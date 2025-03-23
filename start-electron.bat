@echo off
echo Starting VirtuaLearn...
cd %~dp0
set VITE_DEV_SERVER_URL=http://127.0.0.1:5173/
start /b npm run dev
timeout /t 3
electron . 