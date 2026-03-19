#!/bin/bash
# i18n Hardcoded String Checker
# Runs before push to catch untranslated strings in components

ERRORS=0

# Check that all i18n files have the same key count (merchandising section)
EN_KEYS=$(grep -c "^\s\+\w\+:" src/i18n/en.ts 2>/dev/null || echo 0)
for lang in es fr de it pt nl sv no; do
  LANG_KEYS=$(grep -c "^\s\+\w\+:" src/i18n/${lang}.ts 2>/dev/null || echo 0)
  DIFF=$((EN_KEYS - LANG_KEYS))
  if [ "$DIFF" -gt 5 ] || [ "$DIFF" -lt -5 ]; then
    echo "⚠️  i18n: ${lang}.ts has ${LANG_KEYS} keys vs en.ts with ${EN_KEYS} keys (diff: ${DIFF})"
    ERRORS=$((ERRORS + 1))
  fi
done

# Quick check for obvious hardcoded strings in page components (common patterns)
SUSPECT=$(grep -rn ">[A-Z][a-z]\+[a-z ]\+<\|'[A-Z][a-z]\+ [A-Z][a-z]\+'" \
  src/app/collection/*/merchandising/page.tsx \
  src/app/collection/*/creative/page.tsx \
  2>/dev/null | grep -v "className\|import\|//\|console\|type\|interface\|DTC\|Wholesale" | head -10)

if [ -n "$SUSPECT" ]; then
  echo "⚠️  Possible hardcoded strings found:"
  echo "$SUSPECT"
  echo ""
  echo "   If these are intentional, ignore. If not, add to i18n."
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "❌ i18n check found ${ERRORS} issue(s). Please fix before pushing."
  exit 1
fi

echo "✅ i18n check passed"
exit 0
