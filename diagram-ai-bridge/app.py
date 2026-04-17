from flask import Flask, request, jsonify, render_template_string
import requests
import json
import os
import re
import unicodedata

app = Flask(__name__)

OLLAMA_URL = "http://localhost:11434"
MODEL_NAME = "mistral:7b"

INVENTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventario.json")

inventory = []

def load_inventory_once():
    global inventory
    if os.path.exists(INVENTORY_FILE):
        try:
            with open(INVENTORY_FILE, "r", encoding="utf-8") as f:
                inventory = json.load(f)
        except (json.JSONDecodeError, OSError):
            inventory = []
    else:
        inventory = []
    print(f"Inventario cargado: {len(inventory)} productos")

def save_inventory():
    with open(INVENTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)

def normalize_text(text):
    text = (text or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text

def find_inventory_item(producto):
    query = normalize_text(producto)
    if not query:
        return None

    for p in inventory:
        nombre = normalize_text(p.get("nombre", ""))
        if not nombre:
            continue

        if query == nombre or query in nombre or nombre in query:
            return p

        if query.endswith("s") and query[:-1] == nombre:
            return p
        if nombre.endswith("s") and nombre[:-1] == query:
            return p

    # Fallback: buscar por cualquier parte del nombre sin importar mayúsculas/minúsculas
    for p in inventory:
        if query in normalize_text(p.get("nombre", "")):
            return p
        if normalize_text(p.get("nombre", "")) in query:
            return p

    return None

def get_product_list():
    productos = ", ".join([f"{p['nombre']} (${p['precio']})" for p in inventory])
    return productos

def process_orders(order_items):
    if not order_items:
        return "No se detectaron pedidos"

    responses = []
    updated = False

    for item in order_items:
        # Formato nuevo: (tipo, producto, cantidad)
        # Formato fallback: (producto, cantidad) - assume VENDER
        if len(item) == 3:
            tipo, producto, cantidad = item
        else:
            tipo = "VENDER"
            producto, cantidad = item

        producto_item = find_inventory_item(producto)
        if not producto_item:
            responses.append(f"No encontrado: {producto}")
            continue

        if cantidad <= 0:
            continue

        if tipo == "VENDER":
            if producto_item["stock"] >= cantidad:
                producto_item["stock"] -= cantidad
                updated = True
                responses.append(f"{producto_item['nombre']}: {cantidad} vendidos")
            else:
                responses.append(f"Sin stock: {producto_item['nombre']}")
        
        elif tipo in ["QUITAR", "CANCELAR"]:
            producto_item["stock"] += cantidad
            updated = True
            responses.append(f"{producto_item['nombre']}: +{cantidad} devueltos")

    if updated:
        save_inventory()

    return " | ".join(responses)

def extract_sales_commands(ai_response):
    if not ai_response:
        return []

    # Validar que la respuesta contenga [ACCION]
    if "[ACCION]" not in ai_response.upper():
        return []

    commands = []
    # Buscar formato [ACCION] TIPO Producto:Cantidad [/ACCION]
    pattern = r"\[ACCION\]\s*(\w+)\s+(\w+)\s*:\s*(\d+)\s*\[/ACCION\]"
    for match in re.finditer(pattern, ai_response, flags=re.IGNORECASE):
        tipo = match.group(1).strip().upper()
        producto = match.group(2).strip()
        cantidad = int(match.group(3))
        commands.append((tipo, producto, cantidad))
    
    return commands

def extract_product_from_prompt(prompt):
    prompt_lower = (prompt or "").lower()
    results = []
    for p in inventory:
        nombre = p["nombre"].lower()
        if nombre in prompt_lower:
            pattern = rf"(\d+)\s+{re.escape(nombre)}(?:s|es)?\b"
            match = re.search(pattern, prompt_lower)
            cantidad = int(match.group(1)) if match else 1
            results.append(("VENDER", p["nombre"], cantidad))
    return results

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Tienda AI</title>
    <style>
        body { font-family: Arial; max-width: 800px; margin: 20px auto; padding: 20px; background: #f0f0f0; }
        .container { display: flex; gap: 20px; }
        .panel { background: white; padding: 20px; border-radius: 8px; }
        .left { flex: 1; }
        .right { flex: 1; }
        textarea { width: 100%; height: 60px; margin-bottom: 10px; padding: 10px; }
        button { background: #28a745; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
        button:hover { background: #218838; }
        #response { margin-top: 15px; padding: 15px; background: #e9ecef; border-radius: 4px; }
        #inventory div { padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    </style>
</head>
<body>
    <h1>Tienda AI - Vendedor</h1>
    <p>Modelo: <strong>{{ model }}</strong></p>
    
    <div class="container">
        <div class="panel left">
            <h3>Pedido</h3>
            <textarea id="prompt" placeholder="Ej: Necesito 2 panes"></textarea>
            <br>
            <button onclick="sendPrompt()">Vender</button>
            <div id="response"></div>
        </div>
        
        <div class="panel right">
            <h3>Inventario</h3>
            <div id="inventory"></div>
        </div>
    </div>

    <script>
        async function loadInventory() {
            const res = await fetch('/inventory');
            const data = await res.json();
            document.getElementById('inventory').innerHTML = data.map(p => 
                '<div><span>' + p.nombre + '</span><span>Stock: ' + p.stock + ' ($' + p.precio.toFixed(2) + ')</span></div>'
            ).join('');
        }
        loadInventory();
        
        async function sendPrompt() {
            const prompt = document.getElementById('prompt').value;
            document.getElementById('response').innerText = 'Procesando...';
            
            const res = await fetch('/generate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({prompt: prompt})
            });
            const data = await res.json();
            
            document.getElementById('response').innerText = data.response || data.error || '';
            loadInventory();
            document.getElementById('prompt').value = '';
        }
    </script>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE, model=MODEL_NAME)

@app.route('/inventory')
def get_inventory():
    return jsonify(inventory)

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json(silent=True) or {}
    user_prompt = data.get('prompt', '')
    
    if not user_prompt:
        return jsonify({"error": "Prompt vacío"}), 400
    
    try:
        productos = get_product_list()
        prompt = f"""Eres un sistema de pedidos de tienda.

PRODUCTOS:
{productos}

NOMBRES VALIDOS:
Pan, Leche, Huevos, Queso, Jamon, Jugo, Galletas, Cafe

-----------------------------------
FORMATO OBLIGATORIO:

[ACCION] TIPO Producto:Cantidad [/ACCION]

TIPOS:
- VENDER (compra normal) - reduce stock
- QUITAR (devolver/al cancelar) - aumenta stock
- CANCELAR (eliminar del pedido) - aumentar stock

-----------------------------------
REGLAS:

1. NUNCA usar cantidades negativas
2. Cada producto en su propio bloque
3. Sin texto extra
4. Si el cliente NO pide nada → NO generar salida

-----------------------------------
EJEMPLOS:

Cliente: "Dame 2 panes"
[ACCION] VENDER Pan:2 [/ACCION]

Cliente: "Quita el jugo"
[ACCION] QUITAR Jugo:1 [/ACCION]

Cliente: "Cancela el cafe"
[ACCION] CANCELAR Cafe:1 [/ACCION]

Cliente: "Dame 2 panes y 1 leche"
[ACCION] VENDER Pan:2 [/ACCION]
[ACCION] VENDER Leche:1 [/ACCION]

Cliente: "Quiero todo"
(No generates nada - necesitas PRODUCTOS específicos)

-----------------------------------
Cliente: "{user_prompt}"
Respuesta:
"""
        
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            ia_response = result.get("response", "")

            commands = extract_sales_commands(ia_response)
            if commands:
                resultado = process_orders(commands)
                ia_response += " | " + resultado
            else:
                fallback_orders = extract_product_from_prompt(user_prompt)
                if fallback_orders:
                    resultado = process_orders(fallback_orders)
                    ia_response = f"Procesado: {resultado}"
            
            return jsonify({"response": ia_response})
        else:
            return jsonify({"error": f"Error: {response.status_code}"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    load_inventory_once()
    print("Tienda AI - Modelo:", MODEL_NAME)
    print("Abre: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)