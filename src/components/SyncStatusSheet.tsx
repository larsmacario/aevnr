import { useCallback, useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { processSyncQueue } from "../lib/db";
import { getPendingSyncEntries } from "../lib/offline/syncQueue";
import type { SyncQueueEntry } from "../lib/offline/types";
import { useNetwork } from "../lib/offline/networkStatus";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { useI18n } from "../lib/i18n";

export interface SyncStatusSheetProps {
  open: boolean;
  onClose: () => void;
  pendingCount: number;
  onSynced?: () => void;
}

export function SyncStatusSheet({ open, onClose, pendingCount, onSynced }: SyncStatusSheetProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const [entries, setEntries] = useState<SyncQueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      return;
    }
    setEntries(await getPendingSyncEntries(user.id));
  }, [user]);

  useEffect(() => {
    if (open) void loadEntries();
  }, [open, loadEntries, pendingCount]);

  const handleSync = async () => {
    if (!user || !isOnline || syncing) return;
    setSyncing(true);
    try {
      await processSyncQueue(user.id);
      await loadEntries();
      onSynced?.();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("sync.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 20, color: M.fg }}>{t("sync.title")}</div>
        <p style={{ margin: 0, color: M.mut, fontSize: 13, lineHeight: 1.45 }}>
          {isOnline
            ? t("sync.online")
            : t("sync.offline")}
        </p>

        {entries.length === 0 ? (
          <div style={{ color: M.mut, fontSize: 13 }}>{t("sync.empty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: M.bg,
                  border: `1px solid ${M.line}`,
                  fontSize: 13,
                  color: M.fg,
                }}
              >
                <div style={{ fontWeight: 600 }}>{entry.op.replace(/_/g, " ")}</div>
                {entry.lastError && (
                  <div style={{ color: M.danger, marginTop: 4 }}>{entry.lastError}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {isOnline && entries.length > 0 && (
          <MButton variant="primary" size="md" fullWidth onClick={() => void handleSync()} loading={syncing}>
            {t("sync.now")}
          </MButton>
        )}
      </div>
    </BottomSheet>
  );
}
