const puppeteer = require('puppeteer')
const chalk = require('chalk')
const { persistData } = require('./database-controller')
const log = console.log

const index = async (request, response) => {
  try {
    const { companyCode } = request.body

    if (!companyCode) {
      return response.status(400).json({ error: 'Código não fornecido' })
    }

    log(chalk.black.bold.bgGreen('\nStarting crawler...\n'))

    const PAGE_URL = 'http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/BuscaEmpresaListada.aspx?idioma=pt-br'
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
    const last3YearsTableData = await parseTable(firstLinkToReportHistory)
    const last3YearsTableHeader = last3YearsTableData[0]
    last3YearsTableData.splice(0, 1)

    const last3YerasSerialized = {
      companyName: companyName,
      tableHeader: last3YearsTableHeader,
      tableData: last3YearsTableData
    }
    persistData(last3YerasSerialized)

    // Get second link from reports
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento')
    const secondLinkToReportHistory = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento',
      (element) => {
        const linkToReport2 = element.href
        return linkToReport2.substring(36, linkToReport2.length - 2)
      }
    )
    console.log(`\nsecondLinkToReportHistory: ${secondLinkToReportHistory}`)

    const previous3YearsTableData = await parseTable(secondLinkToReportHistory)
    const previous3YearsTableHeader = previous3YearsTableData[0]
    // Remove o header da resposta
    previous3YearsTableData.splice(0, 1)

    const previous3YearsSerialized = {
      companyName,
      tableHeader: previous3YearsTableHeader,
      tableData: previous3YearsTableData
    }

    persistData(previous3YearsSerialized)
    const serialized = {
      companyName,
      previous3YearsTableHeader,
      previous3YearsTableData,
      last3YearsTableHeader,
      last3YearsTableData
    }

    await navigationPromise
    await browser.close()
    log(chalk.cyan('Crawler finalizou'))
    return response.status(200).json(serialized)
  } catch (err) {
    log(chalk.red(`Erro: ${err}`))
    return response.status(500).json({ error: err })
  }
}

const removeWhiteSpacesFromStrings = async (table) => {
  log('Limpando whitespaces')
  const promises = []

  for (let i = 0; i < table.length; i++) {
    for (let j = 0; j < table[i].length; j++) {
      promises.push(
        new Promise(resolve => {
          resolve(table[i][j] = (table[i][j]).trim())
        })
      )
    }
  }
  return Promise.all(promises).then(() => {
    return (table)
  })
}

const removeDotFromStrings = async (table) => {
  log('Limpando pontos')
  const promises = []

  for (let i = 0; i < table.length; i++) {
    for (let j = 2; j < table[i].length; j++) {
      promises.push(
        new Promise(resolve => {
          resolve(table[i][j] = (table[i][j]).replace(/\./g, ''))
        })
      )
    }
  }
  return Promise.all(promises).then(() => {
    return (table)
  })
}

const parseTable = async (secondLinkToReportHistory) => {
  try {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(secondLinkToReportHistory)

    await page.waitFor(500)

    await page.waitForSelector('#iFrameFormulariosFilho')
    const elementHandle = await page.$('#iFrameFormulariosFilho')
    const frame = await elementHandle.contentFrame()

    const originalUrl = frame._url

    await page.goto(originalUrl, { waitUntil: 'domcontentloaded' })

    const selector = '#ctl00_cphPopUp_tbDados > tbody > tr'
    const table = await page.$$eval(selector, trs =>
      trs.map(tr => {
        const tds = [...tr.getElementsByTagName('td')]
        return tds.map(td => td.textContent)
      })
    )

    const cleanWhiteSpaceTable = await removeWhiteSpacesFromStrings(table)
    const cleanDotTable = await removeDotFromStrings(cleanWhiteSpaceTable)

    await browser.close()
    return cleanDotTable
  } catch (err) {
    console.log(err)
    return (err)
  }
}

module.exports = { index }
