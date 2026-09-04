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

function restrictSidebar(allowedTabs) {
  const allNavItems = document.querySelectorAll('.nav-item');
  const groupHeaders = document.querySelectorAll('.sidebar h4, .sidebar .group-title');

  allNavItems.forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    let matches = false;

    allowedTabs.forEach(tab => {
      if (onclickAttr.includes(`'${tab}'`)) {
        matches = true;
      }
    });

    if (matches) {
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  });

  // Hide empty category headers in sidebar
  groupHeaders.forEach(header => {
    let hasVisibleSibling = false;
    let next = header.nextElementSibling;
    while (next && !next.tagName.startsWith('H')) {
      if (next.classList.contains('nav-item') && next.style.display !== 'none') {
        hasVisibleSibling = true;
        break;
      }
      next = next.nextElementSibling;
    }
    header.style.display = hasVisibleSibling ? 'block' : 'none';
  });
}

function switchTab(tabKey) {
  // Check URL permissions
  const urlParams = new URLSearchParams(window.location.search);
  const activeParam = (urlParams.get('branch') || 'group5').toLowerCase();
  const allowedTabs = branchGroups[activeParam] || [activeParam];

  // Prevent accessing unauthorized branches via code
  if (!allowedTabs.includes(tabKey) && activeParam !== 'group5') {
    tabKey = activeParam;
  }

  // Hide all view panels
  const allPanels = document.querySelectorAll('.view-panel');
  allPanels.forEach(panel => {
    panel.classList.remove('active');
    panel.style.display = 'none';
  });

  // Manage navigation highlights
  const allNavItems = document.querySelectorAll('.nav-item');
  allNavItems.forEach(btn => btn.classList.remove('active'));

  allNavItems.forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${tabKey}'`)) {
      btn.classList.add('active');
    }
  });

  // Render requested view
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

// Utility: Convert formatted string back to raw number
function parseCurrencyNumber(val) {
  if (!val && val !== 0) return 0;
  const clean = val.toString().replace(/[^0-9.-]+/g, "");
  return parseFloat(clean) || 0;
}

// Utility: Format number into currency ($1,234)
function formatCurrency(val) {
  const num = parseCurrencyNumber(val);
  if (!num && num !== 0) return '';
  return (num < 0 ? '-' : '') + '$' + Math.abs(num).toLocaleString('en-US');
}

// Utility: Calculate Coverage Percentage
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
      <td><input class="matrix-input" value="${row.login || ''}" onchange="updateCell('${rowId}', 'login', this.value)"></td>
      <td>
        <input class="matrix-input" value="${formattedClient}" 
               onfocus="handleInputFocus(this)" 
               onblur="handleInputBlur('${rowId}', 'client', this)" 
               placeholder="$0">
      </td>
      <td>
        <input class="matrix-input" value="${formattedCoverage}" 
               onfocus="handleInputFocus(this)" 
               onblur="handleInputBlur('${rowId}', 'coverage', this)" 
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
  updateCell(rowId, field, rawNum);
  
  input.value = rawNum ? formatCurrency(rawNum) : '';

  const rowData = (matrixStore[currentBranch] || {})[rowId] || {};
  const pctCell = document.getElementById(`pct_${rowId}`);
  if (pctCell) {
    pctCell.innerText = calculatePercentage(rowData.client, rowData.coverage);
  }
}

function updateCell(rowId, field, val) {
  if (!matrixStore[currentBranch]) matrixStore[currentBranch] = {};
  if (!matrixStore[currentBranch][rowId]) matrixStore[currentBranch][rowId] = { login: '', client: '', coverage: '' };
  
  matrixStore[currentBranch][rowId][field] = val;
}

function saveMatrixData() {
  localStorage.setItem('pl_matrix_store', JSON.stringify(matrixStore));
  alert('Operational Matrix saved successfully!');
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

function routeFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const branchParam = (urlParams.get('branch') || 'group5').toLowerCase();

  const allowedTabs = branchGroups[branchParam] || [branchParam];
  
  // Enforce locked sidebar navigation
  restrictSidebar(allowedTabs);

  // Switch tab directly to requested branch
  switchTab(branchParam);
}

window.onload = routeFromURL;
