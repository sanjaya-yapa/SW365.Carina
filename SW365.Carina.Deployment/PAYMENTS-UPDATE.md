# Regular Payments calendar

The new Payments navigation item opens manual schedules, a monthly calendar, an
agenda and the next seven days of unpaid upcoming payments. Expected totals are
separate from actual spending. Paid requires linking an existing expense with the
same account and category. Complete a pending CSV import using the existing flow,
then select the resulting transaction in Payments. Amount/date differences are
allowed for real bills that differ from their estimates. Each transaction can link
to only one occurrence. Linking does not modify the transaction or its regular flag.

Schedules support weekly, fortnightly, monthly, quarterly and yearly recurrence.
The first/next due date anchors the schedule; short months clamp to their last day
without changing the original anchor. End dates are inclusive. To change a schedule,
end the old schedule before the replacement starts and create a new schedule.
Paid occurrences beyond a proposed end date must be unlinked first.

Skip affects one occurrence. Undo removes its paid/skipped status without deleting
the expense. Deleting a linked expense also clears its payment link. Existing
Is Regular expenses are not automatically converted into schedules. No automatic
matching, transaction generation, or notifications are included in this version.
Overdue means an unpaid due date before the browser's local today; today's items
remain upcoming. Monthly overdue totals are for the selected month.

## Azure rollout (database first)

Run from `SW365.Carina.Deployment`, adjusting the VM/key if needed. Run each step
separately and continue only after it succeeds.

```powershell
.\scripts\05-run-mysql-backup.ps1 `
  -VmPublicIp "20.213.93.151" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina" `
  -UpdateBackupScript
```

Confirm `Backup uploaded: <filename>` and successful completion; save the filename.

```powershell
.\scripts\12-update-database-add-payment-schedules.ps1 `
  -VmPublicIp "20.213.93.151" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

This additive, rerunnable migration creates payment_schedules and payment_occurrences.
It retains existing financial data. Do not run `03-deploy-database.ps1`; that rebuilds
tables. Existing deployed code continues working while this migration is applied.

```powershell
.\scripts\07-update-application.ps1 `
  -VmPublicIp "20.213.93.151" `
  -SshPrivateKeyPath "$env:USERPROFILE\.ssh\id_ed25519_carina"
```

Verify active service output, hard-refresh the browser and open Payments. Create a
schedule, inspect a short month, skip/undo an occurrence, and link an existing
expense. Confirm spending totals have not increased and a duplicate link is rejected.
Try ending the schedule and check later occurrences disappear while earlier ones
remain. Check Calendar/Agenda on mobile. Database and browser checks must be run
on the deployed installation; local automated checks use database stubs.
