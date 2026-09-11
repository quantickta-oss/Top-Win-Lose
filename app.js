// ============================================================================
// Dealer P/L & Operational Risk Dashboard — Professional Edition
// ============================================================================

// IMPORTANT: keep your real production Firebase credentials here.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "pl-system-227d1.firebaseapp.com",
  databaseURL: "https://pl-system-227d1-default-rtdb.firebaseio.com",
  projectId: "pl-system-227d1",
  storageBucket: "pl-system-227d1.firebasestorage.app",
  messagingSenderId: "557167025195",
  appId: "1:557167025195:web:9de8f4305284ba2a045e6e",
  measurementId: "G-1YSYFWMWTZ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();


// ============================================================================
// CONFIGURATION
// ============================================================================

const branchGroups = {
  awada: ['awada', 'fawaz'],
  fawaz: ['awada', 'fawaz'],

  boudani: ['boudani', 'issa'],
  issa: ['boudani', 'issa'],

  bbc: ['bbc', 'badaro', 'tajco'],
  badaro: ['bbc', 'badaro', 'tajco'],
  tajco: ['bbc', 'badaro', 'tajco'],

  cdi: ['cdi', 'connect'],
  connect: ['cdi', 'connect'],

  group5: [
    'awada',
    'fawaz',
    'boudani',
    'issa',
    'bbc',
    'badaro',
    'tajco',
    'cdi',
    'connect',
    'group5',
    'archive'
  ]
};

const allBranches = [
  'awada',
  'fawaz',
  'boudani',
  'issa',
  'bbc',
  'badaro',
  'tajco',
  'cdi',
  'connect'
];

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

const shifts = [
  'ON',
  'AM',
  'PM'
];


// ============================================================================
// STATE
// ============================================================================

let currentBranch = 'awada';

let matrixStore = {};
let archiveStore = {};

let saveDebounceTimers = {};

let selectedArchiveWeek = null;

let toastTimer = null;


// ============================================================================
// FIREBASE LIVE LISTENERS
// ============================================================================

db.ref('pl_matrix_store').on('value', snapshot => {

  matrixStore = snapshot.val() || {};

  const activePanel =
    document.querySelector('.view-panel.active');

  if (
    activePanel &&
    activePanel.id === 'view-group5'
  ) {

    renderManagementView();

  } else if (
    activePanel &&
    activePanel.id === 'view-matrix'
  ) {

    // Do not redraw the matrix while someone is typing.
    if (
      !document.activeElement ||
      document.activeElement.tagName !== 'INPUT'
    ) {
      renderMatrixTable();
    }
  }
});


db.ref('pl_history').on('value', snapshot => {

  archiveStore = snapshot.val() || {};

  const archivePanel =
    document.getElementById('view-archive');

  if (
    archivePanel &&
    archivePanel.classList.contains('active')
  ) {
    renderArchiveView();
  }
});


// ============================================================================
// SIDEBAR / NAVIGATION
// ============================================================================

// NOTE:
// Hiding tabs in the browser is NOT true security.
// Real access protection should later be done using
// Firebase Authentication + Firebase Database Rules.

function applySidebarLock(allowedTabs) {

  const isGroup5 =
    allowedTabs.includes('group5');


  document
    .querySelectorAll('.nav-item')
    .forEach(btn => {

      const onclickAttr =
        btn.getAttribute('onclick') || '';

      const isAllowed =
        allowedTabs.some(tab =>
          onclickAttr.includes(`'${tab}'`)
        );

      btn.style.setProperty(
        'display',
        isAllowed ? 'flex' : 'none',
        'important'
      );
    });


  document
    .querySelectorAll('.nav-section')
    .forEach(sec => {

      if (isGroup5) {

        sec.style.setProperty(
          'display',
          'block',
          'important'
        );

        return;
      }


      let hasVisibleChild = false;

      let nextElem =
        sec.nextElementSibling;


      while (
        nextElem &&
        !nextElem.classList.contains('nav-section')
      ) {

        if (
          nextElem.classList.contains('nav-item') &&
          nextElem.style.display !== 'none'
        ) {

          hasVisibleChild = true;

          break;
        }

        nextElem =
          nextElem.nextElementSibling;
      }


      sec.style.setProperty(
        'display',
        hasVisibleChild ? 'block' : 'none',
        'important'
      );
    });
}


function showPanel(panelId) {

  const panel =
    document.getElementById(panelId);

  if (!panel) return;

  panel.classList.add('active');

  panel.style.display = 'block';
}


