param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,

    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$WebAppPath = "..\..\SW365.Carina.WebApp",
    [string]$DbName = "personal_finance",
    [string]$DbUser = "carina_app",
    [Parameter(Mandatory = $true)]
    [string]$DbPassword
)

$ErrorActionPreference = "Stop"

$resolvedWebAppPath = Resolve-Path (Join-Path $PSScriptRoot $WebAppPath)
$schemaPath = Join-Path $resolvedWebAppPath "sql\schema.sql"
$proceduresPath = Join-Path $resolvedWebAppPath "sql\procedures.sql"

if (-not (Test-Path $schemaPath)) {
    throw "Schema file was not found at $schemaPath"
}

if (-not (Test-Path $proceduresPath)) {
    throw "Procedures file was not found at $proceduresPath"
}

Write-Host "Uploading database scripts..."
scp -i $SshPrivateKeyPath $schemaPath "$AdminUsername@$VmPublicIp`:/tmp/schema.sql"
scp -i $SshPrivateKeyPath $proceduresPath "$AdminUsername@$VmPublicIp`:/tmp/procedures.sql"

Write-Host "Applying database scripts..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "mysql -u '$DbUser' -p'$DbPassword' '$DbName' < /tmp/schema.sql && mysql -u '$DbUser' -p'$DbPassword' '$DbName' < /tmp/procedures.sql"

Write-Host "Database scripts applied."
