param(
    [ValidateSet('All', 'Production', 'Test')]
    [string]$Target = 'All'
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

function Invoke-HostingDeploy {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Alias,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host "[$Label] Firebase Hosting deployment started ($Alias)."
    & firebase deploy --only hosting --project $Alias
    if ($LASTEXITCODE -ne 0) {
        throw "$Label Hosting deployment failed with exit code $LASTEXITCODE."
    }
    Write-Host "[$Label] Firebase Hosting deployment completed."
}

Push-Location $workspacePath
try {
    if ($Target -in @('All', 'Test')) {
        Invoke-HostingDeploy -Alias 'test' -Label 'TEST · hearme2nite1205'
    }

    if ($Target -in @('All', 'Production')) {
        Invoke-HostingDeploy -Alias 'prod' -Label 'MAIN · our-baby-care'
    }
}
finally {
    Pop-Location
}

