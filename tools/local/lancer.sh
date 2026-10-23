#!/bin/sh
# Re Zero : lance le jeu en local avec une base de test riche (100 000 essence et 60 boosters par compte).
cd "$(dirname "$0")/../.." || exit 1
[ -f public/index.html ] || python3 build.py
( sleep 12; URL="http://localhost:8787/auth/dev?id=100000000000000001&name=Reichi"; open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null ) &
exec npx --yes wrangler@4 dev --local --persist-to .local-db --var DEV_LOGIN:1 --var LOCAL_RICH:1 --var ADMIN_IDS:100000000000000001 --var DEV_IDS:100000000000000001
