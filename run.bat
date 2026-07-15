@echo off
REM joash-arrows playtest. English-only, CRLF.
cd /d "%~dp0"
echo Starting Joash Arrows (Victory Arrow) ...
if not exist "node_modules" call npm install
call npm run dev -- --open
pause
