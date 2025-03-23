# Clean previous build and stop any running processes
Write-Host "Cleaning previous builds..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "./dist"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "./dist-electron"

# Build the app without watch mode
Write-Host "Building app..."
npm run build

# Start Electron directly
Write-Host "Starting Electron app..."
npx electron . 