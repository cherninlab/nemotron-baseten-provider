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
⚡️ Add Nemotron to OpenCode (v${version})

Usage:
  bunx opencode-nemotron [options]

Options:
  --debug        Show advanced logs and architecture details
  -h, --help     Show this help message
`);
	process.exit(0);
}

// 1. Get API Key
let BASETEN_API_KEY = process.env.BASETEN_API_KEY;

if (!BASETEN_API_KEY) {
	const answer = prompt("Enter your Baseten API key:");
	if (!answer) {
		console.error("❌ API key is required.");
		process.exit(1);
	}
	BASETEN_API_KEY = answer.trim();
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
	title: "Nemotron",
	provider: "openai",
	model: "nemotron-super",
	apiBase: "http://localhost:3042/v1",
};

let foundConfig = false;

for (const configPath of configPaths) {
	try {
		const stat = await fs.stat(configPath);
		if (stat.isFile()) {
			foundConfig = true;
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
			console.log("✔ Found OpenCode config");
			console.log("✔ Added Nemotron model");
			break; // Stop after updating the first valid config found
		}
	} catch (err: unknown) {
		// Ignore ENOENT silently
	}
}

if (!foundConfig) {
	console.log("⚠️ Could not locate OpenCode config automatically.");
	if (values.debug) {
		console.log("Please manually add this to your models array:");
		console.log(JSON.stringify(PROXY_MODEL_CONFIG, null, 2));
	}
}

// 3. Start Bridge
const PORT = parseInt(process.env.PORT || "3042", 10);
const BASETEN_URL = "https://bridge.baseten.co/v1/chat/completions";

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

		const response = await fetch(BASETEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Api-Key ${BASETEN_API_KEY}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok || !response.body) {
			const errorText = await response.text();
			return new Response(`Baseten Error: ${errorText}`, {
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

console.log("✔ Started local bridge\n");
console.log("You're ready. Nemotron is now available in OpenCode!");
if (values.debug) {
	console.log(`[DEBUG] Proxy running on port ${PORT}`);
} else {
	console.log("(Keep this terminal open while using it)");
}
