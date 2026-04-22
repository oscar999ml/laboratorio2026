const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
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

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + endpoint, (res) => {
      let result = '';
      res.on('data', (chunk) => result += chunk);
      res.on('end', () => resolve(result));
    }).on('error', reject);
  });
}

async function test() {
  console.log('=== 1. Crear proyecto ===');
  const proj = await post('/projects', { name: 'Mi Proyecto', description: 'Primer proyecto de prueba' });
  console.log(proj);

  console.log('\n=== 2. Listar proyectos ===');
  const projects = await get('/projects');
  console.log(projects);

  console.log('\n=== 3. Crear documento ===');
  const doc = await post('/documents', { project_id: 1, title: 'Notas del proyecto', content: 'Contenido inicial', tags: 'important', category: 'general' });
  console.log(doc);

  console.log('\n=== 4. Buscar documentos ===');
  const search = await get('/documents/search?q=proyecto');
  console.log(search);

  console.log('\n=== 5. Preguntar a IA ===');
  const ai = await post('/ai/ask', { question: 'cómo hacer un login en React?' });
  console.log(ai);
}

test().catch(console.error);