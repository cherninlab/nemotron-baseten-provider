#!/usr/bin/env bun
import { serve } from "bun";
import { parseGrownXmlChunks } from "./parser";

const PORT = process.env.PORT || 3042;
const BASETEN_API_KEY = process.env.BASETEN_API_KEY;

if (!BASETEN_API_KEY) {
	console.error("❌ Error: BASETEN_API_KEY environment variable is missing.");
	console.error(
		"Please start the proxy with: BASETEN_API_KEY=your_key bunx nemotron-baseten-provider",
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

		if (new URL(req.url).pathname !== "/v1/chat/completions") {
			return new Response("Not Found", { status: 404 });
		}

		// Proxy the request to baseten
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

		// Set up the streaming transformation
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

						// Standard OpenAI chunk format parsing is complex, we assume simple text replacement here
						// But since this is a proxy, we actually intercept SSE (Server Sent Events)
						// A production version would parse the SSE, transform the parsed JSON `content` field, and re-stringify.
						// For simplicity and to show the exemplary nature, we parse the raw text chunks matching XML.

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
