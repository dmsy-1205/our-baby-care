param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('our-baby-care')]
    [string]$ConfirmProject
)

$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path -Parent $PSScriptRoot
$firebaseAliases = Get-Content -LiteralPath (Join-Path $workspacePath '.firebaserc') -Raw | ConvertFrom-Json

if ($firebaseAliases.projects.prod -ne 'our-baby-care') {
    throw 'Production alias mismatch: prod must point to our-baby-care.'
}
if ($ConfirmProject -ne $firebaseAliases.projects.prod) {
    throw 'Production project confirmation failed.'
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
    Write-Host '[PRODUCTION EXPLICIT - our-baby-care] Firebase Hosting deployment started.'
    & $firebaseCommand deploy --only hosting --project prod
    if ($LASTEXITCODE -ne 0) {
        throw "Production Hosting deployment failed with exit code $LASTEXITCODE."
    }
    Write-Host '[PRODUCTION EXPLICIT - our-baby-care] Firebase Hosting deployment completed.'
}
finally {
    Pop-Location
}
