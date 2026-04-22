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

async function test() {
  console.log('=== GUARDANDO MEMORIAS ===');
  
  const memories = [
    { content: "error 401 en login - solución: agregar token JWT en headers", type: "bug" },
    { content: "usar bcrypt para hashear passwords", type: "decision" },
    { content: "implementar rate limiting con express-rate-limit", type: "feature" },
    { content: "error CORS - agregar cors() en express", type: "bug" },
    { content: "usar dotenv para variables de entorno", type: "decision" },
    { content: "crear endpoint /api/health para health check", type: "feature" },
    { content: "error TypeError en destructuring - verificar que objeto existe", type: "bug" },
    { content: "usar helmet para headers de seguridad", type: "decision" }
  ];
  
  for (const mem of memories) {
    const result = await post('/memory/save', mem);
    console.log('Guardado:', JSON.parse(result).id);
  }
  
  console.log('\n=== BUSCANDO "login" ===');
  const http = require('http');
  http.get('http://localhost:3000/memory/search?q=login', (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log(body);
    });
  });
}

test().catch(console.error);