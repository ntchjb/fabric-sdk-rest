/**
 * 
 */



export enum ASN1Type {
  /**
   * SEQUENCE Identifier
   * 
   * SEQUENCE identifier bits in single byte
   * ---class---    ---primitive/constructed---    ---tag number---
   *     0 0                     1                    1 0 0 0 0
   */
  SEQUENCE = 0x30,
  /**
   * INTEGER Identifier
   * 
   * INTERGER identifier octet (byte)
   * ---class---    ---primitive/constructed---    ---tag number---
   *     0 0                     0                    0 0 0 1 0
   */
  INTEGER = 0x02
}

interface Sequence {
  [key: string]: number | BigInt | string | null | Sequence;
}

interface ASN1Parts {
  identifier: Buffer;
  length: Buffer;
  content: Buffer;
}

/**
 * Sequence definition where key is variable name and
 * value is identifier ID
 */
export interface Definition {
  [fieldName: string]: {
    id: number;
    child?: Definition;
  };
}

export interface RootDefinition {
  root: {
    id: number;
    child?: Definition;
  };
}

const checkASN1Identifier = (data: Buffer, expectedId: number): boolean => {
  // First byte must be expected identifier
  if (data.length < 1) {
    return false
  }
  const id = data[0]
  if (id !== expectedId) {
    return false
  }
  return true
}

const getASN1Parts = (data: Buffer): ASN1Parts | null => {
  if (data.length < 2) {
    return null
  }
  // Check content length which is number of octets
  let contentLength: number = data[1]
  let numBytesOfLength = 1
  // If the first bit of the first byte is 1, that means content length number has more than 1 byte
  if (data[1] >> 7 === 0b1) {
    // Remove the first bit from the first byte to get number of bytes that are reserve by content length number
    numBytesOfLength = (data[1] & 0b01111111) + 1
    // Get content length number in the following byte range
    const contentLengthBuffer = data.slice(2, 2 + numBytesOfLength)
    // Convert byte range to number
    contentLength = contentLengthBuffer.readUInt32BE()
  }
  if (contentLength > data.length) {
    throw new Error("content length is more than data size")
  }
  return {
    identifier: data.slice(0, 1),
    length: data.slice(1, 1 + numBytesOfLength),
    content: data.slice(numBytesOfLength + 1, numBytesOfLength + 1 + contentLength)
  }
}

/**
 * Convert two complement number to unsigned integer
 * This convert negative integer in two complement format to positive unsigned integer e.g. convert from -6 to 6
 * and also convert positive value in unsigned integer to two complement negative integer
 * @param numBytes number in an array of bytes
 */
export const twoComplementConverter = (numBytes: Buffer): void => {
  // Invert all bits
  numBytes.forEach((num, index) => {
    numBytes[index] = ~num
  })
  // plus one to buffer by for loop from least significant to most significant bit
  let carry = true
  for (let i = numBytes.length - 1; i>=0; i-=1) {
    if (carry === true) {
      if (numBytes[i] === 255) {
        numBytes[i] = ~numBytes[i];
        carry = true
      } else {
        numBytes[i] = numBytes[i] + 1
        carry = false
      }
    } else {
      break
    }
  }
}

const parseBigInteger = (data: Buffer): bigint => {
  const contentParts = getASN1Parts(data)
  if (contentParts) {
    if (checkASN1Identifier(contentParts.identifier, ASN1Type.INTEGER) === false) {
      throw new Error('unexpected type of the data. expected integer')
    }
    if(contentParts.content.length > 0) {
      /* 
        Since INTEGER is two complement number, the most significant bit is a sign bit
        indicating whether the number is negative (1) or positive (0)
      */

      // Clone buffer because we need to modify it and don't want to mutate the original
      const numBytes = Buffer.from(contentParts.content)
      // Get sign
      const sign = numBytes[0] >> 7
      let result = 0n
      if (sign === 1) {
        twoComplementConverter(numBytes)
        // Convert to BigInt
        result = BigInt(`0x${numBytes.toString('hex')}`)
      } else {
        result = BigInt(`0x${numBytes.toString('hex')}`)
      }
      return result
    } else {
      return 0n
    }
  } else {
    throw new Error('unable to get ASN.1 parts from the given data')
  }
}

const parseSequence = <T extends object>(data: Buffer, definition: Definition): T => {
  const sequenceParts = getASN1Parts(data)
  if (sequenceParts) {
    if (checkASN1Identifier(sequenceParts.identifier, ASN1Type.SEQUENCE) === false) {
      throw new Error("the data is not an object if SEQUENCE")
    }

    const result: Sequence = {};

    let sequenceContent = sequenceParts.content
    Object.keys(definition).forEach((objName, index) => {
      const parts = getASN1Parts(sequenceContent)
      if(parts) {
        if (definition[objName].id === ASN1Type.INTEGER && checkASN1Identifier(parts.identifier, ASN1Type.INTEGER)) {
          const value = parseBigInteger(sequenceContent)
          result[objName] = value
        } else if (definition[objName].id === ASN1Type.SEQUENCE && checkASN1Identifier(parts.identifier, ASN1Type.SEQUENCE)) {
          const childBP = definition[objName].child
          if (childBP) {
            const value = parseSequence<Sequence>(sequenceContent, childBP)
            result[objName] = value
          }
        } else {
          throw new Error(`the property of the SEQUENCE at no. ${index+1} is not INTEGER.`)
        }
        const currentObjectLength = parts.identifier.length + parts.length.length + parts.content.length
        sequenceContent = sequenceContent.slice(currentObjectLength)
      } else {
        throw new Error('unable to get parts from ASN.1 binary data')
      }
    })


    return result as T
  } else {
    throw new Error('unable to get parts from ASN.1 binary data')
  }
}

const parseRoot = <T>(data: Buffer, definition: RootDefinition): T => {
  const parts = getASN1Parts(data)
  let result: unknown
  if (parts) {
    if (checkASN1Identifier(data, ASN1Type.INTEGER)) {
      result = parseBigInteger(data)
    } else if(checkASN1Identifier(data, ASN1Type.SEQUENCE)) {
      const sequenceDef = definition.root.child
      if(sequenceDef) {
        result = parseSequence(data, sequenceDef)
      }
    }
  }
  return result as T
}


export class ASN1 {
  public static fromDER<T>(data: Buffer, definition: RootDefinition): T {
    return parseRoot<T>(data, definition)
  }
}
