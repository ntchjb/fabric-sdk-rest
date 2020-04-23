/**
 * The router for transaction management
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express, { Request, Response } from 'express'
import { getCommonProperties, proposalResponseToBuffer } from '../lib/request'
import { User, CommitSendRequest, BroadcastResponse } from 'fabric-common'
import { ProposalBase64, TransactionBase64, EndorsementResponseBase64 } from '../lib/interfaces'
import CustomEndorsement from '../lib/fabric-impl/CustomEndorsement'
import FabricClient from '../lib/fabric-impl/Client'
import CustomCommit from '../lib/fabric-impl/CustomCommit'
import { REQUEST_TIMEOUT } from '../lib/constants'
import { ECDSASignature } from '../lib/ECDSASignature'
import { validationResult, body } from 'express-validator'

const router = express.Router()

router.post('/create', [
  body('cert').isBase64(),
  body('channel').isString(),
  body('chaincode').isString(),
  body('mspid').isString(),
  body('proposal.payload').isBase64(),
  body('responses').exists()
], (req: Request, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Get proposal and its peer responses
  const proposalBase64: ProposalBase64 = req.body.proposal
  const proposal = Buffer.from(proposalBase64.payload, 'base64')
  const proposalResponses: EndorsementResponseBase64[] = req.body.responses
  
  const processedResponses = proposalResponseToBuffer(proposalResponses)
  
  try {
  // Create client, user, and channel
  const client = FabricClient.getInstance()
  const channel = client.getChannel(common.channel)
  const user = User.createUser('', '', common.mspid, common.cert)

  // Create an custom endorsement prepare the endorsement data for creating commit object
  const endorsement = new CustomEndorsement(common.chaincode, channel)
  const idx = client.newIdentityContext(user)
  endorsement.setPayload(proposal)
  endorsement.setResponses(processedResponses)

  // Create new commit and build it to get unsigned transaction
  const commit = endorsement.newCommit()
  const commitBytes = commit.build(idx)

  const commitBase64 = commitBytes.toString('base64')

  // Return the result
  const result = {
    transaction: commitBase64,
  }

  return res.json(result)
} catch(err) {
  return res.status(500).json({
    message: `Unable to generate transaction: ${err.message}`
  })
}
})

router.post('/send', [
  body('channel').isString(),
  body('chaincode').isString(),
  body('transaction.payload').isBase64(),
  body('transaction.signature.type').isString(),
  body('transaction.signature.value').isBase64(),
  body('orderers').isArray(),
  body('orderers.*').isString(),
], async (req: Request, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Create client, user, and channel
  const client = FabricClient.getInstance()
  const channel = client.getChannel(common.channel)
  
  // Get transaction and its signature
  const transactionBase64: TransactionBase64 = req.body.transaction
  const transaction = Buffer.from(transactionBase64.payload, 'base64')
  const sigObj = new ECDSASignature()
  try {
    sigObj.import(transactionBase64.signature)
  } catch(err) {
    return res.status(422).json({
      message: err.message
    })
  }
  const signature = sigObj.toDER()
  const targetOrderers: string[] = req.body.orderers

  const commit = new CustomCommit(common.chaincode, channel)
  commit.setPayload(transaction)
  commit.sign(signature)
  const commitRequest: CommitSendRequest = {
    targets: targetOrderers,
    requestTimeout: REQUEST_TIMEOUT
  }
  try {
    const result: BroadcastResponse = await commit.send(commitRequest)
    
    if (result.status === 'SUCCESS') {
      return res.json({
        success: true
      })
    } else {
      return res.json({
        success: false,
        message: result.status
      })
    }
  } catch (err) {
    return res.status(500).json({
      message: `Unable to send signed transaction: ${err.message}`
    })
  }
})

export default router
