/**
 * Interfaces provide types for this project
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import {ServiceHandler} from 'fabric-common'
import fabprotos, { protos, common } from './lib/protobuf/fabprotos';

// Chaincode's invocation function
export interface InvokeFunction {
  fcn: string, // Name of invocation function
  args: Array<string>, // A list of arguments for the function
  transientMap?: {
    [key: string]: Uint8Array
  },
  init?: boolean
}

// Chaincode's invocation function
export interface InvokeFunctionBase64 {
  fcn: string, // Name of invocation function
  args: Array<string>, // A list of arguments for the function
  transientMap?: {
    [key: string]: string
  },
  init?: boolean
}

export interface CommonProperty {
  cert: string,
  mspid: string,
  channel: string,
  chaincode: string
}

export interface EndorsementRequest {
  targets: string[],
  handler?: ServiceHandler
}

export interface CommitRequest {
  targets: string[],
  handler?: ServiceHandler,
  requestTimeout: number,
}

export interface ProposalBase64 {
  payload: string,
  signature: string
}

export interface TransactionBase64 {
  payload: string,
  signature: string,
}

export interface BroadcastResponse {
  status: string,
  info: string
}

export interface EndorsementResponseBase64 {
	response: {
		status: number;
		message: string;
		payload: string;
	};
	payload: string;
	endorsement: {
		endorser: string;
		signature: string;
	};
}

export interface EndorsementActions {
  proposal: protos.Proposal;
  header: common.Header;
}

// Declare getter and setter for protobuf protos.Proposal message
// Because protobuf version 6 is no longer use getter and setter
// But fabric-common still use protobuf v5.
declare module './lib/protobuf/fabprotos.js' {
  namespace protos {
    interface Proposal {
      getHeader(): Uint8Array,
      getPayload(): Uint8Array,
      getExtension(): Uint8Array
    }
  }

  namespace common {
    interface Header {
      getSignatureHeader(): Uint8Array,
      getChannelHeader(): Uint8Array
    }
  }
}
