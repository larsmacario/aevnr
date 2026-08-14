import { describe, expect, it } from "vitest";
import { FACT_APP_ACTIONS, normalizeFactTimezone, normalizeFactTopics } from "./facts";

describe("Faktenpräferenzen", () => {
  it("akzeptiert nur bekannte Themen und maximal drei Werte", () => {
    expect(normalizeFactTopics(["sleep", "nutrition", "sleep", "unknown", "movement", "gut_health"])).toEqual(["sleep", "nutrition", "movement"]);
  });

  it("fällt bei ungültiger Zeitzone auf Berlin zurück", () => {
    expect(normalizeFactTimezone("Mars/Olympus")).toBe("Europe/Berlin");
    expect(normalizeFactTimezone("Europe/Berlin")).toBe("Europe/Berlin");
  });

  it("beschränkt App-Hilfen auf die bekannten Navigationsziele", () => {
    expect(FACT_APP_ACTIONS).toEqual(["checkin", "breathing", "express", "protein", "water", "ai_plan"]);
  });
});
