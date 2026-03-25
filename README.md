<div align="center">
  <h1>⚡️ OpenCode OSS</h1>
  <p><strong>Fix broken tool calling for all Open-Source LLMs natively in OpenCode.</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
</div>

<br />

## ⚡️ Quick Start

```bash
bunx opencode-oss
```

Enter your target API URL when prompted:
- **Local Ollama**: `http://127.0.0.1:11434/v1`
- **vLLM / OpenRouter**: Enter your specific endpoint.

That’s it.

Your open-source models will appear in OpenCode automatically under the name **"OpenCode OSS"** and their tool-calling will seamlessly work. Keep the terminal running while you use it in the IDE.

---

## What this does

* **Fixes Broken Tool Calls**: OpenCode execution breaks when models like Qwen, LLaMa, or Nemotron output custom XML (`<execute>`, `<think>`), Hermes JSON dumps, or incorrectly emit `<|tool_calls_section_end|>` tokens.
* **Universal Normalization**: This tool automatically intercepts these broken formats on-the-fly and morphs them into the native structure OpenCode executes.
* **Zero-Config Setup**: Automatically injects its configuration into the IDE so you never have to manually edit JSON files.

---

## Optional: Advanced / Debugging

If a specific model is generating a new unsupported block format or failing to run, start it in debug mode to see raw chunk payloads:

```bash
bunx opencode-oss --debug
```

### Manual Configuration

If the automatic installer cannot find your config file, you can manually set it up in `oh-my-opencode.json`:

```json
{
  "models": [
    {
      "title": "OpenCode OSS",
      "provider": "openai",
      "model": "oss-model-name",
      "apiBase": "http://localhost:3042/v1"
    }
  ]
}
```

### The Architecture

Open source models use vastly different formatting conventions for tool calls. OpenCode natively only officially tracks OpenAI's rigorous schemas. This tool stands up a lightweight zero-install server that perfectly translates streaming outputs across the entire open-source model ecosystem, regardless of the API provider.
