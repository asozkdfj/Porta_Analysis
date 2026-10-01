import { describe, expect, it } from "vitest";
import { formatGraphRoleTitle } from "../../src/renderer/src/components/drop-zones/DropZoneCanvas";
import { createEmptyRoles } from "../../src/shared/schemas/types";

describe("formatGraphRoleTitle", () => {
  it("joins multiple Y with & vs X", () => {
    const roles = createEmptyRoles();
    roles.y = [
      { columnId: "a", name: "errStr" },
      { columnId: "b", name: "TesterID" },
    ];
    roles.x = [{ columnId: "c", name: "SerialNumber" }];
    expect(formatGraphRoleTitle(roles)).toBe("errStr & TesterID vs. SerialNumber");
  });

  it("shortens PROX:: names to leaf", () => {
    const roles = createEmptyRoles();
    roles.y = [{ columnId: "a", name: "PROX::MOD_BC4MM" }];
    roles.x = [{ columnId: "b", name: "SerialNumber" }];
    expect(formatGraphRoleTitle(roles)).toBe("MOD_BC4MM vs. SerialNumber");
  });
});
