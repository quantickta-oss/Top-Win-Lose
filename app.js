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
  'group5': ['awada', 'fawaz', 'boudani', 'issa', 'bbc', 'badaro', 'tajco', 'cdi', 'connect', 'group5']
};

const allBranches = ["awada", "fawaz", "boudani", "issa", "bbc", "badaro", "tajco", "cdi", "connect"];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const shifts = ['ON', 'AM', 'PM'];

let currentBranch = 'awada';
let matrixStore = {};
let saveDebounceTimers = {};

// Live Listener: Updates data without disrupting active user focus
db.ref('pl_matrix_store').on('value', (snapshot) => {
  matrixStore = snapshot.val() || {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const activeParam = (urlParams.get('branch') || 'group5').toLowerCase();
  
  if (activeParam === 'group5') {
    renderManagementView();
  } else {
    // Prevent DOM redraw while editing any input
    if (!document.activeElement || document.activeElement.tagName !== 'INPUT') {
      renderMatrixTable();
    }
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
    const group5Panel = document.getElementById('view-group5');
    if (group5Panel) {
      group5Panel.classList.add('active');
      group5Panel.style.display = 'block';
    }
    renderManagementView();
  } else {
    currentBranch = tabKey;
    const matrixPanel = document.getElementById('view-matrix');
    if (matrixPanel) {
      matrixPanel.classList.add('active');
      matrixPanel.style.display = 'block';
    }
    
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
  updateLocalAndScheduleSave(rowId, field, rawNum, false); // Standard debounced save on blur
  
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
      
      // Delay slightly so blur handlers finish execution cleanly
      setTimeout(() => {
        nextInput.focus();
        if (typeof nextInput.select === 'function') {
          nextInput.select();
        }
      }, 20);
    }
  }
}

function renderManagementView() {
  const container = document.getElementById('management-tables-container');
  if (!container) return;
  container.innerHTML = '';

  allBranches.forEach(b => {
    const bData = matrixStore[b] || {};
    let rows = [];

    Object.keys(bData).forEach(key => {
      const item = bData[key];
      if (item.login && item.client) {
        rows.push({
          login: item.login,
          client: parseCurrencyNumber(item.client),
          coverage: parseCurrencyNumber(item.coverage)
        });
      }
    });

    const winners = [...rows].filter(r => r.client > 0).sort((a, b) => b.client - a.client).slice(0, 5);

    let winnersHTML = winners.map((w, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><strong>${w.login}</strong></td>
        <td class="tag-winner">${formatCurrency(w.client)}</td>
        <td>${formatCurrency(w.coverage)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:#64748b;">No data entered</td></tr>';

    container.innerHTML += `
      <div class="branch-card">
        <h3>${b.toUpperCase()} — Top 5 Winners</h3>
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
    `;
  });
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
