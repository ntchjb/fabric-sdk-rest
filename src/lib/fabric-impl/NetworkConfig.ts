/*
 Copyright 2019 IBM All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0

 This class is reimplemented by JAIBOON Nathachai
 The code is derived from fabric-network library
 as it cannot be imported from the library
 This is also rewritten to use TypeScript
*/

import winston, { format } from 'winston'
import { Client, ConnectOptions } from 'fabric-common'
import fs from 'fs'
import path from 'path'

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ level: 'debug' })
  ],
  format: format.combine(
    format.splat(),
    format.simple(),
  ),
})

interface NetworkConfigData {
  peers: {
    [key: string]: FabricNodeConfig;
  };
  orderers: {
    [key: string]: OrdererConfig;
  };
  channels: ChannelConfig;
  organizations: OrganizationConfig;
}

interface OrganizationConfig {
  [key: string]: {
    peers: Array<string>;
    mspid: string;
  };
}

interface ChannelConfig {
  [key: string]: FabricNodesInChannel;
}

interface FabricNodesInChannel {
    orderers: Array<string>;
    peers: {
      [key: string]: {
        endorsingPeer: boolean;
        chaincodeQuery: boolean;
        ledgerQuery: boolean;
        eventSource: boolean;
        discover: boolean;
      };
    };
}

interface FabricNodeConfig {
  url: string;
  grpcOptions: GRPCOptions;
  tlsCACerts: PEMConfig;
}

interface OrdererConfig extends FabricNodeConfig {
  mspid: string;
}

interface PEMConfig {
  pem?: string;
  path?: string;
}

interface GRPCOptions {
  'requestTimeout'?: number;
  'request-timeout'?: number;
  'ssl-target-name-override'?: string;
  "grpc.max_receive_message_length"?: number;
  "grpc.max_send_message_length"?: number;
  "grpc.keepalive_time_ms"?: number; 
  "grpc.http2.min_time_between_pings_ms"?: number; 
  "grpc.keepalive_timeout_ms"?: number; 
  "grpc.http2.max_pings_without_data"?: number; 
  "grpc.keepalive_permit_without_calls"?: number;
}

function normalizeX509(raw: string): string {
  const regex = /(-----\s*BEGIN ?[^-]+?-----)([\s\S]*)(-----\s*END ?[^-]+?-----)/
  let matches = raw.match(regex)
  if (!matches || matches.length !== 4) {
    throw new Error('Failed to find start line or end line of the certificate.')
  }

  // remove the first element that is the whole match
  matches.shift()
  // remove LF or CR
  matches = matches.map((element) => {
    return element.trim()
  })

  // make sure '-----BEGIN CERTIFICATE-----' and '-----END CERTIFICATE-----' are in their own lines
  // and that it ends in a new line
  let result =  matches.join('\n') + '\n'

  // could be this has multiple certs within
  const regex2 = /----------/
  result = result.replace(new RegExp(regex2, 'g'), '-----\n-----')

  return result
}

function getPEMfromConfig(config: PEMConfig): string | null {
  let result = null
  if (config) {
    if (config.pem) {
      // cert value is directly in the configuration
      result = config.pem
    } else if (config.path) {
      // cert value is in a file
      let data: Buffer
      if (path.isAbsolute(config.path)) {
        data = fs.readFileSync(config.path)
      } else {
        data = fs.readFileSync(path.resolve(process.cwd(), config.path))
      }
      result = Buffer.from(data).toString()
      result = normalizeX509(result)
    }
  }

  return result
}

function buildOptions(endpointConfig: FabricNodeConfig): ConnectOptions {
  const method = 'buildOptions'
  logger.debug(`${method} - start`)
  const options: ConnectOptions = {
    url: endpointConfig.url
  }
  const pem = getPEMfromConfig(endpointConfig.tlsCACerts)
  if (pem) {
    options.pem = pem
  }
  Object.assign(options, endpointConfig.grpcOptions)

  if (options['request-timeout'] && !options.requestTimeout) {
    options.requestTimeout = options['request-timeout']
  }

  return options
}

