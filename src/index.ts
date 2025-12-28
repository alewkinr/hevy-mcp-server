/**
 * Hevy MCP Server - Node.js Entry Point
 *
 * Single-user Docker deployment for Hevy fitness tracking API
 * Uses environment variable HEVY_API_KEY for authentication
 */

import { createServer } from "node:http";
import { getMcpTransport } from "./routes/mcp.js";
import { handleUtilityRoutes } from "./routes/utility.js";

const port = Number.parseInt(process.env.PORT || "8787", 10);

// Validate required environment variables
if (!process.env.HEVY_API_KEY) {
	console.error("❌ ERROR: HEVY_API_KEY environment variable is required");
	console.error("   Get your API key from: https://hevy.com/settings?developer");
	console.error("   Set it in .env file or pass via: docker run -e HEVY_API_KEY=...");
	process.exit(1);
}

console.log("🏋️  Starting Hevy MCP Server...");
console.log(`   Port: ${port}`);
console.log(`   Node: ${process.version}`);
console.log("   Mode: single-user");

// Get the MCP transport for direct handling
const mcpTransport = getMcpTransport();

// Create Node.js HTTP server
const server = createServer(async (req, res) => {
	// Add CORS headers to all responses
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	// Handle OPTIONS preflight
	if (req.method === "OPTIONS") {
		res.writeHead(204);
		res.end();
		return;
	}

	// Handle MCP endpoint directly with the transport
	if (req.url?.startsWith("/mcp")) {
		try {
			// Parse body for POST requests
			let parsedBody: unknown;
			if (req.method === "POST") {
				const chunks: Buffer[] = [];
				for await (const chunk of req) {
					chunks.push(chunk);
				}
				const body = Buffer.concat(chunks).toString();
				parsedBody = body ? JSON.parse(body) : undefined;
			}

			await mcpTransport.handleRequest(req, res, parsedBody);
			return;
		} catch (error) {
			console.error("MCP request error:", error);
			if (!res.headersSent) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Failed to process MCP request" }));
			}
			return;
		}
	}

	// Handle utility routes (health, stats, home page)
	const handled = await handleUtilityRoutes(req, res);
	if (handled) return;

	// 404 for unknown routes
	res.writeHead(404, { "Content-Type": "text/plain" });
	res.end("Not found");
});

server.listen(port, () => {
	console.log("\n✅ Hevy MCP Server running");
	console.log(`   MCP endpoint:  http://localhost:${port}/mcp`);
	console.log(`   Health check:  http://localhost:${port}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
	server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
	console.log("\n🛑 Received SIGINT, shutting down gracefully...");
	server.close(() => process.exit(0));
});
