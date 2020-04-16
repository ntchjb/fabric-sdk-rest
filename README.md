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

This is a RESTful server which is a stateless server that provides API to `create` and `send` proposals, transactions, events, etc. THe signature created from any data is performed on client side. That means the client can sign transaction offline. It follows transaction flows of Hyperledger Fabric.

# License

Copyright 2020 [JAIBOON Nathachai](https://github.com/ntchjb)