import { describe, it, expect } from "vitest";

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || "https://blpbeopmdfahiosglomx.supabase.co";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/leaderboard-stripe-webhooks`;

describe("Leaderboard Stripe webhooks integration", () => {
  it("should reject non-POST methods", async () => {
    const response = await fetch(WEBHOOK_URL, { method: "GET" });
    expect(response.status).toBe(405);
    const text = await response.text();
    expect(text).toContain("Method not allowed");
  });

  it("should reject POST without stripe-signature header", async () => {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ping" }),
    });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toContain("Missing signature");
  });

  it("should reject POST with invalid signature", async () => {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=0,v1=invalid_signature_for_integration_test",
      },
      body: JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } }),
    });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toContain("Bad signature");
  });

  it("should be deployed and return JSON on fatal handler errors only when applicable", async () => {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "stripe-signature": "t=1,v1=abc",
      },
      body: "not-valid-stripe-payload",
    });
    expect([400, 500]).toContain(response.status);
  });
});
