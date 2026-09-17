P/L SYSTEM — DAILY NIGHT-SHIFT + WHOLE WEEK

INSTALL
Replace index.html, app.js and styles.css together in your existing GitHub Pages repository. This package is not yet deployed.
Keep your existing Firebase project configuration. The source files currently contain YOUR_FIREBASE_API_KEY; restore the correct web app key in app.js before use. Database rules must permit the same authorized operators to read/write pl_daily_store as the existing pl_weekly_store. Do not make the database public to fix permissions.

DAILY WORKFLOW
After each night shift, export the completed trading day's MT5 Trades/Summary using the SAME start and end date. This is the whole trading day's result, not just trades during night-shift hours. Use the MT5 trading date even if uploading after midnight.
Upload the daily Summary and Coverage History, Analyze Report, then Save Report. Coverage includes only OUT closes on that exact report date; longer history still resolves client mappings.
Daily imports support Monday–Friday. A repeated branch/date replaces that day's record after confirmation.

WHOLE WEEK
Choose Whole week to see Monday–Friday totals built automatically from all saved daily accounts. Rankings are recalculated from each client's total, not from daily winners/losers alone. Weeks with fewer than five saved days show PARTIAL WEEK; missing dates are not assumed to be zero.
You can still import one full Monday–Friday Summary and Coverage History. This full-week report takes priority for its branch/week, preventing daily-plus-weekly double counting. Daily records remain visible in Daily view. Further daily edits do not change an authoritative full-week import; re-import the corrected full week when necessary.
Monday-to-Tuesday/Thursday week-to-date exports and other overlapping ranges are rejected.

HISTORY
Existing weekly reports remain available. Daily records use pl_daily_store; existing weekly reports stay in pl_weekly_store. No automatic database migration or deletion is performed. CLEAR EVERYTHING includes both daily and weekly records with the existing confirmations.

VALIDATION
Local tests cover accepted/rejected date ranges, day boundaries, daily aggregation, replacement without double counting, full-week precedence, week/year boundaries, save paths and view rendering with a mocked database. Live Firebase reads/writes are not verified.
