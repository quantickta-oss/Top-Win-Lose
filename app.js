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
let matrixStore = JSON.parse(localStorage.getItem('pl_matrix_store')) || {};

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

// Formatting utilities
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

  tbody.innerHTML += `
    <tr>
      <td><strong>${day}</strong></td>
      <td>${shift}</td>
      <td><span class="${tagClass}">${type}</span></td>
      <td>#${rank}</td>
      <td>
        <input class="matrix-input col-login" value="${row.login || ''}" 
               oninput="updateAndAutoSave('${rowId}', 'login', this.value)"
               onkeydown="handleEnterKey(event, this)">
      </td>
      <td>
        <input class="matrix-input col-client" value="${formattedClient}" 
               onfocus="handleInputFocus(this)" 
               onblur="handleInputBlur('${rowId}', 'client', this)" 
               oninput="updateAndAutoSave('${rowId}', 'client', this.value)"
               onkeydown="handleEnterKey(event, this)"
               placeholder="$0">
      </td>
      <td>
        <input class="matrix-input col-coverage" value="${formattedCoverage}" 
               onfocus="handleInputFocus(this)" 
               onblur="handleInputBlur('${rowId}', 'coverage', this)" 
               oninput="updateAndAutoSave('${rowId}', 'coverage', this.value)"
               onkeydown="handleEnterKey(event, this)"
               placeholder="$0">
      </td>
      <td><span class="pct-badge" id="pct_${rowId}">${pctDisplay}</span></td>
    </tr>
  `;
}

function handleInputFocus(input) {
  const rawNum = parseCurrencyNumber(input.value);
  input.value = rawNum ? rawNum : '';
}

function handleInputBlur(rowId, field, input) {
  const rawNum = parseCurrencyNumber(input.value);
  updateAndAutoSave(rowId, field, rawNum);
  
  input.value = rawNum ? formatCurrency(rawNum) : '';

  const rowData = (matrixStore[currentBranch] || {})[rowId] || {};
  const pctCell = document.getElementById(`pct_${rowId}`);
  if (pctCell) {
    pctCell.innerText = calculatePercentage(rowData.client, rowData.coverage);
  }
}

// Auto-Saves instantly on every input entry
function updateAndAutoSave(rowId, field, val) {
  if (!matrixStore[currentBranch]) matrixStore[currentBranch] = {};
  if (!matrixStore[currentBranch][rowId]) matrixStore[currentBranch][rowId] = { login: '', client: '', coverage: '' };
  
  matrixStore[currentBranch][rowId][field] = val;
  localStorage.setItem('pl_matrix_store', JSON.stringify(matrixStore));
}

// Pressing ENTER automatically jumps directly down to the next input field
function handleEnterKey(event, currentInput) {
  if (event.key === 'Enter') {
    event.preventDefault();
    
    // Trigger blur/format logic if active
    currentInput.blur();

    const allInputs = Array.from(document.querySelectorAll('.matrix-input'));
    const currentIndex = allInputs.indexOf(currentInput);

    if (currentIndex !== -1 && currentIndex + 1 < allInputs.length) {
      const nextInput = allInputs[currentIndex + 1];
      nextInput.focus();
      if (typeof nextInput.select === 'function') {
        nextInput.select();
      }
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
