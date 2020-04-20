/**
 * FabricClient is the singleton class that manage a single instance of Fabric Client
 * 
 * Copyright 2020 JAIBOON Nathachai
 */
import { Client } from 'fabric-common'

class FabricClient {
  private static client: Client

  public static getInstance(): Client {
    if (!FabricClient.client) {
      FabricClient.client = new Client('fabricclient')
      // Set dummy mutual TLS to prevent from error building endorsement
      // otherwise, it is unable to add cert hash to the header of the endorsement
      FabricClient.client.setTlsClientCertAndKey('', '')
    }

    return FabricClient.client
  }
}

export default FabricClient
