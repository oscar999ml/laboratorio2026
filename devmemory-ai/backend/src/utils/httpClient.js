/**
 * Cliente HTTP compartido para backend y extensión
 * Elimina duplicación de código post/get
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Hacer request HTTP POST
 * @param {string} endpoint - Ruta del endpoint (ej: /memory/save)
 * @param {object} data - Datos a enviar
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<string>} - Response body
 */
function post(endpoint, data, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    
    const options = {
      hostname: new URL(API_URL).hostname,
      port: new URL(API_URL).port || 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout
    };
    
    const req = http.request(options, (res) => {
      let result = '';
      res.on('data', (chunk) => (result += chunk));
      res.on('end', () => resolve(result));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(body);
    req.end();
  });
}

/**
 * Hacer request HTTP GET
 * @param {string} endpoint - Ruta del endpoint
 * @param {object} query - Query parameters
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<string>} - Response body
 */
function get(endpoint, query = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(query).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    http.get(new URL(url, API_URL).href, { timeout }, (res) => {
      let result = '';
      res.on('data', (chunk) => (result += chunk));
      res.on('end', () => resolve(result));
    }).on('error', reject);
  });
}

/**
 * Helper: parse JSON response con manejo de error
 * @param {string} jsonString - JSON a parsear
 * @returns {object} - Objeto parseado o null
 */
function parseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('JSON parse error:', err.message);
    return null;
  }
}

module.exports = { post, get, parseJSON };
