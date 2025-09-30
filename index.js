#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();

// Parse command line arguments
const args = process.argv.slice(2);
let port = process.env.PORT || 3000;
let mocksDir = process.env.MOCKS_DIR;

// Parse CLI arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' || args[i] === '-p') {
    port = parseInt(args[i + 1]) || port;
    i++;
  } else if (args[i] === '--mocks-dir' || args[i] === '-d') {
    mocksDir = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Mocker Server - A powerful mock server with GUI

Usage: mocker [options]

Options:
  -p, --port <number>     Port to run the server on (default: 3000)
  -d, --mocks-dir <path>  Directory to store mock data (default: ./mocks)
  -h, --help              Show this help message

Environment Variables:
  PORT                    Port to run the server on
  MOCKS_DIR              Directory to store mock data

Examples:
  mocker
  mocker --port 8080
  mocker --mocks-dir ./api-mocks
  MOCKS_DIR=./custom-mocks mocker
    `);
    process.exit(0);
  }
}

const PORT = port;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Data storage paths - configurable via environment variables or CLI
const MOCKS_DIR = mocksDir || path.join(process.cwd(), 'mocks');
const ENDPOINTS_DIR = path.join(MOCKS_DIR, 'endpoints');

// Ensure data directories exist
fs.ensureDirSync(MOCKS_DIR);
fs.ensureDirSync(ENDPOINTS_DIR);

// Helper functions
const getEndpointFilePath = (endpointPath, method, statusCode, name) => {
  // Clean the path and create directory structure
  const cleanPath = endpointPath.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
  const pathSegments = cleanPath ? cleanPath.split('/') : [];
  const dirPath = path.join(ENDPOINTS_DIR, ...pathSegments);
  const fileName = `${method.toLowerCase()}.${statusCode}.${name}.json`;
  return path.join(dirPath, fileName);
};

const loadEndpoints = () => {
  try {
    const endpointMap = new Map();
    
    const loadFromDirectory = (dirPath, currentPath = '') => {
      if (!fs.existsSync(dirPath)) return;
      
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Recursively load from subdirectories
          const newPath = currentPath ? `${currentPath}/${item}` : item;
          loadFromDirectory(itemPath, newPath);
        } else if (item.endsWith('.json')) {
          // Check if this is a selected response file
          if (item.endsWith('.selected.json')) {
            const method = item.replace('.selected.json', '').toUpperCase();
            const fullPath = currentPath ? `/${currentPath}` : '';
            
            // Create or update endpoint
            const endpointKey = `${method}|${fullPath}`;
            if (!endpointMap.has(endpointKey)) {
              endpointMap.set(endpointKey, {
                path: fullPath,
                method: method,
                responses: [],
                selectedResponseName: null
              });
            }
            
            try {
              const selectedData = fs.readJsonSync(itemPath);
              const endpoint = endpointMap.get(endpointKey);
              endpoint.selectedResponseName = selectedData.selectedResponseName;
            } catch (e) {
              // Ignore errors reading selected file
            }
          } else {
            // Parse filename: method.statusCode.name.json
            const filename = item.replace('.json', '');
            const parts = filename.split('.');
            
            if (parts.length >= 3) {
              const method = parts[0].toUpperCase();
              const statusCode = parseInt(parts[1]);
              const name = parts.slice(2).join('.');
              const fullPath = currentPath ? `/${currentPath}` : '';
              
              // Load response body
              const responseBody = fs.readJsonSync(itemPath);
              
              // Create or update endpoint
              const endpointKey = `${method}|${fullPath}`;
              if (!endpointMap.has(endpointKey)) {
                endpointMap.set(endpointKey, {
                  path: fullPath,
                  method: method,
                  responses: [],
                  selectedResponseName: null
                });
              }
              
              const endpoint = endpointMap.get(endpointKey);
              endpoint.responses.push({
                name: name,
                statusCode: statusCode,
                body: responseBody,
                isDefault: ['Success', 'Error', 'Empty'].includes(name)
              });
            }
          }
        }
      }
    };
    
    loadFromDirectory(ENDPOINTS_DIR);
    return Array.from(endpointMap.values());
  } catch (error) {
    console.error('Error loading endpoints:', error);
    return [];
  }
};

const saveResponse = (endpointPath, method, statusCode, name, body) => {
  try {
    const filePath = getEndpointFilePath(endpointPath, method, statusCode, name);
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    fs.ensureDirSync(dirPath);
    
    fs.writeJsonSync(filePath, body, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error saving response:', error);
    return false;
  }
};

const deleteResponseFile = (endpointPath, method, statusCode, name) => {
  try {
    const filePath = getEndpointFilePath(endpointPath, method, statusCode, name);
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath);
      
      // Clean up empty directories
      const dirPath = path.dirname(filePath);
      try {
        if (fs.readdirSync(dirPath).length === 0) {
          fs.removeSync(dirPath);
        }
      } catch (e) {
        // Directory not empty or other error, ignore
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting response file:', error);
    return false;
  }
};

const deleteAllEndpointFiles = (endpointPath, method) => {
  try {
    const cleanPath = endpointPath.replace(/^\/+|\/+$/g, '');
    const pathSegments = cleanPath ? cleanPath.split('/') : [];
    const dirPath = path.join(ENDPOINTS_DIR, ...pathSegments);
    
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.startsWith(`${method.toLowerCase()}.`) && file.endsWith('.json')) {
          fs.removeSync(path.join(dirPath, file));
        }
      }
      
      // Clean up empty directory
      try {
        if (fs.readdirSync(dirPath).length === 0) {
          fs.removeSync(dirPath);
        }
      } catch (e) {
        // Directory not empty or other error, ignore
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting endpoint files:', error);
    return false;
  }
};

// API Routes

// Get all endpoints
app.get('/api/endpoints', (req, res) => {
  const endpoints = loadEndpoints();
  // Add ID field for frontend compatibility
  const endpointsWithIds = endpoints.map(endpoint => ({
    ...endpoint,
    id: Buffer.from(`${endpoint.method}|${endpoint.path}`).toString('base64')
  }));
  res.json(endpointsWithIds);
});

// Get single endpoint
app.get('/api/endpoints/:id', (req, res) => {
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  // Add ID field for frontend compatibility
  const endpointWithId = {
    ...endpoint,
    id: Buffer.from(`${endpoint.method}|${endpoint.path}`).toString('base64')
  };
  
  res.json(endpointWithId);
});

// Create new endpoint
app.post('/api/endpoints', (req, res) => {
  const { path, method } = req.body;
  
  if (!path || !method) {
    return res.status(400).json({ error: 'Path and method are required' });
  }
  
  const methodUpper = method.toUpperCase();
  
  // Normalize path - ensure it starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Check if path is reserved for the application
  if (normalizedPath.startsWith('/api/endpoints')) {
    return res.status(400).json({ 
      error: 'Path /api/endpoints is reserved for the application and cannot be used' 
    });
  }
  
  // Check if endpoint with same path and method already exists
  const existingEndpoints = loadEndpoints();
  const existingEndpoint = existingEndpoints.find(ep => 
    ep.path === normalizedPath && ep.method === methodUpper
  );
  
  if (existingEndpoint) {
    return res.status(409).json({ 
      error: `Endpoint with path '${normalizedPath}' and method '${methodUpper}' already exists` 
    });
  }
  
  // Create default response files
  const defaultResponses = [
    { name: 'Success', statusCode: 200, body: { message: 'Success' } },
    { name: 'Error', statusCode: 500, body: { error: 'Internal Server Error' } },
    { name: 'Empty', statusCode: 204, body: null }
  ];
  
  let allSaved = true;
  for (const response of defaultResponses) {
    if (!saveResponse(normalizedPath, methodUpper, response.statusCode, response.name, response.body)) {
      allSaved = false;
      break;
    }
  }
  
  if (allSaved) {
    const newEndpoint = {
      path: normalizedPath,
      method: methodUpper,
      responses: defaultResponses.map(r => ({ ...r, isDefault: true })),
      selectedResponseName: null
    };
    
    // Add ID field for frontend compatibility
    const endpointWithId = {
      ...newEndpoint,
      id: Buffer.from(`${newEndpoint.method}|${newEndpoint.path}`).toString('base64')
    };
    res.json(endpointWithId);
  } else {
    res.status(500).json({ error: 'Failed to save endpoint' });
  }
});

// Update endpoint
app.put('/api/endpoints/:id', (req, res) => {
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  const { path, method } = req.body;
  
  // If path or method changed, we need to move files
  if ((path && path !== endpoint.path) || (method && method.toUpperCase() !== endpoint.method)) {
    // This is a complex operation - for now, return error
    return res.status(400).json({ error: 'Changing endpoint path or method is not supported' });
  }
  
  // For now, just return the existing endpoint
  const endpointWithId = {
    ...endpoint,
    id: Buffer.from(`${endpoint.method}|${endpoint.path}`).toString('base64')
  };
  res.json(endpointWithId);
});

// Delete endpoint
app.delete('/api/endpoints/:id', (req, res) => {
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  if (deleteAllEndpointFiles(endpoint.path, endpoint.method)) {
    res.json({ message: 'Endpoint deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

// Add response to endpoint
app.post('/api/endpoints/:id/responses', (req, res) => {
  const { name, statusCode, body } = req.body;
  
  if (!name || !statusCode) {
    return res.status(400).json({ error: 'Name and status code are required' });
  }
  
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  const newResponse = {
    name,
    statusCode: parseInt(statusCode),
    body: body || null,
    isDefault: false
  };
  
  if (saveResponse(endpoint.path, endpoint.method, newResponse.statusCode, newResponse.name, newResponse.body)) {
    res.json(newResponse);
  } else {
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Update response
app.put('/api/endpoints/:id/responses/:responseName', (req, res) => {
  const { name, statusCode, body } = req.body;
  const responseName = decodeURIComponent(req.params.responseName);
  
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  const response = endpoint.responses.find(r => r.name === responseName);
  
  if (!response) {
    return res.status(404).json({ error: 'Response not found' });
  }
  
  const newName = name || response.name;
  const newStatusCode = statusCode ? parseInt(statusCode) : response.statusCode;
  const newBody = body !== undefined ? body : response.body;
  
  // Delete old file and create new one
  if (deleteResponseFile(endpoint.path, endpoint.method, response.statusCode, response.name) &&
      saveResponse(endpoint.path, endpoint.method, newStatusCode, newName, newBody)) {
    res.json({
      name: newName,
      statusCode: newStatusCode,
      body: newBody,
      isDefault: response.isDefault
    });
  } else {
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Delete response
app.delete('/api/endpoints/:id/responses/:responseName', (req, res) => {
  const responseName = decodeURIComponent(req.params.responseName);
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  const response = endpoint.responses.find(r => r.name === responseName);
  
  if (!response) {
    return res.status(404).json({ error: 'Response not found' });
  }
  
  // Don't allow deletion of default responses
  if (response.isDefault) {
    return res.status(400).json({ error: 'Cannot delete default responses' });
  }
  
  if (deleteResponseFile(endpoint.path, endpoint.method, response.statusCode, response.name)) {
    res.json({ message: 'Response deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// Set selected response for endpoint
app.put('/api/endpoints/:id/select-response', (req, res) => {
  const { responseName } = req.body;
  
  const endpoints = loadEndpoints();
  const endpoint = endpoints.find(ep => Buffer.from(`${ep.method}|${ep.path}`).toString('base64') === req.params.id);
  
  if (!endpoint) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  const response = endpoint.responses.find(r => r.name === responseName);
  
  if (!response) {
    return res.status(404).json({ error: 'Response not found' });
  }
  
  // Save selected response to a special file
  const cleanPath = endpoint.path.replace(/^\/+|\/+$/g, '');
  const pathSegments = cleanPath ? cleanPath.split('/') : [];
  const dirPath = path.join(ENDPOINTS_DIR, ...pathSegments);
  const selectedFile = path.join(dirPath, `${endpoint.method.toLowerCase()}.selected.json`);
  
  try {
    fs.ensureDirSync(dirPath);
    fs.writeJsonSync(selectedFile, { selectedResponseName: responseName }, { spaces: 2 });
    res.json({ message: 'Response selected successfully' });
  } catch (error) {
    console.error('Error saving selected response:', error);
    res.status(500).json({ error: 'Failed to select response' });
  }
});

// Dynamic mock routing - this should be last to catch all routes
app.use((req, res, next) => {
  const endpoints = loadEndpoints();
  const method = req.method.toUpperCase();
  const path = req.path;
  
  // Find matching endpoint
  const endpoint = endpoints.find(ep => {
    // Simple path matching - you could enhance this with regex or more sophisticated matching
    return ep.method === method && ep.path === path;
  });
  
  if (!endpoint) {
    return next(); // Let Express handle 404 for unmatched routes
  }
  
  // Find the selected response or default to first response
  let selectedResponse = endpoint.responses.find(r => r.name === endpoint.selectedResponseName);
  if (!selectedResponse) {
    selectedResponse = endpoint.responses[0];
  }
  
  // Return the mock response
  res.status(selectedResponse.statusCode).json(selectedResponse.body);
});

// Serve the GUI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Mocker Server running on http://localhost:${PORT}`);
  console.log(`📱 GUI available at http://localhost:${PORT}`);
  console.log(`📁 Mocks directory: ${MOCKS_DIR}`);
  console.log(`💡 Use --help for more options`);
});

