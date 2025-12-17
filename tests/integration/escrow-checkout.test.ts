import { describe, it, expect } from "vitest";

const SUPABASE_URL = "https://blpbeopmdfahiosglomx.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-escrow-checkout`;

describe("Escrow Checkout Integration Tests", () => {
  describe("create-escrow-checkout function", () => {
    it("should handle OPTIONS (CORS preflight)", async () => {
      const response = await fetch(FUNCTION_URL, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    });

    it("should reject requests without payment_code", async () => {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("payment_code required");
    });

    it("should reject invalid/non-existent payment codes", async () => {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_code: "INVALID123",
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("Invalid or expired payment code");
    });

    it("should reject null payment_code value", async () => {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_code: null,
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject empty string payment_code", async () => {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_code: "",
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("Environment validation", () => {
    it("function should be deployed and responding", async () => {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payment_code: "test" }),
      });

      // Function should respond (not 404 or network failure)
      expect([200, 400, 500]).toContain(response.status);
      
      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("application/json");
    });
  });
});
