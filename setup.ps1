# Agent0 Quick Setup Script
# Run this after installing the browser extension

Write-Host "🚀 Agent0 Screenshot Extension Setup" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this script from the project root directory" -ForegroundColor Red
    Write-Host "   cd 'D:\main project\agent0'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully`n" -ForegroundColor Green

# Check if extension files exist
Write-Host "🔍 Checking browser extension files..." -ForegroundColor Yellow
$extensionFiles = @(
    "browser-extension\manifest.json",
    "browser-extension\background.js",
    "browser-extension\content.js",
    "browser-extension\popup.html"
)

$allFilesExist = $true
foreach ($file in $extensionFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file - MISSING!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ Some extension files are missing!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All extension files present`n" -ForegroundColor Green

# Instructions
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "1. Install the browser extension:" -ForegroundColor White
Write-Host "   • Open Chrome/Edge and go to: chrome://extensions/" -ForegroundColor Gray
Write-Host "   • Enable 'Developer mode' (top-right toggle)" -ForegroundColor Gray
Write-Host "   • Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   • Select the 'browser-extension' folder`n" -ForegroundColor Gray

Write-Host "2. Start the development server:" -ForegroundColor White
Write-Host "   npm run dev`n" -ForegroundColor Yellow

Write-Host "3. Test the extension:" -ForegroundColor White
Write-Host "   • Navigate to any website" -ForegroundColor Gray
Write-Host "   • Press Ctrl+Shift+S (Windows) or Cmd+Shift+S (Mac)" -ForegroundColor Gray
Write-Host "   • Capture a screenshot`n" -ForegroundColor Gray

Write-Host "4. Optional - Create extension icons:" -ForegroundColor White
Write-Host "   • See browser-extension\icons\SETUP.md for instructions`n" -ForegroundColor Gray

Write-Host "📖 Full documentation: INSTALLATION.md`n" -ForegroundColor Cyan

$startServer = Read-Host "Would you like to start the dev server now? (y/n)"
if ($startServer -eq 'y' -or $startServer -eq 'Y') {
    Write-Host "`n🚀 Starting Agent0 development server..." -ForegroundColor Green
    Write-Host "Visit: http://localhost:3000`n" -ForegroundColor Cyan
    npm run dev
}