function switchTab(tabKey) {

  const urlParams =
    new URLSearchParams(
      window.location.search
    );

  const activeParam =
    (
      urlParams.get('branch') ||
      'group5'
    ).toLowerCase();


  const allowedTabs =
    branchGroups[activeParam] ||
    [activeParam];


  if (
    !allowedTabs.includes(tabKey) &&
    activeParam !== 'group5'
  ) {

    tabKey = activeParam;
  }


  document
    .querySelectorAll('.view-panel')
    .forEach(panel => {

      panel.classList.remove('active');

      panel.style.display = 'none';
    });


  document
    .querySelectorAll('.nav-item')
    .forEach(btn => {

      btn.classList.remove('active');

      const onclickAttr =
        btn.getAttribute('onclick') || '';

      if (
        onclickAttr.includes(
          `'${tabKey}'`
        )
      ) {

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


    const titleElem =
      document.getElementById(
        'matrix-title'
      );


    if (titleElem) {

      titleElem.innerText =
        `${tabKey.toUpperCase()} Weekly Operational Matrix`;
    }


    updateWeekLabels();

    renderMatrixTable();
  }


  window.scrollTo(0, 0);
}


// ============================================================================
// NUMBER / CURRENCY UTILITIES
// ============================================================================

function parseCurrencyNumber(val) {

  if (
    val === null ||
    val === undefined ||
    val === ''
  ) {
    return 0;
  }


  const clean =
    String(val)
      .replace(
        /[^0-9.-]+/g,
        ''
      );


  return parseFloat(clean) || 0;
}


function formatCurrency(val) {

  const num =
    parseCurrencyNumber(val);


  const sign =
    num < 0 ? '-' : '';


  return (
    sign +
    '$' +
    Math.abs(num)
      .toLocaleString(
        'en-US',
        {
          maximumFractionDigits: 2
        }
      )
  );
}


// Coverage result relative to the client's absolute P/L.
function calculatePercentage(
  client,
  coverage
) {

  const c =
    parseCurrencyNumber(client);

  const cov =
    parseCurrencyNumber(coverage);


  if (!c) {
    return '-';
  }


  const pct =
    (
      cov /
      Math.abs(c)
    ) * 100;


  return (
    pct.toFixed(2) +
    '%'
  );
}


// Broker result:
//
// Client profit = broker cost
// Coverage profit = broker income
//
// Example:
//
// Client +10,000
// Coverage +6,000
//
// Broker Net = -4,000

function brokerNet(
  client,
  coverage
) {

  return (
    parseCurrencyNumber(coverage) -
    parseCurrencyNumber(client)
  );
}


// ============================================================================
// SECURITY / HTML ESCAPING
// ============================================================================

function escapeHTML(value) {

  return String(
    value ?? ''
  )

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );
}


// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

function showToast(
  message,
  type = 'normal'
) {

  const toast =
    document.getElementById(
      'toast'
    );


  if (!toast) {
    return;
  }


  clearTimeout(
    toastTimer
  );


  toast.textContent =
    message;


  toast.classList.toggle(
    'error',
    type === 'error'
  );


  toast.classList.add(
    'show'
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          'show'
        );

      },
      2600
    );
}


// ============================================================================
// TRADING WEEK UTILITIES
// ============================================================================

function getWeekBounds(
  date = new Date()
) {

  const d =
    new Date(date);


  d.setHours(
    12,
    0,
    0,
    0
  );


  const day =
    d.getDay();


  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;


  const monday =
    new Date(d);


  monday.setDate(
    d.getDate() +
    diffToMonday
  );


  const friday =
    new Date(monday);


  friday.setDate(
    monday.getDate() + 4
  );


  return {
    monday,
    friday
  };
}


function isoDateOnly(date) {

  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const d =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );


  return `${y}-${m}-${d}`;
}


function getWeekLabel(
  date = new Date()
) {

  const {
    monday,
    friday
  } =
    getWeekBounds(date);


  const options = {
    month: 'short',
    day: 'numeric'
  };


  return (
    monday.toLocaleDateString(
      'en-US',
      options
    ) +
    ' – ' +
    friday.toLocaleDateString(
      'en-US',
      {
        ...options,
        year: 'numeric'
      }
    )
  );
}


function updateWeekLabels() {

  const label =
    `Trading Week · ${getWeekLabel()}`;


  const matrixLabel =
    document.getElementById(
      'matrix-week-label'
    );


  const executiveLabel =
    document.getElementById(
      'executive-week-label'
    );


  if (matrixLabel) {
    matrixLabel.textContent =
      label;
  }


  if (executiveLabel) {
    executiveLabel.textContent =
      label;
  }
}


// ============================================================================
// MATRIX ENTRY SCREEN
// ============================================================================

function renderMatrixTable() {

  const tbody =
    document.getElementById(
      'matrix-tbody'
    );


  if (!tbody) {
    return;
  }


  tbody.innerHTML = '';


  const branchData =
    matrixStore[currentBranch] ||
    {};


  days.forEach(day => {

    shifts.forEach(shift => {


      // -----------------------
      // Top 3 Winners
      // -----------------------

      for (
        let r = 1;
        r <= 3;
        r++
      ) {

        const rowId =
          `${day}_${shift}_Winner_${r}`;


        renderRow(
          tbody,
          day,
          shift,
          'Winner',
          r,
          rowId,
          branchData[rowId]
        );
      }


      // -----------------------
      // Top 3 Losers
      // -----------------------

      for (
        let r = 1;
        r <= 3;
        r++
      ) {

        const rowId =
          `${day}_${shift}_Loser_${r}`;


        renderRow(
          tbody,
          day,
          shift,
          'Loser',
          r,
          rowId,
          branchData[rowId]
        );
      }

    });

  });
}


