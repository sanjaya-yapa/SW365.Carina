# Reports landing page and Monthly Expense Analysis

Reports now opens a landing page at `/pages/reports.html` with links to:

- Monthly Expense Analysis: `/pages/monthly-expense-analysis.html`
- Daily Spending & Expense Details: `/pages/daily-expenses.html`

The daily report retains its chart, table, filters and transaction details.
The monthly analysis compares all 12 months of the selected year by expense category,
with total recorded spending, highest-spending month(s), and monthly changes.
The Is Regular filter applies to every total. January has no prior-month comparison;
percentage changes are unavailable when the preceding month is zero. Future and
empty months show zero recorded spending, not projected amounts.

## Azure update

Use the same backup-then-application-update sequence as previous changes:

```powershell
# Run from SW365.Carina.Deployment. Use your current address/key if different.
.\scripts\05-run-mysql-backup.ps1 `
  -VmPublicIp "20.213.93.151" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -UpdateBackupScript

# Run only after Backup uploaded and Manual MySQL backup completed, without errors.
.\scripts\07-update-application.ps1 `
  -VmPublicIp "20.213.93.151" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

No schema migration is required. Do not run `03-deploy-database.ps1`; it rebuilds
tables. The new `/api/reports/monthly-analysis` endpoint aggregates existing expense
transactions in a single query and includes inactive historical categories. Pending
imports, assets and income are excluded. Chart.js remains a production dependency.

Check for an active service in the SSH output, then hard-refresh the browser.
Verify both landing-page links and their All reports links. Compare a monthly total
with the daily report for the same month and Is Regular filter. Check an empty year,
month-to-month changes, and keyboard category toggles. These steps verify the live
database and browser; automated checks use stubs for database and chart rendering.
