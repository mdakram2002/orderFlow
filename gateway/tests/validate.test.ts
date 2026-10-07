import { describe, expect, it } from "vitest";
import { errorResponse } from "../src/middleware";

describe("gateway error envelope", () => {
  it("includes request correlation", () => {
    expect(errorResponse("NOT_FOUND", "Missing", "req_test")).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Missing", requestId: "req_test" },
    });
  });
});

