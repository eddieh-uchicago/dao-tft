import { describe, expect, it } from "vitest";
import { traitStyle } from "./traits";

describe("traitStyle", () => {
  it("is inactive below the first threshold", () => {
    expect(traitStyle(1, [2, 4, 6])).toBeNull();
    expect(traitStyle(1, [])).toBeNull();
  });

  it("goes bronze, silver, then gold", () => {
    expect(traitStyle(2, [2, 4, 6])).toBe("bronze");
    expect(traitStyle(5, [2, 4, 6])).toBe("silver");
    expect(traitStyle(6, [2, 4, 6])).toBe("gold");
  });

  it("goes prismatic at the last threshold only when there are more than 3", () => {
    expect(traitStyle(4, [2, 3, 4, 5])).toBe("gold");
    expect(traitStyle(5, [2, 3, 4, 5])).toBe("prismatic");
    expect(traitStyle(9, [3, 5, 7, 9, 11])).toBe("gold");
    expect(traitStyle(11, [3, 5, 7, 9, 11])).toBe("prismatic");
  });
});
