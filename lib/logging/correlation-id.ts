import "server-only";

import { randomUUID } from "node:crypto";

import { selectCorrelationId } from "./log-record";

export function createCorrelationId(trustedCandidate?: string | null): string {
  return selectCorrelationId(trustedCandidate, randomUUID());
}
