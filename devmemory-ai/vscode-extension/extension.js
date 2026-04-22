const vscode = require('vscode');
const http = require('http');

const API_URL = 'http://localhost:3000';

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

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${endpoint}`, (res) => {
      let result = '';
      res.on('data', (chunk) => result += chunk);
      res.on('end', () => resolve(result));
    }).on('error', reject);
  });
}

async function saveContext() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No hay archivo abierto');
    return;
  }
  
  const selection = editor.selection;
  const text = editor.document.getText(selection);
  const content = text || await vscode.window.showInputBox({
    prompt: 'Contenido a guardar',
    placeHolder: 'Describe el contexto o error...'
  });
  
  if (!content) return;
  
  const type = await vscode.window.showQuickPick(['bug', 'decision', 'feature'], {
    placeHolder: 'Tipo de memoria'
  });
  
  if (!type) return;
  
  try {
    const result = await post('/memory/save', { content, type });
    const data = JSON.parse(result);
    vscode.window.showInformationMessage(`Guardado (ID: ${data.id})`);
  } catch (err) {
    vscode.window.showErrorMessage('Error: ' + err.message);
  }
}

async function searchMemory() {
  const query = await vscode.window.showInputBox({
    prompt: 'Buscar en memorias',
    placeHolder: 'palabra clave...'
  });
  
  if (!query) return;
  
  try {
    const result = await get(`/memory/search?q=${encodeURIComponent(query)}`);
    const memories = JSON.parse(result);
    
    if (memories.length === 0) {
      vscode.window.showInformationMessage('No se encontraron memorias');
      return;
    }
    
    const items = memories.map(m => ({
      label: `[${m.type}] ${m.content.substring(0, 50)}...`,
      detail: m.content,
      content: m.content
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
      matchOnDetail: true
    });
    
    if (selected) {
      vscode.window.showInformationMessage(selected.content);
    }
  } catch (err) {
    vscode.window.showErrorMessage('Error: ' + err.message);
  }
}

async function askAI() {
  const question = await vscode.window.showInputBox({
    prompt: 'Preguntar a la IA',
    placeHolder: 'Tu pregunta...'
  });
  
  if (!question) return;
  
  try {
    vscode.window.showInformationMessage('Consultando IA...');
    const result = await post('/ai/ask', { question });
    const data = JSON.parse(result);
    
    vscode.window.showInformationMessage(`IA: ${data.respuesta}`);
  } catch (err) {
    vscode.window.showErrorMessage('Error: ' + err.message);
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('devmemory.save', saveContext),
    vscode.commands.registerCommand('devmemory.search', searchMemory),
    vscode.commands.registerCommand('devmemory.ask', askAI)
  );
  
  vscode.window.showInformationMessage('DevMemory AI activado');
}

function deactivate() {}

module.exports = { activate, deactivate };