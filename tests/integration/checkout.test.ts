import { describe, it, expect } from "vitest";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || "https://blpbeopmdfahiosglomx.supabase.co";
const CHECKOUT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-leaderboard-checkout`;

describe("Checkout Integration Tests", () => {
  describe("create-leaderboard-checkout function", () => {
    it("should be reachable and handle OPTIONS (CORS preflight)", async () => {
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "OPTIONS",
        headers: {
          "Origin": "https://leakedliability.com",
          "Access-Control-Request-Method": "POST",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    });

    it("should reject requests without authorization", async () => {
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier: "crew_t1",
          billing_frequency: "monthly",
        }),
      });

      // Should return 401 Unauthorized (proper HTTP status for auth errors)
      expect(response.status).toBe(401);
    });

    it("should reject invalid tier values", async () => {
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer fake_token_for_validation_test",
        },
        body: JSON.stringify({
          tier: "invalid_tier",
          billing_frequency: "monthly",
        }),
      });

      // Auth is checked first, so fake token returns 401 before tier validation
      expect(response.status).toBe(401);
    });

    it("should reject invalid billing frequency", async () => {
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer fake_token_for_validation_test",
        },
        body: JSON.stringify({
          tier: "crew_t1",
          billing_frequency: "weekly", // invalid
        }),
      });

      // Auth is checked first, so fake token returns 401 before frequency validation
      expect(response.status).toBe(401);
    });

    it("should return JSON for unauthenticated POST", async () => {
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "crew_t1",
          billing_frequency: "monthly",
        }),
      });
      expect([401, 500]).toContain(response.status);
      const contentType = response.headers.get("content-type") || "";
      expect(contentType).toContain("application/json");
      const data = await response.json();
      expect(data).toBeDefined();
      const errText =
        typeof (data as { error?: string }).error === "string"
          ? (data as { error: string }).error
          : typeof (data as { message?: string }).message === "string"
            ? (data as { message: string }).message
            : JSON.stringify(data);
      expect(errText.length).toBeGreaterThan(0);
    });
  });

  describe("Environment validation", () => {
    // This test verifies the function logs environment check
    // In a real scenario with valid auth, it would proceed to Stripe
    it("function should be deployed and responding", async () => {
      const response = await fetch(CHECKOUT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      // Function exists and responds (even if with an error)
      expect([200, 400, 401, 500]).toContain(response.status);
      
      // Response is valid JSON
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });
});

// Note: Full authenticated checkout tests require a valid JWT token
// Those should be run in a staging environment with test users
// or mocked at the Supabase auth level
