import { describe, expect, it } from "vitest";
import { normalizeFactTimezone, normalizeFactTopics } from "./facts";

describe("Faktenpräferenzen", () => {
  it("akzeptiert nur bekannte Themen und maximal drei Werte", () => {
    expect(normalizeFactTopics(["sleep", "nutrition", "sleep", "unknown", "movement", "gut_health"])).toEqual(["sleep", "nutrition", "movement"]);
  });

  it("fällt bei ungültiger Zeitzone auf Berlin zurück", () => {
    expect(normalizeFactTimezone("Mars/Olympus")).toBe("Europe/Berlin");
    expect(normalizeFactTimezone("Europe/Berlin")).toBe("Europe/Berlin");
  });
});
