// Example configuration for mocker-server
// This file shows how to configure the server programmatically

const mocker = require('./index.js');

// Configuration options
const config = {
  port: 3000,
  mocksDir: './mocks',
  cors: true,
  staticFiles: './public'
};

// Start the server
console.log('Starting Mocker Server with custom configuration...');
console.log('Config:', config);

// Note: This is just an example. The actual implementation
// would need to be modified to support programmatic configuration
