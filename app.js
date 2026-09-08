// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7aW_ZjQ70syN6SigrdPO_v0BB4E8HJv0",
  authDomain: "pl-system-227d1.firebaseapp.com",
  databaseURL: "https://pl-system-227d1-default-rtdb.firebaseio.com",
  projectId: "pl-system-227d1",
  storageBucket: "pl-system-227d1.firebasestorage.app",
  messagingSenderId: "557167025195",
  appId: "1:557167025195:web:9de8f4305284ba2a045e6e",
  measurementId: "G-1YSYFWMWTZ"
};

// Initialize Firebase Realtime Database
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Master Branch Access Control Mapping
const branchGroups = {
  'awada': ['awada', 'fawaz'],
  'fawaz': ['awada', 'fawaz'],
  'boudani': ['boudani', 'issa'],
  'issa': ['boudani', 'issa'],
  'bbc': ['bbc', 'badaro', 'tajco'],
  'badaro': ['bbc', 'badaro', 'tajco'],
  'tajco': ['bbc', 'badaro', 'tajco'],
  'cdi': ['cdi', 'connect'],
  'connect': ['cdi', 'connect'],
  'group5': ['awada', 'fawaz', 'boudani', 'issa', 'bbc', 'badaro', 'tajco', 'cdi', 'connect', 'group5', 'archive']
};

const allBranches = ["awada", "fawaz", "boudani", "issa", "bbc", "badaro", "tajco", "cdi", "connect"];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const shifts = ['ON', 'AM', 'PM'];

let currentBranch = 'awada';
let matrixStore = {};
let saveDebounceTimers = {};

let archiveStore = {};
let selectedArchiveWeek = null;

// Live Listener: Updates data without disrupting active user focus
db.ref('pl_matrix_store').on('value', (snapshot) => {
  matrixStore = snapshot.val() || {};

  const urlParams = new URLSearchParams(window.location.search);
  const activeParam = (urlParams.get('branch') || 'group5').toLowerCase();

  if (activeParam === 'group5') {
    const group5Panel = document.getElementById('view-group5');
    if (group5Panel && group5Panel.classList.contains('active')) {
      renderManagementView();
    }
  } else {
    // Prevent DOM redraw while editing any input
    if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
      renderMatrixTable();
    }
  }
});

// Live Listener: Weekly archive history (Group 5 / executive access only in the UI)
db.ref('pl_history').on('value', (snapshot) => {
  archiveStore = snapshot.val() || {};

  const archivePanel = document.getElementById('view-archive');
  if (archivePanel && archivePanel.classList.contains('active')) {
    renderArchiveView();
  }
});

function applySidebarLock(allowedTabs) {
  const isGroup5 = allowedTabs.includes('group5');

  document.querySelectorAll('.nav-item').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    const isAllowed = allowedTabs.some(tab => onclickAttr.includes(`'${tab}'`));

    if (isAllowed) {
      btn.style.setProperty('display', 'flex', 'important');
    } else {
      btn.style.setProperty('display', 'none', 'important');
    }
  });

  document.querySelectorAll('.nav-section').forEach(sec => {
    if (isGroup5) {
      sec.style.setProperty('display', 'block', 'important');
    } else {
      let hasVisibleChild = false;
      let nextElem = sec.nextElementSibling;

      while (nextElem && !nextElem.classList.contains('nav-section')) {
        if (nextElem.classList.contains('nav-item') && nextElem.style.display !== 'none') {
          hasVisibleChild = true;
          break;
        }
        nextElem = nextElem.nextElementSibling;
      }

      if (hasVisibleChild) {
        sec.style.setProperty('display', 'block', 'important');
      } else {
        sec.style.setProperty('display', 'none', 'important');
      }
    }
  });
}

function showPanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('active');
    panel.style.display = 'block';
  }
}

function switchTab(tabKey) {
  const urlParams = new URLSearchParams(window.location.search);
  const activeParam = (urlParams.get('branch') || 'group5').toLowerCase();
  const allowedTabs = branchGroups[activeParam] || [activeParam];

  if (!allowedTabs.includes(tabKey) && activeParam !== 'group5') {
    tabKey = activeParam;
  }

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
    panel.style.display = 'none';
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${tabKey}'`)) {
      btn.classList.add('active');
    }
  });

  if (tabKey === 'group5') {
    showPanel('view-group5');
    renderManagementView();
  } else if (tabKey === 'archive') {
    showPanel('view-archive');
    renderArchiveView();
  } else {
    currentBranch = tabKey;
    showPanel('view-matrix');

    const titleElem = document.getElementById('matrix-title');
    if (titleElem) {
      titleElem.innerText = tabKey.toUpperCase() + " Weekly Operational Matrix";
    }

    renderMatrixTable();
  }

  window.scrollTo(0, 0);
}

