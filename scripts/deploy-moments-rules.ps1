param(
    [ValidateSet('All', 'Production', 'Test')]
    [string]$Target = 'All'
)

$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path -Parent $PSScriptRoot

function Invoke-RulesDeploy {
    param([string]$Alias, [string]$Only, [string]$Label)
    Write-Host "[$Label] Security rules deployment started ($Only)."
    & firebase deploy --only $Only --project $Alias
    if ($LASTEXITCODE -ne 0) { throw "$Label rules deployment failed with exit code $LASTEXITCODE." }
    Write-Host "[$Label] Security rules deployment completed."
}

Push-Location $workspacePath
try {
    if ($Target -in @('All', 'Test')) {
        Invoke-RulesDeploy -Alias 'test' -Only 'database,storage' -Label 'FUTURE PRODUCTION - hearme2nite1205'
    }
    if ($Target -in @('All', 'Production')) {
        Invoke-RulesDeploy -Alias 'prod' -Only 'database' -Label 'LEGACY BETA - our-baby-care'
    }
}
finally {
    Pop-Location
}
