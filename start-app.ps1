Write-Host "Starting VirtuaLearn..." -ForegroundColor Green

# Set environment variable
$env:VITE_DEV_SERVER_URL = "http://127.0.0.1:5173/"

# Change to the app directory
Set-Location $PSScriptRoot

# Start the Vite dev server
Start-Process -NoNewWindow npm -ArgumentList "run", "dev"

# Wait for the server to be ready
Write-Host "Waiting for dev server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Run electron
Write-Host "Starting Electron app..." -ForegroundColor Green
npx electron . 