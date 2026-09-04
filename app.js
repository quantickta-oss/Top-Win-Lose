const groups = {
  "Group 1": ["awada", "fawaz"],
  "Group 2": ["boudani", "issa"],
  "Group 3": ["bbc", "badaro", "tajco"],
  "Group 4": ["cdi", "connect"]
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const shifts = ['ON', 'AM', 'PM'];

let currentBranch = 'awada';
let matrixStore = JSON.parse(localStorage.getItem('pl_matrix_store')) || {};

function switchTab(tabKey, btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
  
  btn.classList.add('active');

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

function renderMatrixTable() {
  const tbody = document.getElementById('matrix-tbody');
  tbody.innerHTML = '';

  const branchData = matrixStore[currentBranch] || {};

  days.forEach(day => {
    shifts.forEach(shift => {
      // Top 3 Winners
      for (let r = 1; r <= 3; r++) {
        const rowId = `${day}_${shift}_Winner_${r}`;
        const row = branchData[rowId] || { login: '', client: '', coverage: '' };
        
        tbody.innerHTML += `
          <tr>
            <td><strong>${day}</strong></td>
            <td>${shift}</td>
            <td><span class="tag-winner">Winner</span></td>
            <td>#${r}</td>
            <td><input class="matrix-input" value="${row.login}" onchange="updateCell('${rowId}', 'login', this.value)"></td>
            <td><input class="matrix-input" type="number" value="${row.client}" onchange="updateCell('${rowId}', 'client', this.value)"></td>
            <td><input class="matrix-input" type="number" value="${row.coverage}" onchange="updateCell('${rowId}', 'coverage', this.value)"></td>
          </tr>
        `;
      }
      // Top 3 Losers
      for (let r = 1; r <= 3; r++) {
        const rowId = `${day}_${shift}_Loser_${r}`;
        const row = branchData[rowId] || { login: '', client: '', coverage: '' };
        
        tbody.innerHTML += `
          <tr>
            <td><strong>${day}</strong></td>
            <td>${shift}</td>
            <td><span class="tag-loser">Loser</span></td>
            <td>#${r}</td>
            <td><input class="matrix-input" value="${row.login}" onchange="updateCell('${rowId}', 'login', this.value)"></td>
            <td><input class="matrix-input" type="number" value="${row.client}" onchange="updateCell('${rowId}', 'client', this.value)"></td>
            <td><input class="matrix-input" type="number" value="${row.coverage}" onchange="updateCell('${rowId}', 'coverage', this.value)"></td>
          </tr>
        `;
      }
    });
  });
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

  Object.keys(groups).forEach(groupName => {
    let groupHTML = `<div class="group-container"><h2 class="group-title">${groupName}</h2><div class="branches-row">`;

    groups[groupName].forEach(b => {
      const bData = matrixStore[b] || {};
      let rows = [];

      Object.keys(bData).forEach(key => {
        const item = bData[key];
        if (item.login && item.client) {
          rows.push({ login: item.login, client: parseFloat(item.client) || 0, coverage: parseFloat(item.coverage) || 0 });
        }
      });

      const winners = [...rows].filter(r => r.client > 0).sort((a,b) => b.client - a.client).slice(0, 5);
      const losers = [...rows].filter(r => r.client < 0).sort((a,b) => a.client - b.client).slice(0, 5);

      let winnersHTML = winners.map((w, i) => `
        <tr>
          <td>#${i+1}</td>
          <td><strong>${w.login}</strong></td>
          <td class="tag-winner">+$${w.client.toLocaleString()}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center;color:#64748b;">No data</td></tr>';

      let losersHTML = losers.map((l, i) => `
        <tr>
          <td>#${i+1}</td>
          <td><strong>${l.login}</strong></td>
          <td class="tag-loser">$${l.client.toLocaleString()}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center;color:#64748b;">No data</td></tr>';

      groupHTML += `
        <div class="branch-card">
          <h3>${b.toUpperCase()}</h3>
          <div class="tables-split">
            <div>
              <div class="sub-table-title win">Top 5 Winners</div>
              <table class="matrix-table">
                <thead><tr><th>Rank</th><th>Login</th><th>Client P/L</th></tr></thead>
                <tbody>${winnersHTML}</tbody>
              </table>
            </div>
            <div>
              <div class="sub-table-title loss">Top 5 Losers</div>
              <table class="matrix-table">
                <thead><tr><th>Rank</th><th>Login</th><th>Client P/L</th></tr></thead>
                <tbody>${losersHTML}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    });

    groupHTML += `</div></div>`;
    container.innerHTML += groupHTML;
  });
}

// Initial Load
renderManagementView();
