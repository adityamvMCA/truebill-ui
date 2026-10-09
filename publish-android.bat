@echo off
setlocal

title TrueBill Android Publish

echo.
echo ==========================================
echo        TrueBill Android Publish
echo ==========================================
echo.

set PROJECT_DIR=D:\TrueBill\true-frontend\trustbook-frontend
set ANDROID_DIR=%PROJECT_DIR%\android
set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk
set SSH_KEY=C:\Users\HP\.ssh\github_actions_deploy
set VPS_HOST=37.187.139.100
set VPS_PORT=20300
set VPS_USER=deploy
set VPS_PATH=/var/www/truebill-api/downloads/truebill-1.0.2.apk

cd /d "%PROJECT_DIR%"

echo [1/4] Building frontend...
call npm run build

if errorlevel 1 (
    echo.
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)

echo.
echo [2/4] Syncing Capacitor Android...
call npx cap sync android

if errorlevel 1 (
    echo.
    echo ERROR: Capacitor sync failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Building Android APK...
cd /d "%ANDROID_DIR%"

call gradlew assembleDebug

if errorlevel 1 (
    echo.
    echo ERROR: Android APK build failed.
    pause
    exit /b 1
)

echo.
echo Checking APK...

if not exist "%APK_PATH%" (
    echo.
    echo ERROR: APK was not found.
    echo Expected:
    echo %APK_PATH%
    pause
    exit /b 1
)

echo.
echo APK found:
echo %APK_PATH%

echo.
echo [4/4] Uploading APK to VPS...

scp -i "%SSH_KEY%" -P %VPS_PORT% ^
"%APK_PATH%" ^
%VPS_USER%@%VPS_HOST%:%VPS_PATH%

if errorlevel 1 (
    echo.
    echo ERROR: APK upload failed.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo       PUBLISH SUCCESSFUL
echo ==========================================
echo.
echo APK:
echo https://truebillapi.trustiqtech.com/downloads/truebill-1.0.2.apk
echo.
echo VPS:
echo %VPS_PATH%
echo.

pause