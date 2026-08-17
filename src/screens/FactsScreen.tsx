import { useEffect, useMemo, useState } from "react";
import { displayStyle, labelStyle, M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { ScreenScroll } from "../components/ScreenScroll";
import { factLocalDate, type DailyFact } from "../lib/facts";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { cacheFact, cacheFacts, getCachedFactForDate, getCachedFacts, setCachedFactSaved } from "../lib/offline/factStore";
import { enqueueMutation } from "../lib/offline/syncEngine";
import { useI18n } from "../lib/i18n";
import type { TranslationKey } from "../locales/de";

type FactsState = "loading" | "ready" | "needs_topics" | "before_six" | "preparing" | "error";

interface FactsResponse {
  state?: FactsState;
  fact?: (DailyFact & { assignmentId: string }) | null;
  facts?: Array<DailyFact & { assignmentId: string }>;
  error?: string;
}

interface FactsScreenProps {
  onOpenProfile: () => void;
  onOpenCheckin: () => void;
  onOpenBreathing: () => void;
  onOpenExpress: () => void;
  onOpenRecovery: (section: "protein" | "water") => void;
  onOpenAiPlan: () => void;
}

export function FactsScreen({ onOpenProfile, onOpenCheckin, onOpenBreathing, onOpenExpress, onOpenRecovery, onOpenAiPlan }: FactsScreenProps) {
  const { language, locale, t } = useI18n();
  const { user } = useAuth();
  const [state, setState] = useState<FactsState>("loading");
  const [fact, setFact] = useState<(DailyFact & { assignmentId: string }) | null>(null);
  const [historyFacts, setHistoryFacts] = useState<Array<DailyFact & { assignmentId: string }>>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);

  const chooseFact = (next: DailyFact & { assignmentId: string }, index: number) => {
    setFact(next);
    setActiveHistoryIndex(index);
    setSourcesOpen(false);
  };

  const replaceHistory = (items: Array<DailyFact & { assignmentId: string }>, preferredId?: string) => {
    const unique = [...new Map(items.map((item) => [item.assignmentId, item])).values()].sort((a, b) => b.localDate.localeCompare(a.localDate));
    setHistoryFacts(unique);
    const index = Math.max(0, unique.findIndex((item) => item.assignmentId === (preferredId ?? fact?.assignmentId)));
    const selected = unique[index];
    if (selected) chooseFact(selected, index);
  };

  const loadFact = async () => {
    if (!user) return;
    const cachedFacts = await getCachedFacts(user.id, language);
    const cached = await getCachedFactForDate(user.id, language, factLocalDate());
    if (cached) {
      replaceHistory(cachedFacts, cached.assignmentId);
      setState("ready");
    } else {
      setState("loading");
      const { data, error } = await supabase.functions.invoke("facts", { body: { language } });
      const result = data as FactsResponse | null;
      if (error || result?.error) {
        setState("error");
        setFeedback(t("facts.preparingFeedback"));
        return;
      }
      const nextFact = result?.fact ? { ...result.fact, language } : null;
      if (nextFact) {
        await cacheFact(user.id, nextFact);
        replaceHistory([nextFact, ...cachedFacts], nextFact.assignmentId);
      }
      setFact(nextFact);
      setState(result?.state ?? "preparing");
    }
    // Versionsschlüssel lädt den erweiterten Verlauf einmalig nach, auch wenn die
    // erste Cache-Version nur den heutigen Fakt kannte.
    const historyKey = `aevnr:facts-history:v3:${user.id}:${language}`;
    if (localStorage.getItem(historyKey)) return;
    const { data } = await supabase.functions.invoke("facts", { body: { view: "history", language } });
    const history = ((data as FactsResponse | null)?.facts ?? []).map((item) => ({ ...item, language }));
    if (history.length) {
      await cacheFacts(user.id, history);
      replaceHistory([...history, ...cachedFacts], cached?.assignmentId);
    }
    localStorage.setItem(historyKey, "loaded");
  };

  useEffect(() => { void loadFact(); }, [user?.id, language]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    if (!normalized) return historyFacts;
    return historyFacts.filter((entry) => `${entry.title} ${entry.body}`.toLocaleLowerCase(locale).includes(normalized));
  }, [query, historyFacts, locale]);

  const favouriteFacts = useMemo(() => historyFacts.filter((entry) => entry.saved), [historyFacts]);

  const handleShare = async () => {
    if (!fact) return;
    const text = `${fact.title}\n\n${fact.body}${fact.sources[0] ? `\n\n${t("facts.source")}: ${fact.sources[0].pubmedUrl}` : ""}`;
    try {
      const canShare = typeof navigator.share === "function";
      if (canShare) await navigator.share({ title: fact.title, text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else throw new Error(t("facts.shareUnavailable"));
      setFeedback(canShare ? t("facts.shared") : t("facts.copied"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(error instanceof Error ? error.message : t("facts.shareFailed"));
    }
  };

  const toggleSaved = async () => {
    if (!fact) return;
    if (!user) return;
    const nextSaved = !fact.saved;
    const updated = { ...fact, saved: nextSaved };
    setFact(updated);
    setHistoryFacts((items) => items.map((item) => item.assignmentId === fact.assignmentId ? updated : item));
    await setCachedFactSaved(user.id, fact.assignmentId, nextSaved, true);
    await enqueueMutation(user.id, "TOGGLE_FACT_SAVED", { assignmentId: fact.assignmentId, saved: nextSaved });
  };

  const openAction = () => {
    switch (fact?.action?.appAction) {
      case "checkin": onOpenCheckin(); break;
      case "breathing": onOpenBreathing(); break;
      case "express": onOpenExpress(); break;
      case "protein": onOpenRecovery("protein"); break;
      case "water": onOpenRecovery("water"); break;
      case "ai_plan": onOpenAiPlan(); break;
    }
  };

  const actionTitle = fact?.action?.title?.trim().toLocaleLowerCase(locale) === (language === "de" ? "für dich ausprobieren" : "try it for yourself")
    ? t("facts.actionFallback")
    : fact?.action?.title;

  const moveHistory = (direction: -1 | 1) => {
    const nextIndex = activeHistoryIndex + direction;
    const next = historyFacts[nextIndex];
    if (next) chooseFact(next, nextIndex);
  };

  const onCardTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (swipeStart == null) return;
    const end = event.changedTouches[0]?.clientX ?? swipeStart;
    const delta = end - swipeStart;
    if (delta < -50) moveHistory(1);
    if (delta > 50) moveHistory(-1);
    setSwipeStart(null);
  };

  const cardTitle = fact?.title ?? (state === "before_six" ? t("facts.beforeSixTitle") : state === "needs_topics" ? t("facts.needsTopicsTitle") : state === "preparing" ? t("facts.preparingTitle") : t("facts.defaultTitle"));
  const cardBody = fact?.body ?? (state === "before_six" ? t("facts.beforeSixBody") : state === "needs_topics" ? t("facts.needsTopicsBody") : state === "preparing" ? t("facts.preparingBody") : state === "error" ? t("facts.errorBody") : t("facts.loadingBody"));

  return (
    <ScreenScroll page>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div><div style={{ ...labelStyle() }}>{t("facts.forYou")}</div><div style={{ ...displayStyle(24), marginTop: 4 }}>{t("facts.title")}</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MButton type="button" variant="ghost" size="sm" onClick={onOpenProfile} style={{ color: M.fg, padding: "0 10px" }}><Icon name="user" size={16} /> {t("menu.profile")}</MButton>
          <MButton type="button" variant="secondary" size="icon" onClick={() => setSearchOpen((open) => !open)} aria-label={t("facts.search")} title={t("facts.searchTitle")} style={{ background: M.card, borderColor: M.line }}><Icon name="search" size={21} color={M.fg} /></MButton>
        </div>
      </div>

      {searchOpen ? <div style={{ marginTop: 16 }}>
        <label htmlFor="facts-search" style={{ ...labelStyle(), display: "block", marginBottom: 6 }}>{t("facts.search")}</label>
        <input id="facts-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("facts.searchPlaceholder")} autoFocus style={{ width: "100%", boxSizing: "border-box", height: 48, padding: "0 14px", borderRadius: 14, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: `500 15px ${M.body}`, outline: "none" }} />
        {query.trim() ? <div style={{ marginTop: 10, display: "grid", gap: 8 }}>{results.length ? results.map((entry) => <button type="button" key={entry.assignmentId} onClick={() => chooseFact(entry, historyFacts.findIndex((item) => item.assignmentId === entry.assignmentId))} style={{ padding: 12, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, textAlign: "left", color: M.fg, cursor: "pointer" }}><div style={{ fontWeight: 700, fontSize: 14 }}>{entry.title}</div><div style={{ color: M.mut, fontSize: 13, lineHeight: 1.4, marginTop: 4 }}>{entry.body}</div></button>) : <div style={{ ...labelStyle() }}>{t("facts.noneFound")}</div>}</div> : null}
      </div> : null}

      <section onTouchStart={(event) => setSwipeStart(event.touches[0]?.clientX ?? null)} onTouchEnd={onCardTouchEnd} style={{ minHeight: 430, marginTop: 28, padding: "28px 22px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", borderRadius: 24, background: M.card, border: `1px solid ${M.line2}`, boxShadow: M.shadow, touchAction: "pan-y" }}>
        {historyFacts.length > 1 ? <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}><MButton type="button" variant="ghost" size="sm" onClick={() => moveHistory(-1)} disabled={activeHistoryIndex === 0} aria-label={t("facts.newer")}><Icon name="chevL" size={17} /></MButton><span style={{ ...labelStyle() }}>{activeHistoryIndex + 1} / {historyFacts.length}</span><MButton type="button" variant="ghost" size="sm" onClick={() => moveHistory(1)} disabled={activeHistoryIndex === historyFacts.length - 1} aria-label={t("facts.older")}><Icon name="chevR" size={17} /></MButton></div> : null}
        <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 24, background: M.accSoft, color: M.fg, marginTop: 36 }}><Icon name="book" size={24} stroke={2} /></div>
        {fact ? <div style={{ ...labelStyle(), marginTop: 20 }}>{t(`fact.${fact.topic}` as TranslationKey)}</div> : null}
        <h1 style={{ ...displayStyle(30), margin: "10px 0 0", maxWidth: 320 }}>{cardTitle}</h1>
        <p style={{ maxWidth: 330, margin: "14px 0 0", color: M.mut, fontSize: 15, lineHeight: 1.5 }}>{cardBody}</p>
        {fact?.action ? <div style={{ width: "100%", marginTop: 18, textAlign: "left", padding: "16px", boxSizing: "border-box", borderRadius: 16, background: M.bg, border: `1px solid ${M.line2}` }}>
          <div style={{ ...labelStyle(), marginBottom: 7 }}>{t("facts.action")}</div>
          <div style={{ fontWeight: 750, fontSize: 16, lineHeight: 1.3 }}>{actionTitle}</div>
          <p style={{ margin: "7px 0 0", color: M.mut, fontSize: 14, lineHeight: 1.45 }}>{fact.action.body}</p>
          {fact.action.appAction ? <MButton type="button" variant="primary" size="sm" onClick={openAction} style={{ marginTop: 13 }}>{t("facts.start")} <Icon name="chevR" size={15} /></MButton> : null}
        </div> : null}
        {fact?.sources.length ? <MButton type="button" variant="ghost" size="sm" onClick={() => setSourcesOpen((open) => !open)} style={{ marginTop: 16, color: M.fg }}>{t("facts.sources")} {sourcesOpen ? t("facts.sourcesHide") : t("facts.sourcesShow")} <Icon name={sourcesOpen ? "chevD" : "chevR"} size={15} /></MButton> : null}
        {sourcesOpen ? <div style={{ width: "100%", marginTop: 6, textAlign: "left", display: "grid", gap: 8 }}>{fact?.sources.map((source) => <a key={source.pmid} href={source.pubmedUrl} target="_blank" rel="noreferrer" style={{ display: "block", color: M.fg, textDecoration: "none", padding: 11, borderRadius: 12, background: M.bg, border: `1px solid ${M.line2}` }}><div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{source.title}</div><div style={{ ...labelStyle(), marginTop: 5 }}>{source.authors} · {source.journal} · {source.publicationYear}</div></a>)}</div> : null}
        <div style={{ flex: 1 }} />
        {feedback ? <div role="status" style={{ ...labelStyle(), color: M.fg, marginBottom: 14 }}>{feedback}</div> : null}
        {fact ? <div style={{ width: "100%", display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}><MButton type="button" variant="ghost" size="icon" onClick={() => void handleShare()} aria-label={t("facts.share")} title={t("facts.shareTitle")} style={{ color: M.fg }}><Icon name="share" size={22} color={M.fg} /></MButton><span style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{fact.localDate === factLocalDate() ? t("facts.today") : new Date(`${fact.localDate}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })}</span><MButton type="button" variant="ghost" size="icon" onClick={() => void toggleSaved()} aria-label={fact.saved ? t("facts.removeSaved") : t("facts.saveLater")} title={fact.saved ? t("facts.savedTitle") : t("facts.saveTitle")} style={{ color: M.fg }}><Icon name="heartOutline" size={24} color={M.fg} fill={fact.saved ? M.fg : "none"} /></MButton></div> : null}
      </section>
      {favouriteFacts.length ? <section style={{ marginTop: 20 }}><div style={{ ...labelStyle(), marginBottom: 10 }}>{t("facts.saved")}</div><div style={{ display: "grid", gap: 8 }}>{favouriteFacts.map((entry) => <button type="button" key={entry.assignmentId} onClick={() => chooseFact(entry, historyFacts.findIndex((item) => item.assignmentId === entry.assignmentId))} style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 16, border: `1px solid ${M.line2}`, background: M.card, color: M.fg, textAlign: "left", cursor: "pointer" }}><Icon name="heartOutline" size={18} fill={M.fg} /><span style={{ fontWeight: 650, fontSize: 14, lineHeight: 1.3, flex: 1 }}>{entry.title}</span><Icon name="chevR" size={16} color={M.mut} /></button>)}</div></section> : null}
    </ScreenScroll>
  );
}
