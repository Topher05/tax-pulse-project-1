$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Host $Message -ForegroundColor Red
    exit 1
}

function Read-TrimmedFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Fail "Required manifest '$Path' was not found."
    }

    return (Get-Content -LiteralPath $Path -Raw).Trim()
}

function Get-ToolVersion([string]$ToolName) {
    $toolVersions = Read-TrimmedFile ".tool-versions"

    foreach ($line in ($toolVersions -split "`r?`n")) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $parts = $trimmed -split "\s+"
        if ($parts.Length -ge 2 -and $parts[0] -eq $ToolName) {
            return $parts[1].Trim()
        }
    }

    Fail "Tool '$ToolName' was not found in .tool-versions."
}

function Get-PythonVersionFromPyproject {
    $pyproject = Read-TrimmedFile "pyproject.toml"
    $match = [regex]::Match($pyproject, '(?m)^\s*requires-python\s*=\s*"==([^"]+)"\s*$')

    if (-not $match.Success) {
        Fail "Could not parse requires-python from pyproject.toml. Expected exact pin like ==3.13.0."
    }

    return $match.Groups[1].Value.Trim()
}

function Assert-VersionMatch([string]$Label, [string]$Expected, [string]$Actual) {
    if ($Expected -ne $Actual) {
        Fail "$Label mismatch. Expected: $Expected, Found: $Actual"
    }
}

function Assert-CommandExists([string]$CommandName, [string]$Message) {
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Fail $Message
    }
}

Write-Host "Validating toolchain manifests..." -ForegroundColor Cyan

$ExpectedNodeFromNvmrc = (Read-TrimmedFile ".nvmrc").TrimStart("v")
$ExpectedNodeFromToolVersions = Get-ToolVersion "nodejs"
$ExpectedPythonFromToolVersions = Get-ToolVersion "python"
$ExpectedPythonFromPyproject = Get-PythonVersionFromPyproject

Assert-VersionMatch "Node manifest" $ExpectedNodeFromToolVersions $ExpectedNodeFromNvmrc
Assert-VersionMatch "Python manifest" $ExpectedPythonFromToolVersions $ExpectedPythonFromPyproject

Write-Host "Manifest versions agree: Node $ExpectedNodeFromToolVersions, Python $ExpectedPythonFromToolVersions" -ForegroundColor Green

Assert-CommandExists "nvm" "nvm is required but was not found on PATH. Install nvm for Windows and rerun setup.ps1."
Assert-CommandExists "winget" "winget is required but was not found on PATH. Install App Installer / winget and rerun setup.ps1."
Assert-CommandExists "py" "py launcher is required but was not found on PATH. Install Python Launcher and rerun setup.ps1."

Write-Host "Installing pinned Node.js with nvm..." -ForegroundColor Cyan
& nvm install $ExpectedNodeFromToolVersions | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "nvm install failed for Node $ExpectedNodeFromToolVersions."
}

& nvm use $ExpectedNodeFromToolVersions | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "nvm use failed for Node $ExpectedNodeFromToolVersions."
}

$PythonMajorMinor = ($ExpectedPythonFromToolVersions -split '\.')[0..1] -join '.'

Write-Host "Ensuring Python $ExpectedPythonFromToolVersions is installed..." -ForegroundColor Cyan
& py -$PythonMajorMinor -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" *> $null
if ($LASTEXITCODE -ne 0) {
    & winget install --exact --accept-package-agreements --accept-source-agreements --id Python.Python.$PythonMajorMinor --version $ExpectedPythonFromToolVersions | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Fail "winget install failed for Python $ExpectedPythonFromToolVersions."
    }
}

Assert-CommandExists "node" "node is unavailable after nvm activation."
Assert-CommandExists "npm" "npm is unavailable after nvm activation."

& py -$PythonMajorMinor -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" *> $null
if ($LASTEXITCODE -ne 0) {
    Fail "Python $ExpectedPythonFromToolVersions is unavailable after installation."
}

$pipCheck = & py -$PythonMajorMinor -m pip --version 2>$null
if ($LASTEXITCODE -ne 0 -or -not $pipCheck) {
    Fail "pip is unavailable for Python $ExpectedPythonFromToolVersions."
}

