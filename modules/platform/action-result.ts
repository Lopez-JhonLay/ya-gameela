export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: string; fieldErrors?: FieldErrors };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFailure(
  code: string,
  fieldErrors?: FieldErrors,
): ActionResult<never> {
  return fieldErrors === undefined
    ? { ok: false, code }
    : { ok: false, code, fieldErrors };
}
