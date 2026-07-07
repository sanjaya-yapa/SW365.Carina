param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [Parameter(Mandatory = $true)]
    [string]$StorageAccountName,
    [string]$StorageContainerName = "mysql-backups",
    [string]$DbName = "personal_finance",
    [string]$DbUser = "carina_app",
    [Parameter(Mandatory = $true)]
    [string]$DbPassword,
    [switch]$InstallDailySchedule,
    [string]$CronSchedule = "0 2 * * *"
)

$ErrorActionPreference = "Stop"

$deploymentRoot = Split-Path -Parent $PSScriptRoot
$backupScriptPath = Join-Path $deploymentRoot "vm\backup-mysql.sh"

if (-not (Test-Path $backupScriptPath)) {
    throw "Backup script was not found at $backupScriptPath"
}

Write-Host "Uploading backup script..."
scp -i $SshPrivateKeyPath $backupScriptPath "$AdminUsername@$VmPublicIp`:/tmp/backup-mysql.sh"

Write-Host "Installing backup script..."
$remoteCommand = @"
sudo mkdir -p /opt/personal-finance/backups &&
sudo mv /tmp/backup-mysql.sh /opt/personal-finance/backups/backup-mysql.sh &&
sudo chmod 700 /opt/personal-finance/backups/backup-mysql.sh &&
sudo tee /etc/personal-finance-backup.env >/dev/null <<'EOF'
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$DbPassword
STORAGE_ACCOUNT_NAME=$StorageAccountName
STORAGE_CONTAINER_NAME=$StorageContainerName
EOF
sudo chmod 600 /etc/personal-finance-backup.env &&
sudo rm -f /etc/cron.d/personal-finance-mysql-backup
"@

ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" $remoteCommand

if ($InstallDailySchedule) {
    Write-Host "Installing optional daily backup schedule..."
    ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "echo '$CronSchedule root /opt/personal-finance/backups/backup-mysql.sh >> /var/log/personal-finance-mysql-backup.log 2>&1' | sudo tee /etc/cron.d/personal-finance-mysql-backup >/dev/null && sudo chmod 644 /etc/cron.d/personal-finance-mysql-backup"
    Write-Host "Daily backup schedule installed."
}

Write-Host "Backup script installed."
Write-Host "To run a manual backup, use:"
Write-Host "ssh -i $SshPrivateKeyPath $AdminUsername@$VmPublicIp `"sudo /opt/personal-finance/backups/backup-mysql.sh`""