function findPeerMspid(name: string, config: NetworkConfigData): string | undefined {
  const method = 'findPeerMspid'
  logger.debug('%s - start for %s', method, name)

  let mspid
  here: for (const orgName in config.organizations) {
    const org = config.organizations[orgName]
    for (const peer of org.peers) {
      logger.debug('%s - checking peer %s in org %s', method, peer, orgName)
      if (peer === name) {
        mspid = org.mspid
        logger.debug('%s - found mspid %s for %s', method, mspid, name)
        break here
      }
    }
  }

  return mspid
}

async function buildPeer(client: Client, peerName: string, peerConfig: FabricNodeConfig, config: NetworkConfigData): Promise<void> {
  const method = 'buildPeer'
  logger.debug('%s - start - %s', method, peerName)

  const mspid = findPeerMspid(peerName, config)
  const options = buildOptions(peerConfig)
  const endPoint = client.newEndpoint(options)
  try {
    logger.debug('%s - about to connect to endorser %s url:%s mspid:%s', method, peerName, peerConfig.url, mspid)
    // since this adds to the clients list, no need to save
    const peer = client.getEndorser(peerName, mspid)
    await peer.connect(endPoint)
    logger.debug('%s - connected to endorser %s url:%s', method, peerName, peerConfig.url)
  } catch (error) {
    logger.error('%s - Unable to connect to the endorser %s due to %s', method, peerName, error)
  }
}


function buildChannel(client: Client, channelName: string, channelConfig: FabricNodesInChannel): void {
  const method = 'buildChannel'
  logger.debug('%s - start - %s', method, channelName)

  // this will add the channel to the client instance
  const channel = client.getChannel(channelName)
  if (channelConfig.peers) {
    // using 'in' as peers is an object
    for (const peerName in channelConfig.peers) {
      const peer = client.getEndorser(peerName)
      channel.addEndorser(peer)
      logger.debug('%s - added endorsing peer :: %s', method, peer.name)
    }
  } else {
    logger.debug('%s - no peers in config', method)
  }

  if (channelConfig.orderers) {
    // using 'of' as orderers is an array
    for (const ordererName of channelConfig.orderers) {
      const orderer = client.getCommitter(ordererName)
      channel.addCommitter(orderer)
      logger.debug('%s - added orderer :: %s', method, orderer.name)
    }
  } else {
    logger.debug('%s - no orderers in config', method)
  }

}

async function buildOrderer(client: Client, ordererName: string, ordererConfig: OrdererConfig): Promise<void> {
  const method = 'buildOrderer'
  logger.debug('%s - start - %s', method, ordererName)

  const mspid = ordererConfig.mspid
  const options = buildOptions(ordererConfig)
  const endPoint = client.newEndpoint(options)
  try {
    logger.debug('%s - about to connect to committer %s url:%s mspid:%s', method, ordererName, ordererConfig.url, mspid)
    // since the client saves the orderer, no need to save here
    const orderer = client.getCommitter(ordererName, mspid)
    await orderer.connect(endPoint)
    logger.debug('%s - connected to committer %s url:%s', method, ordererName, ordererConfig.url)
  } catch (error) {
    logger.error('%s - Unable to connect to the committer %s due to %s', method, ordererName, error)
  }
}

/**
 * This is an implementation of the [NetworkConfig]{@link module:api.NetworkConfig} API.
 * It will be used to work with the v1.0.1 version of a JSON based common connection profile.
 * (also known as a network configuration).
 *
 * @class
 */
class NetworkConfig {

  static async loadFromConfig(client: Client, config: NetworkConfigData): Promise<void> {
    const method = 'loadFromConfig'
    logger.debug('%s - start', method)

    // create peers
    if (config.peers) {
      for (const peerName in config.peers) {
        await buildPeer(client, peerName, config.peers[peerName], config)
      }
    }
    // create orderers
    if (config.orderers) {
      for (const ordererName in config.orderers) {
        await buildOrderer(client, ordererName, config.orderers[ordererName])
      }
    }
    // build channels
    if (config.channels) {
      for (const channelName in config.channels) {
        buildChannel(client, channelName, config.channels[channelName])
      }
    }

    logger.debug('%s - end', method)
  }
}

export {
  NetworkConfig,
  NetworkConfigData
}
