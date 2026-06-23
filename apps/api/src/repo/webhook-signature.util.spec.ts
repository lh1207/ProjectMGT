import { signWebhookPayload, verifyWebhookSignature } from "./webhook-signature.util";

describe("webhook-signature.util", () => {
  const secret = "test-webhook-secret";
  const body = Buffer.from('{"event":"push","repoId":"repo-1"}');

  it("verifies a valid signature", () => {
    const signature = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, signature)).toBe(true);
  });

  it("rejects missing or invalid signatures", () => {
    const signature = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, undefined)).toBe(false);
    expect(verifyWebhookSignature(secret, body, "sha256=deadbeef")).toBe(false);
    expect(
      verifyWebhookSignature("wrong-secret", body, signature),
    ).toBe(false);
    expect(
      verifyWebhookSignature(
        secret,
        Buffer.from('{"tampered":true}'),
        signature,
      ),
    ).toBe(false);
  });
});
