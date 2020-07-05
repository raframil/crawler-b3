const { Router } = require('express')

const CrawlerController = require('./controllers/crawler-controller')

const router = Router()

router.get('/api/companies', CrawlerController.index)

module.exports = router
