#!/usr/bin/env bash
# Sets a 30-day expiry lifecycle rule on the backups/ prefix of the production R2 bucket.
# Run once before launch: bash scripts/setup-r2-lifecycle.sh
set -euo pipefail

BUCKET="localmatal-images"
RULE_ID="backup-retention-30d"

echo "Setting 30-day lifecycle rule on R2 bucket: $BUCKET (prefix: backups/)"

TMPFILE=$(mktemp /tmp/r2-lifecycle-XXXXXX.json)
trap 'rm -f "$TMPFILE"' EXIT

cat > "$TMPFILE" <<JSON
{
  "Rules": [
    {
      "ID": "$RULE_ID",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/" },
      "Expiration": { "Days": 30 }
    }
  ]
}
JSON

npx wrangler r2 bucket lifecycle set "$BUCKET" --file "$TMPFILE" --force

echo "Done. Verify with: npx wrangler r2 bucket lifecycle list $BUCKET"
