@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ========================================
REM TrustIQ ERP Android Debug APK Builder
REM ========================================

REM Default version if no argument is supplied.
set "VERSION=1.0.6"

REM Usage:
REM build-android-debug.bat 1.0.7
if not "%~1"=="" (
  set "VERSION=%~1"
)

REM ----- Project root -----
set "PROJECT_ROOT=%CD%"

REM ----- Android internal version code -----
REM Version 1.0.6 becomes 10006
REM Version 1.0.7 becomes 10007
REM Version 1.2.0 becomes 10200
REM Version 2.0.0 becomes 20000

for /f "tokens=1,2,3 delims=." %%A in ("%VERSION%") do (
  set "VERSION_MAJOR=%%A"
  set "VERSION_MINOR=%%B"
  set "VERSION_PATCH=%%C"
)

if "%VERSION_MAJOR%"=="" (
  echo ERROR: Invalid version format.
  echo Use semantic version format, for example:
  echo build-android-debug.bat 1.0.7
  exit /b 1
)

if "%VERSION_MINOR%"=="" (
  echo ERROR: Invalid version format.
  echo Use three parts, for example: 1.0.7
  exit /b 1
)

if "%VERSION_PATCH%"=="" (
  echo ERROR: Invalid version format.
  echo Use three parts, for example: 1.0.7
  exit /b 1
)

REM Validate version components contain numbers only.
echo %VERSION_MAJOR%| findstr /r "^[0-9][0-9]*$" >nul

if errorlevel 1 (
  echo ERROR: Major version must be numeric.
  exit /b 1
)

echo %VERSION_MINOR%| findstr /r "^[0-9][0-9]*$" >nul

if errorlevel 1 (
  echo ERROR: Minor version must be numeric.
  exit /b 1
)

echo %VERSION_PATCH%| findstr /r "^[0-9][0-9]*$" >nul

if errorlevel 1 (
  echo ERROR: Patch version must be numeric.
  exit /b 1
)

REM Use 2 digits for minor and patch:
REM major * 10000 + minor * 100 + patch.
set /a VERSION_CODE=VERSION_MAJOR * 10000 + VERSION_MINOR * 100 + VERSION_PATCH

REM ----- Deployment configuration -----
set "PROJECT_NAME=TrustIQ ERP"

set "SSH_KEY=C:\Users\HP\.ssh\github_actions_deploy"
set "SSH_PORT=20300"
set "SSH_USER=deploy"
set "SSH_HOST=37.187.139.100"
set "REMOTE_PATH=/var/www/truebill-api/downloads"

set "GRADLE_FILE=%PROJECT_ROOT%\android\app\build.gradle"

set "APK_SOURCE=%PROJECT_ROOT%\android\app\build\outputs\apk\debug\app-debug.apk"

set "APK_NAME=truebill-%VERSION%.apk"

echo.
echo ========================================
echo %PROJECT_NAME% Android APK Build
echo Version Name: %VERSION%
echo Version Code: %VERSION_CODE%
echo API Mode: production
echo ========================================
echo.

REM ----- Validate project files -----
if not exist "%PROJECT_ROOT%\package.json" (
  echo ERROR: package.json was not found.
  echo Run this script from the frontend project root.
  exit /b 1
)

if not exist "%PROJECT_ROOT%\.env.production" (
  echo ERROR: .env.production was not found.
  echo Add:
  echo VITE_API_BASE_URL=https://truebillapi.trustiqtech.com/api
  exit /b 1
)

if not exist "%GRADLE_FILE%" (
  echo ERROR: Android Gradle file was not found.
  echo Expected:
  echo %GRADLE_FILE%
  exit /b 1
)

if not exist "%SSH_KEY%" (
  echo ERROR: SSH key was not found.
  echo Expected:
  echo %SSH_KEY%
  exit /b 1
)

REM ----- Validate required commands -----
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

REM ----- Update Android version in Gradle -----
echo.
echo Updating Android version in build.gradle...
echo versionName = %VERSION%
echo versionCode = %VERSION_CODE%

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$file = '%GRADLE_FILE%';" ^
  "$content = Get-Content -Path $file -Raw;" ^
  "$content = [regex]::Replace($content, 'versionCode\s+\d+', 'versionCode %VERSION_CODE%', 1);" ^
  "$content = [regex]::Replace($content, 'versionName\s+[""][^""]*[""]', 'versionName ""%VERSION%""', 1);" ^
  "Set-Content -Path $file -Value $content -NoNewline"

if errorlevel 1 (
  echo.
  echo ERROR: Failed to update Android version in build.gradle.
  exit /b 1
)

findstr /c:"versionCode %VERSION_CODE%" "%GRADLE_FILE%" >nul

if errorlevel 1 (
  echo.
  echo ERROR: versionCode was not updated in build.gradle.
  exit /b 1
)

findstr /c:"versionName ""%VERSION%""" "%GRADLE_FILE%" >nul

if errorlevel 1 (
  echo.
  echo ERROR: versionName was not updated in build.gradle.
  exit /b 1
)

echo Android version updated successfully.

REM ----- Step 1: Build frontend -----
echo.
echo [1/4] Building frontend with production API...

cd /d "%PROJECT_ROOT%"

call npm run build -- --mode production

if errorlevel 1 (
  echo.
  echo ERROR: Frontend production build failed.
  exit /b 1
)

REM ----- Step 2: Sync Capacitor -----
echo.
echo [2/4] Syncing Capacitor Android project...

call npx cap sync android

if errorlevel 1 (
  echo.
  echo ERROR: Capacitor Android sync failed.
  exit /b 1
)

REM ----- Step 3: Build Android APK -----
echo.
echo [3/4] Building Android debug APK...

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

REM ----- Confirm APK exists -----
if not exist "%APK_SOURCE%" (
  echo.
  echo ERROR: APK was not generated.
  echo Expected:
  echo %APK_SOURCE%
  exit /b 1
)

for %%F in ("%APK_SOURCE%") do (
  set "APK_SIZE=%%~zF"
)

echo.
echo APK generated successfully.
echo APK size: !APK_SIZE! bytes

REM ----- Step 4: Upload APK -----
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
  exit /b 1
)

echo.
echo ========================================
echo SUCCESS: APK built and uploaded.
echo ========================================
echo.
echo Android App Version Name: %VERSION%
echo Android App Version Code: %VERSION_CODE%
echo Uploaded APK: %APK_NAME%
echo.
echo Server location:
echo %REMOTE_PATH%/%APK_NAME%
echo.

endlocal
exit /b 0