const pg = require('pg')
const chalk = require('chalk')
const log = console.log

const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'crawler-b3',
  password: 'root',
  port: '5432',
  max: 10
})

const getCompanyData = async (companyName, reportType) => {
  const client = await pool.connect()
  let sqlString = ''
  switch (reportType) {
    case 'bpa':
      sqlString = `
        SELECT * FROM "balanco-patrimonial-ativo" WHERE "codigoEmpresa" = $1
      `
      break
      // const result = await getOrganizedDre(companyName)
      // return result
    case 'bpp':
      sqlString = `
        SELECT * FROM "balanco-patrimonial-passivo" WHERE "codigoEmpresa" = $1 
      `
      break
    case 'dfc':
      sqlString = `
        SELECT * FROM "demonstracao-fluxo-caixa" WHERE "codigoEmpresa" = $1 
      `
      break
    case 'dre':
      // const result =
      // return await getOrganizedDre(companyName)
      sqlString = `
        SELECT * FROM "demonstrativo-de-resultado" WHERE "codigoEmpresa" = $1
      `
      break
    default:
      break
  }
  const res = await client
    .query(sqlString, [companyName])
    .then(res => { return res.rows })
    .catch(e => console.error(e.stack))
  return res
}

const getOrganizedDre = async (companyName) => {
  const client = await pool.connect()
  // obtendo anos que possuimos registros

  const sqlString = 'SELECT "ano" FROM "balanco-patrimonial-ativo" WHERE "codigoEmpresa" LIKE $1 GROUP BY "ano" ORDER BY "ano" DESC;'
  const years = await client
    .query(sqlString, [companyName])
    .then(res => { return res.rows })
    .catch(e => console.error(e.stack))
  console.log(years)

  const tableArray = [[]]
  for (const year of years) {
    const yearValue = year.ano
    const sqlStringGetByYear = `
    SELECT "valor" FROM "balanco-patrimonial-ativo" WHERE "ano" = $1`
    const table = await client
      .query(sqlStringGetByYear, [yearValue])
      .then(res => { return res.rows })
      .catch(e => console.error(e.stack))
    console.log(yearValue)
    tableArray[yearValue] = table
  }
  console.log('asd', tableArray[years[5].ano])
  const teste = []
  for (let index = 0; index < tableArray[years[0].ano].length; index++) {
    const year0 = years[0].ano
    const year1 = years[1].ano
    const year2 = years[2].ano
    const year3 = years[3].ano
    const year4 = years[4].ano
    const year5 = years[4].ano
    teste[index] = [
      tableArray[year0][index],
      tableArray[year1][index],
      tableArray[year2][index],
      tableArray[year3][index],
      tableArray[year4][index],
      tableArray[year5][index]
    ]
    console.log('kkkk', tableArray[year5])
  }
  console.log('=======', teste)
  return teste
  // for (const lineData of tableArray['2019']) {
  //   // const codigoConta = lineData.codigoConta1 + '.' + lineData.codigoConta2 + (lineData.codigoConta3 ? '.' + lineData.codigoConta3 : '')
  //   optimizedTableArray.push([
  //     lineData.codigoConta1,
  //     lineData.codigoConta2,
  //     lineData.codigoConta3,
  //     lineData.descrição,
  //     years[0].ano = lineData.valor
  //   ])
  // }

  // console.log(optimizedTableArray)
}
const persistData = async (parsedData, reportType) => {
  const client = await pool.connect()
  const companyName = parsedData.companyName
  const firstYear = parsedData.tableHeader[2].split('/')[2].split(/(\s+)/)[0]
  const secondYear = parsedData.tableHeader[3].split('/')[2].split(/(\s+)/)[0]
  const thirdYear = parsedData.tableHeader[4].split('/')[2].split(/(\s+)/)[0]
  const tableData = parsedData.tableData

  log(chalk.yellow('Armazenamento dos dados(' + firstYear + ' a ' + thirdYear + ') inicializado'))
  let sqlString
  switch (reportType) {
    case 'bpa':
      sqlString = `
        INSERT INTO "balanco-patrimonial-ativo"
        ("codigoEmpresa", "codigoConta1", "codigoConta2", "codigoConta3", "descrição", "valor", "ano")
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)`
      break
    case 'bpp':
      sqlString = `
        INSERT INTO "balanco-patrimonial-passivo"
        ("codigoEmpresa", "codigoConta1", "codigoConta2", "codigoConta3", "descrição", "valor", "ano")
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)`
      break
    case 'dfc':
      sqlString = `
        INSERT INTO "demonstracao-fluxo-caixa"
        ("codigoEmpresa", "codigoConta1", "codigoConta2", "codigoConta3", "descrição", "valor", "ano")
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)`
      break
    case 'dre':
      sqlString = `
        INSERT INTO "demonstrativo-de-resultado"
        ("codigoEmpresa", "codigoConta1", "codigoConta2", "codigoConta3", "descrição", "valor", "ano")
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)`
      break
    default:
      break
  }
  for (const row of tableData) {
    const description = row[1]
    const codigoConta = row[0].split('.')

    if (codigoConta.length < 4) {
      const firstYearValue = row[2]
      const secondYearValue = row[3]
      const thirdYearValue = row[4]

      const firstYearValues = [companyName, codigoConta[0], codigoConta[1], codigoConta[2], description, firstYearValue, firstYear]
      const secondYearValues = [companyName, codigoConta[0], codigoConta[1], codigoConta[2], description, secondYearValue, secondYear]
      const thirdYearValues = [companyName, codigoConta[0], codigoConta[1], codigoConta[2], description, thirdYearValue, thirdYear]

      // Pass the string and array to the pool's query() method
      client.query(sqlString, firstYearValues, (err, res) => {
        if (err) {
          console.log('pool.query():', err)
        }
        if (res) {
          // console.log('pool.query(): sucess')
        }
      })
      client.query(sqlString, secondYearValues, (err, res) => {
        if (err) {
          console.log('pool.query():', err)
        }
        if (res) {
          // console.log('pool.query(): sucess')
        }
      })
      client.query(sqlString, thirdYearValues, (err, res) => {
        if (err) {
          console.log('pool.query():', err)
        }
        if (res) {
          // console.log('pool.query(): sucess')
        }
      })
    } else {
      // console.log('Code is too big')
      // console.log(row)
    }
  }
  log(chalk.yellow('Armazenamento finalizado(' + firstYear + ' a ' + thirdYear + ')'))
}

module.exports = { persistData, pool, getCompanyData }