function renderRow(
  tbody,
  day,
  shift,
  type,
  rank,
  rowId,
  rowData
) {

  const row =
    rowData || {
      login: '',
      client: '',
      coverage: ''
    };


  const formattedClient =
    row.client !== '' &&
    row.client !== undefined

      ? formatCurrency(
          row.client
        )

      : '';


  const formattedCoverage =
    row.coverage !== '' &&
    row.coverage !== undefined

      ? formatCurrency(
          row.coverage
        )

      : '';


  const pctDisplay =
    calculatePercentage(
      row.client,
      row.coverage
    );


  const tagClass =
    type === 'Winner'
      ? 'tag-winner'
      : 'tag-loser';


  const shiftClass =
    shift === 'ON'
      ? 'shift-on'
      : shift === 'AM'
        ? 'shift-am'
        : 'shift-pm';


  const tr =
    document.createElement(
      'tr'
    );


  tr.dataset.rowId =
    rowId;


  tr.innerHTML = `

    <td>
      <strong>${day}</strong>
    </td>

    <td>
      <span class="shift-badge ${shiftClass}">
        ${shift}
      </span>
    </td>

    <td>
      <span class="${tagClass}">
        ${type}
      </span>
    </td>

    <td>
      #${rank}
    </td>

    <td>

      <input

        id="input_login_${rowId}"

        data-field="login"

        data-row-id="${rowId}"

        class="matrix-input"

        value="${escapeHTML(
          row.login || ''
        )}"

        oninput="
          updateLocalAndScheduleSave(
            '${rowId}',
            'login',
            this.value
          )
        "

        onkeydown="
          handleEnterKey(
            event,
            this
          )
        "

        placeholder="Login ID"

        autocomplete="off"

      >

    </td>

    <td>

      <input

        id="input_client_${rowId}"

        data-field="client"

        data-row-id="${rowId}"

        class="matrix-input num-input"

        value="${escapeHTML(
          formattedClient
        )}"

        onfocus="
          handleInputFocus(this)
        "

        onblur="
          handleInputBlur(
            '${rowId}',
            'client',
            this
          )
        "

        oninput="
          updateLocalAndScheduleSave(
            '${rowId}',
            'client',
            this.value
          )
        "

        onkeydown="
          handleEnterKey(
            event,
            this
          )
        "

        placeholder="$0"

        inputmode="decimal"

      >

    </td>

    <td>

      <input

        id="input_coverage_${rowId}"

        data-field="coverage"

        data-row-id="${rowId}"

        class="matrix-input num-input"

        value="${escapeHTML(
          formattedCoverage
        )}"

        onfocus="
          handleInputFocus(this)
        "

        onblur="
          handleInputBlur(
            '${rowId}',
            'coverage',
            this
          )
        "

        oninput="
          updateLocalAndScheduleSave(
            '${rowId}',
            'coverage',
            this.value
          )
        "

        onkeydown="
          handleEnterKey(
            event,
            this
          )
        "

        placeholder="$0"

        inputmode="decimal"

      >

    </td>

    <td>

      <span

        class="pct-badge"

        id="pct_${rowId}"

      >

        ${pctDisplay}

      </span>

    </td>
  `;


  tbody.appendChild(
    tr
  );
}


// ============================================================================
// INPUT HANDLING
// ============================================================================

function handleInputFocus(input) {

  const rawNum =
    parseCurrencyNumber(
      input.value
    );


  input.value =
    rawNum ||
    (
      rawNum === 0 &&
      input.value
    )

      ? rawNum

      : '';


  input.style.textAlign =
    'left';


  setTimeout(
    () => {

      input.select();

    },
    0
  );
}


function handleInputBlur(
  rowId,
  field,
  input
) {

  const rawNum =
    parseCurrencyNumber(
      input.value
    );


  updateLocalAndScheduleSave(
    rowId,
    field,
    rawNum,
    true
  );


  input.value =
    input.value.trim() === ''

      ? ''

      : formatCurrency(
          rawNum
        );


  input.style.textAlign =
    'right';


  const rowData =
    (
      matrixStore[
        currentBranch
      ] || {}
    )[rowId] || {};


  const pctCell =
    document.getElementById(
      `pct_${rowId}`
    );


  if (pctCell) {

    pctCell.innerText =
      calculatePercentage(
        rowData.client,
        rowData.coverage
      );
  }
}


// ============================================================================
// SAFE REALTIME SAVE
// ============================================================================
//
// Very important fix:
//
// The old version used "currentBranch" when the delayed Firebase timer fired.
//
// If somebody typed in AWADA and quickly switched to FAWAZ,
// the delayed save could theoretically go into the wrong branch.
//
// We now capture branchAtEdit immediately.
//

