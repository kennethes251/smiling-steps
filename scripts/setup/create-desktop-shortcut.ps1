# Create Desktop Shortcut for Smiling Steps
# This script creates a shortcut on your desktop that starts both backend and frontend servers

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Smiling Steps.lnk"

# Get the current directory (project root) as absolute path
$ProjectRoot = (Get-Location).Path

# Path to the batch file (absolute)
$BatchFile = Join-Path $ProjectRoot "start-smiling-steps.bat"

# Path to the favicon (absolute path)
$IconPath = Join-Path $ProjectRoot "client\public\favicon.ico"

# Check if icon exists
if (-not (Test-Path $IconPath)) {
    Write-Host "Warning: favicon.ico not found at $IconPath" -ForegroundColor Yellow
    Write-Host "Shortcut will be created without custom icon" -ForegroundColor Yellow
    $IconPath = ""
}

# Delete existing shortcut if it exists
if (Test-Path $ShortcutPath) {
    Remove-Item $ShortcutPath -Force
    Write-Host "Removed existing shortcut" -ForegroundColor Gray
}

# Create the shortcut
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatchFile
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Start Smiling Steps - Backend and Frontend Servers"
$Shortcut.WindowStyle = 1  # Normal window

if ($IconPath -ne "") {
    $Shortcut.IconLocation = "$IconPath,0"
}

$Shortcut.Save()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Desktop Shortcut Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Shortcut: $ShortcutPath" -ForegroundColor White
Write-Host "Target:   $BatchFile" -ForegroundColor White
Write-Host "Icon:     $IconPath" -ForegroundColor White
Write-Host ""
Write-Host "Double-click 'Smiling Steps' on your desktop to start!" -ForegroundColor Yellow
Write-Host ""
