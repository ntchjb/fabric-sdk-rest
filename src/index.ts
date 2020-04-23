/**
 * The entry point of this project
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import proposalRoute from './routes/proposal'
import transactionRoute from './routes/transaction'
import eventRoute from './routes/event'
import blockchainNetwork from './routes/network'
import FabricClient from './lib/fabric-impl/Client'
import * as ccp from '../ccp.json'
import { NetworkConfig, NetworkConfigData } from './lib/fabric-impl/NetworkConfig'

// Get an instance of express
const app = express()
app.use(cors())
const port = process.env.PORT || 3000

// Add JSON body parser middleware to express app
app.use(bodyParser.json())

// Assign routers to express app
app.use('/proposal', proposalRoute)
app.use('/transaction', transactionRoute)
app.use('/event', eventRoute)
app.use('/network', blockchainNetwork)

const init = async (): Promise<void> => {
  console.log('Load common connection profile from ccp.yaml ...')
  const client = FabricClient.getInstance()
  try {
    await NetworkConfig.loadFromConfig(client, ccp as NetworkConfigData)

    // Start listening on port
    app.listen(port, () => console.log(`Fabric RESTful server is listening at port ${port}`))
  } catch (err) {
    console.error('Error occurred during load common connection profile:', err)
  }
}

init()
