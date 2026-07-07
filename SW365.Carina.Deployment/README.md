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
vm/setup-app.sh                    Remote app installer
vm/backup-mysql.sh                 Remote backup script
```

## Deployment Flow

1. Create the Azure infrastructure:

```powershell
.\scripts\01-create-infrastructure.ps1 `
  -ResourceGroupName "rg-carina-personal" `
  -Location "australiaeast" `
  -VmName "vm-carina-personal" `
  -AdminUsername "azureuser" `
  -SshPublicKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina.pub"
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
