param(
    [Parameter(Mandatory = $true)]
    [string]$VmPublicIp,
    [string]$AdminUsername = "azureuser",
    [string]$SshPrivateKeyPath = "$env:USERPROFILE\.ssh\id_ed25519_carina",
    [ValidatePattern('^[a-zA-Z0-9_]+$')]
    [string]$DbName = "personal_finance"
)

$ErrorActionPreference = "Stop"
$migrationPath = Join-Path $PSScriptRoot "..\sql-updates\2026-10-22-add-transaction-owners.sql"
$proceduresPath = Join-Path $PSScriptRoot "..\..\SW365.Carina.WebApp\sql\procedures.sql"
$remotePrefix = "/tmp/carina-owners-$([Guid]::NewGuid().ToString('N'))"

if (-not (Test-Path -LiteralPath $SshPrivateKeyPath -PathType Leaf)) {
    throw "SSH private key was not found at $SshPrivateKeyPath"
}

Write-Host "Uploading transaction owner schema and stored procedures..."
$temporarySchema = [System.IO.Path]::GetTempFileName()
$temporaryProcedures = [System.IO.Path]::GetTempFileName()
try {
    # Normalize Windows checkouts to Unix line endings without a UTF-8 BOM for the Linux mysql client.
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $schema = [System.IO.File]::ReadAllText($migrationPath).Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($temporarySchema, $schema, $utf8NoBom)
    $procedures = [System.IO.File]::ReadAllText($proceduresPath).Replace("`r`n", "`n") -replace 'USE personal_finance;', "USE ``$DbName``;"
    [System.IO.File]::WriteAllText($temporaryProcedures, $procedures, $utf8NoBom)

    scp -i $SshPrivateKeyPath $temporarySchema "$AdminUsername@$VmPublicIp`:$remotePrefix-schema.sql"
    if ($LASTEXITCODE -ne 0) { throw "Schema upload failed; database update was not started." }
    scp -i $SshPrivateKeyPath $temporaryProcedures "$AdminUsername@$VmPublicIp`:$remotePrefix-procedures.sql"
    if ($LASTEXITCODE -ne 0) { throw "Procedure upload failed; database update was not started." }
}
finally {
    Remove-Item -LiteralPath $temporarySchema, $temporaryProcedures -Force
}

Write-Host "Applying transaction owner database update..."
ssh -i $SshPrivateKeyPath "$AdminUsername@$VmPublicIp" "sudo -n mysql --protocol=socket -uroot '$DbName' < '$remotePrefix-schema.sql' && sudo -n mysql --protocol=socket -uroot '$DbName' < '$remotePrefix-procedures.sql' && rm -f '$remotePrefix-schema.sql' '$remotePrefix-procedures.sql'"
if ($LASTEXITCODE -ne 0) { throw "Database update failed. Do not start the new app until both SQL files have applied successfully." }

Write-Host "Transaction owner database update applied. Deploy the matching application before restarting it."
