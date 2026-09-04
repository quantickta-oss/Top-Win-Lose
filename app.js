let entries = JSON.parse(localStorage.getItem('pl_entries')) || [];

function switchView(viewId, btn) {
  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('view-' + viewId).classList.add('active');
  btn.classList.add('active');

  if (viewId === 'group5') renderManagementDashboard();
  if (viewId === 'operators') renderLogsTable();
}

function handleLogSubmit(e) {
  e.preventDefault();

  const newEntry = {
    id: Date.now(),
    branch: document.getElementById('input-branch').value,
    shift: document.getElementById('input-shift').value,
    login: document.getElementById('input-login').value,
    clientPL: parseFloat(document.getElementById('input-client').value),
    coveragePL: parseFloat(document.getElementById('input-coverage').value) || 0
  };

  entries.push(newEntry);
  localStorage.setItem('pl_entries', JSON.stringify(entries));

  document.getElementById('shift-form').reset();
  renderLogsTable();
}

function deleteEntry(id) {
  entries = entries.filter(item => item.id !== id);
  localStorage.setItem('pl_entries', JSON.stringify(entries));
  renderLogsTable();
}

function clearAllData() {
  if (confirm("Are you sure you want to delete all entries?")) {
    entries = [];
    localStorage.removeItem('pl_entries');
    renderLogsTable();
    renderManagementDashboard();
  }
}

function renderLogsTable() {
  const tbody = document.querySelector('#logs-table tbody');
  tbody.innerHTML = '';

  entries.forEach(item => {
    const isPositive = item.clientPL >= 0;
    tbody.innerHTML += `
      <tr>
        <td>${item.branch}</td>
        <td>${item.shift}</td>
        <td><strong>${item.login}</strong></td>
        <td class="${isPositive ? 'positive' : 'negative'}">$${item.clientPL.toLocaleString()}</td>
        <td>$${item.coveragePL.toLocaleString()}</td>
        <td><button class="delete-btn" onclick="deleteEntry(${item.id})">Delete</button></td>
      </tr>
    `;
  });
}

function renderManagementDashboard() {
  const winnersBody = document.querySelector('#mgmt-winners-table tbody');
  const losersBody = document.querySelector('#mgmt-losers-table tbody');

  winnersBody.innerHTML = '';
  losersBody.innerHTML = '';

  const winners = entries.filter(e => e.clientPL > 0).sort((a, b) => b.clientPL - a.clientPL).slice(0, 5);
  const losers = entries.filter(e => e.clientPL < 0).sort((a, b) => a.clientPL - b.clientPL).slice(0, 5);

  if (winners.length > 0) {
    document.getElementById('top-gain-val').innerText = "+$" + winners[0].clientPL.toLocaleString();
    document.getElementById('top-gain-trader').innerText = `Trader ${winners[0].login} (${winners[0].branch})`;
  } else {
    document.getElementById('top-gain-val').innerText = "$0.00";
    document.getElementById('top-gain-trader').innerText = "No data logged";
  }

  if (losers.length > 0) {
    document.getElementById('top-loss-val').innerText = "$" + losers[0].clientPL.toLocaleString();
    document.getElementById('top-loss-trader').innerText = `Trader ${losers[0].login} (${losers[0].branch})`;
  } else {
    document.getElementById('top-loss-val').innerText = "$0.00";
    document.getElementById('top-loss-trader').innerText = "No data logged";
  }

  winners.forEach((w, i) => {
    winnersBody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${w.login}</strong></td>
        <td>${w.branch}</td>
        <td class="positive">+$${w.clientPL.toLocaleString()}</td>
        <td>$${w.coveragePL.toLocaleString()}</td>
      </tr>
    `;
  });

  losers.forEach((l, i) => {
    losersBody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${l.login}</strong></td>
        <td>${l.branch}</td>
        <td class="negative">$${l.clientPL.toLocaleString()}</td>
        <td>$${l.coveragePL.toLocaleString()}</td>
      </tr>
    `;
  });
}

// Initial render
renderManagementDashboard();
