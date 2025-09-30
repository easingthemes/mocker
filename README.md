# Mocker Server

Simple Node.js mock server with a beautiful GUI for managing API endpoints and responses. Perfect for development, testing, and prototyping.

## Features

- 🎨 **Beautiful GUI** - Intuitive web interface for managing endpoints
- 🚀 **Easy Setup** - Start mocking APIs in seconds
- 📁 **File-based Storage** - All data stored in organized JSON files
- 🔄 **Real-time Testing** - Test endpoints directly from the GUI
- 📊 **Status Code Management** - Pre-configured dropdown with common HTTP status codes
- 🎯 **Path-based Organization** - Automatic folder structure based on API paths
- ✨ **JSON Validation** - Real-time validation with helpful error messages
- 🔒 **Reserved Path Protection** - Prevents conflicts with internal API routes

## Installation

### Global Installation (Recommended)
```bash
npm install -g @draganfilipovic/mocker
```

### Local Installation
```bash
npm install @draganfilipovic/mocker
```

## Quick Start

### Using the CLI
```bash
# Start the server (uses ./mocks directory by default)
mocker

# Or specify a custom directory
MOCKS_DIR=/path/to/your/mocks mocker

# Or set a custom port
PORT=8080 mocker
```

### Using as a Module
```javascript
const mocker = require('@draganfilipovic/mocker');

// Start the server programmatically
mocker.start({
  port: 3000,
  mocksDir: './custom-mocks'
});
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `MOCKS_DIR` - Directory to store mock data (default: `./mocks`)

### Example Usage

```bash
# Custom port and directory
PORT=8080 MOCKS_DIR=./api-mocks mocker

# Or using npx
npx mocker-server --port 8080 --mocks-dir ./api-mocks
```

## Directory Structure

The server automatically creates the following structure:

```
your-project/
├── mocks/                    # Default mocks directory
│   └── endpoints/
│       └── api/              # Based on your API paths
│           └── users/
│               ├── get.200.Success.json
│               ├── get.404.Error.json
│               ├── post.201.Created.json
│               └── get.selected.json
└── your-other-files...
```

## API Endpoints

### Management API
- `GET /api/endpoints` - List all endpoints
- `POST /api/endpoints` - Create new endpoint
- `GET /api/endpoints/:id` - Get specific endpoint
- `PUT /api/endpoints/:id` - Update endpoint
- `DELETE /api/endpoints/:id` - Delete endpoint

### Response Management
- `POST /api/endpoints/:id/responses` - Add response
- `PUT /api/endpoints/:id/responses/:name` - Update response
- `DELETE /api/endpoints/:id/responses/:name` - Delete response
- `PUT /api/endpoints/:id/select-response` - Select active response

### Mock API
- `ALL /your-endpoint-path` - Returns the selected mock response

## GUI Features

### Endpoint Management
- Create endpoints with path and HTTP method
- Visual status indicators for each response
- One-click endpoint testing
- Delete endpoints with confirmation

### Response Management
- Add custom responses with JSON bodies
- Pre-configured status code dropdown (20 most common codes)
- Real-time JSON validation
- Select active response per endpoint
- Edit and delete responses

### Testing
- Click endpoint URLs to open in new tab
- Built-in test button with response preview
- Real-time response display

## File Format

### Response Files
Files are named: `{method}.{statusCode}.{name}.json`

Example: `get.200.Success.json`
```json
{
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Selection Files
Files are named: `{method}.selected.json`

Example: `get.selected.json`
```json
{
  "selectedResponseName": "Success"
}
```

## Development

### Running from Source
```bash
git clone https://github.com/easingthemes/mocker.git
cd mocker
npm install
npm start
```

### Building
```bash
npm run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/easingthemes/mocker/issues)

## Changelog

### v1.0.0
- Initial release
- GUI for endpoint management
- File-based storage
- Real-time JSON validation
- Status code dropdown
- Path-based organization
- Reserved path protection

---

Made with ❤️ for developers who love clean, efficient mock servers.

(Actually made with Cursor AI)
