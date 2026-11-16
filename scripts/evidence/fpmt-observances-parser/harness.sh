#!/usr/bin/env bash
# Mutation harness for scripts/fetch-fpmt-observances.mjs. See README.md.
#
#   CONV=/path/to/scratch/dir  bash harness.sh
#
# CONV is a directory OUTSIDE the repository holding recorded/ (filled by record.mjs, see README.md).
# OLD_REV is the revision whose parser is the one before the K2 fix (default 8a330a5).
EVID="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -W 2>/dev/null || pwd)"
REPO="${REPO:-$(cd "$EVID/../../.." && pwd -W 2>/dev/null || pwd)}"
CONV="${CONV:?set CONV to a scratch directory outside the repository}"
REC="${REC:-$CONV/recorded}"
OLD_REV="${OLD_REV:-8a330a5}"
cd "$CONV" || exit 2
rm -rf "$CONV/new" "$CONV/old" "$CONV/out"
mkdir -p "$CONV/new/scripts" "$CONV/new/test/fixtures" "$CONV/old/scripts" "$CONV/old/test/fixtures" "$CONV/out"
cp "$REPO/scripts/fetch-fpmt-observances.mjs" "$CONV/new/scripts/"
cmp "$REPO/scripts/fetch-fpmt-observances.mjs" "$CONV/new/scripts/fetch-fpmt-observances.mjs" || { echo "scratch copy differs"; exit 2; }
git -C "$REPO" show "$OLD_REV:scripts/fetch-fpmt-observances.mjs" > "$CONV/old/scripts/fetch-fpmt-observances.mjs" || exit 2
PRELOAD="file:///$EVID/replay.mjs"
pass=0; failn=0

# run <tree> <mutant> <label>; sets $code and $FIX
run() {
  FIX="$CONV/$1/test/fixtures/fpmt-observances.ts"
  rm -f "$FIX"
  REC_DIR="$REC" MUT="$2" node --import "$PRELOAD" "$CONV/$1/scripts/fetch-fpmt-observances.mjs" > "$CONV/out/$3.txt" 2>&1
  code=$?
}
ok()   { echo "PASS $1"; pass=$((pass+1)); }
bad()  { echo "FAIL $1"; tail -3 "$CONV/out/$2.txt"; failn=$((failn+1)); }

control() {
  run new control "control-$1"
  if [ $code -eq 0 ] && [ -f "$FIX" ]; then cp "$FIX" "$CONV/out/control-fixture-raw-$1.ts"; ok "control $1: exit 0, fixture written"; else bad "control $1: exit $code" "control-$1"; fi
}

control start

# b-first: 6B-8. The fixed parser reads 6, 7, 8 (the middle regular); the old one read 6, 8 leap, 8.
run new b-first new-b-first
if [ $code -eq 0 ] && grep -q 'iso: "2024-12-02", month: 7, day: 1,' "$FIX" && ! grep 'iso: "2024-12-02"' "$FIX" | grep -q isLeapMonth; then ok "b-first, fixed parser: 2024-12-02 is month 7, regular"; else bad "b-first, fixed parser" new-b-first; fi
run old b-first old-b-first
if [ $code -eq 0 ] && grep 'iso: "2024-12-02"' "$FIX" | grep -q 'month: 8,.*isLeapMonth: true'; then ok "b-first, old parser: 2024-12-02 is month 8, leap (the defect, reproduced)"; else bad "b-first, old parser did not show the defect" old-b-first; fi

# middle-does-not-lead: 5-8. The fixed parser refuses; the old one writes a fixture.
run new middle-does-not-lead new-middle
MSG='has three months, but the middle one inferred (6) does not run from the first to the last'
if [ $code -ne 0 ] && [ ! -f "$FIX" ] && grep -qF -- "$MSG" "$CONV/out/new-middle.txt"; then ok "middle-does-not-lead, fixed parser: refused, no fixture, message found"; else bad "middle-does-not-lead, fixed parser, wanted: $MSG" new-middle; fi
run old middle-does-not-lead old-middle
if [ $code -eq 0 ] && [ -f "$FIX" ]; then ok "middle-does-not-lead, old parser: accepted, fixture written (no guard)"; else bad "middle-does-not-lead, old parser" old-middle; fi

control end
cmp "$CONV/out/control-fixture-raw-start.ts" "$CONV/out/control-fixture-raw-end.ts" && ok "both controls wrote the same fixture" || { echo "FAIL controls differ"; failn=$((failn+1)); }
echo "pass $pass fail $failn"
echo "baseline: copy $CONV/out/control-fixture-raw-start.ts over test/fixtures/fpmt-observances.ts, run biome check --write on it, git diff must be empty (never leave the copy)"
