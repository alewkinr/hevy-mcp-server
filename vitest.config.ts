import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/test/**",
				"**/*.test.ts",
				"**/*.config.ts",
				// Exclude entry points and integration code from coverage
				// These are tested via integration/manual testing
				"src/index.ts", // HTTP server entry point
				"src/routes/mcp.ts", // MCP transport setup (integration layer)
				"src/mcp-server.ts", // MCP server with 17 tools - tested via integration tests
			],
			// Set thresholds for business logic only
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
