/**
 * FabricClient is the singleton class that manage a single instance of Fabric Client
 * 
 * Copyright 2020 JAIBOON Nathachai
 */
import { Client } from 'fabric-common';

class FabricClient {
  private static client: Client

  private constructor() {}

  public static getInstance(): Client {
    if (!FabricClient.client) {
      FabricClient.client = new Client('fabricclient');
    }

    return FabricClient.client;
  }
}

export default FabricClient
