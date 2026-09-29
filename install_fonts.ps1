$ErrorActionPreference = "Stop"
$FontDir = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
if (!(Test-Path -Path $FontDir)) { New-Item -ItemType Directory -Path $FontDir -Force | Out-Null }

$RegistryPath = "HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"

Write-Host "Installing SutonnyMJ..."
$SutonnyMJPath = "C:\Users\Admin\.gemini\antigravity-ide\scratch\fayzar-bangla-converter\fonts\SutonnyMJ-Regular.ttf"
if (Test-Path $SutonnyMJPath) {
    Copy-Item $SutonnyMJPath -Destination $FontDir -Force
    New-ItemProperty -Path $RegistryPath -Name "SutonnyMJ Regular (TrueType)" -Value "SutonnyMJ-Regular.ttf" -PropertyType String -Force | Out-Null
    Write-Host "SutonnyMJ Installed."
} else {
    Write-Host "SutonnyMJ not found in project folder."
}

Write-Host "Installing Kalpurush..."
$KalpurushUrl = "https://raw.githubusercontent.com/ShujonSutradhar/bangla-fonts/master/Kalpurush.ttf"
$KalpurushDest = "$FontDir\Kalpurush.ttf"
Invoke-WebRequest -Uri $KalpurushUrl -OutFile $KalpurushDest
New-ItemProperty -Path $RegistryPath -Name "Kalpurush (TrueType)" -Value "Kalpurush.ttf" -PropertyType String -Force | Out-Null
Write-Host "Kalpurush Installed."

Write-Host "Fonts installed successfully. Please restart Microsoft Word if it is open."
