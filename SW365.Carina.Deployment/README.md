# SW365 Carina Azure VM Deployment

This folder contains scripts for a low-cost Azure deployment where one small Linux VM runs:

- Node.js/Express web app
- MySQL database
- Nginx reverse proxy
- manual MySQL backups to Azure Blob Storage

This is intended for light personal usage where the VM can be deallocated when the app is not needed.

## Prerequisites

- Azure CLI installed locally
- PowerShell 7 or Windows PowerShell
- SSH key pair
- Azure subscription selected with `az account set`

If you do not already have an SSH key pair, create one first:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh"
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519_carina" -C "carina-azure-vm"
```

Then use the generated public key path when creating the VM:

```powershell
-SshPublicKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina.pub"
```

## Files

```text
cloud-init/vm-init.yml             Base VM bootstrap script
scripts/01-create-infrastructure.ps1
scripts/02-deploy-application.ps1
scripts/03-deploy-database.ps1
scripts/04-install-mysql-backup.ps1
scripts/05-run-mysql-backup.ps1
scripts/06-update-database-add-savings-account-type.ps1
scripts/07-update-application.ps1
scripts/08-change-vm-os-disk-sku.ps1
scripts/09-restore-mysql-backup.ps1
scripts/10-update-database-add-bank-transaction-imports.ps1
sql-updates/2026-07-08-add-savings-account-type.sql
sql-updates/2026-07-19-add-bank-transaction-imports.sql
vm/setup-app.sh                    Remote app installer
vm/backup-mysql.sh                 Remote backup script
vm/restore-mysql.sh                Remote restore script
```

## Deployment Flow

1. Create the Azure infrastructure:

```powershell
.\scripts\01-create-infrastructure.ps1 `
  -ResourceGroupName "rg-carina-personal" `
  -Location "australiaeast" `
  -VmName "vm-carina-personal" `
  -AdminUsername "azureuser" `
  -SshPublicKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina.pub" `
  -OsDiskSku "Standard_LRS"
```

2. Deploy the web app:

```powershell
.\scripts\02-deploy-application.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -DbPassword "<APP_DB_PASSWORD>"
```

3. Deploy or refresh database schema/procedures:

```powershell
.\scripts\03-deploy-database.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -DbPassword "<APP_DB_PASSWORD>"
```

4. Install the manual backup script:

```powershell
.\scripts\04-install-mysql-backup.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -StorageAccountName "<STORAGE_ACCOUNT_NAME>" `
  -DbPassword "<APP_DB_PASSWORD>"
```

5. Run a backup manually whenever you need one:

```powershell
.\scripts\05-run-mysql-backup.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

If you later decide you want a daily schedule, run step 4 with `-InstallDailySchedule`.

## Updating an Existing Azure VM App

For updates to an already deployed VM, do not run `03-deploy-database.ps1` unless you intend to rebuild the database from `schema.sql`. The schema script drops and recreates tables.

For the account type update that adds `SAVINGS`, run the non-destructive database update first:

```powershell
.\scripts\06-update-database-add-savings-account-type.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -DbPassword "<APP_DB_PASSWORD>"
```

Then deploy the web app changes and restart the Node.js service:

```powershell
.\scripts\07-update-application.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

The application update preserves the existing remote `.env`, copies the current web app files, runs `npm ci --omit=dev`, and restarts the `personal-finance` systemd service.

For the bank CSV import feature, run the non-destructive database update first:

```powershell
.\scripts\10-update-database-add-bank-transaction-imports.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -DbPassword "<APP_DB_PASSWORD>"
```

Then deploy the web app changes:

```powershell
.\scripts\07-update-application.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

## Changing the VM OS Disk to Standard HDD

Future VM deployments use `-OsDiskSku "Standard_LRS"` by default, which creates the OS disk as Standard HDD.

Changing the disk SKU requires the VM to be deallocated, so plan for app downtime. For extra safety, create a disk snapshot before changing the SKU.

Changing the disk SKU should preserve the data on the managed disk. The backup and restore steps below are a safety net in case you need to recover MySQL data.

### Full Backup, Disk Change, Restore Runbook

1. Make sure the backup script is installed. Run this once if it has not already been installed:

```powershell
.\scripts\04-install-mysql-backup.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -StorageAccountName "<STORAGE_ACCOUNT_NAME>" `
  -DbPassword "<APP_DB_PASSWORD>"
```

2. Run a fresh manual MySQL backup before touching the disk:

```powershell
.\scripts\05-run-mysql-backup.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

The backup script prints the uploaded blob name, for example `personal_finance_2026-07-09_10-15-00.sql.gz`. Keep that name if you want to restore a specific backup.

3. Change the OS disk from Premium SSD to Standard HDD and start the VM again:

```powershell
.\scripts\08-change-vm-os-disk-sku.ps1 `
  -ResourceGroupName "rg-carina-personal" `
  -VmName "vm-carina-personal" `
  -DiskSku "Standard_LRS" `
  -StartVmAfterChange
```

4. Check the app. In the normal case, the data should still be there and you do not need to restore.

5. If you need to restore MySQL from the latest backup, run:

Restoring overwrites the database with the backup state. Only do this if the app data is missing or corrupted after the disk SKU change.

```powershell
.\scripts\09-restore-mysql-backup.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

To restore a specific backup blob instead of the latest one:

```powershell
.\scripts\09-restore-mysql-backup.ps1 `
  -VmPublicIp "<VM_PUBLIC_IP_OR_DNS>" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -BackupBlobName "personal_finance_2026-07-09_10-15-00.sql.gz"
```

The restore script stops the `personal-finance` service, downloads the backup from Azure Blob Storage using the VM managed identity, imports it into MySQL, and starts the service again.

For an existing VM that already has a Premium SSD OS disk, run:

```powershell
.\scripts\08-change-vm-os-disk-sku.ps1 `
  -ResourceGroupName "rg-carina-personal" `
  -VmName "vm-carina-personal" `
  -DiskSku "Standard_LRS"
```

This deallocates the VM, changes the managed OS disk SKU, and leaves the VM stopped. Add `-StartVmAfterChange` if you want the script to start it again:

```powershell
.\scripts\08-change-vm-os-disk-sku.ps1 `
  -ResourceGroupName "rg-carina-personal" `
  -VmName "vm-carina-personal" `
  -DiskSku "Standard_LRS" `
  -StartVmAfterChange
```

## Cost Control

When not using the app, deallocate the VM:

```powershell
az vm deallocate --resource-group "rg-carina-personal" --name "vm-carina-personal"
```

Start it again when needed:

```powershell
az vm start --resource-group "rg-carina-personal" --name "vm-carina-personal"
```

## Security Notes

- The scripts open ports 22, 80, and 443.
- Add application authentication before exposing personal finance data publicly.
- Restrict SSH source IPs in the NSG after deployment.
- Use HTTPS before regular usage.
- Backups are copied to Azure Blob Storage using the VM's managed identity.
