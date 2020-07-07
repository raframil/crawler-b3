const puppeteer = require('puppeteer')
const chalk = require('chalk')
const log = console.log

const index = async (request, response) => {
  try {
    const { cvm } = request.query

    if (!cvm) {
      return response.status(400).json({ error: 'CVM não fornecido' })
    }

    log(chalk.black.bold.bgGreen('\nStarting crawler...\n'))

    const PAGE_URL = `http://bvmf.bmfbovespa.com.br/cias-listadas/empresas-listadas/HistoricoFormularioReferencia.aspx?codigoCVM=${cvm}&tipo=dfp&ano=0&idioma=pt-br`
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto(PAGE_URL)

    // Wait company name and return
    await page.waitForSelector('#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa')
    const companyName = await page.$eval(
      '#ctl00_contentPlaceHolderConteudo_MenuEmpresasListadas1_lblNomeEmpresa',
      (element) => {
        return element.innerHTML
      }
    )
    log(chalk.blue(`Empresa encontrada: ${companyName}\n`))

    if (companyName === '') {
      return response.status(404).json({ err: 'Empresa não encontrada' })
    }

    // await browser.close()
    log(chalk.cyan('Crawler finalizou'))
    return response.status(200).json({ companyName })
  } catch (err) {
    log(chalk.red(`Erro: ${err}`))
    return response.status(500).json({ error: err })
  }
}

module.exports = { index }