function updateLocalAndScheduleSave(
  rowId,
  field,
  val,
  immediate = false
) {

  const branchAtEdit =
    currentBranch;


  if (
    !matrixStore[
      branchAtEdit
    ]
  ) {

    matrixStore[
      branchAtEdit
    ] = {};
  }


  if (
    !matrixStore[
      branchAtEdit
    ][rowId]
  ) {

    matrixStore[
      branchAtEdit
    ][rowId] = {

      login: '',

      client: '',

      coverage: ''
    };
  }


  matrixStore[
    branchAtEdit
  ][rowId][field] =
    val;


  // -------------------------
  // Live coverage percentage
  // -------------------------

  if (
    field === 'client' ||
    field === 'coverage'
  ) {

    const pctCell =
      document.getElementById(
        `pct_${rowId}`
      );


    if (pctCell) {

      const row =
        matrixStore[
          branchAtEdit
        ][rowId];


      pctCell.innerText =
        calculatePercentage(
          row.client,
          row.coverage
        );
    }
  }


  const timerKey =
    `${branchAtEdit}_${rowId}_${field}`;


  if (
    saveDebounceTimers[
      timerKey
    ]
  ) {

    clearTimeout(
      saveDebounceTimers[
        timerKey
      ]
    );
  }


  const saveValue =
    val;


  const pushToFirebase =
    () => {


      delete saveDebounceTimers[
        timerKey
      ];


      return db
        .ref(
          `pl_matrix_store/${branchAtEdit}/${rowId}`
        )
        .update({

          [field]:
            saveValue,

          updatedAt:
            firebase.database
              .ServerValue
              .TIMESTAMP
        })

        .catch(err => {

          console.error(
            'Save failed:',
            err
          );


          showToast(
            'Save failed. Check the connection and try again.',
            'error'
          );
        });
    };


  if (immediate) {

    pushToFirebase();

  } else {

    saveDebounceTimers[
      timerKey
    ] =
      setTimeout(
        pushToFirebase,
        450
      );
  }
}


// ============================================================================
// ENTER KEY NAVIGATION
// ============================================================================
//
// ENTER:
// Login -> Client P/L -> Coverage P/L -> next row Login
//
// SHIFT + ENTER:
// Goes backward
//

function handleEnterKey(
  event,
  currentInput
) {

  if (
    event.key !== 'Enter'
  ) {
    return;
  }


  event.preventDefault();


  const inputs =
    Array.from(
      document.querySelectorAll(
        '#matrix-tbody input.matrix-input'
      )
    );


  const index =
    inputs.indexOf(
      currentInput
    );


  if (index < 0) {
    return;
  }


  const direction =
    event.shiftKey
      ? -1
      : 1;


  const target =
    inputs[
      index +
      direction
    ];


  if (!target) {
    return;
  }


  target.focus();


  if (
    typeof target.select ===
    'function'
  ) {

    target.select();
  }
}


// ============================================================================
// MATRIX KEY PARSER
// ============================================================================

function parseMatrixKey(key) {

  const match =
    /^(Monday|Tuesday|Wednesday|Thursday|Friday)_(ON|AM|PM)_(Winner|Loser)_([1-3])$/
      .exec(key);


  if (!match) {
    return null;
  }


  return {

    day:
      match[1],

    shift:
      match[2],

    type:
      match[3],

    rank:
      Number(match[4])
  };
}


// ============================================================================
// TOP 5 AGGREGATION ENGINE
// ============================================================================
//
// IMPORTANT:
//
// This fixes the old PM-only problem.
//
// shiftFilter:
//
// ALL = ON + AM + PM
// ON  = Overnight only
// AM  = AM only
// PM  = PM only
//
// Repeated login numbers are NETTED together before ranking.
//

function aggregateBranchEntries(
  branchData,
  shiftFilter = 'ALL',
  branchName = ''
) {

  const netByLogin = {};

  const bData =
    branchData || {};


  Object.entries(
    bData
  )
    .forEach(
      ([key, item]) => {


        const meta =
          parseMatrixKey(
            key
          );


        if (
          !meta ||
          !item ||
          !item.login
        ) {
          return;
        }


        if (
          shiftFilter !== 'ALL' &&
          meta.shift !== shiftFilter
        ) {
          return;
        }


        if (
          item.client === undefined ||
          item.client === null ||
          item.client === ''
        ) {
          return;
        }


        const login =
          String(
            item.login
          ).trim();


        if (!login) {
          return;
        }


        if (
          !netByLogin[
            login
          ]
        ) {

          netByLogin[
            login
          ] = {

            login,

            client: 0,

            coverage: 0,

            occurrences: 0,

            days:
              new Set(),

            shifts:
              new Set(),

            branches:
              new Set()
          };
        }


        const entry =
          netByLogin[
            login
          ];


        entry.client +=
          parseCurrencyNumber(
            item.client
          );


        entry.coverage +=
          parseCurrencyNumber(
            item.coverage
          );


        entry.occurrences +=
          1;


        entry.days.add(
          meta.day
        );


        entry.shifts.add(
          meta.shift
        );


        if (branchName) {

          entry.branches.add(
            branchName
          );
        }
      }
    );


  return Object.values(
    netByLogin
  )
    .map(
      entry => ({

        login:
          entry.login,

        client:
          entry.client,

        coverage:
          entry.coverage,

        brokerNet:
          brokerNet(
            entry.client,
            entry.coverage
          ),

        coveragePct:
          entry.client

            ? (
                entry.coverage /
                Math.abs(
                  entry.client
                )
              ) * 100

            : 0,

        occurrences:
          entry.occurrences,

        days:
          Array.from(
            entry.days
          ),

        shifts:
          Array.from(
            entry.shifts
          ),

        branches:
          Array.from(
            entry.branches
          )
      })
    );
}


