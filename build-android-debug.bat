@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ========================================
REM TrustIQ ERP Android Debug APK Builder
REM ========================================

REM Default version if no argument is given.
set "VERSION=1.0.6"

REM Usage examples:
REM build-android-debug.bat
REM build-android-debug.bat 1.0.7
REM build-android-debug.bat 1.1.0
if not "%~1"=="" (
  set "VERSION=%~1"
)

REM Current frontend project root.
set "PROJECT_ROOT=%CD%"

REM ========================================
REM Parse semantic version: major.minor.patch
REM ========================================

for /f "tokens=1,2,3 delims=." %%A in ("%VERSION%") do (
  set "VERSION_MAJOR=%%A"
  set "VERSION_MINOR=%%B"
  set "VERSION_PATCH=%%C"
)

if "%VERSION_MAJOR%"=="" goto :invalid_version
if "%VERSION_MINOR%"=="" goto :invalid_version
if "%VERSION_PATCH%"=="" goto :invalid_version

REM Validate semantic version with PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$version = '%VERSION%';" ^
  "if ($version -notmatch '^\d+\.\d+\.\d+$') { exit 1 }"

if errorlevel 1 goto :invalid_version

REM Android internal version:
REM 1.0.6 = 10006
REM 1.0.7 = 10007
REM 1.1.0 = 10100
REM 2.0.0 = 20000
set /a VERSION_CODE=VERSION_MAJOR * 10000 + VERSION_MINOR * 100 + VERSION_PATCH

goto :version_valid

:invalid_version
echo.
echo ERROR: Invalid version format: %VERSION%
echo.
echo Use:
echo build-android-debug.bat 1.0.7
echo.
echo Valid examples:
echo 1.0.7
echo 1.1.0
echo 1.2.15
echo 2.0.0
echo.
exit /b 1

:version_valid

REM ========================================
REM Deployment configuration
REM ========================================

set "PROJECT_NAME=TrustIQ ERP"
set "PRODUCTION_API_URL=https://truebillapi.trustiqtech.com/api"

set "SSH_KEY=C:\Users\HP\.ssh\github_actions_deploy"
set "SSH_PORT=20300"
set "SSH_USER=deploy"
set "SSH_HOST=37.187.139.100"
set "REMOTE_PATH=/var/www/truebill-api/downloads"

set "VERSION_FILE=%PROJECT_ROOT%\android\version.properties"

set "APK_SOURCE=%PROJECT_ROOT%\android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_NAME=truebill-%VERSION%.apk"

echo.
echo ========================================
echo %PROJECT_NAME% Android APK Builder
echo ========================================
echo Version Name: %VERSION%
echo Version Code: %VERSION_CODE%
echo API Mode: production
echo API URL: %PRODUCTION_API_URL%
echo ========================================
echo.

REM ========================================
REM Validate required files
REM ========================================

if not exist "%PROJECT_ROOT%\package.json" (
  echo ERROR: package.json was not found.
  echo Run this script from the frontend project root folder.
  exit /b 1
)

if not exist "%PROJECT_ROOT%\.env.production" (
  echo ERROR: .env.production was not found.
  echo.
  echo Create:
  echo %PROJECT_ROOT%\.env.production
  echo.
  echo Add:
  echo VITE_API_BASE_URL=%PRODUCTION_API_URL%
  exit /b 1
)

if not exist "%PROJECT_ROOT%\android" (
  echo ERROR: Android project folder was not found.
  echo Expected:
  echo %PROJECT_ROOT%\android
  exit /b 1
)

if not exist "%PROJECT_ROOT%\android\app\build.gradle" (
  echo ERROR: Android app build.gradle was not found.
  echo Expected:
  echo %PROJECT_ROOT%\android\app\build.gradle
  exit /b 1
)

if not exist "%SSH_KEY%" (
  echo ERROR: SSH key was not found.
  echo Expected:
  echo %SSH_KEY%
  exit /b 1
)

REM ========================================
REM Validate commands
REM ========================================

where npm >nul 2>&1

if errorlevel 1 (
  echo ERROR: npm was not found in PATH.
  exit /b 1
)

where npx >nul 2>&1

