param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$DbName = "personal_finance",
    [string]$DbUser = "carina_app",
    [Parameter(Mandatory = $true)]
    [string]$DbPassword,
    [string]$MigrationPath = "..\sql-updates\2026-07-19-add-bank-transaction-imports.sql"
)

$ErrorActionPreference = "Stop"

$resolvedMigrationPath = Resolve-Path (Join-Path $PSScriptRoot $MigrationPath)
$remoteMigrationPath = "/tmp/2026-07-19-add-bank-transaction-imports.sql"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

if (-not (Test-Path $resolvedMigrationPath)) {
    throw "Migration file was not found at $resolvedMigrationPath"
}

Write-Host "Uploading bank import database update..."
scp -i $SshPrivateKeyPath $resolvedMigrationPath "$AdminUsername@$VmPublicIp`:$remoteMigrationPath"

Write-Host "Applying non-destructive bank import database update..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "mysql -u '$DbUser' -p'$DbPassword' '$DbName' < '$remoteMigrationPath'"

Write-Host "Bank import database update applied."
