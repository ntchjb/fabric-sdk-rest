/**
 * This file provides functions to extract useful data from requests
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import { CommonProperty } from '../interfaces'
import * as config from '../../config.json'

const getCommonProperties = (reqBody: any): CommonProperty => {
  const certificatePEM: string = Buffer
    .from(reqBody.cert, 'base64')
    .toString('utf8');
  return {
    cert: certificatePEM,
    mspid: config.mspid,
    chaincode: config.chaincode,
    channel: config.channel
  };
}

export { getCommonProperties };