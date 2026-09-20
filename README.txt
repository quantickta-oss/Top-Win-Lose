P/L SYSTEM — AM / PM / OVERNIGHT REPORTS

FILES / PORTALS
management.html (or index.html) — all 12 branches + executive dashboard
group1.html — AWADA, BBC, FAWAZ, EGYPT
group2.html — BOUDANI, CDI, AR, SH
group3.html — CONNECT, BADARO, MT, TR

Upload all files together to your existing static website. Give each group its
own page link, for example https://YOUR-SITE/group1.html. Each page uses the
same shared database once configured. No live site or database was changed by
this delivery. You can open index.html locally to preview first.

KEYBOARD
Enter or Tab moves to the next input; Shift+Enter or Shift+Tab moves backward.
Calculated cells are skipped. Enter on the final amount focuses Save Report.
Tab retains standard browser keyboard navigation.

CALCULATIONS
Client profit positive, client loss negative. Cover profit positive, cover loss
negative. Enter 0 explicitly for no cover. Amounts allow up to 2 decimals.
Broker Net = Cover Net - Client P/L.
Net % = Broker Net / absolute Client P/L * 100. Zero denominator shows a dash.
Combined % = sum Broker Net / sum absolute Client P/L * 100 (not average %).
These are selected-client results, not total branch P/L; no extra IB or other
expenses are subtracted. Top 3 entries are selected by the worker.

REPORTS
Choose the trading date and shift: AM, PM or Overnight. Enter results for that
shift ONLY, not cumulative daily totals. For Overnight, keep the trading date
the shift belongs to even after midnight. Enter up to three winners and three
losers per branch per shift. Client Name is removed: enter Login, Client P/L
and Cover Net only.
Unused rows stay fully blank. If neither category has clients, tick No clients.
Save Report creates or updates one report for that branch/date/shift. Archive lists
saved dates and shifts. Management shows the selected shift across all branches. Clear entries only clears the form until Save Report is pressed.
Download backup exports accessible saved reports, not unsaved form entries.
Restore only adds missing reports; it never replaces existing branch/date/shift data.

SHARED ACCESS SETUP — REQUIRED BEFORE USING WITH WORKERS
The supplied source used a placeholder Firebase key. config.js therefore
starts with enabled:false. In this LOCAL PREVIEW mode, reports stay in one
browser; pages are demonstrations of separate group interfaces, NOT secure
multi-user access. Browser storage may be cleared: download backups.

1. In your Firebase project, enable Authentication > Email/Password. Create
   worker accounts and a management account. Add your hosting domain to the
   Firebase Authentication authorized domains when necessary.
2. In Realtime Database, create pl_manual_roles/<AUTH_USER_UID> with the string
   group1, group2, group3, or management. Set these roles using the Firebase
   console or trusted Admin tooling. Workers cannot assign themselves roles.
3. Review and deploy database.rules.json. If keeping your existing system,
   merge the two new path rules (pl_manual_roles and pl_manual_reports_v1)
   into your existing rules. DO NOT overwrite unrelated rules without review.
   There must be no broader parent/root .read:true or .write:true grant: Firebase
   grants cascade and would bypass the group restrictions. Preserve any existing
   access by putting appropriate rules on the old paths, not a public root.
4. Paste your actual Firebase web configuration into config.js and set
   enabled:true. Firebase web config is not an access-control secret; the
   authenticated roles and database rules enforce access.
5. Upload all files. Test with each worker account: its assigned group loads;
   the other group pages and management page deny it. Management can access
   every group. Sign out between tests. Verify direct database access is also
   denied for another group, not just navigation. Test saving and reading from
   two different browsers before rollout.

Shared mode never silently falls back to local saving if authentication or
network access fails. The app only uses the NEW pl_manual_reports_v1 path;
old imported weekly/daily reports remain in their previous database paths.
No old Issa/Tajco data is renamed or migrated into another branch.

VALIDATION LIMITS
Client-side validation checks signs, required fields, duplicate logins, and
three entries per category. Database rules enforce group access, allowed
branches, schema, numeric cents, signs and at most six rows. More stringent
server-side business validation can be added if required. The live Firebase
configuration and rules need deployment/testing in your project; they were
not exercised against your database during preparation.

PREPARATION CHECKS
JavaScript syntax, calculation examples, combined percentage denominator,
input validation, Enter navigation, local save/reload, and portal branch
scopes passed automated checks. A full browser visual check was unavailable
in the preparation environment. Live Firebase login and authorization still
require testing after configuration.

UPDATING FROM THE DAILY VERSION
Replace app.js, styles.css and all five HTML pages in GitHub with these files.
Keep your already configured config.js; do not replace live Firebase settings
with this package's local-preview configuration. Apply the updated rules in
Firebase too (uploading the rules file to GitHub does not apply it).
Each shift has its own key, such as 2026-09-21_am. Saving PM cannot replace AM.
Previous daily records remain available in Archive, labeled Daily (previous
version), read-only. They are not automatically assigned to a shift. Previous
JSON backups can still be restored without assigning an invented shift.

SHIFT UPDATE CHECKS
Verified separate AM/PM/Overnight saves, edits isolated to one shift, login-only
validation, Enter navigation, legacy read-only reports, and backup restoration.
