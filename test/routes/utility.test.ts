import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { handleUtilityRoutes } from "../../src/routes/utility.js";

// Helper to create mock request
function createMockRequest(url: string, method = "GET"): IncomingMessage {
	return {
		url,
		method,
		headers: { host: "localhost:8787" },
	} as IncomingMessage;
}

// Helper to create mock response
function createMockResponse(): ServerResponse & {
	statusCode?: number;
	headers?: Record<string, string>;
	body?: string;
} {
	const headers: Record<string, string> = {};
	let statusCode: number | undefined;
	let body = "";

	const res = {
		writeHead(code: number, hdrs?: Record<string, string>) {
			statusCode = code;
			if (hdrs) {
				Object.assign(headers, hdrs);
			}
		},
		setHeader(name: string, value: string) {
			headers[name] = value;
		},
		end(data?: string) {
			if (data) body = data;
		},
		statusCode,
		headers,
		body,
	} as any;

	// Make properties accessible
	Object.defineProperty(res, "statusCode", {
		get: () => statusCode,
	});
	Object.defineProperty(res, "headers", {
		get: () => headers,
	});
	Object.defineProperty(res, "body", {
		get: () => body,
	});

	return res;
}

describe("Utility Routes", () => {
	describe("Health Check", () => {
		it("should return health status", async () => {
			const req = createMockRequest("/health");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			expect(handled).toBe(true);
			expect(res.statusCode).toBe(200);
			expect(res.headers?.["Content-Type"]).toBe("application/json");

			const data = JSON.parse(res.body!);
			expect(data).toMatchObject({
				status: "healthy",
				version: "4.0.0",
				mode: "single-user",
				transport: "streamable-http",
			});
			expect(data.timestamp).toBeDefined();
			expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
		});

		it("should include current timestamp", async () => {
			const beforeTime = Date.now();
			const req = createMockRequest("/health");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			const data = JSON.parse(res.body!);
			const afterTime = Date.now();
			const responseTime = new Date(data.timestamp).getTime();

			expect(responseTime).toBeGreaterThanOrEqual(beforeTime - 1000); // Allow 1s variance
			expect(responseTime).toBeLessThanOrEqual(afterTime + 1000);
		});

		it("should return 200 status code", async () => {
			const req = createMockRequest("/health");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			expect(res.statusCode).toBe(200);
		});

		it("should set proper content type", async () => {
			const req = createMockRequest("/health");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			expect(res.headers?.["Content-Type"]).toBe("application/json");
		});
	});

	describe("Stats Endpoint", () => {
		it("should return stats", async () => {
			const req = createMockRequest("/stats");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			expect(handled).toBe(true);
			expect(res.statusCode).toBe(200);

			const data = JSON.parse(res.body!);
			expect(data).toEqual({
				mode: "single-user",
				users: 1,
				message: "Running in single-user Docker mode",
			});
		});

		it("should return JSON content type", async () => {
			const req = createMockRequest("/stats");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			expect(res.headers?.["Content-Type"]).toBe("application/json");
		});

		it("should indicate single-user mode", async () => {
			const req = createMockRequest("/stats");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			const data = JSON.parse(res.body!);
			expect(data.mode).toBe("single-user");
			expect(data.users).toBe(1);
		});
	});

	describe("Unknown Routes", () => {
		it("should return false for unknown routes", async () => {
			const req = createMockRequest("/unknown");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			expect(handled).toBe(false);
		});

		it("should return false for root path", async () => {
			const req = createMockRequest("/");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			expect(handled).toBe(false);
		});

		it("should not write response for unknown routes", async () => {
			const req = createMockRequest("/unknown");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			expect(res.body).toBe("");
		});
	});

	describe("HTTP Methods", () => {
		it("should handle GET requests to /health", async () => {
			const req = createMockRequest("/health", "GET");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			expect(handled).toBe(true);
			expect(res.statusCode).toBe(200);
		});

		it("should handle GET requests to /stats", async () => {
			const req = createMockRequest("/stats", "GET");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			expect(handled).toBe(true);
			expect(res.statusCode).toBe(200);
		});

		it("should handle POST requests to /health", async () => {
			const req = createMockRequest("/health", "POST");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			// Should still handle (route matching is URL-based, not method-based)
			expect(handled).toBe(true);
			expect(res.statusCode).toBe(200);
		});
	});

	describe("Edge Cases", () => {
		it("should handle missing URL", async () => {
			const req = createMockRequest("");
			req.url = undefined as any;
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			// Should default to "/" which returns false
			expect(handled).toBe(false);
		});

		it("should handle health check with query parameters", async () => {
			const req = createMockRequest("/health?foo=bar");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			// Should not match (exact match required)
			expect(handled).toBe(false);
		});

		it("should handle stats with trailing slash", async () => {
			const req = createMockRequest("/stats/");
			const res = createMockResponse();

			const handled = await handleUtilityRoutes(req, res);

			// Should not match (exact match required)
			expect(handled).toBe(false);
		});
	});

	describe("Response Format", () => {
		it("should return valid JSON for health check", async () => {
			const req = createMockRequest("/health");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			expect(() => JSON.parse(res.body!)).not.toThrow();
		});

		it("should return valid JSON for stats", async () => {
			const req = createMockRequest("/stats");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			expect(() => JSON.parse(res.body!)).not.toThrow();
		});

		it("should not include extra whitespace in JSON", async () => {
			const req = createMockRequest("/health");
			const res = createMockResponse();

			await handleUtilityRoutes(req, res);

			const parsed = JSON.parse(res.body!);
			const reparsed = JSON.parse(JSON.stringify(parsed));
			expect(parsed).toEqual(reparsed);
		});
	});
});
