# Create Icon and Desktop Shortcut for Smiling Steps
# This script converts the logo PNG to ICO with proper colors and creates the shortcut

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$ProjectRoot = (Get-Location).Path
$LogoPng = Join-Path $ProjectRoot "client\src\assets\smiling-steps-logo.png"
$IconPath = Join-Path $ProjectRoot "smiling-steps.ico"
$BatchFile = Join-Path $ProjectRoot "start-smiling-steps.bat"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Smiling Steps.lnk"

Write-Host "Creating icon from logo..." -ForegroundColor Cyan

# Check if logo exists
if (-not (Test-Path $LogoPng)) {
    Write-Host "Logo not found at: $LogoPng" -ForegroundColor Red
    Write-Host "Please save your logo as: $LogoPng" -ForegroundColor Yellow
    exit 1
}

try {
    # Load the PNG image with proper color handling
    $img = [System.Drawing.Image]::FromFile($LogoPng)
    
    # Create a 256x256 bitmap with 32-bit ARGB (preserves transparency and colors)
    $bitmap = New-Object System.Drawing.Bitmap(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # High quality rendering settings
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Clear with transparent background
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    # Draw the image maintaining aspect ratio
    $graphics.DrawImage($img, 0, 0, 256, 256)
    $graphics.Dispose()
    
    # Convert bitmap to icon
    $hIcon = $bitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    
    # Save the icon
    $fileStream = [System.IO.File]::Create($IconPath)
    $icon.Save($fileStream)
    $fileStream.Close()
    
    # Cleanup
    $icon.Dispose()
    $bitmap.Dispose()
    $img.Dispose()
    
    # Release the icon handle
    [void][System.Runtime.InteropServices.Marshal]::DestroyIcon($hIcon)
    
    Write-Host "Icon created: $IconPath" -ForegroundColor Green
}
catch {
    Write-Host "Error creating icon: $_" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    try {
        # Alternative: Use ImageMagick if available, or copy favicon
        $fallbackIcon = Join-Path $ProjectRoot "client\public\favicon.ico"
        if (Test-Path $fallbackIcon) {
            Copy-Item $fallbackIcon $IconPath -Force
            Write-Host "Copied favicon as icon" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Could not create icon. Please create smiling-steps.ico manually." -ForegroundColor Red
    }
}

# Delete existing shortcut
if (Test-Path $ShortcutPath) {
    Remove-Item $ShortcutPath -Force
    Write-Host "Removed old shortcut" -ForegroundColor Gray
}

# Create the shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatchFile
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "Start Smiling Steps Application"
$Shortcut.WindowStyle = 7  # Minimized
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Save()

# Clear icon cache to force refresh
Write-Host "Clearing icon cache..." -ForegroundColor Cyan
$iconCachePath = "$env:LOCALAPPDATA\IconCache.db"
$thumbCachePath = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db"

# Try to clear icon cache
try {
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    if (Test-Path $iconCachePath) {
        Remove-Item $iconCachePath -Force -ErrorAction SilentlyContinue
    }
    
    Get-Item $thumbCachePath -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    
    Start-Process explorer
    Write-Host "Icon cache cleared" -ForegroundColor Green
}
catch {
    Write-Host "Could not clear icon cache automatically. Try restarting your computer." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Desktop Shortcut Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Shortcut: $ShortcutPath" -ForegroundColor White
Write-Host "Icon:     $IconPath" -ForegroundColor White
Write-Host ""
Write-Host "If icon still appears grey:" -ForegroundColor Yellow
Write-Host "  1. Delete the shortcut from desktop" -ForegroundColor Gray
Write-Host "  2. Run this script again" -ForegroundColor Gray
Write-Host "  3. Or restart your computer to clear icon cache" -ForegroundColor Gray
Write-Host ""
