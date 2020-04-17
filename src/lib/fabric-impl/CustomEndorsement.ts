/**
 * CustomEndorsement is the extension of Endorsement object
 * that provide function to manually set payload to it
 * so that the server doesn't need to remember the endorsement object
 * after built the proposal.
 * 
 * Copyright 2020 JAIBOON Nathachai
 */
import { Endorsement, Channel, EndorsementResponse, EndorsementAction } from 'fabric-common';
import fabprotos from '../protobuf/fabprotos.js';

const TYPE = 'Endorsement';


fabprotos.protos.Proposal.prototype['getHeader'] = function(): Uint8Array {
  return this.header;
};
fabprotos.protos.Proposal.prototype['getPayload'] = function(): Uint8Array {
  return this.payload;
};
fabprotos.protos.Proposal.prototype['getExtension'] = function(): Uint8Array {
  return this.extension;
};
fabprotos.common.Header.prototype['getSignatureHeader'] = function(): Uint8Array {
  return this.signature_header;
};
fabprotos.common.Header.prototype['getChannelHeader'] = function(): Uint8Array {
  return this.channel_header;
};


class CustomEndorsement extends Endorsement {
  protected type: string
  protected _payload: Buffer | null
  protected _proposalResponses: EndorsementResponse[] | null
  protected _action: EndorsementAction | null

  constructor(chaincodeId: string, channel: Channel) {
		super(chaincodeId, channel);
    this.type = TYPE;
    this._payload = null;
    this._proposalResponses = null;
    this._action = null;
  }

  public setPayload(payload: Buffer) {
    const proposal = fabprotos.protos.Proposal.decode(payload);
    const header = fabprotos.common.Header.decode(proposal.header);
    this._action = {
      header,
      proposal
    };
    this._payload = payload;
  }

  public setResponses(responses: EndorsementResponse[]) {
    this._proposalResponses = responses;
  }
  
}

export default CustomEndorsement