@echo off
echo ====================================
echo GPS Tracking System - Deploy Script
echo ====================================
echo.

REM Check if index.lock exists and remove it
if exist ".git\index.lock" (
    echo Removing git lock file...
    del /F ".git\index.lock"
    echo Lock removed!
    echo.
)

echo Stage all changes...
git add .

echo.
echo Commit changes...
git commit -m "Add Traccar GPS tracking: GET endpoint, logging, CORS, device management UI"

echo.
echo Push to remote...
git push

echo.
echo ====================================
echo Deploy complete!
echo ====================================
echo.
echo Next steps:
echo 1. Wait for Vercel to deploy (1-2 minutes)
echo 2. Check Vercel Dashboard for deployment status
echo 3. Test with: https://your-vercel-url.vercel.app/api/gps?id=test^&lat=41^&lon=28^&timestamp=1738152000000
echo.
pause
