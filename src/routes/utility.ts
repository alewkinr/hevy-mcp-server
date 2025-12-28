/**
 * Utility Routes - Health Check and Stats
 *
 * Simple HTTP handlers without framework dependencies
 */

import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Handle utility routes: /health, /stats
 * Returns true if the route was handled, false otherwise
 */
export async function handleUtilityRoutes(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = req.url || "/";

  // Health check endpoint
  if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        version: "4.0.0",
        mode: "single-user",
        transport: "streamable-http",
        timestamp: new Date().toISOString(),
      }),
    );
    return true;
  }

  // Stats endpoint
  if (url === "/stats") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        mode: "single-user",
        users: 1,
        message: "Running in single-user mode",
      }),
    );
    return true;
  }

  return false;
}
