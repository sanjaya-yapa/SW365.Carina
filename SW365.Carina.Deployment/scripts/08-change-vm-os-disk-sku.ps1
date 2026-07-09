param(
    [string]$ResourceGroupName = "rg-carina-personal",
    [string]$VmName = "vm-carina-personal",
    [ValidateSet("Standard_LRS", "StandardSSD_LRS", "Premium_LRS")]
    [string]$DiskSku = "Standard_LRS",
    [switch]$StartVmAfterChange
)

$ErrorActionPreference = "Stop"

Write-Host "Finding OS disk for VM $VmName..."
$osDiskId = az vm show `
    --resource-group $ResourceGroupName `
    --name $VmName `
    --query "storageProfile.osDisk.managedDisk.id" `
    --output tsv

if (-not $osDiskId) {
    throw "Could not find the OS disk for VM $VmName in resource group $ResourceGroupName."
}

Write-Host "Deallocating VM before disk SKU change..."
az vm deallocate `
    --resource-group $ResourceGroupName `
    --name $VmName `
    --output table

Write-Host "Updating OS disk SKU to $DiskSku..."
az disk update `
    --ids $osDiskId `
    --sku $DiskSku `
    --output table

if ($StartVmAfterChange) {
    Write-Host "Starting VM..."
    az vm start `
        --resource-group $ResourceGroupName `
        --name $VmName `
        --output table
}

Write-Host "Disk SKU update complete."
Write-Host "Standard_LRS means Standard HDD."
