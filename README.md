<div align="center">
  <h1>⚡️ OpenCode Bridge</h1>
  <p><strong>A universal parser that fixes broken tool calling for Open-Source LLMs (Ollama, vLLM, Nemotron) natively in OpenCode.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
</div>

<br />

## ⚡️ Quick Start

```bash
bunx opencode-bridge
```

Enter your target API URL (e.g. `http://127.0.0.1:11434/v1` for local Ollama, or your vLLM / OpenRouter endpoint) when prompted.

That’s it.

Your open-source model will appear in OpenCode automatically under the name **"OpenCode OSS Bridge"** and its tool-calling will seamlessly work. Keep the terminal running while you use it in the IDE.

---

## What this does

* **Fixes Broken Tool Calls**: OpenCode breaks when models like Qwen, LLaMa, or Nemotron output custom XML (`<execute>`, `<think>`), Hermes JSON dumps, or incorrectly emit `<|tool_calls_section_end|>` tokens.
* **Universal Normalization**: This tool automatically intercepts these broken formats on-the-fly and morphs them into the native structure OpenCode executes.
* **Zero-Config Setup**: Automatically injects its configuration into the IDE so you never have to manually edit JSON files.

---

## Optional: Advanced / Debugging

If a specific model is generating a new unsupported block format or failing to run, run the bridge in debug mode to see raw chunk payloads:

```bash
bunx opencode-bridge --debug
```

### Manual Configuration

If the automatic installer cannot find your config file, you can manually set it up in `oh-my-opencode.json`:

```json
{
  "models": [
    {
      "title": "OpenCode OSS Bridge",
      "provider": "openai",
      "model": "oss-model-name",
      "apiBase": "http://localhost:3042/v1"
    }
  ]
}
```

### The Architecture

Open source models use vastly different formatting conventions for tool calls. OpenCode natively only officially tracks OpenAI's rigorous schemas. This tool runs a local zero-install server that perfectly translates streaming outputs across the entire open-source model ecosystem, regardless of the API provider.
