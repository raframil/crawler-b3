const express = require('express')
const app = express()
const routes = require('./routes')
const http = require('http')
const cors = require('cors')

const server = http.Server(app)

app.get('/api', (req, res) => {
  res.json({ ok: 'API online'})
})

app.use(cors())
app.use(express.json())
app.use(routes)


server.listen(3333)