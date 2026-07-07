param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$WebAppPath = "..\..\SW365.Carina.WebApp",
    [string]$DbName = "personal_finance",
    [string]$DbUser = "carina_app",
    [Parameter(Mandatory = $true)]
    [string]$DbPassword,
    [int]$AppPort = 3000
)

$ErrorActionPreference = "Stop"

$deploymentRoot = Split-Path -Parent $PSScriptRoot
$resolvedWebAppPath = Resolve-Path (Join-Path $PSScriptRoot $WebAppPath)
$setupScriptPath = Join-Path $deploymentRoot "vm\setup-app.sh"

if (-not (Test-Path $SshPrivateKeyPath)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

if (-not (Test-Path $setupScriptPath)) {
    throw "Remote setup script was not found at $setupScriptPath"
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("carina-deploy-" + [Guid]::NewGuid().ToString("N"))
$packagePath = Join-Path ([System.IO.Path]::GetTempPath()) ("carina-webapp-" + [Guid]::NewGuid().ToString("N") + ".zip")

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    Write-Host "Staging application package..."
    robocopy $resolvedWebAppPath $tempRoot /E /XD node_modules /XF .env | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }

    Compress-Archive -Path (Join-Path $tempRoot "*") -DestinationPath $packagePath -Force

    Write-Host "Uploading package and setup script..."
    scp -i $SshPrivateKeyPath $packagePath "$AdminUsername@$VmPublicIp`:/tmp/personal-finance.zip"
    scp -i $SshPrivateKeyPath $setupScriptPath "$AdminUsername@$VmPublicIp`:/tmp/setup-app.sh"

    Write-Host "Installing application on VM..."
    ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "chmod +x /tmp/setup-app.sh && sudo /tmp/setup-app.sh '$DbName' '$DbUser' '$DbPassword' '$AppPort'"

    Write-Host ""
    Write-Host "Application deployed."
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
