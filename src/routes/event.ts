/**
 * The router for event management
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express from 'express'
import { getCommonProperties } from '../lib/request'
import { User, EventInfo, StartEventRequest } from 'fabric-common'
import FabricClient from '../lib/fabric-impl/Client'
import { EventListenerRequest, EventServiceBase64 } from '../lib/interfaces'
import CustomEventService from '../lib/fabric-impl/CustomEventService'
import { REQUEST_TIMEOUT } from '../lib/constants'
import { ECDSASignature } from '../lib/ECDSASignature'

const router = express.Router()

router.post('/create', (req, res) => {
  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Create client, user, identity context, and channel
  const client = FabricClient.getInstance()
  const user = User.createUser('', '', common.mspid, common.cert)
  const channel = client.getChannel(common.channel)
  const idx = client.newIdentityContext(user)

  // Create event service
  const eventService = channel.newEventService('tx')
  const eventServiceBytes = eventService.build(idx, {})
  const eventServiceBase64 = eventServiceBytes.toString('base64')

  const result = {
    event: eventServiceBase64
  }

  return res.json(result)
})

router.post('/send', async (req, res) => {

  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Get event service payload and signature
  const eventServiceBase64: EventServiceBase64 = req.body.event
  const sigObj = new ECDSASignature()
  sigObj.fromDER(Buffer.from(eventServiceBase64.signature, 'base64'))
  sigObj.lowerS()
  const signature = sigObj.toDER()
  const eventServiceBytes = {
    payload: Buffer.from(eventServiceBase64.payload, 'base64'),
    signature
  }
  // Get target peers
  const peers: string[] = req.body.peers
  // Get object type and id to be listened to
  // If it is block, then id is block number
  // If it is transaction, then id is transaction ID
  const eventListenerRequest: EventListenerRequest = req.body.listener

  // Create client, user, identity context, and channel
  const client = FabricClient.getInstance()
  const channel = client.getChannel(common.channel)

  // Create new event service instance
  const eventService = new CustomEventService('tx', channel)
  // Set payload
  eventService.setPayload(eventServiceBytes.payload)
  eventService.sign(eventServiceBytes.signature)

  // Create new eventers based on given peer names
  const eventers = peers.map((peerName) => {
    const endorser = channel.getEndorser(peerName)
    const eventer = client.newEventer(endorser.name)
    eventer.setEndpoint(endorser.endpoint)
    return eventer
  })

  // Setting target peers and timeout
  const eventServiceRequest: StartEventRequest = {
    targets: eventers,
    requestTimeout: REQUEST_TIMEOUT
  }

  // Subscribe event to target peers
  await eventService.send(eventServiceRequest)

  // Add listener to the subscribe channel which listen to given txid
  if (eventListenerRequest.type === 'transaction') {
    const eventListener: Promise<EventInfo | string> = new Promise((resolve: Function, reject: Function): void => {
      const handle: NodeJS.Timeout = setTimeout(() => {
        eventers.forEach((eventer) => {
          eventer.disconnect()
        })
        // may want to unregister the tx event listener
        reject(new Error('Test application has timed out waiting for tx event'))
      }, REQUEST_TIMEOUT)
  
      eventService.registerTransactionListener(
        eventListenerRequest.id,
        (error?: Error, event?: EventInfo): void => {
          clearTimeout(handle)
          if (error) {
            reject(error)
          }
          if (event !== undefined) {
            resolve(event)
          } else {
            resolve({
              status: 'success'
            })
          }
        },
        {}
      )
    })
    const eventStatus = await eventListener
    let result: object
    if (typeof eventStatus === 'string') {
      result = {
        status: {
          code: eventStatus
        }
      }
    } else {
      result = {
        status: {
          code: eventStatus.status,
          block: eventStatus.blockNumber
        }
      }
    }
    return res.json(result)
  } else if (eventListenerRequest.type === 'block') {
    return res.status(501).send('Listening on new blocks has not been implemented yet')
  } else if (eventListenerRequest.type === 'chaincode') {
    return res.status(501).send('Listening on chaincode event has not been implemented yet')
  }
  return res.status(400).send()
})


export default router
