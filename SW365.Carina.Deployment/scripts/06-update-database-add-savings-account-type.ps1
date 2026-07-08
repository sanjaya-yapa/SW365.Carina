param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$DbName = "personal_finance",
    [string]$DbUser = "carina_app",
    [Parameter(Mandatory = $true)]
    [string]$DbPassword,
    [string]$MigrationPath = "..\sql-updates\2026-07-08-add-savings-account-type.sql"
)

$ErrorActionPreference = "Stop"

$resolvedMigrationPath = Resolve-Path (Join-Path $PSScriptRoot $MigrationPath)
$remoteMigrationPath = "/tmp/2026-07-08-add-savings-account-type.sql"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

if (-not (Test-Path $resolvedMigrationPath)) {
    throw "Migration file was not found at $resolvedMigrationPath"
}

Write-Host "Uploading database update..."
scp -i $SshPrivateKeyPath $resolvedMigrationPath "$AdminUsername@$VmPublicIp`:$remoteMigrationPath"

Write-Host "Applying non-destructive database update..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "mysql -u '$DbUser' -p'$DbPassword' '$DbName' < '$remoteMigrationPath'"

Write-Host "Database update applied."
Write-Host "Account type SAVINGS is now allowed by the accounts table and stored procedures."
