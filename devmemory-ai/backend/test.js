const http = require('http');

const memories = [
  { content: "error en login", type: "bug" },
  { content: "usar Node.js 18", type: "decision" },
  { content: "implementar auth con JWT", type: "feature" },
  { content: "error CORS en producción", type: "bug" },
  { content: "usar PostgreSQL para producción", type: "decision" }
];

let index = 0;

function saveMemory(mem) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(mem);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/memory/save',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  console.log('=== GUARDANDO MEMORIAS ===');
  for (const mem of memories) {
    const result = await saveMemory(mem);
    console.log('Guardado:', result);
  }
  
  console.log('\n=== BUSCANDO "error" ===');
  const searchReq = http.get('http://localhost:3000/memory/search?q=error', (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(body));
  });
  
  setTimeout(() => {
    console.log('\n=== BUSCANDO "login" ===');
    const searchReq2 = http.get('http://localhost:3000/memory/search?q=login', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => console.log(body));
    });
  }, 500);
}

test().catch(console.error);