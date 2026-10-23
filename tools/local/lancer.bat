@echo off
rem Re : LOL : lance le jeu en local avec une base de test riche (100 000 essence et 60 boosters par compte).
rem Double-clique ce fichier. Il faut Node.js (https://nodejs.org). Ferme la fenetre noire pour arreter.
cd /d "%~dp0\..\.."
if not exist public\index.html python build.py
start "" cmd /c "timeout /t 12 >nul & start http://localhost:8787/auth/dev?id=100000000000000001^&name=Reichi"
npx --yes wrangler@4 dev --local --persist-to .local-db --var DEV_LOGIN:1 --var LOCAL_RICH:1 --var ADMIN_IDS:100000000000000001 --var DEV_IDS:100000000000000001
pause
