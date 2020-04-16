/*
  Copyright 2017, 2018 IBM All Rights Reserved.

  SPDX-License-Identifier: Apache-2.0

*/

/**
 * The utility to sign a content imported from content.txt and output as the signature
 * in base64 format
 * 
 * Created by JAIBOON Nathachai
 * Code derived from https://github.com/hyperledger/fabric-sdk-node
 */
const elliptic = require('elliptic');
const { KEYUTIL } = require('jsrsasign');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// this ordersForCurve comes from CryptoSuite_ECDSA_AES.js and will be part of the
// stand alone fabric-sig package in future.
const ordersForCurve = {
  secp256r1: {
    halfOrder: elliptic.curves.p256.n.shrn(1),
    order: elliptic.curves.p256.n,
  },
  secp384r1: {
    halfOrder: elliptic.curves.p384.n.shrn(1),
    order: elliptic.curves.p384.n,
  },
};

// this function comes from CryptoSuite_ECDSA_AES.js and will be part of the
// stand alone fabric-sig package in future.
function preventMalleability(sig, curveParams) {
  const resultSig = sig;
  const { halfOrder } = ordersForCurve[curveParams.name];
  if (!halfOrder) {
    throw new Error(`Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: ${curveParams.name}`);
  }

  // in order to guarantee 's' falls in the lower range of the order, as explained,
  // in the above link first see if 's' is larger than half of the order, if so,
  // it needs to be specially treated.
  if (resultSig.s.cmp(halfOrder) === 1) { // module 'bn.js', file lib/bn.js, method cmp()
    // convert from BigInteger used by jsrsasign Key objects and bn.js used by
    // elliptic Signature objects
    const bigNum = ordersForCurve[curveParams.name].order;
    resultSig.s = bigNum.sub(resultSig.s);
  }

  return sig;
}

// Read private key file and base64-encoded file from 'samples' folder.
const privateKeyPEM = fs.readFileSync(path.resolve(__dirname, './samples/priv_sk'), { encoding: 'utf8' });
const contentBase64 = fs.readFileSync(path.resolve(__dirname, './samples/content.txt'), { encoding: 'utf8' });
const key = KEYUTIL.getKey(privateKeyPEM); // convert the pem encoded key to hex encoded private key

// Load content
const content = Buffer.from(contentBase64, 'base64');

// Load private key
const EC = elliptic.ec;
const ecdsaCurve = elliptic.curves.p256;
const ecdsa = new EC(ecdsaCurve);
const signKey = ecdsa.keyFromPrivate(key.prvKeyHex, 'hex');

// Create hash from the content
const sha256 = crypto.createHash('sha256');
const hashValue = sha256.update(content).digest();

console.log(`digest: ${hashValue.toString('hex')}`);

// Sign the content with pervention of malleability
let sig = ecdsa.sign(hashValue, signKey);
sig = preventMalleability(sig, key.ecparams);

// Convert the signature to DER format and encode it to bas64
const signature = Buffer.from(sig.toDER());
console.log(signature.toString('base64'));
