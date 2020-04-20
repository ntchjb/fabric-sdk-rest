/**
 * The router for blockchain network information
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express from 'express'
import * as ccp from '../../ccp.json'
import { NetworkConfigData } from '../lib/fabric-impl/NetworkConfig'

const router = express.Router()

router.get('/info', async (req, res) => {
  const networkConfig = ccp as NetworkConfigData
  const result: {
    [channelName: string]: {
      orderers: string[];
      peers: {
        [mspId: string]: string[];
      };
    };
  } = {}
  Object.keys(networkConfig.channels).forEach((channelName) => {
    result[channelName] = {
      orderers: [],
      peers: {}
    }
    result[channelName].orderers = networkConfig.channels[channelName].orderers
    Object.keys(networkConfig.organizations).forEach((orgName) => {
      result[channelName].peers[networkConfig.organizations[orgName].mspid] = networkConfig.organizations[orgName].peers
    })
  })

  return res.json(result)
})

export default router