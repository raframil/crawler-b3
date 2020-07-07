const { Router } = require('express')

const CrawlerController = require('./controllers/crawler-controller')
const CVMCrawlerController = require('./controllers/crawler-cvm-controller')

const router = Router()

router.get('/api/companies', CrawlerController.demonstracaoResultado)
router.get('/api/reports', CVMCrawlerController.index)

module.exports = router
