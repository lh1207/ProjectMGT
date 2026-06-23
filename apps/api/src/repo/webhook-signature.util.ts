import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function signWebhookPayload(
  secret: string,
  rawBody: string | Buffer,
): string {
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `${SIGNATURE_PREFIX}${digest}`;
}

export function verifyWebhookSignature(
  secret: string,
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice(SIGNATURE_PREFIX.length);
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
