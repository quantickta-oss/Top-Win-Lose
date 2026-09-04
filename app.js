// Complete list of groups and their respective branches
const groups = {
  "Group 1": ["awada", "fawaz"],
  "Group 2": ["boudani", "issa"],
  "Group 3": ["bbc", "badaro", "tajco"],
  "Group 4": ["cdi", "connect"]
};

// All 9 active branches
const allBranches = ["awada", "fawaz", "boudani", "issa", "bbc", "badaro", "tajco", "cdi", "connect"];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const shifts = ['ON', 'AM', 'PM'];

let currentBranch = 'awada';
let matrixStore = JSON.parse(localStorage.getItem('pl_matrix_store')) || {};

function switchTab(tabKey, btn) {
  // Clear active styling on all tabs and panels
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));

  // If a button element wasn't explicitly passed, search for it in the DOM
  if (!btn) {
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(b => {
      const onclickAttr = b.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${tabKey}'`)) {
        btn = b;
      }
    });
  }

  if (btn) btn.classList.add('active');

  if (tabKey === 'group5') {
    document.getElementById('view-group5').classList.add('active');
    renderManagementView();
  } else {
    currentBranch = tabKey;
    document.getElementById('view-matrix').classList.add('active');
    document.getElementById('matrix-title').innerText = tabKey.toUpperCase() + " Weekly Operational Matrix";
    renderMatrixTable();
  }
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
  tbody.innerHTML = '';

  const branchData = matrixStore[currentBranch] || {};

  days.forEach(day => {
    shifts.forEach(shift => {
      // Top 3 Winners
      for (let r = 1; r <= 3; r++) {
        const rowId = `${day}_${shift}_Winner_${r}`;
        renderRow(tbody, day, shift, 'Winner', r, rowId, branchData[rowId]);
      }
      // Top 3 Losers
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

  // Update % cell dynamically
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

// URL Parameter Routing Initialization
function initRouting() {
  const urlParams = new URLSearchParams(window.location.search);
  const branchParam = urlParams.get('branch');

  if (branchParam) {
    const targetBranch = branchParam.toLowerCase();
    switchTab(targetBranch, null);
  } else {
    // Default view is Group 5
    switchTab('group5', null);
  }
}

// Run routing immediately when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouting);
} else {
  initRouting();
}
