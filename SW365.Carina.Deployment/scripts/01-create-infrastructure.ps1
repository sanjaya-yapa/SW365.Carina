param(
    [string]$ResourceGroupName = "rg-carina-personal",
    [string]$Location = "australiaeast",
    [string]$VmName = "vm-carina-personal",
    [string]$AdminUsername = "azureuser",
    [string]$SshPublicKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub",
    [string]$VmSize = "Standard_B1s",
    [string]$AddressPrefix = "10.42.0.0/16",
    [string]$SubnetPrefix = "10.42.1.0/24"
)

$ErrorActionPreference = "Stop"

$deploymentRoot = Split-Path -Parent $PSScriptRoot
$cloudInitPath = Join-Path $deploymentRoot "cloud-init\vm-init.yml"

if (-not (Test-Path $SshPublicKeyPath)) {
    throw "SSH public key was not found at $SshPublicKeyPath"
}

if (-not (Test-Path $cloudInitPath)) {
    throw "Cloud-init file was not found at $cloudInitPath"
}

$suffix = (Get-Random -Minimum 10000 -Maximum 99999)
$vnetName = "$VmName-vnet"
$subnetName = "$VmName-subnet"
$nsgName = "$VmName-nsg"
$publicIpName = "$VmName-pip"
$nicName = "$VmName-nic"
$storageAccountName = ("carinabackup{0}" -f $suffix).ToLower()
$backupContainerName = "mysql-backups"
$dnsLabel = ("{0}-{1}" -f $VmName, $suffix).ToLower()

Write-Host "Creating resource group..."
az group create `
    --name $ResourceGroupName `
    --location $Location `
    --output table

Write-Host "Creating backup storage account..."
az storage account create `
    --resource-group $ResourceGroupName `
    --location $Location `
    --name $storageAccountName `
    --sku Standard_LRS `
    --kind StorageV2 `
    --min-tls-version TLS1_2 `
    --allow-blob-public-access false `
    --output table

az storage container create `
    --account-name $storageAccountName `
    --name $backupContainerName `
    --auth-mode login `
    --output table

Write-Host "Creating network..."
az network vnet create `
    --resource-group $ResourceGroupName `
    --location $Location `
    --name $vnetName `
    --address-prefix $AddressPrefix `
    --subnet-name $subnetName `
    --subnet-prefixes $SubnetPrefix `
    --output table

az network nsg create `
    --resource-group $ResourceGroupName `
    --location $Location `
    --name $nsgName `
    --output table

az network nsg rule create `
    --resource-group $ResourceGroupName `
    --nsg-name $nsgName `
    --name AllowSsh `
    --priority 1000 `
    --access Allow `
    --protocol Tcp `
    --direction Inbound `
    --source-address-prefixes "*" `
    --source-port-ranges "*" `
    --destination-address-prefixes "*" `
    --destination-port-ranges 22 `
    --output table

az network nsg rule create `
    --resource-group $ResourceGroupName `
    --nsg-name $nsgName `
    --name AllowHttp `
    --priority 1010 `
    --access Allow `
    --protocol Tcp `
    --direction Inbound `
    --source-address-prefixes "*" `
    --source-port-ranges "*" `
    --destination-address-prefixes "*" `
    --destination-port-ranges 80 `
    --output table

az network nsg rule create `
    --resource-group $ResourceGroupName `
    --nsg-name $nsgName `
    --name AllowHttps `
    --priority 1020 `
    --access Allow `
    --protocol Tcp `
    --direction Inbound `
    --source-address-prefixes "*" `
    --source-port-ranges "*" `
    --destination-address-prefixes "*" `
    --destination-port-ranges 443 `
    --output table

az network public-ip create `
    --resource-group $ResourceGroupName `
    --location $Location `
    --name $publicIpName `
    --sku Standard `
    --allocation-method Static `
    --dns-name $dnsLabel `
    --output table

az network nic create `
    --resource-group $ResourceGroupName `
    --location $Location `
    --name $nicName `
    --vnet-name $vnetName `
    --subnet $subnetName `
    --network-security-group $nsgName `
    --public-ip-address $publicIpName `
    --output table

Write-Host "Creating VM..."
az vm create `
    --resource-group $ResourceGroupName `
    --name $VmName `
    --location $Location `
    --size $VmSize `
    --image Ubuntu2404 `
    --admin-username $AdminUsername `
    --ssh-key-values $SshPublicKeyPath `
    --nics $nicName `
    --assign-identity `
    --custom-data $cloudInitPath `
    --output table

$principalId = az vm identity show `
    --resource-group $ResourceGroupName `
    --name $VmName `
    --query principalId `
    --output tsv

$storageId = az storage account show `
    --resource-group $ResourceGroupName `
    --name $storageAccountName `
    --query id `
    --output tsv

Write-Host "Granting VM managed identity access to backup storage..."
az role assignment create `
    --assignee $principalId `
    --role "Storage Blob Data Contributor" `
    --scope $storageId `
    --output table

$publicIp = az network public-ip show `
    --resource-group $ResourceGroupName `
    --name $publicIpName `
    --query ipAddress `
    --output tsv

$fqdn = az network public-ip show `
    --resource-group $ResourceGroupName `
    --name $publicIpName `
    --query dnsSettings.fqdn `
    --output tsv

Write-Host ""
Write-Host "Infrastructure created."
Write-Host "Public IP: $publicIp"
Write-Host "DNS name:  $fqdn"
Write-Host "Storage:   $storageAccountName"
Write-Host "SSH:       ssh -i <private-key-path> $AdminUsername@$publicIp"
Write-Host ""
Write-Host "Wait 2-5 minutes for cloud-init to finish before deploying the app."

