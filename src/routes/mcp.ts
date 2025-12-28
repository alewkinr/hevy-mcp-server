/**
 * MCP Routes - Direct MCP SDK Integration
 *
 * Handles MCP protocol requests without authentication or Durable Objects
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp-server.js";

// Singleton transport instance
let transport: StreamableHTTPServerTransport | null = null;

/**
 * Get or create the MCP transport
 * This creates a singleton transport that's shared across all requests
 */
export function getMcpTransport(): StreamableHTTPServerTransport {
	if (transport) {
		return transport;
	}

	// Get API key from environment
	const apiKey = process.env.HEVY_API_KEY;
	if (!apiKey) {
		throw new Error("HEVY_API_KEY environment variable is required");
	}

	// Create MCP server instance
	const mcpServer = createMcpServer(apiKey);

	// Create transport for HTTP streaming (stateless mode)
	transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined, // Stateless mode for single-user deployment
	});

	// Connect server to transport
	mcpServer.connect(transport).catch((error) => {
		console.error("Failed to connect MCP server to transport:", error);
	});

	return transport;
}
