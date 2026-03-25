// This parser acts on strings streamed from Baseten Nemotron and
// transforms Nemotron's XML tags (e.g. <execute>...</execute>)
// into code blocks that OpenCode natively parses and executes.

export function parseGrownXmlChunks(chunk: string): string {
	// If the chunk contains no XML, return as is.
	if (!chunk.includes("<") && !chunk.includes(">")) return chunk;

	// Since Nemotron responds natively in standard OpenAI SSE format,
	// we would normally parse `data: {"choices": [{"delta": {"content": "..."}}]}`.
	// We'll perform string replacement on the raw chunk for demonstration purposes.
	// In a robust implementation, you should use an SSE parser and JSON transformer.

	// Convert <execute> to standard markdown code block triggers.
	// For open code, a markdown block starting with \`\`\`bash is often enough.
	const transformed = chunk
		.replace(/<execute>/g, "\n```bash\n")
		.replace(/<\/execute>/g, "\n```\n")
		.replace(/<thought>/g, "\n*Thinking...*\n> ")
		.replace(/<\/thought>/g, "\n");

	return transformed;
}
