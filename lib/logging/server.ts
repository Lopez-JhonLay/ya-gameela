import "server-only";

import { serverEnv } from "@/lib/env/server";

import { createLogRecord, type LogInput, type LogLevel } from "./log-record";

const logLevelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function writeLog(input: LogInput): void {
  if (
    logLevelPriority[input.severity] < logLevelPriority[serverEnv.LOG_LEVEL]
  ) {
    return;
  }

  const output = JSON.stringify(createLogRecord(input));

  switch (input.severity) {
    case "debug":
      console.debug(output);
      break;
    case "info":
      console.info(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
  }
}
