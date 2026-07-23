param(
    [ValidateSet('Test')]
    [string]$Target = 'Test'
)

$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path -Parent $PSScriptRoot
$firebaseAliases = Get-Content -LiteralPath (Join-Path $workspacePath '.firebaserc') -Raw | ConvertFrom-Json

if ($firebaseAliases.projects.test -ne 'hearme2nite1205') {
    throw 'Test alias mismatch: test must point to hearme2nite1205.'
}

$firebaseCommand = Get-Command firebase.cmd -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
if (-not $firebaseCommand) {
    $firebaseCommand = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'npm\firebase.cmd'
}
if (-not (Test-Path -LiteralPath $firebaseCommand)) {
    throw 'Firebase CLI was not found. Install firebase-tools before deployment.'
}

Push-Location $workspacePath
try {
    node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8')); console.log('[TEST RULES] JSON parse passed')"
    if ($LASTEXITCODE -ne 0) { throw 'Database rules JSON validation failed.' }

    node scripts/verify-critical-contracts.js
    if ($LASTEXITCODE -ne 0) { throw 'Critical contract verification failed.' }

    Write-Host '[TEST RULES ONLY - hearme2nite1205] Realtime Database rules deployment started.'
    & $firebaseCommand deploy --only database --project test
    if ($LASTEXITCODE -ne 0) {
        throw "Test Database rules deployment failed with exit code $LASTEXITCODE."
    }
    Write-Host '[TEST RULES ONLY - hearme2nite1205] Realtime Database rules deployment completed. No data was changed.'
}
finally {
    Pop-Location
}
