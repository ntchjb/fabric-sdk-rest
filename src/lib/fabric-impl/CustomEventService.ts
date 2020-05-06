/**
 * Custom version of EventService class
 *
 * Copyright 2020 JAIBOON Nathachai
 */

import { EventService, Channel } from "fabric-common"

class CustomEventService extends EventService {
  protected _payload: Buffer | null
  constructor(name: string, channel: Channel) {
    super(name, channel)
    this._payload = null
  }

  public setPayload(payload: Buffer): void {
    this._payload = payload
  }
}

export default CustomEventService
