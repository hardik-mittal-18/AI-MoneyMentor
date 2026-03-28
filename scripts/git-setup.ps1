Param(
  [string]$RepoUrl = "https://github.com/hardik-mittal-18/AI-MoneyMentor.git"
)

$ErrorActionPreference = "Stop"

Write-Host "== AI-MoneyMentor: Git setup ==" -ForegroundColor Cyan

# Ensure git is available
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  throw "git is not installed or not on PATH. Install Git for Windows and retry."
}

# Initialize repo if needed
if (-not (Test-Path -Path ".git")) {
  git init
}

# Configure identity (local repo)
git config user.name "hardik-mittal-18"
git config user.email "hardikmittal2908@gmail.com"

# Ensure branch is main
# (Works whether we're on master, main, or detached)
try {
  git branch -M main
} catch {
  # Older git fallback
  git checkout -B main
}

# Remote handling: remove existing origin if present
$hasOrigin = $false
try {
  $originUrl = git remote get-url origin 2>$null
  if ($originUrl) { $hasOrigin = $true }
} catch {
  $hasOrigin = $false
}

if ($hasOrigin) {
  Write-Host "Origin already exists ($originUrl). Resetting to $RepoUrl" -ForegroundColor Yellow
  git remote remove origin
}

git remote add origin $RepoUrl

# Initial commit
# Stage everything (respects .gitignore)
git add .

# Create commit only if there is something to commit
$porcelain = git status --porcelain
if (-not $porcelain) {
  Write-Host "No changes to commit." -ForegroundColor Yellow
} else {
  git commit -m "Initial commit - AI Money Mentor"
}

# Push
Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push -u origin main

Write-Host "Done." -ForegroundColor Green
