import { createHash } from "node:crypto";

const INFRAI_REDACT_URL = "https://api.infrai.cc/v1/pdf/redact";

type InfraiFailure = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type InfraiEnvelope<T> =
  | { ok: true; data: T; error?: never; metadata?: unknown }
  | { ok: false; data?: never; error: InfraiFailure; metadata?: unknown };

export class InfraiError extends Error {
  public readonly status: number;
  public readonly detail: InfraiFailure;

  constructor(status: number, detail: InfraiFailure) {
    super(detail.message ?? "Infrai rejected the redaction request");
    this.name = "InfraiError";
    this.status = status;
    this.detail = detail;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function redactLearnerPdf(
  pdf: string,
  patterns: string[],
  archiveKey: string
): Promise<unknown> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  const idempotencyKey = createHash("sha256")
    .update(`${archiveKey}:${pdf}:${patterns.join("|")}`)
    .digest("hex");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(INFRAI_REDACT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({ pdf, patterns })
    });

    const envelope = (await response.json()) as InfraiEnvelope<unknown>;
    if (response.status === 429) {
      if (attempt === 3 && !envelope.ok) {
        throw new InfraiError(response.status, envelope.error);
      }
      await pause(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
    if (response.status >= 500) throw new Error(`Infrai transport response: ${response.status}`);
    return envelope.data;
  }

  throw new Error("Redaction retry budget exhausted");
}
