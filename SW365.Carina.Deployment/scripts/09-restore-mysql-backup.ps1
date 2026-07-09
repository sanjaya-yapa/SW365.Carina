param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_ed25519_carina",
    [string]$BackupBlobName = "latest",
    [string]$ServiceName = "personal-finance"
)

$ErrorActionPreference = "Stop"

$deploymentRoot = Split-Path -Parent $PSScriptRoot
$restoreScriptPath = Join-Path $deploymentRoot "vm\restore-mysql.sh"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

if (-not (Test-Path $restoreScriptPath)) {
    throw "Restore script was not found at $restoreScriptPath"
}

Write-Host "Uploading restore script..."
scp -i $SshPrivateKeyPath $restoreScriptPath "$AdminUsername@$VmPublicIp`:/tmp/restore-mysql.sh"

Write-Host "Installing restore script..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "sudo mkdir -p /opt/personal-finance/backups && sudo mv /tmp/restore-mysql.sh /opt/personal-finance/backups/restore-mysql.sh && sudo chmod 700 /opt/personal-finance/backups/restore-mysql.sh"

Write-Host "Restoring MySQL backup..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "sudo /opt/personal-finance/backups/restore-mysql.sh '$BackupBlobName' '$ServiceName'"

Write-Host "MySQL restore completed."
