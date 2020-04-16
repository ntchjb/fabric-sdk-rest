/**
 * This file provides functions to extract useful data from requests
 * 
 * Copyright 2020 JAIBOON Nathachai
 */

import { CommonProperty } from '../interfaces'
import * as config from '../../config.json'

export const getCommonProperties = (reqBody: any): CommonProperty => {
  let certificatePEM: string = '';
  if (reqBody.cert) {
    certificatePEM = Buffer
    .from(reqBody.cert, 'base64')
    .toString('utf8');
  }
  return {
    cert: certificatePEM,
    mspid: reqBody.mspid,
    chaincode: reqBody.chaincode,
    channel: reqBody.channel
  };
}

export { getCommonProperties };