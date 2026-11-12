#!/usr/bin/env bash
# Mutation harness for scripts/verify-observance-names.mjs. See README.md.
#
#   CONV=/path/to/scratch/dir/with/node_modules  bash harness.sh
#
# CONV is a directory OUTSIDE the repository where `npm install jsewts tibetan-ewts-converter` was run.
# REPO defaults to the working tree containing this file; REC to $CONV/recorded, which record.mjs fills (see README.md).
EVID="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -W 2>/dev/null || pwd)"
REPO="${REPO:-$(cd "$EVID/../../.." && pwd -W 2>/dev/null || pwd)}"
CONV="${CONV:?set CONV to a scratch directory containing node_modules/jsewts}"
REC="${REC:-$CONV/recorded}"
TREE="$CONV/tree"
cd "$CONV" || exit 2
rm -rf "$TREE"; mkdir -p "$TREE/scripts" "$TREE/test/fixtures" "$CONV/out"
for f in verify-observance-names.mjs cologne.mjs tibetan-dictionary.mjs observance-name-rigpa-passages.data.json; do cp "$REPO/scripts/$f" "$TREE/scripts/$f"; done
# the scratch copy must be the shipped file: a mutant is never written into the repository
cmp "$REPO/scripts/verify-observance-names.mjs" "$TREE/scripts/verify-observance-names.mjs" || { echo "scratch copy differs"; exit 2; }
FIX="$TREE/test/fixtures/observance-names.ts"
PRELOAD="file:///$EVID/replay.mjs"
pass=0; failn=0
run() { # mutant expected-message
  rm -f "$FIX"
  REC_DIR="$REC" MUT="$1" node --import "$PRELOAD" "$TREE/scripts/verify-observance-names.mjs" > "$CONV/out/out-$1.txt" 2>&1
  code=$?
  if [ "$1" = "control" ]; then
    if [ $code -eq 0 ] && [ -f "$FIX" ]; then echo "PASS control: exit 0, fixture written"; pass=$((pass+1)); cp "$FIX" "$CONV/out/control-fixture-raw.ts"; else echo "FAIL control: exit $code"; tail -5 "$CONV/out/out-$1.txt"; failn=$((failn+1)); fi
    return
  fi
  if [ $code -ne 0 ] && [ ! -f "$FIX" ] && grep -qF -- "$2" "$CONV/out/out-$1.txt"; then echo "PASS $1: exit $code, no fixture, message found: $2"; pass=$((pass+1)); else echo "FAIL $1: exit $code, fixture $( [ -f "$FIX" ] && echo present || echo absent ), wanted: $2"; grep -E "^  - |Error" "$CONV/out/out-$1.txt" | head -4; failn=$((failn+1)); fi
}
run control
run converter-disagree "EWTS converters disagree on \"gso sbyong\""
run roundtrip "which reads back as \"sbyin sreg x\""
run jaeschke-index "Jäschke's index puts \"dus chen\" at p. 454, not p. 255"
run mvy-pair "the Mahāvyutpatti no longer pairs \"sbyin sreg\" with homaḥ"
run mw-sense "no Monier-Williams entry headed homa prints \"oblation with fire\""
run term-one-witness "head word \"sbyin sreg\" has 1 independent witness group(s) read, not 2"
run duchen-rigpa-alone "head word \"dus chen\" has 1 independent witness group(s) read, not 2"
run rigpa-string "the Rigpa Wiki passage for chokhor-duchen prints"
run rigpa-missing "the Rigpa Wiki witness file is missing or unreadable"
run karmapa-google-removed "\"rgyal dbang karma pa bcu drug pa\" has 1 independent witness(es) stating that spelling, not 2 (Lotsawa House)"
run karmapa-lotsawa-removed "\"rgyal dbang karma pa bcu drug pa\" has 1 independent witness(es) stating that spelling, not 2 (Google Books record)"
run wikipedia-one-group "\"mi la ras pa\" has 1 independent witness(es) stating that spelling, not 2 (Tibetan Wikipedia)"
run check5-index-only "marked word \"bdud 'joms\" is part of no headword that check 3 accepts"
run thl-correction "correction for karmapa-16 is no longer justified"
run control
echo "pass $pass fail $failn"
echo "baseline: copy $CONV/out/control-fixture-raw.ts to a file inside the repo, run biome check --write on it, cmp with test/fixtures/observance-names.ts (never biome --stdin-file-path)"
