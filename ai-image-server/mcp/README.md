# ComfyUI MCP Server

A Model Context Protocol (MCP) server exposing ComfyUI workflows to Claude Desktop.

## Usage

```bash
npm install
npm start
```

Add the server to Claude Desktop configuration on Windows:

```json
{
  "mcpServers": {
    "comfyui-local": {
      "command": "node",
      "args": ["C:/ruta/a/ai-image-server/mcp/comfyui-mcp-server.js"],
      "env": {
        "COMFY_API_BASE": "http://127.0.0.1:8188"
      }
    }
  }
}
```

On Windows, the config file is located at:
`%APPDATA%/Claude/claude_desktop_config.json`

Logs can be viewed from Claude Desktop's developer tools or the console where you launched the server.
