import { CONTENT_HORIZONTAL_PADDING, FOOTER_BAR_PADDING_BOTTOM, useContentColumnStyle } from "../lib/responsive";
import type { SaveSessionInput } from "../lib/db";
import type { TimerCfg, TimerMode } from "../lib/engine";
import { IntervalTimerWizard } from "../components/intervalTimer/IntervalTimerWizard";

export interface TimerScreenProps {
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
  onBack: () => void;
  initialMode?: TimerMode;
  initialConfig?: TimerCfg;
  sessionTags?: string[];
}

export function TimerScreen({ onSaveSession, onBack, initialMode, initialConfig, sessionTags }: TimerScreenProps) {
  const columnStyle = useContentColumnStyle();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...columnStyle,
        // Der Wizard besitzt einen Footer; dieser Container hält ihn über dem iOS-Home-Indikator.
        padding: `0 ${CONTENT_HORIZONTAL_PADDING}px ${FOOTER_BAR_PADDING_BOTTOM}`,
        boxSizing: "border-box",
      }}
    >
      <IntervalTimerWizard
        variant="screen"
        onSaveSession={onSaveSession}
        onExit={onBack}
        showHeader
        initialMode={initialMode}
        initialConfig={initialConfig}
        sessionTags={sessionTags}
      />
    </div>
  );
}
