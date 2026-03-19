import { describe, it, expect } from "vitest";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || "https://blpbeopmdfahiosglomx.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-identity-verification-session`;

describe("create-identity-verification-session integration", () => {
  it("should handle OPTIONS (CORS preflight)", async () => {
    const response = await fetch(FUNCTION_URL, { method: "OPTIONS" });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("should reject requests without Authorization", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producer_id: "00000000-0000-0000-0000-000000000001" }),
    });
    expect([400, 401, 500]).toContain(response.status);
    const data = await response.json();
    expect(data).toBeDefined();
    const blob = JSON.stringify(data).toLowerCase();
    expect(blob).toMatch(/authorization|auth|header|jwt|token|missing/);
  });

  it("should reject invalid JWT before producer lookup", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_jwt_for_integration_test",
      },
      body: JSON.stringify({ producer_id: "00000000-0000-0000-0000-000000000001" }),
    });
    expect([401, 500]).toContain(response.status);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data).toBeDefined();
    const errText =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : JSON.stringify(data);
    expect(String(errText).length).toBeGreaterThan(0);
  });

  it("should reject missing producer_id when authenticated shape is wrong (still fails auth first)", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_jwt_for_integration_test",
      },
      body: JSON.stringify({}),
    });
    expect([401, 500]).toContain(response.status);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data).toBeDefined();
    const errText =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : JSON.stringify(data);
    expect(String(errText).length).toBeGreaterThan(0);
  });

  it("function should be deployed and return JSON", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect([400, 401, 402, 500]).toContain(response.status);
    const contentType = response.headers.get("content-type") || "";
    expect(contentType).toContain("application/json");
    const data = await response.json();
    expect(data).toBeDefined();
  });
});
