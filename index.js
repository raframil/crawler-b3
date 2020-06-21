const puppeteer = require('puppeteer');

(async () => {
  const PAGE_URL = 'http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/BuscaEmpresaListada.aspx?idioma=pt-br'
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  const navigationPromise = page.waitForNavigation()
  
  await page.goto(PAGE_URL)

  await page.waitFor(1000)
  
  await page.type('input[id=ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_txtNomeEmpresa_txtNomeEmpresa_text]', 'MGLU03', { delay: 20 })

  /** Click on Search Button */
  await page.waitForSelector('.row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar')
  await page.click('.row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar')
  /** ! Click on Search Button */

  await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a')
  await page.click('#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a')
  
  await navigationPromise

  
  //await browser.close()
})()