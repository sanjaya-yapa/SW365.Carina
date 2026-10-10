param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_ed25519_carina",

    [switch]$UpdateBackupScript
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

if ($UpdateBackupScript) {
    $backupScriptPath = Join-Path $PSScriptRoot "..\vm\backup-mysql.sh"
    $remotePath = "/tmp/carina-backup-$([Guid]::NewGuid().ToString('N')).sh"
    $localPath = [System.IO.Path]::GetTempFileName()
    try {
        # Normalize Windows checkouts to Unix line endings without a UTF-8 BOM.
        $scriptText = [System.IO.File]::ReadAllText($backupScriptPath).Replace("`r`n", "`n")
        [System.IO.File]::WriteAllText($localPath, $scriptText, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Uploading updated MySQL backup script..."
        scp -i $SshPrivateKeyPath $localPath "$AdminUsername@$VmPublicIp`:$remotePath"
        if ($LASTEXITCODE -ne 0) { throw "Backup script upload failed; backup was not started." }

        ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "bash -n '$remotePath' && sudo -n install -o root -g root -m 700 '$remotePath' /opt/personal-finance/backups/backup-mysql.sh && rm -f '$remotePath'"
        if ($LASTEXITCODE -ne 0) { throw "Backup script installation failed; backup was not started." }
    }
    finally {
        Remove-Item -LiteralPath $localPath -Force
    }
}

Write-Host "Starting manual MySQL backup..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "sudo -n /opt/personal-finance/backups/backup-mysql.sh"
if ($LASTEXITCODE -ne 0) {
    throw "MySQL backup failed (SSH exit code $LASTEXITCODE). Review the remote error above."
}
Write-Host "Manual MySQL backup completed."
