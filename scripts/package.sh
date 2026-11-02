#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
destination="${1:-dist}"
mkdir -p "$destination"
output="$destination/NUFE-Schedule.zip"
rm -f "$output"
zip -q -X -j "$output" index.tsx intent.tsx widget.tsx widget-data.ts script.json
test "$(unzip -Z1 "$output" | wc -l | tr -d " ")" = "5"
unzip -t "$output"
