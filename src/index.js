const puppeteer = require('puppeteer');

(async () => {
  const PAGE_URL = 'http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/BuscaEmpresaListada.aspx?idioma=pt-br'
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  const navigationPromise = page.waitForNavigation()
  
  await page.goto(PAGE_URL)

  await page.waitFor(1000)
  
  await page.type('input[id=ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_txtNomeEmpresa_txtNomeEmpresa_text]', 'MGLU03', { delay: 100 })

  // Click on Search Button
  await page.waitForSelector('.row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar')
  await page.click('.row #ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar')

  // Click on the first result
  await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a')
  await page.click('#ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_grdEmpresa_ctl01 > tbody > .GridRow_SiteBmfBovespa > td:nth-child(1) > a')

  // Wait company name and return 
  await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa')
  const companyName = await page.$eval('#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa', element => {
    return element.innerHTML
  })
  console.log(`Company: ${companyName}`)

  // Get iframe element for original url, then navigate to the original one
  await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_iframeCarregadorPaginaExterna')
  console.log('Element Handle')
  const iframeFromCompanyProfile = await page.$('#ctl00_contentPlaceHolderConteudo_iframeCarregadorPaginaExterna');
  const iframeProperty = await iframeFromCompanyProfile.getProperty('src')
  const originalUrl = iframeProperty._remoteObject.value
  console.log(`Original URL = ${originalUrl}`)

  await page.goto(originalUrl);

  const tableData = await page.$$eval('#accordionDados > table > tbody > tr', trs =>
    trs.map(tr => {
      const tds = [...tr.getElementsByTagName('td')];
      return tds.map(td => td.textContent);
    })
  );

  console.log(tableData)

  
  
  
  await navigationPromise

  
  //await browser.close()
})()