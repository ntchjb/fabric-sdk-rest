/**
 * CustomEndorsement is the extension of Endorsement object
 * that provide function to manually set payload to it
 * so that the server doesn't need to remember the endorsement object
 * because client will send payload to it
 * 
 * Copyright 2020 JAIBOON Nathachai
 */
import { Endorsement, Channel } from 'fabric-common';

const TYPE = 'Endorsement';

class CustomEndorsement extends Endorsement {
  protected type: string
  protected _payload: Buffer | null
  constructor(chaincodeId: string, channel: Channel) {
		super(chaincodeId, channel);
    this.type = TYPE;
    this._payload = null;
  }

  setPayload(payload: Buffer) {
    this._payload = payload;
  }
}

export default CustomEndorsement