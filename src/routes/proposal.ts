/**
 * The router for proposal management
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express, { Request, Response } from 'express'
import { User, BuildProposalRequest, SendProposalRequest } from 'fabric-common'
import { ProposalBase64 } from '../lib/interfaces'
import { getCommonProperties, proposalResponseToBase64, getInvokeFunctionInfo } from '../lib/request'
import CustomEndorsement from '../lib/fabric-impl/CustomEndorsement'
import FabricClient from '../lib/fabric-impl/Client'
import { ECDSASignature } from '../lib/ECDSASignature'
import { body, validationResult } from 'express-validator'

const router = express.Router()

router.post('/create', [
  body('cert').isBase64(),
  body('channel').isString(),
  body('chaincode').isString(),
  body('mspid').isString(),
  body('invoke.fcn').isString(),
  body('invoke.args').isArray(),
  body('invoke.args.*').isString(),
  body('invoke.transientMap').optional(),
  body('invoke.transientMap.*').isBase64()
], async (req: Request, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Get invocation function
  const chaincodeFunc: BuildProposalRequest = getInvokeFunctionInfo(req.body.invoke)

  try {
    // Create client, user, and channel
    const client = FabricClient.getInstance()
    const user = User.createUser('', '', common.mspid, common.cert)
    const channel = client.getChannel(common.channel)

    // Create endorsement and convert to base64 string
    const idx = client.newIdentityContext(user)
    const endorsement = channel.newEndorsement(common.chaincode)
    const proposalBytes = endorsement.build(idx, chaincodeFunc)
    const transactionId = endorsement.getTransactionId()
    const proposalBase64 = proposalBytes.toString('base64')

    // Return the result
    const result = {
      proposal: proposalBase64,
      transactionId
    }

    return res.json(result)
  } catch(err) {
    return res.status(500).json({
      message: `Unable to generate proposal: ${err.message}`
    })
  }
})

router.post('/send', [
  body('channel').isString(),
  body('chaincode').isString(),
  body('proposal.payload').isBase64(),
  body('proposal.signature').isBase64(),
  body('peers').isArray().not().isEmpty(),
  body('peers.*').isString().isURL()
], async (req: Request, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Get proposal, signature, and target peers
  const proposalBase64: ProposalBase64 = req.body.proposal
  const proposal = Buffer.from(proposalBase64.payload, 'base64')
  const sigObj = new ECDSASignature()
  try {
    sigObj.fromDER(Buffer.from(proposalBase64.signature, 'base64'))
    sigObj.lowerS()
  } catch(err) {
    return res.status(422).send({
      message: `Unable to check signature: ${err.message}`
    })
  }
  const signature = sigObj.toDER()
  const targetPeers: string[] = req.body.peers

  try {
    // Create client, user, and channel
    const client = FabricClient.getInstance()
    const channel = client.getChannel(common.channel)

    // Get endorsement config
    const endorsementRequest: SendProposalRequest = {
      targets: targetPeers
    }

    const endorsement = new CustomEndorsement(common.chaincode, channel)
    endorsement.setPayload(proposal)
    endorsement.sign(signature)
    const proposalResponses = await endorsement.send(endorsementRequest)
    const processedResponses = proposalResponseToBase64(proposalResponses.responses)
    const processedErrors = proposalResponses.errors.map((error) => ({
      message: error.message,
      name: error.name
    }))
    
    // Return the result
    const result = {
      responses: processedResponses,
      errors: processedErrors
    }
    return res.json(result)
  } catch(err) {
    return res.status(500).json({
      message: `Unable to send signed proposal: ${err.message}`
    })
  }
})

export default router
