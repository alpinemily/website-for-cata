@echo off
REM Double-click this file (on Windows) to open the website editor.
cd /d "%~dp0"
title Website editor - keep this window open while you edit
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  The website editor needs one free program called Node.js.
  echo  Your browser will open the download page. Install it, then
  echo  double-click "Edit Website" again.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b
)
node cms\server.js --open
pause