import { Commit, Channel, Endorsement } from 'fabric-common';

class CustomCommit extends Commit {
  protected _payload: Buffer | null

  constructor(chaincodeName: string, channel: Channel, endorsement?: Endorsement) {
    if (endorsement) {
      super(chaincodeName, channel, endorsement);
    } else {
      super(chaincodeName, channel, channel.newEndorsement(chaincodeName));
    }
    this._payload = null;
  }

  public setPayload(payload: Buffer) {
    this._payload = payload;
  }
}

export default CustomCommit;