// ============================================================================
// RANKING
// ============================================================================

function rankEntries(entries) {

  const winners =
    entries

      .filter(
        r =>
          r.client > 0
      )

      .sort(
        (a, b) =>
          b.client -
          a.client
      )

      .slice(
        0,
        5
      );


  const losers =
    entries

      .filter(
        r =>
          r.client < 0
      )

      .sort(
        (a, b) =>
          a.client -
          b.client
      )

      .slice(
        0,
        5
      );


  return {
    winners,
    losers
  };
}


function computeTopFive(
  branchData,
  shiftFilter = 'ALL',
  branchName = ''
) {

  const entries =
    aggregateBranchEntries(
      branchData,
      shiftFilter,
      branchName
    );


  return {

    ...rankEntries(
      entries
    ),

    entries
  };
}


// ============================================================================
// ALL-BRANCH COMBINED TOP 5
// ============================================================================

function computeCombinedTopFive(
  shiftFilter = 'ALL',
  sourceMatrix = matrixStore
) {

  const byLogin = {};


  allBranches.forEach(
    branch => {


      const entries =
        aggregateBranchEntries(
          (
            sourceMatrix || {}
          )[branch],
          shiftFilter,
          branch
        );


      entries.forEach(
        item => {


          if (
            !byLogin[
              item.login
            ]
          ) {

            byLogin[
              item.login
            ] = {

              login:
                item.login,

              client: 0,

              coverage: 0,

              occurrences: 0,

              days:
                new Set(),

              shifts:
                new Set(),

              branches:
                new Set()
            };
          }


          const target =
            byLogin[
              item.login
            ];


          target.client +=
            item.client;


          target.coverage +=
            item.coverage;


          target.occurrences +=
            item.occurrences;


          item.days.forEach(
            value =>
              target.days.add(
                value
              )
          );


          item.shifts.forEach(
            value =>
              target.shifts.add(
                value
              )
          );


          item.branches.forEach(
            value =>
              target.branches.add(
                value
              )
          );
        }
      );
    }
  );


  const entries =
    Object.values(
      byLogin
    )
      .map(
        entry => ({

          login:
            entry.login,

          client:
            entry.client,

          coverage:
            entry.coverage,

          brokerNet:
            brokerNet(
              entry.client,
              entry.coverage
            ),

          occurrences:
            entry.occurrences,

          days:
            Array.from(
              entry.days
            ),

          shifts:
            Array.from(
              entry.shifts
            ),

          branches:
            Array.from(
              entry.branches
            )
        })
      );


  return {

    ...rankEntries(
      entries
    ),

    entries
  };
}


// ============================================================================
// MANAGEMENT SHIFT FILTER
// ============================================================================

function managementShiftFilter() {

  return (
    document
      .getElementById(
        'management-shift-filter'
      )
      ?.value ||

    'ALL'
  );
}


// ============================================================================
// TOP 5 TABLE RENDERING
// ============================================================================

function renderRankingRows(
  rows,
  type,
  includeBranch = false
) {

  if (
    !rows.length
  ) {

    return `
      <tr>
        <td
          colspan="7"
          class="muted"
          style="
            text-align:center;
            padding:18px;
          "
        >
          No data entered
        </td>
      </tr>
    `;
  }


  return rows
    .map(
      (r, i) => {


        const netClass =
          r.brokerNet >= 0
            ? 'pl-positive'
            : 'pl-negative';


        return `
          <tr>

            <td>
              #${i + 1}
            </td>

            <td>
              <strong>
                ${escapeHTML(
                  r.login
                )}
              </strong>
            </td>

            ${
              includeBranch

                ? `
                  <td>
                    ${escapeHTML(
                      (
                        r.branches || []
                      )
                        .map(
                          b =>
                            b.toUpperCase()
                        )
                        .join(', ')
                    )}
                  </td>
                `

                : ''
            }

            <td
              class="${
                type === 'winner'
                  ? 'tag-winner'
                  : 'tag-loser'
              }"
            >
              ${formatCurrency(
                r.client
              )}
            </td>

            <td
              class="${
                r.coverage >= 0
                  ? 'coverage-positive'
                  : 'coverage-negative'
              }"
            >
              ${formatCurrency(
                r.coverage
              )}
            </td>

            <td
              class="${netClass}"
            >
              ${formatCurrency(
                r.brokerNet
              )}
            </td>

            <td>
              ${r.occurrences}
            </td>

          </tr>
        `;
      }
    )
    .join('');
}


function rankingCard(
  title,
  rows,
  type,
  includeBranch = false,
  subtitle = ''
) {

  return `

    <div class="branch-card">

      <h3>

        ${escapeHTML(
          title
        )}

        ${
          subtitle

            ? `
              <span
                style="
                  color:#64748b;
                  font-weight:500;
                  margin-left:6px;
                "
              >
                ${escapeHTML(
                  subtitle
                )}
              </span>
            `

            : ''
        }

      </h3>


      <div
        class="table-scroll"
        style="
          overflow-x:auto;
        "
      >

        <table
          class="matrix-table"
        >

          <thead>

            <tr>

              <th>
                RANK
              </th>

              <th>
                LOGIN
              </th>

              ${
                includeBranch
                  ? '<th>BRANCH</th>'
                  : ''
              }

              <th>
                CLIENT P/L
              </th>

              <th>
                COVERAGE P/L
              </th>

              <th>
                BROKER NET
              </th>

              <th>
                ENTRIES
              </th>

            </tr>

          </thead>

          <tbody>

            ${renderRankingRows(
              rows,
              type,
              includeBranch
            )}

          </tbody>

        </table>

      </div>

    </div>
  `;
}


