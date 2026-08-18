const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Z0-9._~+/=-]+/gi;
const secretAssignmentPattern =
  /\b(api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+/gi;
const labelledPhonePattern =
  /\b(phone|whatsapp)\s*[:=]\s*\+?[\d\s().-]{8,}\d/gi;

type StringLogField =
  | "route"
  | "job"
  | "outcome"
  | "errorCode"
  | "entityId"
  | "releaseId"
  | "productId"
  | "categoryId";

type NumberLogField = "durationMs" | "attempt" | "count";

const allowedStringFields = new Set<StringLogField>([
  "route",
  "job",
  "outcome",
  "errorCode",
  "entityId",
  "releaseId",
  "productId",
  "categoryId",
]);

const allowedNumberFields = new Set<NumberLogField>([
  "durationMs",
  "attempt",
  "count",
]);

export interface LogContext {
  route?: string;
  job?: string;
  durationMs?: number;
  outcome?: string;
  errorCode?: string;
  entityId?: string;
  releaseId?: string;
  productId?: string;
  categoryId?: string;
  attempt?: number;
  count?: number;
}

export function redactLogText(value: string): string {
  return value
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(bearerPattern, "Bearer [REDACTED_TOKEN]")
    .replace(secretAssignmentPattern, "$1=[REDACTED_SECRET]")
    .replace(labelledPhonePattern, "$1=[REDACTED_PHONE]");
}

function isStringLogField(key: string): key is StringLogField {
  return allowedStringFields.has(key as StringLogField);
}

function isNumberLogField(key: string): key is NumberLogField {
  return allowedNumberFields.has(key as NumberLogField);
}

export function sanitizeLogContext(input: unknown): LogContext {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(input)) {
    if (isStringLogField(key) && typeof value === "string") {
      const withoutQuery = key === "route" ? value.split(/[?#]/, 1)[0] : value;
      sanitized[key] = redactLogText(withoutQuery).slice(0, 256);
      continue;
    }

    if (
      isNumberLogField(key) &&
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
