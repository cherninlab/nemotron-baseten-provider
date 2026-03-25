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
		install: { type: "boolean" },
		port: { type: "string", short: "p" },
		help: { type: "boolean", short: "h" },
	},
	strict: true,
	allowPositionals: true,
});

if (values.help) {
	console.log(`
⚡️ Nemotron Baseten Provider v${version}

Usage:
  bunx nemotron-baseten-provider [options]

Options:
  --install      Locate and update OpenCode / Oh-My-OpenCode config files to use the proxy
  -p, --port     Port to run the proxy on (default: 3042)
  -h, --help     Show this help message

Environment Variables:
  BASETEN_API_KEY  Required to start the proxy server.
`);
	process.exit(0);
}

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
	title: "Nemotron (Baseten Proxy)",
	provider: "openai",
	model: "nemotron-super",
	apiBase: "http://localhost:3042/v1",
};

async function installConfig() {
	console.log("🔍 Searching for OpenCode configuration files...");
	let found = false;

	for (const configPath of configPaths) {
		try {
			const stat = await fs.stat(configPath);
			if (stat.isFile()) {
				found = true;
				console.log(`✅ Found config at: ${configPath}`);

				const configData = await fs.readFile(configPath, "utf-8");
				let configJson: { models?: Array<{ title: string }> };
				try {
					configJson = JSON.parse(configData);
				} catch (_e) {
					console.error(`❌ Failed to parse JSON in ${configPath}. Skipping.`);
					continue;
				}

				if (!configJson.models) {
					configJson.models = [];
				}

				// Check if already installed
				const alreadyExists = configJson.models.some(
					(m: { title: string }) => m.title === PROXY_MODEL_CONFIG.title,
				);

				if (alreadyExists) {
					console.log(`   ⚡️ Model already exists in ${configPath}. Skipping.`);
				} else {
					configJson.models.push(PROXY_MODEL_CONFIG);
					await fs.writeFile(configPath, JSON.stringify(configJson, null, 2));
					console.log(
						`   🚀 Successfully injected Nemotron model into ${configPath}!`,
					);
				}
			}
		} catch (err: unknown) {
			if (
				err instanceof Error &&
				(err as { code?: string }).code !== "ENOENT"
			) {
				console.error(`⚠️ Error checking ${configPath}:`, err.message);
			}
		}
	}

	if (!found) {
		console.log(
			"⚠️ Could not find any OpenCode configuration files automatically.",
		);
		console.log(
			"Please manually add the model configuration shown in the README to your config file.",
		);
	} else {
		console.log(
			"\n🎉 Installation complete! You can now start the proxy server.",
		);
	}
}

if (values.install) {
	installConfig()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
} else {
	// Start server
	const PORT = values.port
		? parseInt(values.port, 10)
		: parseInt(process.env.PORT || "3042", 10);
	const BASETEN_API_KEY = process.env.BASETEN_API_KEY;

	if (!BASETEN_API_KEY) {
		console.error("❌ Error: BASETEN_API_KEY environment variable is missing.");
		console.error(
			"Please start the proxy with: BASETEN_API_KEY=your_key bunx nemotron-baseten-provider",
		);
		console.log(
			"Or run with --install to inject the configuration into your editor first.",
		);
		process.exit(1);
	}

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
			// Accept /v1/chat/completions or just proxy anything for robustness
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
						console.error("Stream error", e);
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

	console.log(
		`🚀 Nemotron Baseten Provider proxy started on http://localhost:${PORT}`,
	);
	console.log(
		`Now configure OpenCode to use base URL: http://localhost:${PORT}/v1`,
	);
}
