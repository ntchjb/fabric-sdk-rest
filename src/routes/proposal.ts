/**
 * The router for proposal management
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import express from 'express'
import { User, Client, Utils } from 'fabric-common'
import { InvokeFunction, EndorsementRequest } from '../interfaces'
import { getCommonProperties } from '../lib/request'
import CustomEndorsement from '../lib/fabric-impl/CustomEndorsement'
import FabricClient from '../lib/fabric-impl/Client'
import winston from 'winston'

//@ts-ignore
import fabprotos from 'fabric-protos';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const router = express.Router();

router.post('/create', async (req, res) => {
  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body);

  // Get invocation function
  const chaincodeFunc: InvokeFunction = req.body.invoke;

  // Create client, user, and channel
  const client = FabricClient.getInstance();
  // Set dummy mutual TLS to prevent from error building endorsement
  // that it is unable to add cert hash to the header of the endorsement
  client.setTlsClientCertAndKey('', '')
  const user = User.createUser('', '', common.mspid, common.cert);
  const channel = client.getChannel(common.channel);

  // Create endorsement and convert to base64 string
  const idx = client.newIdentityContext(user);
  const endorsement = channel.newEndorsement(common.chaincode);
  const proposalBytes = endorsement.build(idx, chaincodeFunc);
  const transactionId = endorsement.getTransactionId();
  const proposalBase64 = proposalBytes.toString('base64');

  // Return the result
  const result = {
    proposal: proposalBase64,
    transactionId,
  };

  return res.json(result);
})

router.post('/send', async (req, res, next) => {
  // Get user certificate, channel name, and chaincode name
  const common = getCommonProperties(req.body)

  // Get proposal, signature, and target peers
  const proposalBase64: string = req.body.proposal;
  const proposal = Buffer.from(proposalBase64, 'base64');
  const signatureBase64: string = req.body.signature;
  const signature = Buffer.from(signatureBase64, 'base64');
  const targetPeers: string[] = req.body.peers;

  // Create client, user, and channel
  const client = FabricClient.getInstance()
  const channel = client.getChannel(common.channel);

  // Get endorsement config
  const endorsementRequest: EndorsementRequest = {
    targets: targetPeers
  }

  const endorsement = new CustomEndorsement(common.chaincode, channel)
  endorsement.setPayload(proposal)
  endorsement.sign(signature);
  try {
    const proposalResponses = await endorsement.send(endorsementRequest);
    const processedResponses = proposalResponses.responses.map((responseObj) => {
      const endorsement = {
        endoser: responseObj.endorsement.endorser.toString('base64'),
        signature: responseObj.endorsement.signature.toString('base64')
      };
      const payload = responseObj.payload.toString('base64');
      const response = {
        status: responseObj.response.status,
        message: responseObj.response.message,
        payload: responseObj.response.payload.toString('base64')
      };
      return {
        endorsement,
        payload,
        response
      };
    });
    const processedErrors = proposalResponses.errors.map((error) => ({
      message: error.message,
      name: error.name
    }));
    
    // Return the result
    const result = {
      responses: processedResponses,
      errors: processedErrors
    };
    return res.json(result);
  } catch(err) {
    logger.error('Unable to send signed proposal:', err)
    return res.json({
      message: 'Unable to send signed proposal'
    });
  }
})

export default router
