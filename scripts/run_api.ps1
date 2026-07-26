$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $repoRoot ".env"
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { "python" }

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2 -and $parts[0].Trim()) {
                [System.Environment]::SetEnvironmentVariable(
                    $parts[0].Trim(),
                    $parts[1],
                    "Process"
                )
            }
        }
    }
}

Push-Location $repoRoot
try {
    & $python "src\tax_liability_engine\scripts\liability_engine_on.py"
} finally {
    Pop-Location
}
