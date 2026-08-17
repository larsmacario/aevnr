import { describe, expect, it } from "vitest";
import { localeForLanguage, normalizeAppLanguage } from "./language";

describe("app language", () => {
  it("normalizes supported device and profile language tags", () => {
    expect(normalizeAppLanguage("de-DE")).toBe("de");
    expect(normalizeAppLanguage("en_US")).toBe("en");
    expect(normalizeAppLanguage("fr-FR")).toBeNull();
    expect(normalizeAppLanguage(null)).toBeNull();
  });

  it("maps app languages to formatting locales", () => {
    expect(localeForLanguage("de")).toBe("de-DE");
    expect(localeForLanguage("en")).toBe("en-US");
  });
});