// Currency & Math Utilities
function parseCurrencyNumber(val) {
  if (!val && val !== 0) return 0;
  const clean = val.toString().replace(/[^0-9.-]+/g, "");
  return parseFloat(clean) || 0;
}

function formatCurrency(val) {
  const num = parseCurrencyNumber(val);
  if (!num && num !== 0) return '';
  return (num < 0 ? '-' : '') + '$' + Math.abs(num).toLocaleString('en-US');
}

function calculatePercentage(client, coverage) {
  const c = parseCurrencyNumber(client);
  const cov = parseCurrencyNumber(coverage);
  if (!c || c === 0) return '-';
  const pct = (cov / c) * 100;
  return pct.toFixed(2) + '%';
}

function renderMatrixTable() {
  const tbody = document.getElementById('matrix-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const branchData = matrixStore[currentBranch] || {};

  days.forEach(day => {
    shifts.forEach(shift => {
      for (let r = 1; r <= 3; r++) {
        const rowId = `${day}_${shift}_Winner_${r}`;
        renderRow(tbody, day, shift, 'Winner', r, rowId, branchData[rowId]);
      }
      for (let r = 1; r <= 3; r++) {
        const rowId = `${day}_${shift}_Loser_${r}`;
        renderRow(tbody, day, shift, 'Loser', r, rowId, branchData[rowId]);
      }
    });
  });
}

function renderRow(tbody, day, shift, type, rank, rowId, rowData) {
  const row = rowData || { login: '', client: '', coverage: '' };
  const formattedClient = row.client ? formatCurrency(row.client) : '';
  const formattedCoverage = row.coverage ? formatCurrency(row.coverage) : '';
  const pctDisplay = calculatePercentage(row.client, row.coverage);
  const tagClass = type === 'Winner' ? 'tag-winner' : 'tag-loser';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${day}</strong></td>
    <td>${shift}</td>
    <td><span class="${tagClass}">${type}</span></td>
    <td>#${rank}</td>
    <td>
      <input id="input_login_${rowId}" class="matrix-input" value="${row.login || ''}" 
             oninput="updateLocalAndScheduleSave('${rowId}', 'login', this.value)"
             onkeydown="handleEnterKey(event, this)"
             placeholder="Login ID">
    </td>
    <td>
      <input id="input_client_${rowId}" class="matrix-input num-input" value="${formattedClient}" 
             onfocus="handleInputFocus(this)" 
             onblur="handleInputBlur('${rowId}', 'client', this)" 
             oninput="updateLocalAndScheduleSave('${rowId}', 'client', this.value)"
             onkeydown="handleEnterKey(event, this)"
             placeholder="$0">
    </td>
    <td>
      <input id="input_coverage_${rowId}" class="matrix-input num-input" value="${formattedCoverage}" 
             onfocus="handleInputFocus(this)" 
             onblur="handleInputBlur('${rowId}', 'coverage', this)" 
             oninput="updateLocalAndScheduleSave('${rowId}', 'coverage', this.value)"
             onkeydown="handleEnterKey(event, this)"
             placeholder="$0">
    </td>
    <td><span class="pct-badge" id="pct_${rowId}">${pctDisplay}</span></td>
  `;
  tbody.appendChild(tr);
}

// Switches input alignment to left and strips formatting on focus
function handleInputFocus(input) {
  input.style.textAlign = 'left';
  const rawNum = parseCurrencyNumber(input.value);
  input.value = rawNum ? rawNum : '';
}

// Formats currency and re-aligns to right on blur
function handleInputBlur(rowId, field, input) {
  input.style.textAlign = 'right';
  const rawNum = parseCurrencyNumber(input.value);
  updateLocalAndScheduleSave(rowId, field, rawNum, false);

  input.value = rawNum ? formatCurrency(rawNum) : '';

  const rowData = (matrixStore[currentBranch] || {})[rowId] || {};
  const pctCell = document.getElementById(`pct_${rowId}`);
  if (pctCell) {
    pctCell.innerText = calculatePercentage(rowData.client, rowData.coverage);
  }
}

// Local State Update + Debounced Cloud Save
function updateLocalAndScheduleSave(rowId, field, val, immediate = false) {
  if (!matrixStore[currentBranch]) matrixStore[currentBranch] = {};
  if (!matrixStore[currentBranch][rowId]) matrixStore[currentBranch][rowId] = { login: '', client: '', coverage: '' };

  matrixStore[currentBranch][rowId][field] = val;

  // Live calculation for Coverage % badge while typing
  if (field === 'client' || field === 'coverage') {
    const pctCell = document.getElementById(`pct_${rowId}`);
    if (pctCell) {
      const row = matrixStore[currentBranch][rowId];
      pctCell.innerText = calculatePercentage(row.client, row.coverage);
    }
  }

  const timerKey = `${currentBranch}_${rowId}_${field}`;
  if (saveDebounceTimers[timerKey]) {
    clearTimeout(saveDebounceTimers[timerKey]);
  }

  const pushToFirebase = () => {
    db.ref(`pl_matrix_store/${currentBranch}/${rowId}/${field}`).set(val);
  };

  if (immediate) {
    pushToFirebase();
  } else {
    saveDebounceTimers[timerKey] = setTimeout(pushToFirebase, 500);
  }
}

// Clean DOM traversal across all inputs on Enter key
function handleEnterKey(event, currentInput) {
  if (event.key === 'Enter') {
    event.preventDefault();

    const inputs = Array.from(document.querySelectorAll('input.matrix-input'));
    const index = inputs.indexOf(currentInput);

    if (index !== -1 && index + 1 < inputs.length) {
      const nextInput = inputs[index + 1];

      setTimeout(() => {
        nextInput.focus();
        if (typeof nextInput.select === 'function') {
          nextInput.select();
        }
      }, 20);
    }
  }
}

// Builds the Top 5 Winners / Top 5 Losers lists for a single branch's data,
// counting ONLY entries logged under the PM shift.
//
// FIX: a login's client P/L and coverage P/L are first NETTED across every
// PM row it appears in for the week (whether typed into a Winner slot or a
// Loser slot). Only after netting do we classify it as a winner (net > 0)
// or loser (net < 0) and rank on that net amount. This guarantees a single
// login can never appear on both the Winners and Losers tables.
function computeTopFivePM(branchData) {
  const bData = branchData || {};
  const netByLogin = {};

  Object.keys(bData).forEach(key => {
    if (!key.includes('_PM_')) return; // PM shift rows only, e.g. "Monday_PM_Winner_1"

    const item = bData[key];
    if (!item.login || item.client === undefined || item.client === '') return;

    const login = item.login;
    if (!netByLogin[login]) {
      netByLogin[login] = { login, client: 0, coverage: 0 };
    }
    netByLogin[login].client += parseCurrencyNumber(item.client);
    netByLogin[login].coverage += parseCurrencyNumber(item.coverage);
  });

  const netEntries = Object.values(netByLogin);

  const winners = netEntries
    .filter(r => r.client > 0)
    .sort((a, b) => b.client - a.client)
    .slice(0, 5);

  const losers = netEntries
    .filter(r => r.client < 0)
    .sort((a, b) => a.client - b.client)
    .slice(0, 5);

  return { winners, losers };
}

function renderManagementView() {
  const container = document.getElementById('management-tables-container');
  if (!container) return;
  container.innerHTML = '';

  allBranches.forEach(b => {
    const { winners, losers } = computeTopFivePM(matrixStore[b]);

    let winnersHTML = winners.map((w, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><strong>${w.login}</strong></td>
        <td class="tag-winner">${formatCurrency(w.client)}</td>
        <td>${formatCurrency(w.coverage)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:#64748b;">No data entered</td></tr>';

    let losersHTML = losers.map((l, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><strong>${l.login}</strong></td>
        <td class="tag-loser">${formatCurrency(l.client)}</td>
        <td>${formatCurrency(l.coverage)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:#64748b;">No data entered</td></tr>';

    container.innerHTML += `
      <div class="branch-card">
        <h3>${b.toUpperCase()} — Top 5 Winners (PM Shift)</h3>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>LOGIN</th>
              <th>CLIENT P/L</th>
              <th>COVERAGE P/L</th>
            </tr>
          </thead>
          <tbody>${winnersHTML}</tbody>
        </table>
      </div>

      <div class="branch-card">
        <h3>${b.toUpperCase()} — Top 5 Losers (PM Shift)</h3>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>LOGIN</th>
              <th>CLIENT P/L</th>
              <th>COVERAGE P/L</th>
            </tr>
          </thead>
          <tbody>${losersHTML}</tbody>
        </table>
      </div>
    `;
  });
}

// Archives this week's PM-shift Top 5 Winners/Losers per branch to Firebase,
// then (only if that save succeeds) wipes all branch entries for the new week.
function archiveAndResetWeek() {
  const confirmed = confirm(
    "This will save this week's PM-shift Top 5 Winners/Losers for every branch " +
    "to the archive, then permanently erase everything branches entered this week.\n\n" +
    "This cannot be undone. Continue?"
  );
  if (!confirmed) return;

  const archiveKey = Date.now().toString();
  const archiveData = {};

  allBranches.forEach(b => {
    archiveData[b] = computeTopFivePM(matrixStore[b]);
  });

  db.ref(`pl_history/${archiveKey}`).set({
    archivedAt: new Date().toISOString(),
    branches: archiveData
  })
  .then(() => db.ref('pl_matrix_store').remove())
  .then(() => {
    alert("This week's Top 5 results were archived, and all branch entries have been reset.");
  })
  .catch((err) => {
    console.error('Archive & reset failed:', err);
    alert("Something went wrong while archiving. Nothing was erased — please try again.");
  });
}

// --- Weekly Archive browsing screen ---

function formatArchiveDate(isoOrTimestamp) {
  const d = new Date(isoOrTimestamp);
  const datePart = d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function renderArchiveView() {
  const listContainer = document.getElementById('archive-week-list');
  const detailContainer = document.getElementById('archive-detail-container');
  if (!listContainer || !detailContainer) return;

  const weekKeys = Object.keys(archiveStore).sort((a, b) => Number(b) - Number(a));

  if (weekKeys.length === 0) {
    listContainer.innerHTML = '<p class="subtitle" style="padding:10px;">No archived weeks yet.</p>';
    detailContainer.innerHTML = '';
    selectedArchiveWeek = null;
    return;
  }

  if (!selectedArchiveWeek || !archiveStore[selectedArchiveWeek]) {
    selectedArchiveWeek = weekKeys[0];
  }

  listContainer.innerHTML = weekKeys.map(key => {
    const entry = archiveStore[key];
    const label = formatArchiveDate(entry.archivedAt || Number(key));
    const activeClass = key === selectedArchiveWeek ? 'active' : '';
    return `<button class="archive-week-btn ${activeClass}" onclick="selectArchiveWeek('${key}')">${label}</button>`;
  }).join('');

  renderArchiveDetail(selectedArchiveWeek);
}

function selectArchiveWeek(weekKey) {
  selectedArchiveWeek = weekKey;
  renderArchiveView();
}

function renderArchiveDetail(weekKey) {
  const detailContainer = document.getElementById('archive-detail-container');
  if (!detailContainer) return;

  const entry = archiveStore[weekKey];
  if (!entry) {
    detailContainer.innerHTML = '';
    return;
  }

  const branches = entry.branches || {};
  let html = `<h2 class="archive-detail-title">Week archived: ${formatArchiveDate(entry.archivedAt || Number(weekKey))}</h2>
    <div class="dashboard-grid">`;

  allBranches.forEach(b => {
    const bArchive = branches[b] || { winners: [], losers: [] };

    const winnersHTML = (bArchive.winners || []).map((w, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><strong>${w.login}</strong></td>
        <td class="tag-winner">${formatCurrency(w.client)}</td>
        <td>${formatCurrency(w.coverage)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:#64748b;">No data</td></tr>';

    const losersHTML = (bArchive.losers || []).map((l, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><strong>${l.login}</strong></td>
        <td class="tag-loser">${formatCurrency(l.client)}</td>
        <td>${formatCurrency(l.coverage)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:#64748b;">No data</td></tr>';

    html += `
      <div class="branch-card">
        <h3>${b.toUpperCase()} — Top 5 Winners</h3>
        <table class="matrix-table">
          <thead><tr><th>RANK</th><th>LOGIN</th><th>CLIENT P/L</th><th>COVERAGE P/L</th></tr></thead>
          <tbody>${winnersHTML}</tbody>
        </table>
      </div>
      <div class="branch-card">
        <h3>${b.toUpperCase()} — Top 5 Losers</h3>
        <table class="matrix-table">
          <thead><tr><th>RANK</th><th>LOGIN</th><th>CLIENT P/L</th><th>COVERAGE P/L</th></tr></thead>
          <tbody>${losersHTML}</tbody>
        </table>
      </div>
    `;
  });

  html += `</div>`;
  detailContainer.innerHTML = html;
}

function initApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const branchParam = (urlParams.get('branch') || 'group5').toLowerCase();
  const allowedTabs = branchGroups[branchParam] || [branchParam];

  applySidebarLock(allowedTabs);
  switchTab(branchParam);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
