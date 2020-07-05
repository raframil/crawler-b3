const pg = require('pg')
const chalk = require('chalk')
const log = console.log

const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'crawler-b3',
  password: 'root',
  port: '5432',
  max: 10000
})

const persistData = async (parsedData) => {
  const companyName = parsedData.companyName
  const firstYear = parsedData.tableHeader[2].split('/')[2].split(/(\s+)/)[0]
  const secondYear = parsedData.tableHeader[3].split('/')[2].split(/(\s+)/)[0]
  const thirdYear = parsedData.tableHeader[4].split('/')[2].split(/(\s+)/)[0]
  const tableData = parsedData.tableData

  log(chalk.yellow('Armazenamento dos dados(' + firstYear + ' a ' + thirdYear + ') inicializado'))

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
  log(chalk.yellow('Armazenamento finalizado(' + firstYear + ' a ' + thirdYear + ')'))
}

module.exports = { persistData, pool }
