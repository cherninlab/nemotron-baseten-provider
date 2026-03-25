import { describe, expect, test } from "bun:test";
import { parseGrownXmlChunks } from "../src/parser";

describe("Nemotron XML Parser", () => {
	test("transforms <execute> tags into markdown code blocks", () => {
		const rawChunk =
			'data: {"choices":[{"delta":{"content":"<execute>ls -la</execute>"}}]}\n\n';
		const parsed = parseGrownXmlChunks(rawChunk);

		expect(parsed).toContain("```bash\nls -la\n```");
	});

	test("transforms <thought> tags into italic thoughts", () => {
		const rawChunk =
			'data: {"choices":[{"delta":{"content":"<thought>I should run ls</thought>"}}]}\n\n';
		const parsed = parseGrownXmlChunks(rawChunk);

		expect(parsed).toContain("*Thinking...*\n> I should run ls\n");
	});

	test("leaves normal chunks untouched", () => {
		const rawChunk =
			'data: {"choices":[{"delta":{"content":"The model says hello"}}]}\n\n';
		const parsed = parseGrownXmlChunks(rawChunk);

		expect(parsed).toBe(rawChunk);
	});
});
