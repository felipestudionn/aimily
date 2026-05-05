#!/usr/bin/env bash
# Ping IndexNow with all sitemap URLs.
# Notifies Bing/Yandex/Seznam/Naver to crawl the listed URLs immediately.
# Reference: https://www.indexnow.org/documentation
set -euo pipefail

KEY="ed97cba5c7d058f0d68f9c41b0db19e7"
HOST="www.aimily.app"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
SITEMAP="https://${HOST}/sitemap.xml"

# Extract all <loc> URLs from sitemap
URLS=$(curl -s "$SITEMAP" | grep -oE '<loc>[^<]+</loc>' | sed 's|<loc>||;s|</loc>||')
URL_COUNT=$(echo "$URLS" | wc -l | tr -d ' ')

echo "Pinging IndexNow with $URL_COUNT URLs from $SITEMAP"

# Build JSON payload
JSON=$(cat <<EOF
{
  "host": "$HOST",
  "key": "$KEY",
  "keyLocation": "$KEY_LOCATION",
  "urlList": [
$(echo "$URLS" | sed 's|.*|"&"|' | paste -sd "," -)
  ]
}
EOF
)

# Submit to IndexNow main endpoint (Bing-hosted, fan-out to all participating engines)
echo "$JSON" | curl -s -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Host: api.indexnow.org" \
  -d @- \
  -w "\nHTTP %{http_code}\n"
