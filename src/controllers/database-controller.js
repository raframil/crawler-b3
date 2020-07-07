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
const prettyData = async (companyName, tableName) => {
  const client = await pool.connect()
  const sqlStringEvalIfDataIsSaved = `SELECT * FROM "${tableName}" WHERE "codigoEmpresa" = $1`
  const sqlString = `SELECT "ano" FROM "${tableName}" WHERE "codigoEmpresa" = $1 GROUP BY "ano" ORDER BY "ano" DESC`
  const getCodesSqlString = `SELECT "codigoConta1", "codigoConta2", "codigoConta3", "descrição" FROM "${tableName}" WHERE "codigoEmpresa" = $1 GROUP BY ("codigoConta1", "codigoConta2", "codigoConta3", "descrição") ORDER BY ("codigoConta1", "codigoConta2", "codigoConta3") DESC`
  const getAnnualValueSqlString3 = `SELECT "valor" FROM "${tableName}" WHERE "codigoConta1" = $1 AND "codigoConta2" = $2 AND "codigoConta3" = $3 AND "codigoEmpresa" = $4 AND "ano" = $5`
  const getAnnualValueSqlString2 = `SELECT "valor" FROM "${tableName}" WHERE "codigoConta1" = $1 AND "codigoConta2" = $2 AND "codigoEmpresa" = $3 AND "ano" = $4`
  const getAnnualValueSqlString1 = `SELECT "valor" FROM "${tableName}" WHERE "codigoConta1" = $1 AND "codigoEmpresa" = $2 AND "ano" = $3`

  const dataAlreadySaved = await client
    .query(sqlStringEvalIfDataIsSaved, [companyName])
    .then(res => { return res.rows })
    .catch(e => console.error(e.stack))
  if (!dataAlreadySaved.length > 0) {
    return dataAlreadySaved
  }

  const resultYears = await client
    .query(sqlString, [companyName])
    .then(res => { return res.rows })
    .catch(e => console.error(e.stack))
  const years = resultYears.map((element) => { return element.ano })

  const codeLines = await client
    .query(getCodesSqlString, [companyName])
    .then(res => { return res.rows })
    .catch(e => console.error(e.stack))

  const resultadoParcial = []
  const resultadoFinal = []
  let contador = 0
  resultadoFinal[contador++] = ['codigoConta1', 'codigoConta2', 'codigoConta3', 'descrição', ...years]
  for (const codeLine of codeLines) {
    for (let index = 0; index < years.length; index++) {
      // console.log(years[index])
      let finalSqlString
      let values
      if (codeLine.codigoConta1) {
        if (codeLine.codigoConta2) {
          if (codeLine.codigoConta3) {
            finalSqlString = getAnnualValueSqlString3
            values = [codeLine.codigoConta1, codeLine.codigoConta2, codeLine.codigoConta3, companyName, years[index]]
          } else {
            finalSqlString = getAnnualValueSqlString2
            values = [codeLine.codigoConta1, codeLine.codigoConta2, companyName, years[index]]
          }
        } else {
          finalSqlString = getAnnualValueSqlString1
          values = [codeLine.codigoConta1, companyName, years[index]]
        }
      }
      const resultValue = await client
        .query(finalSqlString, values)
        .then(res => { return res.rows })
        .catch(e => console.error(e.stack))
      resultadoParcial[index] = resultValue.map((element) => { return element.valor })[0]
    }
    resultadoFinal[contador++] = [codeLine.codigoConta1, codeLine.codigoConta2, codeLine.codigoConta3, codeLine.descrição, ...resultadoParcial]
    // console.log(resultadoFinal)
  }

  return resultadoFinal
}

const getCompanyData = async (companyName, reportType) => {
  const client = await pool.connect()
  let sqlString = ''
  let tableName
  switch (reportType) {
    case 'bpa':
      sqlString = `
        SELECT * FROM "balanco-patrimonial-ativo" WHERE "codigoEmpresa" = $1 
      `
      tableName = 'balanco-patrimonial-ativo'

      return await prettyData(companyName, tableName)

    case 'bpp':
      sqlString = `
        SELECT * FROM "balanco-patrimonial-passivo" WHERE "codigoEmpresa" = $1 
      `
      tableName = 'balanco-patrimonial-passivo'

      return await prettyData(companyName, tableName)
    case 'dfc':
      sqlString = `
        SELECT * FROM "demonstracao-fluxo-caixa" WHERE "codigoEmpresa" = $1 
      `
      tableName = 'demonstracao-fluxo-caixa'

      return await prettyData(companyName, tableName)
    case 'dre':
      sqlString = `
        SELECT * FROM "demonstrativo-de-resultado" WHERE "codigoEmpresa" = $1 
      `
      tableName = 'demonstrativo-de-resultado'

      return await prettyData(companyName, tableName)
    default:
      break
  }
  const res = await client
    .query(sqlString, [companyName])
    .then(res => { return res.rows })
    .catch(e => console.error(e.stack))
  return res
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
