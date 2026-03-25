<div align="center">
  <h1>⚡️ OpenCode Nemotron</h1>
  <p><strong>Add Baseten's Nemotron models natively to OpenCode in 10 seconds.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
</div>

<br />

## ⚡️ Quick Start

```bash
bunx opencode-nemotron
```

Enter your Baseten API key when prompted.

That’s it.

Nemotron will appear in OpenCode automatically. Keep the terminal running while you use it in the IDE.

---

## What this does

* Connects OpenCode directly to Nemotron.
* Makes outputs compatible automatically (translating Nemotron's XML into standard execution blocks).
* Automatically injects the correct configuration into your IDE. 
* No manual config needed.

---

## Optional: Advanced / Debugging

If something isn't working or you want to see exactly how the bridge translates payloads between OpenCode and Nemotron, you can run the bridge in debug mode:

```bash
bunx opencode-nemotron --debug
```

### Manual Configuration

If the automatic installer cannot find your config file, you can manually set it up in `oh-my-opencode.json`:

```json
{
  "models": [
    {
      "title": "Nemotron",
      "provider": "openai",
      "model": "nemotron-super",
      "apiBase": "http://localhost:3042/v1"
    }
  ]
}
```

### Why it works

Nemotron uses a slightly different generation format (custom XML tags) than OpenCode natively expects. This tool runs a local bridge that automatically intercepts the stream and makes them compatible on-the-fly.
