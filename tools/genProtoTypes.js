/**
 * Import proto files from fabric-protos and generate static module
 * using protobufjs
 * 
 * Copyright 2020 JAIBOON Nathachai
 */
const path = require('path');
const pbjs = require('protobufjs/cli').pbjs;
const pbts = require('protobufjs/cli').pbts;
const glob = require('glob')
 
/**
 * Get relative proto files' paths from fabric-protos node modules
 */
const getProtoFiles = async () => {
  return new Promise((resolve, reject) => {
    glob('./node_modules/fabric-protos/{protos,google-protos}/**/*.proto', function (err, files) {
      if (err !== null) {
        reject(err);
      }
      resolve(files)
    })
  })
};

/**
 * Generate protobuf static module from fabric-protos
 * @param {string} fabProtoJSPath output file path which is protobuf static module
 * @param {Array<string>} protoFiles list of proto file paths
 */
const generateStaticModule = async (fabProtoJSPath, protoFiles) => {
  return new Promise((resolve, reject) => {
    // note that --keep-case is required because fabric-protos still use underscore variable name, not camelCase.
    pbjs.main([ '--keep-case', '-t', 'static-module', '-w', 'commonjs', '-o', fabProtoJSPath, ...protoFiles ], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 
 * @param {string} fabProtoJSPath input file path for protobuf static module
 * @param {*} fabProtoTSPath the output file path which is TypeScript definition file
 */
const generateTypeScriptDefinition = async (fabProtoJSPath, fabProtoTSPath) => {
  return new Promise((resolve, reject) => {
    pbts.main(['-o', fabProtoTSPath, fabProtoJSPath], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const main = async () => {
  console.log('Collecting proto files from fabric-protos node modules...');
  const protoFiles = await getProtoFiles();
  console.log('Found', protoFiles.length, 'files.');
  const fabProtoJSPath = path.resolve(__dirname, '../src/lib/protobuf/fabprotos.js');
  const fabProtoTSPath = path.resolve(__dirname, '../src/lib/protobuf/fabprotos.d.ts');
  console.log('Generate protobuf\'s static modules file...');
  await generateStaticModule(fabProtoJSPath, protoFiles);
  console.log('Generate TypeScript denifition file based on static module file...');
  await generateTypeScriptDefinition(fabProtoJSPath, fabProtoTSPath);
  console.log('Done.');
};

// Start running the program
main();