$ActualNode = (& node --version).Trim().TrimStart("v")
$ActualPython = (& py -$PythonMajorMinor -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')").Trim()

Assert-VersionMatch "Installed Node version" $ExpectedNodeFromToolVersions $ActualNode
Assert-VersionMatch "Installed Python version" $ExpectedPythonFromToolVersions $ActualPython

Write-Host "Installed runtime versions match manifests." -ForegroundColor Green
Write-Host "Detected package managers: npm and pip" -ForegroundColor Green

if (Test-Path -LiteralPath "package.json") {
    # These dependency installs are required before the TypeScript and Python checks can run.
    if (Test-Path -LiteralPath "package-lock.json") {
        Write-Host "package.json and package-lock.json detected. Running npm ci..." -ForegroundColor Cyan
        & npm ci | Out-Host
    } else {
        Write-Host "package.json detected without package-lock.json. Running npm install..." -ForegroundColor Cyan
        & npm install | Out-Host
    }

    if ($LASTEXITCODE -ne 0) {
        Fail "npm dependency installation failed."
    }
} else {
    Write-Host "No package.json found. Skipping npm ci for this fresh-clone check." -ForegroundColor Yellow
}

if (Test-Path -LiteralPath "src/pulseUI/package.json") {
    if (Test-Path -LiteralPath "src/pulseUI/package-lock.json") {
        Write-Host "Pulse UI package.json and package-lock.json detected. Running npm ci in src/pulseUI..." -ForegroundColor Cyan
        & npm --prefix src/pulseUI ci | Out-Host
    } else {
        Write-Host "Pulse UI package.json detected without package-lock.json. Running npm install in src/pulseUI..." -ForegroundColor Cyan
        & npm --prefix src/pulseUI install | Out-Host
    }

    if ($LASTEXITCODE -ne 0) {
        Fail "Pulse UI npm dependency installation failed."
    }
}

Write-Host "Installing Python package with dev dependencies..." -ForegroundColor Cyan
# This editable install is required before Ruff, Pyright, and pytest can run reliably.
& py -$PythonMajorMinor -m pip install -e ".[dev]" | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Python package installation failed."
}

Write-Host "Verifying the canonical Python package import path..." -ForegroundColor Cyan
& py -$PythonMajorMinor -c "import tax_liability_engine, tax_liability_engine.api; print(tax_liability_engine.__name__)" | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Canonical Python package import check failed."
}

Write-Host "Verifying Python linting and type-check tools..." -ForegroundColor Cyan
& py -$PythonMajorMinor -m ruff --version | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Ruff is unavailable after Python dev installation."
}

& py -$PythonMajorMinor -m pyright --version | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Pyright is unavailable after Python dev installation."
}

Write-Host "Running hello checks..." -ForegroundColor Cyan
$nodeHello = (& node -e "console.log('hello')").Trim()
$pythonHello = (& py -$PythonMajorMinor -c "print('hello')").Trim()

if ($nodeHello -ne "hello") {
    Fail "Node hello check failed. Expected 'hello', Found '$nodeHello'."
}

if ($pythonHello -ne "hello") {
    Fail "Python hello check failed. Expected 'hello', Found '$pythonHello'."
}

Write-Host "Hello checks passed for both Node and Python stacks." -ForegroundColor Green

if (Test-Path -LiteralPath "package.json") {
    Write-Host "Running TypeScript checks..." -ForegroundColor Cyan
    & npm run typecheck | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Fail "TypeScript typecheck failed."
    }

    & npm test | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Fail "TypeScript tests failed."
    }
}

Write-Host "Running Python checks..." -ForegroundColor Cyan
& py -$PythonMajorMinor -m ruff format --check src tests | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Ruff formatting check failed."
}

& py -$PythonMajorMinor -m ruff check src tests | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Ruff lint check failed."
}

$PythonExecutable = (& py -$PythonMajorMinor -c "import sys; print(sys.executable)").Trim()
& py -$PythonMajorMinor -m pyright --pythonpath $PythonExecutable | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Pyright type check failed."
}

& py -$PythonMajorMinor -m pytest | Out-Host
if ($LASTEXITCODE -ne 0) {
    Fail "Python tests failed."
}

Write-Host "Project checks passed for both TypeScript and Python." -ForegroundColor Green
