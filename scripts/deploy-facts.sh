#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="jnspiqnlwbsobqctmfnk"
npx supabase@latest functions deploy facts assign-daily-facts generate-fact-library --project-ref "$PROJECT_REF"
echo "Fakten-Functions deployt. Anschließend Vault-Secrets setzen und supabase/facts-cron.sql ausführen."