// ============================================================================
// EXECUTIVE DASHBOARD
// ============================================================================

function renderManagementView() {

  updateWeekLabels();


  const shiftFilter =
    managementShiftFilter();


  const combined =
    computeCombinedTopFive(
      shiftFilter,
      matrixStore
    );


  renderExecutiveKPIs(
    combined.entries,
    shiftFilter
  );


  // ------------------------------------------------------
  // All-branch combined Top 5
  // ------------------------------------------------------

  const combinedContainer =
    document.getElementById(
      'combined-tables-container'
    );


  if (combinedContainer) {

    combinedContainer.innerHTML =

      rankingCard(

        'Top 5 Winners',

        combined.winners,

        'winner',

        true,

        shiftFilter === 'ALL'
          ? 'ON + AM + PM'
          : `${shiftFilter} only`
      )

      +

      rankingCard(

        'Top 5 Losers',

        combined.losers,

        'loser',

        true,

        shiftFilter === 'ALL'
          ? 'ON + AM + PM'
          : `${shiftFilter} only`
      );
  }


  // ------------------------------------------------------
  // Individual branch Top 5
  // ------------------------------------------------------

  const container =
    document.getElementById(
      'management-tables-container'
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    '';


  allBranches.forEach(
    branch => {


      const {
        winners,
        losers
      } =
        computeTopFive(
          matrixStore[
            branch
          ],
          shiftFilter,
          branch
        );


      container.innerHTML +=
        rankingCard(

          `${branch.toUpperCase()} — Top 5 Winners`,

          winners,

          'winner',

          false,

          shiftFilter
        );


      container.innerHTML +=
        rankingCard(

          `${branch.toUpperCase()} — Top 5 Losers`,

          losers,

          'loser',

          false,

          shiftFilter
        );
    }
  );


  renderTraderSearch();
}


// ============================================================================
// EXECUTIVE KPI CARDS
// ============================================================================

function renderExecutiveKPIs(
  entries,
  shiftFilter
) {

  const totalClient =
    entries.reduce(
      (sum, item) =>
        sum + item.client,
      0
    );


  const totalCoverage =
    entries.reduce(
      (sum, item) =>
        sum + item.coverage,
      0
    );


  const totalBrokerNet =
    entries.reduce(
      (sum, item) =>
        sum + item.brokerNet,
      0
    );


  const totalEntries =
    entries.reduce(
      (sum, item) =>
        sum + item.occurrences,
      0
    );


  const container =
    document.getElementById(
      'executive-kpis'
    );


  if (!container) {
    return;
  }


  const netClass =
    totalBrokerNet >= 0

      ? 'value-positive'

      : 'value-negative';


  container.innerHTML = `

    <div class="kpi-card">

      <div class="kpi-label">
        Selected Shift
      </div>

      <div class="kpi-value">

        ${
          shiftFilter === 'ALL'
            ? 'ALL'
            : shiftFilter
        }

      </div>

      <div class="kpi-sub">

        ${
          shiftFilter === 'ALL'
            ? 'ON + AM + PM'
            : 'Single-shift view'
        }

      </div>

    </div>


    <div class="kpi-card">

      <div class="kpi-label">
        Unique Traders
      </div>

      <div class="kpi-value">

        ${entries.length}

      </div>

      <div class="kpi-sub">
        After login netting
      </div>

    </div>


    <div class="kpi-card">

      <div class="kpi-label">
        Client P/L
      </div>

      <div class="kpi-value">

        ${formatCurrency(
          totalClient
        )}

      </div>

      <div class="kpi-sub">
        Net selected entries
      </div>

    </div>


    <div class="kpi-card">

      <div class="kpi-label">
        Coverage P/L
      </div>

      <div class="kpi-value">

        ${formatCurrency(
          totalCoverage
        )}

      </div>

      <div class="kpi-sub">
        Total cover result
      </div>

    </div>


    <div class="kpi-card">

      <div class="kpi-label">
        Broker Net
      </div>

      <div
        class="kpi-value ${netClass}"
      >

        ${formatCurrency(
          totalBrokerNet
        )}

      </div>

      <div class="kpi-sub">

        ${totalEntries}
        submitted rows

      </div>

    </div>
  `;
}


// ============================================================================
// TRADER SEARCH
// ============================================================================

function renderTraderSearch() {

  const box =
    document.getElementById(
      'trader-search-results'
    );


  const input =
    document.getElementById(
      'trader-search'
    );


  if (
    !box ||
    !input
  ) {

    return;
  }


  const query =
    input.value
      .trim()
      .toLowerCase();


  if (!query) {

    box.style.display =
      'none';


    box.innerHTML =
      '';


    return;
  }


  const shiftFilter =
    managementShiftFilter();


  const matches =
    [];


  allBranches.forEach(
    branch => {


      aggregateBranchEntries(
        matrixStore[
          branch
        ],
        shiftFilter,
        branch
      )
        .forEach(
          row => {


            if (
              row.login
                .toLowerCase()
                .includes(
                  query
                )
            ) {

              matches.push({
                ...row,
                branch
              });
            }
          }
        );
    }
  );


  matches.sort(
    (a, b) =>
      Math.abs(
        b.client
      ) -
      Math.abs(
        a.client
      )
  );


  box.style.display =
    'block';


  box.innerHTML = `

    <h3>
      Trader Search Results
    </h3>


    <div
      style="
        overflow-x:auto;
      "
    >

      <table
        class="matrix-table"
      >

        <thead>

          <tr>

            <th>LOGIN</th>

            <th>BRANCH</th>

            <th>CLIENT P/L</th>

            <th>COVERAGE P/L</th>

            <th>BROKER NET</th>

            <th>ENTRIES</th>

            <th>SHIFTS</th>

          </tr>

        </thead>


        <tbody>

          ${
            matches.length

              ? matches
                  .map(
                    row => `

                      <tr>

                        <td>

                          <strong>

                            ${escapeHTML(
                              row.login
                            )}

                          </strong>

                        </td>


                        <td>

                          ${row.branch.toUpperCase()}

                        </td>


                        <td>

                          ${formatCurrency(
                            row.client
                          )}

                        </td>


                        <td>

                          ${formatCurrency(
                            row.coverage
                          )}

                        </td>


                        <td
                          class="${
                            row.brokerNet >= 0
                              ? 'pl-positive'
                              : 'pl-negative'
                          }"
                        >

                          ${formatCurrency(
                            row.brokerNet
                          )}

                        </td>


                        <td>

                          ${row.occurrences}

                        </td>


                        <td>

                          ${escapeHTML(
                            row.shifts.join(
                              ', '
                            )
                          )}

                        </td>

                      </tr>

                    `
                  )
                  .join('')

              : `

                <tr>

                  <td
                    colspan="7"
                    class="muted"
                    style="
                      text-align:center;
                      padding:16px;
                    "
                  >

                    No matching trader found.

                  </td>

                </tr>

              `
          }

        </tbody>

      </table>

    </div>
  `;
}


