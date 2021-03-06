/**
 * This file provides functions to extract useful data from requests
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import { CommonProperty, InvokeFunctionBase64 } from './interfaces'
import { EndorsementResponse, BuildProposalRequest } from 'fabric-common'
import { EndorsementResponseBase64 } from './interfaces'

export const getCommonProperties = (reqBody: CommonProperty): CommonProperty => {
  let certificatePEM = ''
  if (reqBody.cert) {
    certificatePEM = Buffer
    .from(reqBody.cert, 'base64')
    .toString('utf8')
  }
  return {
    cert: certificatePEM,
    mspid: reqBody.mspid,
    chaincode: reqBody.chaincode,
    channel: reqBody.channel
  }
}

export const proposalResponseToBase64 = (responses: EndorsementResponse[]): EndorsementResponseBase64[] => {
  const processedResponses = responses.map((responseObj) => {
    let endorsement: EndorsementResponseBase64["endorsement"] = {
      endorser: null,
      signature: null,
    };
    if (responseObj.endorsement !== null) {
      endorsement = {
        endorser: responseObj.endorsement.endorser.toString('base64'),
        signature: responseObj.endorsement.signature.toString('base64')
      }
  }
    const payload = responseObj.payload.toString('base64')
    const response = {
      status: responseObj.response.status,
      message: responseObj.response.message,
      payload: responseObj.response.payload.toString('base64')
    }
    return {
      endorsement,
      payload,
      response
    }
  })
  return processedResponses
}

export const proposalResponseToBuffer = (responses: EndorsementResponseBase64[]): EndorsementResponse[] => {
  const processedResponses: EndorsementResponse[] = responses.map((responseObj) => {
    let endorsement = {
      endorser: Buffer.alloc(0),
      signature: Buffer.alloc(0),
    };
    if (responseObj.endorsement.endorser !== null && responseObj.endorsement.signature !== null) {
      endorsement = {
        endorser: Buffer.from(responseObj.endorsement.endorser, 'base64'),
        signature: Buffer.from(responseObj.endorsement.signature, 'base64')
      }
    }
    const payload = Buffer.from(responseObj.payload, 'base64')
    const response = {
      status: responseObj.response.status,
      message: responseObj.response.message,
      payload: Buffer.from(responseObj.response.payload, 'base64')
    }
    // Put dummy of connection info here since it is not used.
    return {
      endorsement,
      payload,
      response,
      connection: {
        type: '',
        name: '',
        url: '',
        options: {}
      }
    }
  })
  return processedResponses
}

export const getInvokeFunctionInfo = (info: InvokeFunctionBase64): BuildProposalRequest => {

  const result: BuildProposalRequest = {
    fcn: info.fcn,
    args: info.args
  }
  if (typeof info.init === 'boolean') {
    result.init = info.init
  }
  if (typeof info.transientMap === 'object') {
    const transientMap: {
      [key: string]: Buffer;
    } = {}
    Object.keys(info.transientMap).forEach((key) => {
      if (info.transientMap !== undefined) {
        transientMap[key] = Buffer.from(info.transientMap[key], 'base64')
      }
    })
    result.transientMap = transientMap
  }
  return result
}