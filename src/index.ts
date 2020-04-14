import express from 'express'
import bodyParser from 'body-parser'

import proposalRoute from './routes/proposal'
import transactionRoute from './routes/transaction'
import eventRoute from './routes/event'

// Get an instance of express
const app = express()
const port = process.env.PORT || 3000

// Add JSON body parser middleware to express app
app.use(bodyParser.json())

// Assign routers to express app
app.use('/proposal', proposalRoute)
app.use('/transaction', transactionRoute)
app.use('/event', eventRoute)

// Start listening on port
app.listen(port, () => console.log(`Fabric RESTful server is listening at port ${port}`))
