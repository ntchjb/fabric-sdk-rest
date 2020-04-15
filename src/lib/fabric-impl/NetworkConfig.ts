/*
 Copyright 2019 IBM All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0

 This class is reimplemented by JAIBOON Nathachai
 The code is derived from fabric-network library
 as it cannot be imported from the library
 This is also rewritten to use TypeScript
*/

import winston from 'winston';
import { Client, ConnectOptions } from 'fabric-common';
import fs from 'fs';
import path from 'path';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ level: 'debug' })
  ]
});

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
  }
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
  url: string,
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
  'requestTimeout'?: number,
  'request-timeout'?: number,
  'ssl-target-name-override'?: string;
  "grpc.max_receive_message_length"?: number;
  "grpc.max_send_message_length"?: number;
  "grpc.keepalive_time_ms"?: number; 
  "grpc.http2.min_time_between_pings_ms"?: number; 
  "grpc.keepalive_timeout_ms"?: number; 
  "grpc.http2.max_pings_without_data"?: number; 
  "grpc.keepalive_permit_without_calls"?: number;
}

/**
 * This is an implementation of the [NetworkConfig]{@link module:api.NetworkConfig} API.
 * It will be used to work with the v1.0.1 version of a JSON based common connection profile.
 * (also known as a network configuration).
 *
 * @class
 */
class NetworkConfig {

	static async loadFromConfig(client: Client, config: NetworkConfigData) {
		const method = 'loadFromConfig';
		logger.debug('%s - start', method);

		// create peers
		if (config.peers) {
			for (const peer_name in config.peers) {
				await buildPeer(client, peer_name, config.peers[peer_name], config);
			}
		}
		// create orderers
		if (config.orderers) {
			for (const orderer_name in config.orderers) {
				await buildOrderer(client, orderer_name, config.orderers[orderer_name]);
			}
		}
		// build channels
		if (config.channels) {
			for (const channel_name in config.channels) {
				buildChannel(client, channel_name, config.channels[channel_name]);
			}
		}

		logger.debug('%s - end', method);
	}
}

async function buildChannel(client: Client, channel_name: string, channel_config: FabricNodesInChannel, config?: NetworkConfigData) {
	const method = 'buildChannel';
	logger.debug('%s - start - %s', method, channel_name);

	// this will add the channel to the client instance
	const channel = client.getChannel(channel_name);
	if (channel_config.peers) {
		// using 'in' as peers is an object
		for (const peer_name in channel_config.peers) {
			const peer = client.getEndorser(peer_name);
			channel.addEndorser(peer);
			logger.debug('%s - added endorsing peer :: %s', method, peer.name);
		}
	} else {
		logger.debug('%s - no peers in config', method);
	}

	if (channel_config.orderers) {
		// using 'of' as orderers is an array
		for (const orderer_name of channel_config.orderers) {
			const orderer = client.getCommitter(orderer_name);
			channel.addCommitter(orderer);
			logger.debug('%s - added orderer :: %s', method, orderer.name);
		}
	} else {
		logger.debug('%s - no orderers in config', method);
	}

}

async function buildOrderer(client: Client, orderer_name: string, orderer_config: OrdererConfig) {
	const method = 'buildOrderer';
	logger.debug('%s - start - %s', method, orderer_name);

	const mspid = orderer_config.mspid;
	const options = buildOptions(orderer_config);
	const end_point = client.newEndpoint(options);
	try {
		logger.debug('%s - about to connect to committer %s url:%s mspid:%s', method, orderer_name, orderer_config.url, mspid);
		// since the client saves the orderer, no need to save here
		const orderer = client.getCommitter(orderer_name, mspid);
		await orderer.connect(end_point);
		logger.debug('%s - connected to committer %s url:%s', method, orderer_name, orderer_config.url);
	} catch (error) {
		logger.error('%s - Unable to connect to the committer %s due to %s', method, orderer_name, error);
	}
}

async function buildPeer(client: Client, peer_name: string, peer_config: FabricNodeConfig, config: NetworkConfigData) {
	const method = 'buildPeer';
	logger.debug('%s - start - %s', method, peer_name);

	const mspid = findPeerMspid(peer_name, config);
	const options = buildOptions(peer_config);
	const end_point = client.newEndpoint(options);
	try {
		logger.debug('%s - about to connect to endorser %s url:%s mspid:%s', method, peer_name, peer_config.url, mspid);
		// since this adds to the clients list, no need to save
		const peer = client.getEndorser(peer_name, mspid);
		await peer.connect(end_point);
		logger.debug('%s - connected to endorser %s url:%s', method, peer_name, peer_config.url);
	} catch (error) {
		logger.error('%s - Unable to connect to the endorser %s due to %s', method, peer_name, error);
	}
}

function findPeerMspid(name: string, config: NetworkConfigData) {
	const method = 'findPeerMspid';
	logger.debug('%s - start for %s', method, name);

	let mspid;
	here: for (const org_name in config.organizations) {
		const org = config.organizations[org_name];
		for (const peer of org.peers) {
			logger.debug('%s - checking peer %s in org %s', method, peer, org_name);
			if (peer === name) {
				mspid = org.mspid;
				logger.debug('%s - found mspid %s for %s', method, mspid, name);
				break here;
			}
		}
	}

	return mspid;
}

function buildOptions(endpoint_config: FabricNodeConfig): ConnectOptions {
	const method = 'buildOptions';
	logger.debug(`${method} - start`);
	const options: ConnectOptions = {
    url: endpoint_config.url,
	};
	const pem = getPEMfromConfig(endpoint_config.tlsCACerts);
	if (pem) {
		options.pem = pem;
	}
	Object.assign(options, endpoint_config.grpcOptions);

	if (options['request-timeout'] && !options.requestTimeout) {
		options.requestTimeout = options['request-timeout'];
	}

	return options;
}

function getPEMfromConfig(config: PEMConfig) {
	let result = null;
	if (config) {
		if (config.pem) {
			// cert value is directly in the configuration
			result = config.pem;
		} else if (config.path) {
			// cert value is in a file
			let data: Buffer;
			if (path.isAbsolute(config.path)) {
				data = fs.readFileSync(config.path);
			} else {
				data = fs.readFileSync(path.resolve(process.cwd(), config.path));
			}
			result = Buffer.from(data).toString();
			result = normalizeX509(result);
		}
	}

	return result;
}

function normalizeX509(raw: string): string {
	const regex = /(-----\s*BEGIN ?[^-]+?-----)([\s\S]*)(-----\s*END ?[^-]+?-----)/;
	let matches = raw.match(regex);
	if (!matches || matches.length !== 4) {
		throw new Error('Failed to find start line or end line of the certificate.');
	}

	// remove the first element that is the whole match
	matches.shift();
	// remove LF or CR
	matches = matches.map((element) => {
		return element.trim();
	});

	// make sure '-----BEGIN CERTIFICATE-----' and '-----END CERTIFICATE-----' are in their own lines
	// and that it ends in a new line
	let result =  matches.join('\n') + '\n';

	// could be this has multiple certs within
	const regex2 = /----------/;
	result = result.replace(new RegExp(regex2, 'g'), '-----\n-----');

	return result;
};

export {
	NetworkConfig,
	NetworkConfigData,
};
