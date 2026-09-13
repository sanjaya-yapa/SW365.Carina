param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,
    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_ed25519_carina",
    [ValidatePattern('^[a-zA-Z0-9_]+$')]
    [string]$DbName = "personal_finance"
)

$ErrorActionPreference = "Stop"
$migrationPath = Join-Path $PSScriptRoot "..\sql-updates\2026-09-13-add-regular-expenses.sql"
$remotePath = "/tmp/carina-regular-$([Guid]::NewGuid().ToString('N')).sql"

if (-not (Test-Path -LiteralPath $SshPrivateKeyPath -PathType Leaf)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

Write-Host "Uploading regular expense database update..."
scp -i $SshPrivateKeyPath $migrationPath "$AdminUsername@$VmPublicIp`:$remotePath"
if ($LASTEXITCODE -ne 0) { throw "Migration upload failed; database update was not started." }

# The existing VM installer configures MySQL root access through the local Unix socket.
Write-Host "Applying additive database update using sudo and local MySQL socket authentication..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "sudo -n mysql --protocol=socket -uroot '$DbName' < '$remotePath' && rm -f '$remotePath'"
if ($LASTEXITCODE -ne 0) { throw "Database update failed. Review the error before deploying the application." }

Write-Host "Regular expense database update applied. Now run 07-update-application.ps1."
