/**
 * ECDSASignature class represents an ECDSA signature which help convert
 * the signature between r, s numbers and ASN.1 DER encoded binary data
 * 
 * ASN.1 (X.680) is a schema used to encode/decode data and send through serial communication.
 * DER (X.690) encoding rules is a subset of BER with stricter encoding rules which eliminate alternative rules from BER
 * DER is one of the encoding that commonly used in cryptography e.g. X.509 certificate, signature
 */

import { RootDefinition, ASN1Type, ASN1, twoComplementConverter } from "./asn1"

interface ECDSAValue {
  r: bigint;
  s: bigint;
}

export class ECDSASignature {
  private value: ECDSAValue

  /**
   * Recommended elliptic curve 'n' parameter for secp256r1
   */
  private readonly P256N = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551')
  /**
   * Recommended elliptic curve 'n' parameter for secp384r1
   */
  private readonly P384N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973')
  /**
   * Recommended elliptic curve 'n' parameter for secp521r1
   */
  private readonly P521N = BigInt('0x01FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409')

  /**
   * Constructor
   */
  public constructor() {
    this.value = {
      r: 0n,
      s: 0n
    }
  }

  public toObject(): ECDSAValue {
    return this.value
  }

  public fromObject(signature: ECDSAValue): void {
    this.value = signature
  }

  private getBufferFromBigInt(data: bigint): Buffer {
    let hexString = data.toString(16)
    if (data < 0n) {
      // remove minus sign from string
      hexString = hexString.slice(1)
    }
    // If number of digit in bigint is odd, then add leading zero to make it even
    // because number should be big endian which the least significant bit is on the right side
    if (hexString.length % 2 === 1) {
      hexString = `0${hexString}`
    }
    let numBytes = Buffer.from(hexString, 'hex')
    if (data < 0n) {
      twoComplementConverter(numBytes)
      return numBytes
    } else {
      // If the number is positive but most significant bit is still one
      // then, we need to prepend an empty byte to the buffer
      // so that the most significant bit is represented as positive
      if (numBytes[0] >> 7 === 1) {
        numBytes = Buffer.concat([Buffer.from([0]), numBytes])
      }
      return numBytes
    }
  }

  public toDER(): Buffer {
    const r = this.getBufferFromBigInt(this.value.r)
    const s = this.getBufferFromBigInt(this.value.s)

    // Define identifier and content length
    let rInteger = Buffer.alloc(2)
    let sInteger = Buffer.alloc(2)
    rInteger.writeUInt8(ASN1Type.INTEGER)
    sInteger.writeUInt8(ASN1Type.INTEGER)
    rInteger.writeUInt8(r.length, 1)
    sInteger.writeUInt8(s.length, 1)

    // concatenate identifier, content length, and content together
    rInteger = Buffer.concat([rInteger, r])
    sInteger = Buffer.concat([sInteger, s])

    // Now, create SEQUENCE object from R and S integer
    let result = Buffer.alloc(2)
    const sequenceLength = rInteger.length + sInteger.length
    result.writeUInt8(ASN1Type.SEQUENCE)
    result.writeUInt8(sequenceLength, 1)

    result = Buffer.concat([result, rInteger, sInteger])
    return result
  }

  public fromDER(signature: Buffer): void {
    const def: RootDefinition = {
      root: {
        id: ASN1Type.SEQUENCE,
        child: {
          r: { id: ASN1Type.INTEGER },
          s: { id: ASN1Type.INTEGER }
        }
      }
    }
    this.value = ASN1.fromDER(signature, def)
  }

  public lowerS(): void {
    /* If 's' value is lower than the half of order value 'n'
       then set the s value to n - s
    */
    if (this.value.s < this.P256N) {
      // Shift bits in s value to the right 1 time
      if (this.value.s > (this.P256N >> BigInt(1))) {
        this.value.s = this.P256N - this.value.s
      }
    } else if (this.value.s < this.P384N) {
      if (this.value.s > (this.P384N >> BigInt(1))) {
        this.value.s = this.P384N - this.value.s
      }
    } else if (this.value.s < this.P521N) {
      if (this.value.s > (this.P521N >> BigInt(1))) {
        this.value.s = this.P521N - this.value.s
      }
    }
  }
}
