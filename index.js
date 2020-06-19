const puppeteer = require('puppeteer');

(async () => {
  const PAGE_URL = 'http://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/empresas-listadas.htm'
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  
  await page.goto(PAGE_URL)

  await page.waitFor(1000)
  
  const searchButton = await page.evaluate(() => {
    return document.getElementById("ctl00_contentPlaceHolderConteudo_BuscaNomeEmpresa1_btnBuscar")
  })
  console.log(searchButton)
  await searchButton.click()

  
  //await browser.close()
})()