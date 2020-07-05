const puppeteer = require('puppeteer')

const index = async (request, response) => {
  try {
    const { companyCode } = request.body

    if (!companyCode) {
      return response.status(400).json({ error: 'Código não fornecido' })
    }

    const PAGE_URL = 'http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/BuscaEmpresaListada.aspx?idioma=pt-br'
    const browser = await puppeteer.launch({ headless: false })
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
    console.log(`Company: ${companyName}`)

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

    // get report list link 1
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl00_lnkDocumento')
    const linkToReportHistory1 = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl00_lnkDocumento',
      (element) => {
        // get the javascript call onclick() inside de html li element and return the substring link
        const linkToReport1 = element.href
        return linkToReport1.substring(36, linkToReport1.length - 2)
      }
    )
    console.log(`linkToReportHistory1: ${linkToReportHistory1}`)

    // get report list link 2
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento')
    const linkToReportHistory2 = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento',
      (element) => {
        // get the javascript call onclick() inside de html li element and return the substring link
        const linkToReport2 = element.href
        return linkToReport2.substring(36, linkToReport2.length - 2)
      }
    )
    console.log(`linkToReportHistory2: ${linkToReportHistory2}`)

    await parseTable(linkToReportHistory2, browser)

    await navigationPromise

    await browser.close()
  } catch (err) {
    return response.status(400).json({ error: err })
  }
}

const parseTable = async (linkToReportHistory2, browser) => {
  try {
    const browser = await puppeteer.launch({ headless: false })

    const pageTable1 = await browser.newPage()

    await pageTable1.goto(linkToReportHistory2)

    await pageTable1.waitFor(500)

    // Get iframe element for original url, then navigate to the original one
    await pageTable1.waitForSelector('#iFrameFormulariosFilho')
    const tableBody = await pageTable1.evaluate((selector) => {
      const iframeFormulariosFilho = document.querySelector(selector).contentDocument
      const tableBody = iframeFormulariosFilho.querySelector('#ctl00_cphPopUp_tbDados > tbody').getElementsByTagName('tr')
      const rows = []
      for (let i = 1; i < tableBody.length; i++) {
        const tr = tableBody.item(i)
        const cells = []
        console.log('aqui')
        for (let j = 0; j < 5; j++) {
          console.log(tr.cells[j])
          // alert(tr.cells[j].innerText)
          cells.push(tr.cells[j].innerText)
          // alert("epa")
          // alert(cells[j])
        }
        rows.push(cells)
      }
      return rows
    }, '#iFrameFormulariosFilho')
    console.log(tableBody)
    return tableBody
  } catch (err) {
    console.log(err)
  }
}

module.exports = { index }
