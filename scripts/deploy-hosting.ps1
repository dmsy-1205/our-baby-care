param(
    [ValidateSet('All', 'Production', 'Test')]
    [string]$Target = 'Test'
)

$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path -Parent $PSScriptRoot
$firebaseAliases = Get-Content -LiteralPath (Join-Path $workspacePath '.firebaserc') -Raw | ConvertFrom-Json

if ($firebaseAliases.projects.prod -ne 'our-baby-care') {
    throw 'Production alias mismatch: prod must point to our-baby-care.'
}

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

function Invoke-HostingDeploy {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Alias,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host "[$Label] Firebase Hosting deployment started ($Alias)."
    & $firebaseCommand deploy --only hosting --project $Alias
    if ($LASTEXITCODE -ne 0) {
        throw "$Label Hosting deployment failed with exit code $LASTEXITCODE."
    }
    Write-Host "[$Label] Firebase Hosting deployment completed."
}

Push-Location $workspacePath
try {
    if ($Target -in @('All', 'Test')) {
        Invoke-HostingDeploy -Alias 'test' -Label 'FUTURE PRODUCTION - hearme2nite1205'
    }

    if ($Target -in @('All', 'Production')) {
        Invoke-HostingDeploy -Alias 'prod' -Label 'LEGACY BETA - our-baby-care'
    }
}
finally {
    Pop-Location
}
