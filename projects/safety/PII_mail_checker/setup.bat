@echo off
REM Cross-Platform Setup Script for Email PII Monitor (Windows)
REM Works on Windows Command Prompt and PowerShell

echo 🚀 Setting up Email PII Monitor...

echo ==========================================
echo   Email PII Monitor - Windows Setup
echo ==========================================
echo.

REM Parse command line arguments
set TOTAL_SAMPLES=%1
if "%TOTAL_SAMPLES%"=="" set TOTAL_SAMPLES=500

set PII_RATIO=%2
if "%PII_RATIO%"=="" set PII_RATIO=0.5

echo [INFO] Setup parameters: %TOTAL_SAMPLES% samples, %PII_RATIO% PII ratio
echo.

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16 or higher.
    echo [INFO] Visit: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js found: %NODE_VERSION%

REM Check if npm is installed
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [SUCCESS] npm found: %NPM_VERSION%

REM Install dependencies
echo [INFO] Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Generate training data
echo [INFO] Generating training data...
echo [INFO] Generating %TOTAL_SAMPLES% samples with %PII_RATIO% PII ratio...
node ml/generate_training_data.js %TOTAL_SAMPLES% %PII_RATIO%
if %errorlevel% neq 0 (
    echo [WARNING] Failed to generate training data, will use fallback data
) else (
    echo [SUCCESS] Training data generated successfully
)

REM Train the model
echo [INFO] Training ML model...
node ml/train-model.js
if %errorlevel% neq 0 (
    echo [WARNING] Model training failed, will use rule-based detection only
) else (
    echo [SUCCESS] Model trained successfully
)

REM Run consistency test
echo [INFO] Running consistency tests...
node test-consistency.js
if %errorlevel% neq 0 (
    echo [WARNING] Some tests failed, but setup can continue
) else (
    echo [SUCCESS] All tests passed
)

REM Create sample credentials file
if not exist "credentials.json" (
    echo [INFO] Creating sample credentials.json file...
    (
        echo {
        echo   "installed": {
        echo     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
        echo     "project_id": "your-project-id",
        echo     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        echo     "token_uri": "https://oauth2.googleapis.com/token",
        echo     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        echo     "client_secret": "YOUR_CLIENT_SECRET",
        echo     "redirect_uris": ["http://localhost:3000"]
        echo   }
        echo }
    ) > credentials.json
    echo [WARNING] Created sample credentials.json. Please update with your actual Gmail API credentials.
) else (
    echo [SUCCESS] credentials.json already exists
)

echo.
echo ==========================================
echo [SUCCESS] Setup completed successfully!
echo ==========================================
echo.
echo Next steps:
echo 1. Update credentials.json with your Gmail API credentials
echo 2. Start the server: npm start
echo 3. Test the API: curl http://localhost:3000/api/health
echo.
echo For Docker deployment:
echo 1. Build: npm run docker:build
echo 2. Run: npm run docker:run
echo 3. Or use Docker Compose: npm run docker:compose
echo.
echo [SUCCESS] Setup complete! 🎉
pause 