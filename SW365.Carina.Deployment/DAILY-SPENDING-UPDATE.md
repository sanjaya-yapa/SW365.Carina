# Daily spending chart update

Back up the live database with `scripts/05-run-mysql-backup.ps1` and confirm
`Backup uploaded: <filename>` before updating the application.

Deploy with the existing application updater from this directory:

```powershell
.\scripts\07-update-application.ps1 `
  -VmPublicIp "20.213.93.151" `
  -AdminUsername "azureuser" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

Use your current VM address/key if different. The updater installs the pinned
Chart.js production dependency using `npm ci --omit=dev` and restarts the app.
Both package.json and package-lock.json must be deployed with the application.
The app serves the chart library at `/vendor/chart.umd.js`; no additional CDN is used.

No database migration is required. Do not run `03-deploy-database.ps1` for this
feature; it rebuilds the database. Check for `active` in the remote service output
and verify the page: the updater's final success message alone is not sufficient.

After deployment, hard-refresh Reports. Check:

- Month and Is Regular filters update the chart, daily table and detailed report.
- Daily table totals match the detailed report; zero-spending days are included.
- Legend buttons toggle categories in the chart only. Tooltip totals distinguish
  visible categories from all categories matching the report filters.
- Daily table and Chart buttons switch views, including on mobile.
- An empty month displays zero totals and an empty-state message.

Only recorded expenses are included, using the existing monthly report API.
Pending imports, income and assets remain excluded; inactive historical accounts
and categories are included. Category amounts are aggregated in exact cents.
