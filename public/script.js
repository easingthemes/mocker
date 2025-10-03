let endpoints = [];
let selectedEndpointId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadEndpoints();
    setupEventListeners();
});

function setupEventListeners() {
    // Add endpoint form
    document.getElementById('addEndpointForm').addEventListener('submit', handleAddEndpoint);
    
    // Add response form
    document.getElementById('addResponseForm').addEventListener('submit', handleAddResponse);
    
    // Edit response form
    document.getElementById('editResponseForm').addEventListener('submit', handleEditResponse);
    
    // Real-time JSON validation
    document.getElementById('responseBody').addEventListener('input', function() {
        validateJsonInput('responseBody', 'responseBodyValidation');
    });
    
    document.getElementById('editResponseBody').addEventListener('input', function() {
        validateJsonInput('editResponseBody', 'editResponseBodyValidation');
    });
}

// Load all endpoints
async function loadEndpoints() {
    try {
        const response = await fetch('/api/endpoints');
        endpoints = await response.json();
        renderEndpointList();
    } catch (error) {
        console.error('Error loading endpoints:', error);
        showError('Failed to load endpoints');
    }
}

// Get selected response code for an endpoint
function getSelectedResponseCode(endpoint) {
    if (!endpoint.selectedResponseName || !endpoint.responses) return '';
    const selectedResponse = endpoint.responses.find(r => r.name === endpoint.selectedResponseName);
    return selectedResponse ? selectedResponse.statusCode : '';
}

// Get status color for a status code
function getStatusColor(statusCode) {
    const statusColors = {
        200: '#48bb78', 201: '#48bb78', 204: '#4299e1',
        400: '#ed8936', 401: '#ed8936', 403: '#ed8936',
        404: '#f56565', 500: '#f56565'
    };
    return statusColors[statusCode] || '#718096';
}

// Escape HTML to prevent rendering
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render endpoint list
function renderEndpointList() {
    const container = document.getElementById('endpointList');
    
    if (endpoints.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No endpoints</h3><p>Create your first endpoint to get started</p></div>';
        return;
    }

    container.innerHTML = endpoints.map(endpoint => `
        <div class="endpoint-item ${selectedEndpointId === endpoint.id ? 'active' : ''}" 
             onclick="selectEndpoint('${endpoint.id}')">
            <div>
                <span class="endpoint-method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                <span class="endpoint-path">${endpoint.path}</span>
            </div>
            <div class="endpoint-status">
                <span class="status-label">Selected:</span>
                <span class="status-value">${endpoint.selectedResponseName || 'None'}</span>
                ${endpoint.selectedResponseName ? `<span class="status-code" style="color: ${getStatusColor(getSelectedResponseCode(endpoint))};">(${getSelectedResponseCode(endpoint)})</span>` : ''}
            </div>
        </div>
    `).join('');
}

