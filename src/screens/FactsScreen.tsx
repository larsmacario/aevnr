import { useEffect, useMemo, useState } from "react";
import { displayStyle, labelStyle, M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { ScreenScroll } from "../components/ScreenScroll";
import { FACT_TOPIC_LABELS, type DailyFact } from "../lib/facts";
import { supabase } from "../lib/supabase";

type FactsState = "loading" | "ready" | "needs_topics" | "before_six" | "preparing" | "error";

interface FactsResponse {
  state?: FactsState;
  fact?: (DailyFact & { assignmentId: string }) | null;
  facts?: Array<DailyFact & { assignmentId: string }>;
  error?: string;
}

export function FactsScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [state, setState] = useState<FactsState>("loading");
  const [fact, setFact] = useState<(DailyFact & { assignmentId: string }) | null>(null);
  const [savedFacts, setSavedFacts] = useState<Array<DailyFact & { assignmentId: string }>>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadFact = async () => {
    setState("loading");
    const { data, error } = await supabase.functions.invoke("facts", { body: {} });
    const result = data as FactsResponse | null;
    if (error || result?.error) {
      setState("error");
      setFeedback("Dein nächster Fakt wird gerade vorbereitet.");
      return;
    }
    setFact(result?.fact ?? null);
    setState(result?.state ?? "preparing");
  };

  useEffect(() => { void loadFact(); }, []);

  useEffect(() => {
    if (!searchOpen) return;
    void (async () => {
      const { data } = await supabase.functions.invoke("facts", { body: { view: "saved" } });
      setSavedFacts((data as FactsResponse | null)?.facts ?? []);
    })();
  }, [searchOpen]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("de-DE");
    if (!normalized) return savedFacts;
    return savedFacts.filter((entry) => `${entry.title} ${entry.body}`.toLocaleLowerCase("de-DE").includes(normalized));
  }, [query, savedFacts]);

  const handleShare = async () => {
    if (!fact) return;
    const text = `${fact.title}\n\n${fact.body}${fact.sources[0] ? `\n\nQuelle: ${fact.sources[0].pubmedUrl}` : ""}`;
    try {
      const canShare = typeof navigator.share === "function";
      if (canShare) await navigator.share({ title: fact.title, text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error("Teilen ist auf diesem Gerät nicht verfügbar");
      setFeedback(canShare ? "Geteilt" : "Text kopiert");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(error instanceof Error ? error.message : "Teilen ist gerade nicht möglich");
    }
  };

  const toggleSaved = async () => {
    if (!fact) return;
    const nextSaved = !fact.saved;
    setFact({ ...fact, saved: nextSaved });
    const { error } = await supabase.functions.invoke("facts", { body: { action: "toggle_saved", assignmentId: fact.assignmentId, saved: nextSaved } });
    if (error) {
      setFact({ ...fact, saved: !nextSaved });
      setFeedback("Speichern ist gerade nicht möglich");
    }
  };

  const cardTitle = fact?.title ?? (state === "before_six" ? "Dein Fakt erscheint um 06:00 Uhr" : state === "needs_topics" ? "Wähle deine Themen" : state === "preparing" ? "Dein erster Fakt wird vorbereitet" : "Fakten für ein langes Leben");
  const cardBody = fact?.body ?? (state === "before_six" ? "Ab 06:00 Uhr Ortszeit findest du hier einen neuen, fundierten Impuls." : state === "needs_topics" ? "Wähle bis zu drei Interessen aus, damit wir deine täglichen Fakten passend zusammenstellen können." : state === "preparing" ? "Sobald ein passender, quellengeprüfter Fakt bereitsteht, erscheint er hier." : state === "error" ? "Bitte versuche es später noch einmal." : "Dein heutiger Faktenimpuls wird geladen.");

  return (
    <ScreenScroll page>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div><div style={{ ...labelStyle() }}>FÜR DICH</div><div style={{ ...displayStyle(24), marginTop: 4 }}>Fakten</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MButton type="button" variant="ghost" size="sm" onClick={onOpenProfile} style={{ color: M.fg, padding: "0 10px" }}><Icon name="user" size={16} /> Profil</MButton>
          <MButton type="button" variant="secondary" size="icon" onClick={() => setSearchOpen((open) => !open)} aria-label="Gespeicherte Fakten durchsuchen" title="Suchen" style={{ background: M.card, borderColor: M.line }}><Icon name="search" size={21} color={M.fg} /></MButton>
        </div>
      </div>

      {searchOpen ? <div style={{ marginTop: 16 }}>
        <label htmlFor="facts-search" style={{ ...labelStyle(), display: "block", marginBottom: 6 }}>Gespeicherte Fakten durchsuchen</label>
        <input id="facts-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchbegriff eingeben" autoFocus style={{ width: "100%", boxSizing: "border-box", height: 48, padding: "0 14px", borderRadius: 14, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: `500 15px ${M.body}`, outline: "none" }} />
        {query.trim() ? <div style={{ marginTop: 10, display: "grid", gap: 8 }}>{results.length ? results.map((entry) => <div key={entry.assignmentId} style={{ padding: 12, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}><div style={{ fontWeight: 700, fontSize: 14 }}>{entry.title}</div><div style={{ color: M.mut, fontSize: 13, lineHeight: 1.4, marginTop: 4 }}>{entry.body}</div></div>) : <div style={{ ...labelStyle() }}>Keine gespeicherten Fakten gefunden.</div>}</div> : null}
      </div> : null}

      <section style={{ minHeight: 430, marginTop: 28, padding: "28px 22px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", borderRadius: 24, background: M.card, border: `1px solid ${M.line2}`, boxShadow: M.shadow }}>
        <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 24, background: M.accSoft, color: M.fg, marginTop: 36 }}><Icon name="book" size={24} stroke={2} /></div>
        {fact ? <div style={{ ...labelStyle(), marginTop: 20 }}>{FACT_TOPIC_LABELS[fact.topic]}</div> : null}
        <h1 style={{ ...displayStyle(30), margin: "10px 0 0", maxWidth: 320 }}>{cardTitle}</h1>
        <p style={{ maxWidth: 330, margin: "14px 0 0", color: M.mut, fontSize: 15, lineHeight: 1.5 }}>{cardBody}</p>
        {fact?.sources.length ? <MButton type="button" variant="ghost" size="sm" onClick={() => setSourcesOpen((open) => !open)} style={{ marginTop: 16, color: M.fg }}>Quellen {sourcesOpen ? "ausblenden" : "anzeigen"} <Icon name={sourcesOpen ? "chevD" : "chevR"} size={15} /></MButton> : null}
        {sourcesOpen ? <div style={{ width: "100%", marginTop: 6, textAlign: "left", display: "grid", gap: 8 }}>{fact?.sources.map((source) => <a key={source.pmid} href={source.pubmedUrl} target="_blank" rel="noreferrer" style={{ display: "block", color: M.fg, textDecoration: "none", padding: 11, borderRadius: 12, background: M.bg, border: `1px solid ${M.line2}` }}><div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{source.title}</div><div style={{ ...labelStyle(), marginTop: 5 }}>{source.authors} · {source.journal} · {source.publicationYear}</div></a>)}</div> : null}
        <div style={{ flex: 1 }} />
        {feedback ? <div role="status" style={{ ...labelStyle(), color: M.fg, marginBottom: 14 }}>{feedback}</div> : null}
        {fact ? <div style={{ width: "100%", display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}><MButton type="button" variant="ghost" size="icon" onClick={() => void handleShare()} aria-label="Fakt teilen" title="Teilen" style={{ color: M.fg }}><Icon name="share" size={22} color={M.fg} /></MButton><span style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{fact.saved ? "Für später gespeichert" : "Heute für dich"}</span><MButton type="button" variant="ghost" size="icon" onClick={() => void toggleSaved()} aria-label={fact.saved ? "Aus Favoriten entfernen" : "Für später speichern"} title={fact.saved ? "Gespeichert" : "Speichern"} style={{ color: M.fg }}><Icon name="heartOutline" size={24} color={M.fg} fill={fact.saved ? M.fg : "none"} /></MButton></div> : null}
      </section>
    </ScreenScroll>
  );
}
