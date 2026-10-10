# Editable pending bank imports

This update adds Account, Category, Tax Claimable and Is Regular controls to the
pending-import grid, with Complete and Complete Selected actions. Review continues
to open the existing individual review page. Failed rows retain their edits.
Uncompleted edits stay in memory and prompt before leaving or refreshing the page.

## Update the existing Azure VM

This is an application-only update. It uses the existing regular-expense completion
API and requires no new database migration on the current installation. Do not run
`03-deploy-database.ps1`: it rebuilds tables.

From `SW365.Carina.Deployment`, use the existing application updater:

```powershell
.\scripts\07-update-application.ps1 `
  -VmPublicIp "20.213.93.151" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

Use the VM address and key for your installation if different. The updater preserves
the remote `.env`, installs production dependencies and restarts the service.
Check the SSH output for an active service; the script's final completion message
alone does not verify deployment success. Hard-refresh the browser after updating.

## Verify

1. Open Transactions with pending imports, or import a CSV for the selected month.
2. Set all four fields on an expense row and Complete it. Verify the resulting
   transaction and flags in the main list and its edit page.
3. Edit several rows, select them, and use Complete Selected. A row missing its
   account/category should remain with a message; valid rows should complete.
4. Check that other unfinished rows retain their selections.
5. Check income rows offer income categories and disable the expense flags.
6. Check Review still opens the existing review page and Delete Selected works.
7. Check the grid scrolls horizontally on a narrow screen and leaving the page
   warns when unfinished edits exist.

Local checks from `SW365.Carina.WebApp`:

```powershell
node --test test/monthly-expenses.test.js test/regular-expenses.test.js test/inline-imports.test.js
npm run lint
```

The automated tests use database stubs and a small DOM test harness; the checks
above verify the actual browser and deployed database behavior.
