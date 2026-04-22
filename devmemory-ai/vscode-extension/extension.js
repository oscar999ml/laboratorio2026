const vscode = require("vscode");
const http = require("http");

const API_URL = "http://localhost:3000";

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: "localhost",
      port: 3000,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };
    
    const req = http.request(options, (res) => {
      let result = "";
      res.on("data", (chunk) => result += chunk);
      res.on("end", () => resolve(result));
    });
    
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:3000" + endpoint, (res) => {
      let result = "";
      res.on("data", (chunk) => result += chunk);
      res.on("end", () => resolve(result));
    }).on("error", reject);
  });
}

let memoriesProvider;
let chatProvider;
let currentPanel = null;

class MemoriasProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.memorias = [];
    this.loadMemorias();
  }

  async loadMemorias() {
    try {
      const result = await get("/memory/all");
      this.memorias = JSON.parse(result);
      this._onDidChangeTreeData.fire();
    } catch (err) {
      console.error("Error:", err.message);
    }
  }

  refresh() {
    this.loadMemorias();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!element) {
      return this.memorias.map(m => ({
        label: "[" + m.type + "] " + m.content.substring(0, 40),
        description: m.content,
        type: m.type,
        id: m.id
      }));
    }
    return [];
  }
}

class ChatProvider {
  constructor() {
    this.messages = [];
  }

  getHtml() {
    return `<!DOCTYPE html>
<html>
<head>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#1e1e1e;color:#ccc;padding:10px}
.chat-container{display:flex;flex-direction:column;height:100vh}
.messages{flex:1;overflow-y:auto;padding:10px}
.message{padding:8px 12px;margin:4px 0;border-radius:8px;max-width:90%}
.user{background:#0e639c;color:white;align-self:flex-end}
.ai{background:#2d2d2d;color:#fff}
.input-area{display:flex;padding:10px;border-top:1px solid #333}
input{flex:1;padding:8px;background:#2d2d2d;border:none;color:white;border-radius:4px}
button{margin-left:8px;padding:8px 16px;background:#0e639c;border:none;color:white;border-radius:4px;cursor:pointer}
button:disabled{background:#666}
.loading{color:#4fc3f7;text-align:center;padding:10px}
.empty{text-align:center;color:#666;padding:20px}
</style>
</head>
<body>
<div class="chat-container">
<div class="messages" id="messages"><div class="empty">Pregunta a la IA</div></div>
<div class="input-area">
<input type="text" id="question" placeholder="Tu pregunta..." onkeyup="if(event.key==='Enter')send()">
<button onclick="send()" id="btn">Enviar</button>
</div>
</div>
<script>
const API = "http://localhost:3000";
async function send() {
  const input = document.getElementById("question");
  const btn = document.getElementById("btn");
  const msgs = document.getElementById("messages");
  const question = input.value;
  if (!question) return;
  msgs.innerHTML += "<div class=\"message user\">" + question + "</div>";
  msgs.innerHTML += "<div class=\"loading\">Consultando IA...</div>";
  input.value = "";
  btn.disabled = true;
  try {
    const res = await fetch(API + "/ai/ask", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({question})
    });
    const data = await res.json();
    msgs.removeChild(msgs.lastChild);
    msgs.innerHTML += "<div class=\"message ai\">" + data.respuesta + "</div>";
  } catch (err) {
    msgs.innerHTML += "<div class=\"message ai\">Error: " + err.message + "</div>";
  }
  btn.disabled = false;
}
</script>
</body>
</html>`;
  }
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
    if (memoriesProvider) memoriesProvider.refresh();
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
    const result = await get('/memory/search?q=' + encodeURIComponent(query));
    const memories = JSON.parse(result);
    
    if (memories.length === 0) {
      vscode.window.showInformationMessage('No se encontraron memorias');
      return;
    }
    
    const items = memories.map(m => ({
      label: '[' + m.type + '] ' + m.content.substring(0, 50) + '...',
      description: m.content
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
      matchOnDetail: true
    });
    
    if (selected) {
      vscode.window.showInformationMessage(selected.description);
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
    vscode.window.showInformationMessage('IA: ' + data.respuesta.substring(0, 100) + '...');
  } catch (err) {
    vscode.window.showErrorMessage('Error: ' + err.message);
  }
}

function showMemoriesPanel() {
  if (!memoriesProvider) {
    memoriesProvider = new MemoriesProvider();
  }
  
  vscode.window.registerTreeDataProvider('devmemory.memories', memoriesProvider);
  vscode.commands.executeCommand('setContext', 'devmemory.memoriesVisible', true);
  
  currentPanel = 'memories';
}

function showChatPanel() {
  if (!chatProvider) {
    chatProvider = new ChatProvider();
  }
  
  const panel = vscode.window.createWebviewPanel(
    'devmemory.chat',
    'DevMemory Chat IA',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );
  
  panel.webview.html = chatProvider.getHtml();
  
  currentPanel = 'chat';
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('devmemory.save', saveContext),
    vscode.commands.registerCommand('devmemory.search', searchMemory),
    vscode.commands.registerCommand('devmemory.ask', askAI),
    vscode.commands.registerCommand('devmemory.showMemories', showMemoriesPanel),
    vscode.commands.registerCommand('devmemory.showChat', showChatPanel)
  );
  
  vscode.window.showInformationMessage('DevMemory AI activado');
}

function deactivate() {}

module.exports = { activate, deactivate };