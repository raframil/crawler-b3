const puppeteer = require('puppeteer')
const pg = require('pg')
const chalk = require('chalk')
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
    // todo add parse table to firstLinkToReportHistory
    // const tableData = await parseTable(firstLinkToReportHistory)
    // const tableHeader = tableData[0]

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

    const tableData = await parseTable(secondLinkToReportHistory)
    const tableHeader = tableData[0]

    // Remove o header da resposta
    tableData.splice(0, 1)

    const serialized = {
      companyName,
      tableHeader,
      tableData
    }

    persistData(serialized)

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
const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'crawler-b3',
  password: 'root',
  port: '5432',
  max: 10000
})

const persistData = async (parsedData) => {
  // const client = await Pool.connect
  const companyName = parsedData.companyName
  const firstYear = parsedData.tableHeader[2].split('/')[2].split(/(\s+)/)[0]
  const secondYear = parsedData.tableHeader[3].split('/')[2].split(/(\s+)/)[0]
  const thirdYear = parsedData.tableHeader[4].split('/')[2].split(/(\s+)/)[0]
  const tableData = parsedData.tableData

  for (const row of tableData) {
    const description = row[1]
    const codigoConta = row[0].split('.')

    if (codigoConta.length < 4) {
      const firstYearValue = row[3]
      const secondYearValue = row[4]
      const thirdYearValue = row[5]

      const firstYearValues = [companyName, codigoConta[0], codigoConta[1], codigoConta[2], description, firstYearValue, firstYear]
      const secondYearValues = [companyName, codigoConta[0], codigoConta[1], codigoConta[2], description, secondYearValue, secondYear]
      const thirdYearValues = [companyName, codigoConta[0], codigoConta[1], codigoConta[2], description, thirdYearValue, thirdYear]

      const sqlString = `
      INSERT INTO "demonstrativo-de-resultado"
      ("codigoEmpresa", "codigoConta1", "codigoConta2", "codigoConta3", "descrição", "valor", "ano")
      VALUES
      ($1, $2, $3, $4, $5, $6, $7)`

      // Pass the string and array to the pool's query() method
      pool.query(sqlString, firstYearValues, (err, res) => {
        if (err) {
          console.log('pool.query():', err)
        }
        if (res) {
          // console.log('pool.query(): sucess')
        }
      })
      pool.query(sqlString, secondYearValues, (err, res) => {
        if (err) {
          console.log('pool.query():', err)
        }
        if (res) {
          // console.log('pool.query(): sucess')
        }
      })
      pool.query(sqlString, thirdYearValues, (err, res) => {
        if (err) {
          console.log('pool.query():', err)
        }
        if (res) {
          // console.log('pool.query(): sucess')
        }
      })
    } else {
      // console.log('Code is too big')
      console.log(row)
    }
  }

  pool.end()
}
module.exports = { index }
