# fabric-sdk-rest
RESTful server providing REST API which follows transaction flow of Hyperledger Fabric. It helps clients be able to send proposals and transactions to Fabric network

This project is currently based on Fabric Node.js SDK version 2.0 beta 4. Therefore, it may not be stable enough to be used in production.

# Setup

1. Run `npm install` to install dependencies
2. Run `npm run gen:protos` to generate static module file representing Hyperledger Fabric protobuf module
3. Configure `ccp.json` file. Code editor or IDE may be used to edit the file to get benefit of JSON scheme autocomplete.
4. Put peers and orderer's TLS CA cert files to somewhere or put to `cert` folder.
5. run `npm run tsc` to compile the project into JavaScript code. They can be found in `build` folder.
6. run `npm run serve` to start the server.
7. The server is now running. Yay!

# The Design

This is a RESTful server which is a stateless server that provides API to `create` and `send` proposals, transactions, events, etc. THe signature that is created from any data is performed on client side. That means the client can sign data offline using their private key. The API follows transaction flows of Hyperledger Fabric.

# The implementations

`fabric-common` is used to create, build, sign, and send all types of data (e.g. proposal, transaction, event service, etc.). Since the RESTful server is designed to be stateless. that means it doesn't store any client data on server-side. However, when we want to send binary data along with its signature, its API does not allow to set binary data directly into their class. For example, setting proposal bytes directly into Endorsement class. In order to create proposal in binary data for signature creation, we need to rebuild the endorsement again via `endorsement.build()` which change the endorsement data and make the existing signature invalid. (e.g. transaction ID is changed every time when re-building endorsement). Our solution is to extend the class and add the method that receive the binary data and override the data to class's field. I personally think that this is just a dirty fix, and it would be great that these class will allow to set binary data directly into the class in the future version.

# License

Copyright 2020 © [JAIBOON Nathachai](https://github.com/ntchjb)
