@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo HearMe2nite Firebase Hosting manual deployment
echo Project: our-baby-care
echo ================================================

where firebase >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Firebase CLI was not found.
  echo Install it first with: npm install -g firebase-tools
  pause
  exit /b 1
)

firebase deploy --only hosting --project our-baby-care
if errorlevel 1 (
  echo.
  echo [FAILED] Firebase Hosting deployment failed.
  pause
  exit /b 1
)

echo.
echo [SUCCESS] Deployment completed.
echo https://our-baby-care.web.app
pause
