const puppeteer = require("puppeteer")

;(async () => {
  const PAGE_URL = "http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/BuscaEmpresaListada.aspx?idioma=pt-br"
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  const navigationPromise = page.waitForNavigation()

  await page.goto(PAGE_URL)

  await page.waitFor(1500)

  await page.type(
    "input[id=ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_txtNomeEmpresa_txtNomeEmpresa_text]",
    "Mahle",
    { delay: 100 }
  )

  // Click on Search Button
  await page.waitForSelector(".row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar")
  await page.click(".row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar")

  // Click on the first result
  await page.waitForSelector(
    "#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a"
  )
  await page.click(
    "#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a"
  )

  // Wait company name and return
  await page.waitForSelector("#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa")
  const companyName = await page.$eval(
    "#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa",
    (element) => {
      return element.innerHTML
    }
  )
  console.log(`Company: ${companyName}`)

  // // Get iframe element for original url, then navigate to the original one
  // await page.waitForSelector("#ctl00_contentPlaceHolderConteudo_iframeCarregadorPaginaExterna")
  // console.log("Element Handle")
  // const iframeFromCompanyProfile = await page.$(
  //   "#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_tabMenuEmpresa_tabRelatoriosFinanceiros"
  // )

  // go to report page
  await page.evaluate(
    (selector) => document.querySelector(selector).click(),
    "#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_tabMenuEmpresa_tabRelatoriosFinanceiros"
  )

  // go to reports history page
  await page.waitForSelector("#ctl00_contentPlaceHolderConteudo_liDemonstrativoDfpHistorico")
  await page.evaluate(
    (selector) => document.querySelector(selector).click(),
    "#ctl00_contentPlaceHolderConteudo_liDemonstrativoDfpHistorico > div.content > p > a"
  )

  // get report list link 1
  await page.waitForSelector("#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl00_lnkDocumento")
  const linkToReportHistory1 = await page.$eval(
    "#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl00_lnkDocumento",
    (element) => {
      //get the javascript call onclick() inside de html li element and return the substring link
      const linkToReport1 = element.href
      return linkToReport1.substring(36, linkToReport1.length - 2)
    }
  )
  console.log("linkToReportHistory1: ")
  console.log(linkToReportHistory1)

  // get report list link 2
  await page.waitForSelector("#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento")
  const linkToReportHistory2 = await page.$eval(
    "#ctl00_contentPlaceHolderConteudo_rptDemonstrativo_ctl03_lnkDocumento",
    (element) => {
      //get the javascript call onclick() inside de html li element and return the substring link
      const linkToReport2 = element.href
      return linkToReport2.substring(36, linkToReport2.length - 2)
    }
  )
  console.log("linkToReportHistory2: ")
  console.log(linkToReportHistory2)
  await parseTable(linkToReportHistory2, browser)

  // const iframeProperty = await iframeFromCompanyProfile.getProperty("href")
  // const originalUrl = iframeProperty._remoteObject.value
  // console.log(`Original URL = ${originalUrl}`)

  // await page.goto(originalUrl)

  // const tableData = await page.$$eval("#accordionDados > table > tbody > tr", (trs) =>
  //   trs.map((tr) => {
  //     const tds = [...tr.getElementsByTagName("td")]
  //     return tds.map((td) => td.textContent)
  //   })
  // )

  // console.log(tableData)

  await navigationPromise

  //await browser.close()
})()

async function parseTable(linkToReportHistory2, browser) {
  // const browser = await puppeteer.launch({ headless: false })

  const pageTable1 = await browser.newPage()

  const navigationPromise2 = pageTable1.waitForNavigation()

  await pageTable1.goto(linkToReportHistory2)

  await pageTable1.waitFor(1000)

  const tableData = await pageTable1.$$eval("#ctl00_cphPopUp_tbDados > tbody > tr", (trs) =>
    trs.map((tr) => {
      const tds = [...tr.getElementsByTagName("td")]
      console.log(tr)
      return tds.map((td) => td.innerHTML)
    })
  )

  // const tableData = document.querySelector("#ctl00_cphPopUp_tbDados").getElementsByTagName("tr")[1].textContent

  console.log(tableData)
}
