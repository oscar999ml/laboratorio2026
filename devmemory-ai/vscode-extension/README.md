# DevMemory AI - Extensión VS Code

## Instalación

1. Copia la carpeta `vscode-extension` a `.vscode/extensions/` en tu carpeta de extensiones de VS Code
2. O abre la carpeta en VS Code y presiona **F5** para probar

## Uso

### Comandos disponibles

- `DevMemory: Guardar Contexto` - Guarda el texto seleccionado o pide entrada
- `DevMemory: Buscar Memoria` - Busca en las memorias guardadas
- `DevMemory: Preguntar a IA` - Pregunta a la IA con contexto

### Atajo de teclado

- `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`) - Guardar contexto

## Requisitos

- Servidor corriendo en `http://localhost:3000`
- Para IA: configurar `OPENAI_API_KEY` en `.env`