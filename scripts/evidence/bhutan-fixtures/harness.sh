#!/usr/bin/env bash
# Mutation harness for scripts/fetch-bhutan-fixtures.mjs. See README.md.
#
#   CONV=/path/to/scratch/dir  bash harness.sh
#
# CONV is a directory OUTSIDE the repository holding recorded/ (filled by record.mjs, see README.md).
EVID="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -W 2>/dev/null || pwd)"
REPO="${REPO:-$(cd "$EVID/../../.." && pwd -W 2>/dev/null || pwd)}"
CONV="${CONV:?set CONV to a scratch directory outside the repository}"
REC="${REC:-$CONV/recorded}"
COMMITTED="${COMMITTED:-$REPO/test/fixtures/bhutan.ts}"
cd "$CONV" || exit 2
rm -rf "$CONV/new" "$CONV/oldk1" "$CONV/out"
mkdir -p "$CONV/new/scripts" "$CONV/new/test/fixtures" "$CONV/oldk1/scripts" "$CONV/oldk1/test/fixtures" "$CONV/out"
GEN=fetch-bhutan-fixtures.mjs
cp "$REPO/scripts/$GEN" "$CONV/new/scripts/"
cmp "$REPO/scripts/$GEN" "$CONV/new/scripts/$GEN" || { echo "scratch copy differs"; exit 2; }
# The shipped generator with K1 reverted and nothing else: check 5 reads the field the rows do not have.
sed -e 's/last\.month !== row\.month/last.month !== row.bhutaneseMonth/' \
    -e 's/month: row\.month, leapMonth/month: row.bhutaneseMonth, leapMonth/' \
    "$CONV/new/scripts/$GEN" > "$CONV/oldk1/scripts/$GEN"
[ "$(diff "$CONV/new/scripts/$GEN" "$CONV/oldk1/scripts/$GEN" | grep -c '^>')" = 2 ] || { echo "K1 revert did not change exactly two lines"; exit 2; }
PRELOAD="file:///$EVID/replay.mjs"
pass=0; failn=0

# run <tree> <mutant> <label> [generator args]; sets $code and $FIX
run() {
  local tree=$1 mut=$2 label=$3; shift 3
  FIX="$CONV/$tree/test/fixtures/bhutan.ts"
  rm -f "$FIX"
  REC_DIR="$REC" MUT="$mut" node --import "$PRELOAD" "$CONV/$tree/scripts/$GEN" "$@" > "$CONV/out/$label.txt" 2>&1
  code=$?
}
ok()   { echo "PASS $1"; pass=$((pass+1)); }
bad()  { echo "FAIL $1"; tail -3 "$CONV/out/$2.txt" | cut -c1-300; failn=$((failn+1)); }
refused() { # <label> <message> : exit non-zero, no fixture, message found
  [ $code -ne 0 ] && [ ! -f "$FIX" ] && grep -qF -- "$2" "$CONV/out/$1.txt"
}

rows() { grep -P '^\t\[\d+, \d+, \d+\],$' "$1"; }

control() {
  run new control "control-$1"
  if [ $code -ne 0 ] || [ ! -f "$FIX" ]; then bad "control $1: exit $code" "control-$1"; return; fi
  cp "$FIX" "$CONV/out/control-fixture-$1.ts"
  rows "$FIX" > "$CONV/out/control-rows-$1.txt"
  N=$(wc -l < "$CONV/out/control-rows-$1.txt")
  rows "$COMMITTED" | head -n "$N" > "$CONV/out/committed-head-$1.txt"
  if cmp -s "$CONV/out/control-rows-$1.txt" "$CONV/out/committed-head-$1.txt" \
     && grep -q 'BHUTAN_START = "2000-01-01"' "$FIX" && grep -q 'BHUTAN_END = "2030-04-02"' "$FIX"; then
    ok "control $1: exit 0; $N rows equal the committed fixture's first $N, window 2000-01-01 to 2030-04-02 (committed has $(rows "$COMMITTED" | wc -l))"
  else bad "control $1: rows differ from the committed fixture" "control-$1"; fi
}

control start

# leap-wrong-number: the fixed check refuses; with K1 reverted the same source is accepted.
MSG='leap month 5 beginning 2000-'
run new leap-wrong-number new-wrong
if refused new-wrong "$MSG" && grep -qF 'is not preceded by a regular month 5; the month before it is 4' "$CONV/out/new-wrong.txt"; then ok "leap-wrong-number, fixed: refused, no fixture, message names month 5 after regular 4"; else bad "leap-wrong-number, fixed, wanted: $MSG" new-wrong; fi
run oldk1 leap-wrong-number old-wrong
if [ $code -eq 0 ] && [ -f "$FIX" ]; then ok "leap-wrong-number, K1 reverted: accepted, fixture written (the dead half)"; else bad "leap-wrong-number, K1 reverted" old-wrong; fi

# leap-after-leap: refused by both, because the half K1 left alive catches it.
MSG='leap month 3 beginning 2011-'
run new leap-after-leap new-after
if refused new-after "$MSG" && grep -qF '(also leap)' "$CONV/out/new-after.txt"; then ok "leap-after-leap, fixed: refused, no fixture, message says also leap"; else bad "leap-after-leap, fixed, wanted: $MSG" new-after; fi
run oldk1 leap-after-leap old-after
if [ $code -ne 0 ] && [ ! -f "$FIX" ]; then ok "leap-after-leap, K1 reverted: also refused (the surviving half)"; else bad "leap-after-leap, K1 reverted" old-after; fi

# The source's own defect at 2030-04-03 is outside the default window and refuses only inside one.
run new control boundary-in 2000-01-01 2030-04-03
MSG='leap month 2 beginning 2030-04-03'
if refused boundary-in "$MSG"; then ok "window ending 2030-04-03: refused, message names the 2030-04-03 defect"; else bad "window ending 2030-04-03, wanted: $MSG" boundary-in; fi
run new control boundary-out 2000-01-01 2030-04-02
if [ $code -eq 0 ] && [ -f "$FIX" ] && grep -q 'BHUTAN_END = "2030-04-02"' "$FIX"; then ok "window ending 2030-04-02: accepted although the source holds the defect the next day"; else bad "window ending 2030-04-02" boundary-out; fi

control end
cmp "$CONV/out/control-fixture-start.ts" "$CONV/out/control-fixture-end.ts" && ok "both controls wrote the same fixture" || { echo "FAIL controls differ"; failn=$((failn+1)); }
echo "pass $pass fail $failn"