// Select endpoint
async function selectEndpoint(endpointId) {
    selectedEndpointId = endpointId;
    renderEndpointList();
    
    try {
        const response = await fetch(`/api/endpoints/${endpointId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const endpoint = await response.json();
        
        // Ensure endpoint has required properties
        if (!endpoint.responses) {
            endpoint.responses = [];
        }
        if (!endpoint.selectedResponseName) {
            endpoint.selectedResponseName = null;
        }
        
        renderEndpointDetails(endpoint);
    } catch (error) {
        console.error('Error loading endpoint details:', error);
        showError('Failed to load endpoint details');
    }
}

// Test endpoint
async function testEndpoint(endpointId) {
    const resultDiv = document.getElementById(`testResult-${endpointId}`);
    if (!resultDiv) return;
    
    // Show loading state
    resultDiv.style.display = 'block';
    resultDiv.style.background = '#f7fafc';
    resultDiv.style.border = '1px solid #e2e8f0';
    resultDiv.style.color = '#4a5568';
    resultDiv.innerHTML = 'Testing endpoint...';
    
    try {
        // Get endpoint details to find the path and method
        const endpointResponse = await fetch(`/api/endpoints/${endpointId}`);
        if (!endpointResponse.ok) {
            throw new Error(`Failed to get endpoint details: ${endpointResponse.status}`);
        }
        
        const endpoint = await endpointResponse.json();
        const testUrl = `${window.location.origin}${endpoint.path}`;
        
        // Make the test request with the correct method
        const testResponse = await fetch(testUrl, {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const responseText = await testResponse.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = responseText;
        }
        
        // Display results
        resultDiv.style.background = testResponse.ok ? '#c6f6d5' : '#fed7d7';
        resultDiv.style.border = testResponse.ok ? '1px solid #9ae6b4' : '1px solid #feb2b2';
        resultDiv.style.color = testResponse.ok ? '#2f855a' : '#c53030';
        
        resultDiv.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: 600;">
                Status: ${testResponse.status} ${testResponse.statusText}
            </div>
            <div style="margin-bottom: 8px;">
                <strong>Response:</strong>
            </div>
            <pre style="margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px;">${escapeHtml(JSON.stringify(responseData, null, 2))}</pre>
        `;
        
    } catch (error) {
        console.error('Error testing endpoint:', error);
        resultDiv.style.background = '#fed7d7';
        resultDiv.style.border = '1px solid #feb2b2';
        resultDiv.style.color = '#c53030';
        resultDiv.innerHTML = `Error: ${error.message}`;
    }
}

// Render endpoint details
function renderEndpointDetails(endpoint) {
    const container = document.getElementById('endpointDetails');
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${endpoint.path}`;
    
    container.innerHTML = `
        <div class="section-title">${endpoint.method} ${endpoint.path}</div>
        
        <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #718096; margin-bottom: 5px; font-weight: 500;">ENDPOINT URL</div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <a href="${fullUrl}" target="_blank" style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 14px; color: #667eea; word-break: break-all; text-decoration: none; padding: 5px; border-radius: 4px; transition: all 0.3s ease; flex: 1;" 
                   onmouseover="this.style.background='#edf2f7'; this.style.color='#4a5568';" 
                   onmouseout="this.style.background='transparent'; this.style.color='#667eea';">
                    ${fullUrl}
                </a>
                <button class="btn btn-small" onclick="testEndpoint('${endpoint.id}')" style="white-space: nowrap;">Test</button>
            </div>
            <div id="testResult-${endpoint.id}" style="display: none; margin-top: 10px; padding: 10px; border-radius: 4px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 12px;"></div>
        </div>
        
        
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
            <button class="btn" onclick="openAddResponseModal()">+ Add Response</button>
            <button class="btn btn-danger" onclick="deleteEndpoint('${endpoint.id}')">Delete Endpoint</button>
        </div>
        
        <div class="response-list">
            ${(endpoint.responses || []).map(response => `
                <div class="response-item ${(endpoint.selectedResponseName || '') === response.name ? 'selected' : ''}">
                    <div class="response-header">
                        <div>
                            <div class="response-name">${response.name}</div>
                            <div style="margin-top: 5px;">
                                <span class="status-indicator status-${response.statusCode}"></span>
                                <span style="font-size: 12px; color: ${(endpoint.selectedResponseName || '') === response.name ? 'rgba(255,255,255,0.8)' : '#718096'};">Status ${response.statusCode}</span>
                            </div>
                        </div>
                        <div class="response-actions">
                            <button class="btn btn-small ${(endpoint.selectedResponseName || '') === response.name ? 'btn-secondary' : ''}" 
                                    onclick="selectResponse('${endpoint.id || ''}', '${response.name}')">
                                ${(endpoint.selectedResponseName || '') === response.name ? 'Selected' : 'Select'}
                            </button>
                            <button class="btn btn-small btn-secondary" 
                                    onclick="editResponse('${endpoint.id || ''}', '${response.name}')">
                                Edit
                            </button>
                            ${!response.isDefault ? `
                                <button class="btn btn-small btn-danger" 
                                        onclick="deleteResponse('${endpoint.id || ''}', '${response.name}')">
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <pre style="background: ${(endpoint.selectedResponseName || '') === response.name ? 'rgba(255,255,255,0.1)' : '#f7fafc'}; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; max-height: 200px; overflow-y: auto; color: ${(endpoint.selectedResponseName || '') === response.name ? 'white' : 'inherit'}; white-space: pre-wrap; word-break: break-word;">${escapeHtml(JSON.stringify(response.body, null, 2))}</pre>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Modal functions
function openAddEndpointModal() {
    document.getElementById('addEndpointModal').style.display = 'block';
}

function openAddResponseModal() {
    document.getElementById('addResponseModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Reset forms
    if (modalId === 'addEndpointModal') {
        document.getElementById('addEndpointForm').reset();
    } else if (modalId === 'addResponseModal') {
        document.getElementById('addResponseForm').reset();
    }
}

// Handle add endpoint
async function handleAddEndpoint(e) {
    e.preventDefault();
    
    const formData = {
        path: document.getElementById('endpointPath').value,
        method: document.getElementById('endpointMethod').value
    };

    try {
        const response = await fetch('/api/endpoints', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            await loadEndpoints();
            closeModal('addEndpointModal');
            showSuccess('Endpoint created successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to create endpoint');
        }
    } catch (error) {
        console.error('Error creating endpoint:', error);
        showError('Failed to create endpoint');
    }
}

// Handle add response
async function handleAddResponse(e) {
    e.preventDefault();
    
    // Validate JSON before proceeding
    if (!validateJsonInput('responseBody', 'responseBodyValidation')) {
        showError('Please fix the JSON syntax errors before submitting.');
        return;
    }
    
    try {
        const formData = {
            name: document.getElementById('responseName').value,
            statusCode: parseInt(document.getElementById('responseStatusCode').value),
            body: parseJsonSafely(document.getElementById('responseBody').value)
        };

        const response = await fetch(`/api/endpoints/${selectedEndpointId}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            await loadEndpoints();
            selectEndpoint(selectedEndpointId);
            closeModal('addResponseModal');
            showSuccess('Response added successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to add response');
        }
    } catch (error) {
        console.error('Error adding response:', error);
        if (error.message === 'Invalid JSON format') {
            showError('Invalid JSON format in response body. Please check your JSON syntax.');
        } else {
            showError('Failed to add response');
        }
    }
}

// Handle edit response
async function handleEditResponse(e) {
    e.preventDefault();
    
    // Validate JSON before proceeding
    if (!validateJsonInput('editResponseBody', 'editResponseBodyValidation')) {
        showError('Please fix the JSON syntax errors before submitting.');
        return;
    }
    
    try {
        const originalName = document.getElementById('editResponseOriginalName').value;
        const formData = {
            name: document.getElementById('editResponseName').value,
            statusCode: parseInt(document.getElementById('editResponseStatusCode').value),
            body: parseJsonSafely(document.getElementById('editResponseBody').value)
        };

        const response = await fetch(`/api/endpoints/${selectedEndpointId}/responses/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            await loadEndpoints();
            selectEndpoint(selectedEndpointId);
            closeModal('editResponseModal');
            showSuccess('Response updated successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update response');
        }
    } catch (error) {
        console.error('Error updating response:', error);
        if (error.message === 'Invalid JSON format') {
            showError('Invalid JSON format in response body. Please check your JSON syntax.');
        } else {
            showError('Failed to update response');
        }
    }
}

// Select response
async function selectResponse(endpointId, responseName) {
    try {
        const response = await fetch(`/api/endpoints/${endpointId}/select-response`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ responseName })
        });

        if (response.ok) {
            await loadEndpoints();
            selectEndpoint(endpointId);
            showSuccess('Response selected successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to select response');
        }
    } catch (error) {
        console.error('Error selecting response:', error);
        showError('Failed to select response');
    }
}

// Edit response
function editResponse(endpointId, responseName) {
    const endpoint = endpoints.find(ep => ep.id === endpointId);
    const response = endpoint.responses.find(r => r.name === responseName);
    
    document.getElementById('editResponseOriginalName').value = responseName;
    document.getElementById('editResponseName').value = response.name;
    document.getElementById('editResponseStatusCode').value = response.statusCode;
    document.getElementById('editResponseBody').value = JSON.stringify(response.body, null, 2);
    
    document.getElementById('editResponseModal').style.display = 'block';
}

// Delete response
async function deleteResponse(endpointId, responseName) {
    if (!confirm('Are you sure you want to delete this response?')) {
        return;
    }

    try {
        const response = await fetch(`/api/endpoints/${endpointId}/responses/${encodeURIComponent(responseName)}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadEndpoints();
            selectEndpoint(endpointId);
            showSuccess('Response deleted successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete response');
        }
    } catch (error) {
        console.error('Error deleting response:', error);
        showError('Failed to delete response');
    }
}

// Delete endpoint
async function deleteEndpoint(endpointId) {
    if (!confirm('Are you sure you want to delete this endpoint? This will delete all responses for this endpoint.')) {
        return;
    }

    try {
        const response = await fetch(`/api/endpoints/${endpointId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadEndpoints();
            // Clear the endpoint details since the endpoint is deleted
            document.getElementById('endpointDetails').innerHTML = '<div class="empty-state"><h3>No endpoint selected</h3><p>Select an endpoint to view details</p></div>';
            selectedEndpointId = null;
            showSuccess('Endpoint deleted successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete endpoint');
        }
    } catch (error) {
        console.error('Error deleting endpoint:', error);
        showError('Failed to delete endpoint');
    }
}

// Utility functions
function parseJsonSafely(jsonString) {
    if (!jsonString.trim()) return null;
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error('Invalid JSON format');
    }
}

function validateJsonInput(textareaId, validationId) {
    const textarea = document.getElementById(textareaId);
    const validationDiv = document.getElementById(validationId);
    const jsonString = textarea.value.trim();
    
    // Remove previous validation classes
    textarea.classList.remove('error', 'valid');
    validationDiv.className = 'json-validation-message';
    
    if (!jsonString) {
        // Empty input is valid (will be treated as null)
        textarea.classList.add('valid');
        validationDiv.className = 'json-validation-message success';
        validationDiv.textContent = 'Empty input is valid (will be treated as null)';
        return true;
    }
    
    try {
        JSON.parse(jsonString);
        textarea.classList.add('valid');
        validationDiv.className = 'json-validation-message success';
        validationDiv.textContent = 'Valid JSON format';
        return true;
    } catch (error) {
        textarea.classList.add('error');
        validationDiv.className = 'json-validation-message error';
        validationDiv.textContent = `Invalid JSON: ${error.message}`;
        return false;
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = type;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '300px';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Settings functionality
let settings = {
    serverPort: 3000,
    corsEnabled: true,
    autoReload: true,
    logLevel: 'info',
    responseDelay: 0
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('mockerSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
    
    // Apply settings to UI
    document.getElementById('serverPort').value = settings.serverPort;
    document.getElementById('corsEnabled').checked = settings.corsEnabled;
    document.getElementById('autoReload').checked = settings.autoReload;
    document.getElementById('logLevel').value = settings.logLevel;
    document.getElementById('responseDelay').value = settings.responseDelay;
}

// Save settings to localStorage and apply to server
async function saveSettings() {
    // Get values from form
    settings.serverPort = parseInt(document.getElementById('serverPort').value) || 3000;
    settings.corsEnabled = document.getElementById('corsEnabled').checked;
    settings.autoReload = document.getElementById('autoReload').checked;
    settings.logLevel = document.getElementById('logLevel').value;
    settings.responseDelay = parseInt(document.getElementById('responseDelay').value) || 0;
    
    // Save to localStorage
    localStorage.setItem('mockerSettings', JSON.stringify(settings));
    
    // Apply settings to server
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            showSuccess('Settings saved successfully!');
        } else {
            showError('Failed to save settings to server');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
    }
}

// Reset settings to defaults
function resetSettings() {
    settings = {
        serverPort: 3000,
        corsEnabled: true,
        autoReload: true,
        logLevel: 'info',
        responseDelay: 0
    };
    
    // Update UI
    document.getElementById('serverPort').value = settings.serverPort;
    document.getElementById('corsEnabled').checked = settings.corsEnabled;
    document.getElementById('autoReload').checked = settings.autoReload;
    document.getElementById('logLevel').value = settings.logLevel;
    document.getElementById('responseDelay').value = settings.responseDelay;
    
    // Clear localStorage
    localStorage.removeItem('mockerSettings');
    
    showSuccess('Settings reset to defaults');
}

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadEndpoints();
    setupEventListeners();
    loadSettings(); // Add this line to load settings
});
