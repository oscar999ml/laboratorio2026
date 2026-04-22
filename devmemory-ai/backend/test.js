const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = http.request(options, (res) => {
      let result = '';
      res.on('data', (chunk) => result += chunk);
      res.on('end', () => resolve(result));
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${url}`, (res) => {
      let result = '';
      res.on('data', (chunk) => result += chunk);
      res.on('end', () => resolve(result));
    }).on('error', reject);
  });
}

async function test() {
  console.log('=== TEST API /ai/ask ===');
  const result = await post('/ai/ask', { question: 'cómo arreglo el error de login?' });
  console.log(result);
}

test().catch(console.error);