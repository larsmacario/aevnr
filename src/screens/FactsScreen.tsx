import { useState } from "react";
import { displayStyle, labelStyle, M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { ScreenScroll } from "../components/ScreenScroll";

const CATEGORIES = ["Für dich", "Bewegung", "Ernährung", "Erholung"];

export function FactsScreen() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleShare = async () => {
    const text = "Fakten für ein langes Leben kommen bald in ÆVNR.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "ÆVNR Fakten", text });
        setFeedback("Geteilt");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setFeedback("Text kopiert");
      } else {
        setFeedback("Teilen ist auf diesem Gerät nicht verfügbar");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback("Teilen ist gerade nicht möglich");
    }
  };

  return (
    <ScreenScroll page>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <MButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setCategoryOpen((open) => !open)}
            aria-expanded={categoryOpen}
            aria-haspopup="listbox"
            style={{ background: M.card, borderColor: M.line, minWidth: 142, justifyContent: "space-between" }}
          >
            {category} <Icon name="chevD" size={17} color={M.fg} />
          </MButton>
          {categoryOpen ? (
            <div
              role="listbox"
              aria-label="Faktenkategorie"
              style={{ position: "absolute", top: 54, left: 0, zIndex: 2, minWidth: 180, padding: 6, borderRadius: 14, background: M.panel, border: `1px solid ${M.line}`, boxShadow: M.shadow }}
            >
              {CATEGORIES.map((item) => (
                <MButton
                  key={item}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCategory(item); setCategoryOpen(false); setFeedback(null); }}
                  role="option"
                  aria-selected={category === item}
                  style={{ width: "100%", justifyContent: "flex-start", color: category === item ? M.fg : M.mut, padding: "0 12px" }}
                >
                  {item}
                </MButton>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <MButton type="button" variant="secondary" size="icon" onClick={() => setSearchOpen((open) => !open)} aria-label="Fakten durchsuchen" title="Suchen" style={{ background: M.card, borderColor: M.line }}>
            <Icon name="search" size={21} color={M.fg} />
          </MButton>
        </div>
      </div>

      {searchOpen ? (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="facts-search" style={{ ...labelStyle(), display: "block", marginBottom: 6 }}>Fakten durchsuchen</label>
          <input id="facts-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchbegriff eingeben" autoFocus style={{ width: "100%", boxSizing: "border-box", height: 48, padding: "0 14px", borderRadius: 14, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: `500 15px ${M.body}`, outline: "none" }} />
        </div>
      ) : null}

      <section style={{ minHeight: 430, marginTop: 28, padding: "28px 22px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", borderRadius: 24, background: M.card, border: `1px solid ${M.line2}`, boxShadow: M.shadow }}>
        <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 24, background: M.accSoft, color: M.fg, marginTop: 48 }}>
          <Icon name="book" size={24} stroke={2} />
        </div>
        <div style={{ ...labelStyle(), marginTop: 20 }}>{category}</div>
        <h1 style={{ ...displayStyle(30), margin: "10px 0 0", maxWidth: 300 }}>Fakten für ein langes Leben</h1>
        <p style={{ maxWidth: 315, margin: "14px 0 0", color: M.mut, fontSize: 15, lineHeight: 1.5 }}>
          {query.trim() ? `Für „${query.trim()}“ bereiten wir passende Impulse vor.` : "Hier erscheinen bald verständliche, fundierte Impulse für deinen Healthspan-Alltag."}
        </p>
        <div style={{ flex: 1 }} />
        {feedback ? <div role="status" style={{ ...labelStyle(), color: M.fg, marginBottom: 14 }}>{feedback}</div> : null}
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}>
          <MButton type="button" variant="ghost" size="icon" onClick={() => void handleShare()} aria-label="Fakten teilen" title="Teilen" style={{ color: M.fg }}>
            <Icon name="share" size={22} color={M.fg} />
          </MButton>
          <span style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{saved ? "Für später gespeichert" : "Deine Fakten kommen bald"}</span>
          <MButton type="button" variant="ghost" size="icon" onClick={() => setSaved((value) => !value)} aria-label={saved ? "Aus Favoriten entfernen" : "Für später speichern"} title={saved ? "Gespeichert" : "Speichern"} style={{ color: M.fg }}>
            <Icon name="heartOutline" size={24} color={M.fg} fill={saved ? M.fg : "none"} />
          </MButton>
        </div>
      </section>
    </ScreenScroll>
  );
}
