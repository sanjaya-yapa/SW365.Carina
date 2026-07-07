param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_ed25519_carina"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

Write-Host "Starting manual MySQL backup..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "sudo /opt/personal-finance/backups/backup-mysql.sh"
Write-Host "Manual MySQL backup completed."
