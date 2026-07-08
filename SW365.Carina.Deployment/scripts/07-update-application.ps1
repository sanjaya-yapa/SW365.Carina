param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$WebAppPath = "..\..\SW365.Carina.WebApp",
    [string]$RemoteAppDir = "/opt/personal-finance/app",
    [string]$ServiceName = "personal-finance"
)

$ErrorActionPreference = "Stop"

$resolvedWebAppPath = Resolve-Path (Join-Path $PSScriptRoot $WebAppPath)
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("carina-update-" + [Guid]::NewGuid().ToString("N"))
$packagePath = Join-Path ([System.IO.Path]::GetTempPath()) ("carina-webapp-update-" + [Guid]::NewGuid().ToString("N") + ".zip")
$remotePackagePath = "/tmp/personal-finance-update.zip"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    Write-Host "Staging application update package..."
    robocopy $resolvedWebAppPath $tempRoot /E /XD node_modules /XF .env | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }

    Compress-Archive -Path (Join-Path $tempRoot "*") -DestinationPath $packagePath -Force

    Write-Host "Uploading application update..."
    scp -i $SshPrivateKeyPath $packagePath "$AdminUsername@$VmPublicIp`:$remotePackagePath"

    Write-Host "Applying application update and restarting service..."
    $remoteCommand = "set -e; sudo rm -rf /tmp/personal-finance-update; sudo mkdir -p /tmp/personal-finance-update; sudo unzip -q -o '$remotePackagePath' -d /tmp/personal-finance-update; sudo cp -a /tmp/personal-finance-update/. '$RemoteAppDir'/; cd '$RemoteAppDir'; sudo npm ci --omit=dev; sudo chown -R www-data:www-data /opt/personal-finance; sudo chmod 600 '$RemoteAppDir/.env'; sudo systemctl restart '$ServiceName'; sudo systemctl is-active '$ServiceName'"
    ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" $remoteCommand

    Write-Host ""
    Write-Host "Application update deployed."
    Write-Host "Open: http://$VmPublicIp/"
}
finally {
    if (Test-Path $tempRoot) {
        Remove-Item -Recurse -Force $tempRoot
    }

    if (Test-Path $packagePath) {
        Remove-Item -Force $packagePath
    }
}