// ============================================================================
// ARCHIVE + RESET WEEK
// ============================================================================
//
// New archive system stores the complete weekly matrix.
//
// This means archived weeks can later be recalculated using:
//
// ALL
// ON
// AM
// PM
//
// instead of permanently storing only a PM Top 5.
//

function archiveAndResetWeek() {

  const snapshotMatrix =
    JSON.parse(
      JSON.stringify(
        matrixStore || {}
      )
    );


  const completedRows =
    allBranches.reduce(
      (sum, branch) => {


        const rows =
          Object.values(
            snapshotMatrix[
              branch
            ] || {}
          );


        const completed =
          rows.filter(
            row =>
              row &&
              row.login &&
              row.client !== '' &&
              row.client !== undefined
          ).length;


        return (
          sum +
          completed
        );

      },
      0
    );


  const weekLabel =
    getWeekLabel();


  const confirmed =
    confirm(

      `Archive trading week ${weekLabel}?\n\n` +

      `Preview: ${completedRows} completed trader rows will be saved.\n` +

      `After the archive is written, the live weekly matrix will be cleared in the SAME atomic database update.\n\n` +

      `Continue?`
    );


  if (!confirmed) {
    return;
  }


  const archiveKey =
    Date.now()
      .toString();


  const {
    monday,
    friday
  } =
    getWeekBounds();


  const archiveData = {

    archivedAt:
      new Date()
        .toISOString(),

    weekLabel,

    weekStart:
      isoDateOnly(
        monday
      ),

    weekEnd:
      isoDateOnly(
        friday
      ),

    matrix:
      snapshotMatrix,

    branches: {}
  };


  // Precompute the ALL shift version as well
  // for backward-friendly archive support.

  allBranches.forEach(
    branch => {


      const result =
        computeTopFive(

          snapshotMatrix[
            branch
          ],

          'ALL',

          branch
        );


      archiveData
        .branches[
          branch
        ] = {

          winners:
            result.winners,

          losers:
            result.losers
        };
    }
  );


  // Firebase multi-location update.
  //
  // Archive creation + live reset happen
  // in one atomic database update.

  const updates = {};


  updates[
    `pl_history/${archiveKey}`
  ] =
    archiveData;


  updates[
    'pl_matrix_store'
  ] =
    null;


  db.ref()
    .update(
      updates
    )

    .then(
      () => {

        showToast(
          'Week archived successfully. A new blank week is ready.'
        );
      }
    )

    .catch(
      err => {

        console.error(
          'Archive & reset failed:',
          err
        );


        showToast(
          'Archive failed. Live entries were not reset.',
          'error'
        );
      }
    );
}


// ============================================================================
// ARCHIVE DATE DISPLAY
// ============================================================================

