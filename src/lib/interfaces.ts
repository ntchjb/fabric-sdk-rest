/**
 * Interfaces provide types for this project
 * 
 * Copyright 2020 JAIBOON Nathachai
 */
/* eslint-disable @typescript-eslint/no-namespace */

import { protos, common } from './protobuf/fabprotos'

export interface CommonProperty {
  cert: string;
  mspid: string;
  channel: string;
  chaincode: string;
}

/** Chaincode's invocation function */
export interface InvokeFunctionBase64 {
  /** Name of chaincode invocation function */
  fcn: string;
  /** A list of arguments for the function */
  args: Array<string>;
  /** Transient field object. Its value is binary data encoded in base64 format */
  transientMap?: {
    [key: string]: string;
  };
  /** Indicator whether the function will be inited instead of invoke or not */
  init?: boolean;
}

/** Base64 version of Proposal */
export interface ProposalBase64 {
  /** Proposal's payload which is binary data encoded in base64 format */
  payload: string;
  /** Proposal's signature which is binary data encoded in base64 format */
  signature: Signature;
}

/** Base64 version of transaction */
export interface TransactionBase64 {
  /** Transaction's payload which is binary data encoded in base64 format */
  payload: string;
  /** Transaction's signature which is binary data encoded in base64 format */
  signature: Signature;
}

/** Base64 version of EndorsementResponse */
export interface EndorsementResponseBase64 {
  /** The useful information returned from chaincode */
	response: {
    /** status of the endorsement */
    status: number;
    /** additional information other than the status */
    message: string;
    /** The payload returned from chaincode function,
     * which its original type depending on type of returned value from chaincode function.
     * However, the data is encoded in base64 format
     */
		payload: string;
  };
  /** A full endorsement response which is binary data encoded in base64 format */
  payload: string;
  /** Endorser information in Protobuf binary format */
	endorsement: {
    /** Identity of the endorser in base64 format */
    endorser: string | null;
    /** Signature of the payload included in ProposalResponse concatenated with
     * the endorser's certificate ie, sign(ProposalResponse.payload + endorser)
     * This is encoded in base64 format */
		signature: string | null;
	};
}

export interface EventListenerRequest {
  type: 'block' | 'transaction' | 'chaincode';
  id: string;
}

export interface Signature {
  /** Type can be ASN.1 DER format (der) or concatenated r and s values (raw) */
  type: 'der' | 'raw';
  /** Signature value in base64 format */
  value: string;
}

export interface EventServiceBase64 {
  payload: string;
  signature: Signature;
}

// Declare getter and setter for protobuf protos.Proposal message
// Because protobuf version 6 is no longer use getter and setter
// But fabric-common still use protobuf v5.
declare module './protobuf/fabprotos' {
  namespace protos {
    interface Proposal {
      getHeader(): Uint8Array;
      getPayload(): Uint8Array;
      getExtension(): Uint8Array;
    }
  }

  namespace common {
    interface Header {
      getSignatureHeader(): Uint8Array;
      getChannelHeader(): Uint8Array;
    }
  }
}

declare module 'fabric-common' {

  /** Endorsement action information that is stored inside Endorsement instance */
  interface EndorsementAction {
    /** Proposal Protobuf message */
    proposal: protos.Proposal;
    /** Proposal's header Protobuf message */
    header: common.Header;
  }

  /** Broadcast response received after sent a transaction to orderer */
  interface BroadcastResponse {
    /** Status of the transaction. Can be SUCCESS or else */
    status: 'SUCCESS' | string;
    /** Additional information about the status */
    info: string;
  }

  interface CommitSendRequest {
    /** list of target orderer names, which usually is a hostname of each orderer */
    targets: string[];
    /** service handler used to send the transaction in managed way */
    handler?: ServiceHandler;
    /** the maximum amount of time used to wait for completion */
    requestTimeout?: number;
  }

  /** Request options for sending proposal to target peers */
  interface SendProposalRequest {
    /** list of target peer names, which usually is a hostname of each peer */
    targets: string[];
    /** service handler used to send the proposal in managed way */
    handler?: ServiceHandler;
    /** the maximum amount of time used to wait for completion */
    requestTimeout?: number;
  }

  /** Information of chaincode's invocation function */
  interface BuildProposalRequest {
    /** Name of chaincode invocation function */
    fcn: string;
    /** A list of arguments for the function */
    args: Array<string>;
    /** Transient field */
    transientMap?: {
      [key: string]: Uint8Array;
    };
    /** Indicator whether the function will be inited instead of invoke or not */
    init?: boolean;
  }

  /** Request information for EventService */
  interface StartEventRequest {
    /** List of eventers which are used to connect to peers */
    targets: Eventer[];
    /** The maximum amount of time waiting for completion */
    requestTimeout: number;
  }

  /** Correction of send function's signature for EventService class */
  interface EventService {
    /**
     * Send event service to peers, which will subscribe for listening peer events
     * @param request Request information for event service
     * @returns An empty promise
     */
    send(request: StartEventRequest): Promise<void>;
  }
}
