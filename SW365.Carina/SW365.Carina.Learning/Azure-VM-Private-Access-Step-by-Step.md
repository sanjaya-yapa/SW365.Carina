# Use Carina from Windows 11 without a dedicated Azure public IP

Prepared: 12 September 2026.

**Yes: start the VM first. Keep its existing public IP attached until private access is installed and tested.**

This guide adds Tailscale private access to the existing Ubuntu VM. The application, MySQL database and deployment scripts remain as they are. You use the Finance app in your Windows browser; SSH provides a Linux terminal for administration. This does not install a Windows or Linux graphical desktop.

## What stays and what can be removed

| Resource | Action |
| --- | --- |
| VM, disk and backup storage | Keep |
| Virtual network, subnet, network interface and security group | Keep; the VM needs its network |
| Dedicated Standard public IP | Detach, test, then delete only after all checks pass |

Azure VNets themselves are free. The supplied cost screenshot suggests that approximately AU$5.37 was for Standard IP addresses grouped under Virtual Network. Confirm this in Cost Analysis by filtering to Virtual Network and grouping by Resource or Meter. Storage and running-VM costs remain. [Azure VNet pricing](https://azure.microsoft.com/en-us/pricing/details/virtual-network/)

Tailscale has a free Personal plan for eligible personal use. Select that plan rather than a paid subscription. [Tailscale pricing](https://tailscale.com/pricing)

## 1. Start the existing VM

1. On Windows 11, open [Azure Portal](https://portal.azure.com/).
2. Select the correct subscription and open **Virtual machines**.
3. Open **vm-carina-personal** in **rg-carina-personal**. If your names differ, use the actual names throughout this guide.
4. Select **Start** and wait for **Running**.
5. Record the public IP from the Overview page.

Do not run `01-create-infrastructure.ps1` again. You are connecting to the existing deployment.

## 2. Check the network prerequisite

Tailscale needs outbound internet connectivity even though it does not need an inbound public IP. Package downloads also need outbound connectivity, and the backup upload must be tested separately.

In Azure Portal, open the VM's **Networking / Network settings**, record its network interface and VNet/subnet names, then open **Virtual networks > your VNet > Subnets > your subnet**. Inspect the default outbound access/private subnet setting without changing it.

- If default outbound access is disabled and there is no other outbound route, stop before detaching the public IP. This setup cannot maintain Tailscale connectivity in that state.
- If default outbound access is available, continue with the reversible test below. The setting alone is not proof of working connectivity.
- If another outbound service is configured, check its cost before treating this as a saving.

Newer Azure APIs default new VNets to private subnets; existing networks are not automatically changed. Default outbound access is implicit and less predictable than an explicit outbound method. Do not add a paid NAT Gateway just to save this small public IP charge. [Microsoft outbound access guidance](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/default-outbound-access)

## 3. Connect from Windows PowerShell

Open **PowerShell on Windows**, then check the existing SSH key:

```powershell
Test-Path "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

Expected: `True`. If false, locate the private key used for the original deployment. Do not replace the key or recreate the VM.

Replace the placeholder below with the current public IP:

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519_carina" azureuser@<CURRENT_PUBLIC_IP>
```

Use your original username if it differs. If SSH is unavailable on Windows, install **OpenSSH Client** through Windows Optional Features. If the connection times out, check that the VM is running and its SSH security rule allows your current home IP on TCP 22.

You are now at a **Linux terminal on the VM**. Check the application:

```bash
systemctl is-active personal-finance nginx mysql
curl -I http://127.0.0.1/
```

The services should report `active`, and the HTTP request should return a response. Resolve any existing application failure before changing networking.

## 4. Take a backup before changing access

Open a second **Windows PowerShell** window:

```powershell
Set-Location "C:\PROJECTS\Personal\PersonalFinance\SW365.Carina.Deployment"
.\scripts\05-run-mysql-backup.ps1 -VmPublicIp "<CURRENT_PUBLIC_IP>"
```

This assumes the existing backup script has already been installed. If it has not, follow step 4 of the [deployment README](../../SW365.Carina.Deployment/README.md) first.

Look for `Backup uploaded: ...sql.gz`. In Azure Portal, open the existing backup storage account, then **Containers > mysql-backups**, and confirm a new blob with the expected timestamp exists. Do not rely solely on the PowerShell script's final completion message: it does not explicitly check the SSH exit code.

## 5. Install Tailscale on Windows and the VM

1. On Windows, use the [official Windows installer](https://tailscale.com/docs/install/windows).
2. Sign in to your personal Tailscale account and leave it connected.
3. In the existing **Linux SSH terminal**, run:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo systemctl enable --now tailscaled
sudo tailscale up
tailscale ip -4
```

Open the authentication URL printed by `tailscale up` in your Windows browser and sign in with the same account. Record the VM's Tailscale IPv4 address, typically `100.x.y.z`. [Official Linux installation](https://tailscale.com/docs/install/linux)

Keep your SSH private key on Windows. Ordinary SSH key authentication continues to be used; no Tailscale SSH feature is required.

## 6. Test private access while the public IP is still attached

In a new **Windows PowerShell** window, replace the placeholder:

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519_carina" azureuser@<VM_TAILSCALE_IP>
```

When connecting through this new address for the first time, compare its host-key fingerprint with the VM's fingerprint shown in the original trusted SSH session:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

If the client presents another key type, compare the corresponding host public key. Do not accept a mismatched fingerprint.

On Windows, open:

```text
http://<VM_TAILSCALE_IP>/
```

Confirm your Finance data loads. This browser connection travels through Tailscale's encrypted connection. Do not enable Tailscale Funnel, which would publish a service publicly.

## 7. Detach the public IP, but retain the resource for recovery

1. In Azure Portal, open the VM's **Networking / Network settings**.
2. Select its **network interface**.
3. Open **IP configurations**, then the primary IP configuration.
4. Record the public IP resource name; the deployment normally uses `vm-carina-personal-pip`.
5. Disassociate the public IP, or select **None**, and save. Portal wording can vary.
6. Keep the public IP resource itself. Do not delete it yet.

Your original public-IP SSH session will disconnect. [Microsoft dissociation instructions](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/remove-public-ip-address-vm)

## 8. Test a complete stop/start cycle

1. In Azure Portal, select the VM and click **Stop**.
2. Wait until the status is **Stopped (deallocated)**.
3. Click **Start** and wait for **Running**, then allow time for Linux and Tailscale to reconnect.
4. From Windows, establish a fresh SSH session to the Tailscale address.
5. Open the Finance page at `http://<VM_TAILSCALE_IP>/` and check your data.
6. In the Linux session, check services and outbound HTTPS:

```bash
systemctl is-active tailscaled personal-finance nginx mysql
curl -I --connect-timeout 15 https://registry.npmjs.org/
```

7. From Windows PowerShell, run a new backup:

```powershell
Set-Location "C:\PROJECTS\Personal\PersonalFinance\SW365.Carina.Deployment"
.\scripts\05-run-mysql-backup.ps1 -VmPublicIp "<VM_TAILSCALE_IP>"
```

8. Confirm the new backup blob exists in Azure Storage.

**If any test fails, keep the public IP resource and follow the recovery steps below. Do not proceed to deletion.**

## 9. Delete the detached public IP after successful testing

1. In Azure Portal, search for **Public IP addresses**.
2. Select the exact resource recorded in step 7, in the correct resource group.
3. Verify that it is no longer associated with a resource.
4. Select **Delete** and confirm that specific public IP deletion.

Detaching alone does not stop Standard public IP billing; deletion removes that resource's ongoing charge. Deletion also releases the address, so it cannot be relied on for recovery afterward. [Public IP pricing](https://azure.microsoft.com/en-us/pricing/details/ip-addresses/)

Keep the VNet, subnet, NIC, security group, disks and storage account.

## 10. Daily Finance routine

1. Connect Tailscale on Windows.
2. Start the VM in Azure Portal and wait for it to reconnect.
3. Open `http://<VM_TAILSCALE_IP>/` in your Windows browser and do your Finance work.
4. Run the backup command from step 8 and verify the upload.
5. Select **Stop** in Azure Portal and verify **Stopped (deallocated)**.

You do not need to sign in to Linux for ordinary Finance work. Closing a browser or SSH window does not stop the VM. Disk and backup storage charges continue while it is deallocated.

If you prefer Azure CLI from Windows PowerShell, sign in with `az login`, select the correct subscription, then use:

```powershell
az vm start --resource-group "rg-carina-personal" --name "vm-carina-personal"
```

After finishing:

```powershell
az vm deallocate --resource-group "rg-carina-personal" --name "vm-carina-personal"
```

## Existing deployments and updates

Continue using the [existing deployment instructions](../../SW365.Carina.Deployment/README.md). For scripts that accept `-VmPublicIp`, supply the Tailscale address instead; the parameter is an SSH/SCP destination despite its name. Connect Tailscale on Windows first.

Do not rerun infrastructure creation to change access: it creates a public IP. Do not rerun database initialization for this migration: `03-deploy-database.ps1` rebuilds tables. Follow the README's existing non-destructive update flow for later application changes.

## Recovery and troubleshooting

### Private access fails after detachment, before deletion

1. Use Azure Portal; it does not require a working SSH connection to the guest.
2. Open the recorded NIC's primary **IP configuration**.
3. Associate the retained public IP again and save.
4. Start the VM if necessary and connect with the original public IP and SSH key.
5. Check `sudo tailscale status` and `sudo systemctl status tailscaled`, then investigate outbound connectivity.

If the subnet is private without another outbound route, retain the public IP until another connection design is chosen. Installing Tailscale does not provide Azure internet egress by itself.

### Private access fails after public IP deletion

Check that the VM is running and both devices are signed in to Tailscale. If guest access cannot be restored, create a new Standard public IPv4 resource in the VM's region and associate it through the NIC's IP configuration. Record its new address and use the original SSH key; public IP charges resume. Ensure the SSH NSG rule permits your current home IP.

### Tailscale is connected but the app is unavailable

Use SSH over the Tailscale address and run the service and localhost checks from step 3. Inspect the Linux firewall before changing rules; do not broadly disable it. If a custom firewall is enabled, allow the needed application and SSH traffic on the Tailscale interface.

### Access worked previously but has expired

Check the VM device in the Tailscale admin console for key expiry or a reauthentication requirement. Reauthenticate when needed. Review device-expiry settings before relying on unattended starts; disabling expiry is an optional security tradeoff, not a requirement of this guide.