function formatArchiveDate(
  isoOrTimestamp
) {

  const d =
    new Date(
      isoOrTimestamp
    );


  const datePart =
    d.toLocaleDateString(
      'en-US',
      {

        weekday:
          'short',

        year:
          'numeric',

        month:
          'short',

        day:
          'numeric'
      }
    );


  const timePart =
    d.toLocaleTimeString(
      'en-US',
      {

        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    );


  return (
    `${datePart} · ${timePart}`
  );
}


// ============================================================================
// ARCHIVE LIST
// ============================================================================

function renderArchiveView() {

  const listContainer =
    document.getElementById(
      'archive-week-list'
    );


  const detailContainer =
    document.getElementById(
      'archive-detail-container'
    );


  if (
    !listContainer ||
    !detailContainer
  ) {

    return;
  }


  const weekKeys =
    Object.keys(
      archiveStore
    )
      .sort(
        (a, b) =>
          Number(b) -
          Number(a)
      );


  if (
    !weekKeys.length
  ) {

    listContainer.innerHTML = `
      <p
        class="subtitle"
        style="
          padding:10px;
        "
      >
        No archived weeks yet.
      </p>
    `;


    detailContainer.innerHTML =
      '';


    selectedArchiveWeek =
      null;


    return;
  }


  if (
    !selectedArchiveWeek ||
    !archiveStore[
      selectedArchiveWeek
    ]
  ) {

    selectedArchiveWeek =
      weekKeys[0];
  }


  listContainer.innerHTML =
    weekKeys
      .map(
        key => {


          const entry =
            archiveStore[
              key
            ];


          const label =
            entry.weekLabel ||

            formatArchiveDate(
              entry.archivedAt ||
              Number(key)
            );


          const activeClass =
            key === selectedArchiveWeek
              ? 'active'
              : '';


          return `

            <button

              class="
                archive-week-btn
                ${activeClass}
              "

              onclick="
                selectArchiveWeek(
                  '${key}'
                )
              "

            >

              ${escapeHTML(
                label
              )}

            </button>
          `;
        }
      )
      .join('');


  renderArchiveDetail(
    selectedArchiveWeek
  );
}


function selectArchiveWeek(
  weekKey
) {

  selectedArchiveWeek =
    weekKey;


  renderArchiveView();
}


// ============================================================================
// ARCHIVED WEEK DETAIL
// ============================================================================

function renderArchiveDetail(
  weekKey
) {

  const detailContainer =
    document.getElementById(
      'archive-detail-container'
    );


  if (!detailContainer) {
    return;
  }


  const entry =
    archiveStore[
      weekKey
    ];


  if (!entry) {

    detailContainer.innerHTML =
      '';


    return;
  }


  const shiftFilter =
    document
      .getElementById(
        'archive-shift-filter'
      )
      ?.value ||

    'ALL';


  const title =
    entry.weekLabel ||

    formatArchiveDate(
      entry.archivedAt ||
      Number(
        weekKey
      )
    );


  let html = `

    <h2 class="archive-detail-title">

      Week:
      ${escapeHTML(
        title
      )}

      ·

      ${escapeHTML(
        shiftFilter
      )}

    </h2>


    <div class="dashboard-grid">
  `;


  allBranches.forEach(
    branch => {


      let winners = [];

      let losers = [];


      // New archive structure:
      // calculate any shift from the stored matrix.

      if (
        entry.matrix
      ) {


        const result =
          computeTopFive(

            entry.matrix[
              branch
            ],

            shiftFilter,

            branch
          );


        winners =
          result.winners;


        losers =
          result.losers;


      } else {


        // Legacy archive compatibility.
        //
        // Old archive entries only had
        // precomputed winners / losers.

        const legacy =
          (
            entry.branches ||
            {}
          )[branch] ||

          {
            winners: [],
            losers: []
          };


        winners =
          legacy.winners ||
          [];


        losers =
          legacy.losers ||
          [];


        winners =
          winners.map(
            item => ({

              ...item,

              brokerNet:
                brokerNet(
                  item.client,
                  item.coverage
                ),

              occurrences:
                item.occurrences ||
                1
            })
          );


        losers =
          losers.map(
            item => ({

              ...item,

              brokerNet:
                brokerNet(
                  item.client,
                  item.coverage
                ),

              occurrences:
                item.occurrences ||
                1
            })
          );
      }


      html +=
        rankingCard(

          `${branch.toUpperCase()} — Top 5 Winners`,

          winners,

          'winner',

          false,

          shiftFilter
        );


      html +=
        rankingCard(

          `${branch.toUpperCase()} — Top 5 Losers`,

          losers,

          'loser',

          false,

          shiftFilter
        );
    }
  );


  html +=
    '</div>';


  detailContainer.innerHTML =
    html;
}


// ============================================================================
// INITIALIZATION
// ============================================================================

function initApp() {

  updateWeekLabels();


  const urlParams =
    new URLSearchParams(
      window.location.search
    );


  const branchParam =
    (
      urlParams.get(
        'branch'
      ) ||
      'group5'
    )
      .toLowerCase();


  const allowedTabs =
    branchGroups[
      branchParam
    ] ||
    [
      branchParam
    ];


  applySidebarLock(
    allowedTabs
  );


  switchTab(
    branchParam
  );
}


// ============================================================================
// START APPLICATION
// ============================================================================

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initApp
  );

} else {

  initApp();
}
