import { describe, expect, it } from "vitest";

import { actionFailure, actionSuccess } from "@/modules/platform";

describe("ActionResult constructors", () => {
  it("creates minimal success results", () => {
    expect(actionSuccess({ id: "opaque-id" })).toEqual({
      ok: true,
      data: { id: "opaque-id" },
    });
  });

  it("omits field errors unless supplied", () => {
    expect(actionFailure("invalid_input")).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(actionFailure("invalid_input", { name: ["Required"] })).toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { name: ["Required"] },
    });
  });
});
