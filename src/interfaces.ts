/**
 * Interfaces provide types for this project
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import {ServiceHandler} from 'fabric-common'

// Chaincode's invocation function
interface InvokeFunction {
  fcn: string, // Name of invocation function
  args: Array<string>, // A list of arguments for the function
  transientMap?: Map<string, Buffer>,
  init?: Boolean
}

interface CommonProperty {
  cert: string,
  mspid: string,
  channel: string,
  chaincode: string
}

interface EndorsementRequest {
  targets: string[],
  handler?: ServiceHandler
}

export { InvokeFunction, CommonProperty, EndorsementRequest }