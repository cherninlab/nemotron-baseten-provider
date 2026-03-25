#!/usr/bin/env bun
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { serve } from "bun";
import { parseGrownXmlChunks } from "./parser";

const version = "1.0.0";

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		debug: { type: "boolean" },
		help: { type: "boolean", short: "h" },
	},
	strict: true,
	allowPositionals: true,
});

if (values.help) {
	console.log(`
⚡️ OpenCode OSS (v${version})
Universal compatibility layer for Open-Source models.

Usage:
  bunx opencode-oss [options]

Options:
  --debug        Show advanced logs
  -h, --help     Show this help message
`);
	process.exit(0);
}

// 1. Get Target Details Interactively
let TARGET_URL = process.env.TARGET_URL;
let API_KEY = process.env.API_KEY || "";
let MODEL_NAME_TITLE = "Custom (OSS)";
let MODEL_ID = "custom-model";

if (!TARGET_URL) {
	console.log("Where is your model running?\n");
	console.log("1) Ollama (local)");
	console.log("2) OpenRouter");
	console.log("3) Custom endpoint\n");

	const choice = prompt("> ");

	if (choice === "1") {
		TARGET_URL = "http://127.0.0.1:11434/v1";
		try {
			const res = await fetch("http://127.0.0.1:11434/api/tags");
			if (res.ok) {
				const data = (await res.json()) as { models?: Array<{ name: string }> };
				const models = data.models || [];
				if (models.length > 0) {
					console.log("\nAvailable models:");
					models.forEach((m, i) => {
						console.log(`${i + 1}) ${m.name}`);
					});
					const modChoice = prompt("\n> ");
					const idx = parseInt(modChoice || "1", 10) - 1;
					if (models[idx]) {
						MODEL_NAME_TITLE = `${models[idx].name} (OSS)`;
						MODEL_ID = models[idx].name;
					} else {
						MODEL_NAME_TITLE = "Ollama (OSS)";
						MODEL_ID = "ollama-model";
					}
				}
			}
		} catch (_err) {
			MODEL_NAME_TITLE = "Ollama (OSS)";
			MODEL_ID = "ollama-model";
		}
	} else if (choice === "2") {
		API_KEY = prompt("\nEnter OpenRouter API key:\n> ")?.trim() || "";
		TARGET_URL = "https://openrouter.ai/api/v1";
		MODEL_NAME_TITLE = "OpenRouter (OSS)";
		MODEL_ID = "openrouter-oss-model";
	} else {
		TARGET_URL =
			prompt(
				"\nEnter custom API URL (e.g. http://127.0.0.1:8000/v1):\n> ",
			)?.trim() || "";
		API_KEY = prompt("\nEnter API key (optional):\n> ")?.trim() || "";
		if (!TARGET_URL) {
			console.error("❌ Target URL is required for custom endpoints.");
			process.exit(1);
		}
	}
}

// 2. Setup Config
const homedir = os.homedir();
const configPaths = [
	path.join(homedir, ".opencode", "opencode.json"),
	path.join(homedir, ".config", "opencode", "opencode.json"),
	path.join(homedir, ".oh-my-opencode.json"),
	path.join(homedir, ".config", "oh-my-opencode", "config.json"),
	path.join(process.cwd(), "opencode.json"),
	path.join(process.cwd(), "oh-my-opencode.json"),
];

const PROXY_MODEL_CONFIG = {
	title: MODEL_NAME_TITLE,
	provider: "openai",
	model: MODEL_ID,
	apiBase: "http://localhost:3042/v1",
};

for (const configPath of configPaths) {
	try {
		const stat = await fs.stat(configPath);
		if (stat.isFile()) {
			if (values.debug) console.log(`[DEBUG] Found config at: ${configPath}`);

			const configData = await fs.readFile(configPath, "utf-8");
			let configJson: { models?: Array<{ title: string }> };
			try {
				configJson = JSON.parse(configData);
			} catch (_e) {
				continue;
			}

			if (!configJson.models) {
				configJson.models = [];
			}

			const alreadyExists = configJson.models.some(
				(m: { title: string }) => m.title === PROXY_MODEL_CONFIG.title,
			);

			if (!alreadyExists) {
				configJson.models.push(PROXY_MODEL_CONFIG);
				await fs.writeFile(configPath, JSON.stringify(configJson, null, 2));
			}
			console.log("\n✔ Found OpenCode config");
			console.log(`✔ Added ${MODEL_NAME_TITLE} model`);
			break;
		}
	} catch (_err: unknown) {
		// Ignore ENOENT silently
	}
}

// 3. Start Bridge
const PORT = parseInt(process.env.PORT || "3042", 10);

serve({
	port: PORT,
	async fetch(req) {
		if (req.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "*",
					"Access-Control-Allow-Headers": "*",
				},
			});
		}

		const urlPath = new URL(req.url).pathname;
		if (!urlPath.includes("/chat/completions")) {
			return new Response("Not Found", { status: 404 });
		}

		const body = await req.clone().json();

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (API_KEY) {
			headers.Authorization = `Bearer ${API_KEY}`;
		}

		const TARGET_ENDPOINT = TARGET_URL.endsWith("/chat/completions")
			? TARGET_URL
			: `${TARGET_URL.endsWith("/") ? TARGET_URL.slice(0, -1) : TARGET_URL}/chat/completions`;

		const response = await fetch(TARGET_ENDPOINT, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok || !response.body) {
			const errorText = await response.text();
			if (values.debug) console.error(`[DEBUG] Proxy Error: ${errorText}`);
			return new Response(`Target Error: ${errorText}`, {
				status: response.status,
			});
		}

		const stream = new ReadableStream({
			async start(controller) {
				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) {
					controller.close();
					return;
				}

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						const transformedChunk = parseGrownXmlChunks(chunk);
						controller.enqueue(new TextEncoder().encode(transformedChunk));
					}
				} catch (e) {
					if (values.debug) console.error("Stream error", e);
				} finally {
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	},
});

console.log("\nYou're ready.");
