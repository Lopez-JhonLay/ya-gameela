import { sanitizeLogContext, type LogContext } from "./redaction";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogInput {
  severity: LogLevel;
  event: string;
  correlationId: string;
  context?: LogContext;
}

export interface LogRecord extends LogContext {
  time: string;
  severity: LogLevel;
  event: string;
  correlationId: string;
}

const safeIdentifierPattern = /^[A-Za-z0-9._:-]+$/;

function isSafeIdentifier(value: string, maximumLength: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maximumLength &&
    safeIdentifierPattern.test(value)
  );
}

export function selectCorrelationId(
  trustedCandidate: string | null | undefined,
  fallback: string,
): string {
  if (trustedCandidate && isSafeIdentifier(trustedCandidate, 128)) {
    return trustedCandidate;
  }

  if (!isSafeIdentifier(fallback, 128)) {
    throw new Error("Correlation ID fallback must be a safe identifier");
  }

  return fallback;
}

export function createLogRecord(
  input: LogInput,
  now: Date = new Date(),
): Readonly<LogRecord> {
  const event = isSafeIdentifier(input.event, 64)
    ? input.event
    : "invalid_event";

  return Object.freeze({
    time: now.toISOString(),
    severity: input.severity,
    event,
    correlationId: selectCorrelationId(input.correlationId, "missing"),
    ...sanitizeLogContext(input.context),
  });
}
