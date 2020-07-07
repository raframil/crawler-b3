const puppeteer = require('puppeteer')
const chalk = require('chalk')
const { persistData, getCompanyData } = require('./database-controller')
const log = console.log

const demonstracaoResultado = async (request, response) => {
  try {
    const { companyCode, reportType } = request.query

    if (!companyCode) {
      return response.status(400).json({ error: 'Código não fornecido' })
    }

    if (!reportType) {
      return response.status(400).json({ error: 'Tipo de relatório não fornecido' })
    }

    log(chalk.black.bold.bgGreen('\nStarting crawler...\n'))

    const PAGE_URL =
      'http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/BuscaEmpresaListada.aspx?idioma=pt-br'
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    const navigationPromise = page.waitForNavigation()

    await page.goto(PAGE_URL)

    await page.waitFor(750)

    await page.type(
      'input[id=ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_txtNomeEmpresa_txtNomeEmpresa_text]',
      `${companyCode}`,
      { delay: 100 }
    )

    // Click on Search Button
    await page.waitForSelector('.row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar')
    await page.click('.row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar')

    // Click on the first result
    await page.waitForSelector(
      '#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a'
    )
    await page.click(
      '#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a'
    )

    // Wait company name and return
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa')
    const companyName = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa',
      (element) => {
        return element.innerHTML
      }
    )
    log(chalk.blue(`Empresa encontrada: ${companyName}\n`))

    const companyData = await getCompanyData(companyName, reportType)
    if (companyData.length !== 0) {
      return response.status(200).json(companyData)
    }

    // console.log('asdasdasd')
    // go to report page
    await page.evaluate(
      (selector) => document.querySelector(selector).click(),
      '#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_tabMenuEmpresa_tabRelatoriosFinanceiros'
    )

    // go to reports history page
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_liDemonstrativoDfpHistorico')
    await page.evaluate(
      (selector) => document.querySelector(selector).click(),
      '#ctl00_contentPlaceHolderConteudo_liDemonstrativoDfpHistorico > div.content > p > a'
    )
    // Get first link from reports
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl00_lnkDocumento')
    const firstLinkToReportHistory = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl00_lnkDocumento',
      (element) => {
        const linkToReport1 = element.href
        return linkToReport1.substring(36, linkToReport1.length - 2)
      }
    )
    console.log(`\nfirstLinkToReportHistory: ${firstLinkToReportHistory}`)
    const last3YearsTableData = await parseTable(firstLinkToReportHistory, reportType)
    const last3YearsTableHeader = last3YearsTableData[0]
    last3YearsTableData.splice(0, 1)

    const last3YerasSerialized = {
      companyName: companyName,
      tableHeader: last3YearsTableHeader,
      tableData: last3YearsTableData
    }
    persistData(last3YerasSerialized, reportType)

    // Get second link from reports
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento')
    const secondLinkToReportHistory = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento',
      (element) => {
        const linkToReport2 = element.href
        return linkToReport2.substring(36, linkToReport2.length - 2)
      }
    )
    log(`\nsecondLinkToReportHistory: ${secondLinkToReportHistory}`)

    const previous3YearsTableData = await parseTable(secondLinkToReportHistory, reportType)
    const previous3YearsTableHeader = previous3YearsTableData[0]

    const yearsArray = await getYearsFromHeader(previous3YearsTableHeader)
    const minValueFromArray = Math.min(...yearsArray)
    console.log(minValueFromArray)

    // Remove o header da resposta
    previous3YearsTableData.splice(0, 1)

    const previous3YearsSerialized = {
      companyName,
      tableHeader: previous3YearsTableHeader,
      tableData: previous3YearsTableData
    }

    persistData(previous3YearsSerialized, reportType)

    log(chalk.cyan('Crawler finalizou'))

    const companyDataPersisted = await getCompanyData(companyName, reportType)
    if (companyDataPersisted.length !== 0) {
      return response.status(200).json(companyDataPersisted)
    }
    const serialized = {
      companyName,
      previous3YearsTableHeader,
      previous3YearsTableData,
      last3YearsTableHeader,
      last3YearsTableData
    }

    await navigationPromise
    // await browser.close()
    return response.status(200).json(serialized)
  } catch (err) {
    log(chalk.red(`Erro: ${err}`))
    return response.status(500).json({ error: err })
  }
}

const getYearsFromHeader = async (tableHeader) => {
  const promises = []
  const years = []
  for (let i = 2; i < tableHeader.length; i++) {
    promises.push(
      new Promise(resolve => {
        resolve(years.push(tableHeader[i].substring(6, 10)))
      })
    )
  }
  return Promise.all(promises).then(() => {
    return (years)
  })
}

const parseTable = async (link, reportType) => {
  try {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(link)

    await page.waitFor(1000)

    await page.waitForSelector('#cmbQuadro')

    let value
    switch (reportType) {
      case 'bpa':
        value = await page.evaluate(() => {
          return document.querySelector('#cmbQuadro option:nth-child(1)').value
        })
        break
      case 'bpp':
        value = await page.evaluate(() => {
          return document.querySelector('#cmbQuadro option:nth-child(2)').value
        })
        break
      case 'dfc':
        value = await page.evaluate(() => {
          return document.querySelector('#cmbQuadro option:nth-child(5)').value
        })
        break
      case 'dre':
        break
      default:
        break
    }

    if (reportType !== 'dre') {
      await page.select('#cmbQuadro', value)
    }

    await page.waitFor(10000)

    await page.waitForSelector('#iFrameFormulariosFilho')
    const elementHandle = await page.$('#iFrameFormulariosFilho')
    const frame = await elementHandle.contentFrame()

    const originalUrl = frame._url

    await page.goto(originalUrl, { waitUntil: 'domcontentloaded' })

    const selector = '#ctl00_cphPopUp_tbDados > tbody > tr'
    const table = await page.$$eval(selector, (trs) =>
      trs.map((tr) => {
        const tds = [...tr.getElementsByTagName('td')]
        return tds.map((td) => td.textContent)
      })
    )

    const cleanWhiteSpaceTable = await removeWhiteSpacesFromStrings(table)
    const cleanDotTable = await removeDotFromStrings(cleanWhiteSpaceTable)

    // await browser.close()
    return cleanDotTable
  } catch (err) {
    log(chalk.red(err))
    return err
  }
}

const removeWhiteSpacesFromStrings = async (table) => {
  log('Limpando whitespaces')
  const promises = []

  for (let i = 0; i < table.length; i++) {
    for (let j = 0; j < table[i].length; j++) {
      promises.push(
        new Promise((resolve) => {
          resolve((table[i][j] = table[i][j].trim()))
        })
      )
    }
  }
  return Promise.all(promises).then(() => {
    return table
  })
}

const removeDotFromStrings = async (table) => {
  log('Limpando pontos')
  const promises = []

  for (let i = 0; i < table.length; i++) {
    for (let j = 2; j < table[i].length; j++) {
      promises.push(
        new Promise((resolve) => {
          resolve((table[i][j] = table[i][j].replace(/\./g, '')))
        })
      )
    }
  }
  return Promise.all(promises).then(() => {
    return table
  })
}

module.exports = { demonstracaoResultado }
