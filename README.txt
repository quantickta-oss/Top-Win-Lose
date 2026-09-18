P/L SYSTEM — SIMPLE END-OF-DAY UPLOAD

WORKER STEPS
1. Export Manager Client Summary from Monday through the completed trading day.
2. If the branch has cover, export Coverage Trade History for the same Monday-to-date period. Otherwise leave Coverage History empty.
3. Choose the Summary and optional Coverage History, then click Upload & Calculate once.
Monday: Monday–Monday. Tuesday: Monday–Tuesday. Wednesday: Monday–Wednesday. Continue through Friday.
Use the trading date in MT5, even if uploading after midnight. No separate daily upload is needed.

RESULTS
This week = the latest saved Monday-to-date report; overlapping uploads are NEVER added together.
This day = current cumulative P/L minus the previous trading day's cumulative P/L, calculated per login. Monday uses zero as the baseline. Names, new and removed logins are handled across both reports. Client P/L, Coverage P/L, Broker Net and Top 5 are recalculated for each view.
If the previous trading day's report is missing, daily results are unavailable. The weekly result remains available. Uploading the missing report later automatically recalculates affected days. Re-uploading the same ending date replaces that snapshot after confirmation; subsequent daily differences update automatically.
Snapshot corrections to older activity appear in the next snapshot difference. Daily coverage audit rows show closes dated that day, while daily coverage P/L reflects the snapshot difference, including corrections or newly resolved historical matches.
Each branch's weekly result may be through a different date; the dashboard shows those dates. Missing daily branch results are excluded, not assumed zero.
Full Source Data keeps Login, Name and Cover Profit sorting plus search.

INSTALL
Replace index.html, app.js and styles.css together in the existing GitHub Pages repository. This update is not deployed automatically.
Restore the correct Firebase web configuration in app.js: the supplied source still contains YOUR_FIREBASE_API_KEY. Existing authorized operators need access to the new pl_cumulative_store path. Do not make the database public to enable access.
Old daily/weekly records remain stored. They remain visible for weeks without new cumulative uploads; the new workflow takes priority for a week when a cumulative upload exists. Old single-day records are not used as cumulative baselines.
CLEAR EVERYTHING includes cumulative, daily and weekly stores with the existing confirmations.

VALIDATION
Local mocked-database checks cover date ranges, baseline handling, per-login client/coverage/net differences, missing days, out-of-order uploads, corrections, next-week reset, save location, rendering functions and retained sorting. Live Firebase saving and visual browser layout were not verified.

OPTIONAL COVERAGE
Summary-only uploads use zero week-to-date Coverage P/L. Valid coverage exports with a Deals section but no deals are also accepted. Daily coverage remains the difference between cumulative snapshots; omitting coverage after an earlier nonzero upload therefore records a correction to zero. For branches with no cover throughout the week, both daily and weekly coverage remain zero.