if errorlevel 1 (
  echo ERROR: npx was not found in PATH.
  exit /b 1
)

where scp >nul 2>&1

if errorlevel 1 (
  echo ERROR: scp was not found in PATH.
  echo Install Windows OpenSSH Client.
  exit /b 1
)

REM ========================================
REM Update Android version.properties
REM ========================================

echo.
echo Updating Android version.properties...
echo VERSION_CODE=%VERSION_CODE%
echo VERSION_NAME=%VERSION%

(
  echo VERSION_CODE=%VERSION_CODE%
  echo VERSION_NAME=%VERSION%
) > "%VERSION_FILE%"

if errorlevel 1 (
  echo.
  echo ERROR: Unable to create or update:
  echo %VERSION_FILE%
  exit /b 1
)

findstr /x /c:"VERSION_CODE=%VERSION_CODE%" "%VERSION_FILE%" >nul

if errorlevel 1 (
  echo.
  echo ERROR: VERSION_CODE verification failed.
  exit /b 1
)

findstr /x /c:"VERSION_NAME=%VERSION%" "%VERSION_FILE%" >nul

if errorlevel 1 (
  echo.
  echo ERROR: VERSION_NAME verification failed.
  exit /b 1
)

echo.
echo Android version properties updated successfully.
type "%VERSION_FILE%"

REM ========================================
REM Step 1: Build frontend
REM ========================================

echo.
echo [1/4] Building frontend with production API...

cd /d "%PROJECT_ROOT%"

call npm run build -- --mode production

if errorlevel 1 (
  echo.
  echo ERROR: Frontend production build failed.
  exit /b 1
)

REM ========================================
REM Step 2: Sync Capacitor
REM ========================================

echo.
echo [2/4] Syncing Capacitor Android project...

call npx cap sync android

if errorlevel 1 (
  echo.
  echo ERROR: Capacitor Android sync failed.
  exit /b 1
)

REM ========================================
REM Step 3: Build Android debug APK
REM ========================================

echo.
echo [3/4] Cleaning and building Android debug APK...

pushd "%PROJECT_ROOT%\android"

call gradlew.bat clean assembleDebug

set "GRADLE_EXIT_CODE=%ERRORLEVEL%"

popd

if not "%GRADLE_EXIT_CODE%"=="0" (
  echo.
  echo ERROR: Android APK build failed.
  exit /b %GRADLE_EXIT_CODE%
)

cd /d "%PROJECT_ROOT%"

REM ========================================
REM Verify APK output
REM ========================================

if not exist "%APK_SOURCE%" (
  echo.
  echo ERROR: Debug APK was not generated.
  echo Expected:
  echo %APK_SOURCE%
  exit /b 1
)

for %%F in ("%APK_SOURCE%") do (
  set "APK_SIZE=%%~zF"
  set "APK_TIMESTAMP=%%~tF"
)

echo.
echo APK generated successfully.
echo Local APK: %APK_SOURCE%
echo APK size: !APK_SIZE! bytes
echo APK timestamp: !APK_TIMESTAMP!

REM ========================================
REM Step 4: Upload APK
REM ========================================

echo.
echo [4/4] Uploading %APK_NAME%...

scp ^
  -i "%SSH_KEY%" ^
  -P %SSH_PORT% ^
  "%APK_SOURCE%" ^
  "%SSH_USER%@%SSH_HOST%:%REMOTE_PATH%/%APK_NAME%"

if errorlevel 1 (
  echo.
  echo ERROR: APK upload failed.
  echo.
  echo Manual upload command:
  echo scp -i "%SSH_KEY%" -P %SSH_PORT% "%APK_SOURCE%" %SSH_USER%@%SSH_HOST%:%REMOTE_PATH%/%APK_NAME%
  exit /b 1
)

echo.
echo ========================================
echo SUCCESS: APK built and uploaded.
echo ========================================
echo.
echo Android Version Name: %VERSION%
echo Android Version Code: %VERSION_CODE%
echo Production API:
echo %PRODUCTION_API_URL%
echo.
echo Uploaded APK:
echo %REMOTE_PATH%/%APK_NAME%
echo.

endlocal
exit /b 0