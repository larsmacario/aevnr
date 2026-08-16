import { describe, expect, it } from "vitest";
import { splitHealthspanDomains } from "./HealthspanDashboard";
import type { HealthspanDomain } from "../lib/healthspan";

const domains: HealthspanDomain[] = [
  { id: "strength", label: "Kraft", progress: 0, detail: "" },
  { id: "endurance", label: "Ausdauer", progress: 0, detail: "" },
  { id: "nutrition", label: "Ernährung & Körper", progress: 0, detail: "" },
  { id: "recovery", label: "Erholung", progress: 0, detail: "" },
  { id: "metabolism", label: "Stoffwechsel-Rhythmus", progress: 0, detail: "" },
];

describe("HealthspanDashboard", () => {
  it("hält vier gleichwertige Bereiche im Raster und lagert Erholung aus", () => {
    const result = splitHealthspanDomains(domains);
    expect(result.gridDomains.map((domain) => domain.id)).toEqual(["strength", "endurance", "nutrition", "metabolism"]);
    expect(result.recoveryDomain?.id).toBe("recovery");
  });

  it("funktioniert auch ohne Erholungs-Domain", () => {
    const result = splitHealthspanDomains(domains.filter((domain) => domain.id !== "recovery"));
    expect(result.gridDomains).toHaveLength(4);
    expect(result.recoveryDomain).toBeUndefined();
  });
});
