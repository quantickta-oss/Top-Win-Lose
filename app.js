'use strict';
const GROUPS={group1:['awada','bbc','fawaz','egypt'],group2:['boudani','cdi','ar','sh'],group3:['connect','badaro','mt','tr'],group4:['youssef','fidaa','hassan-h']};
const BRANCHES=Object.values(GROUPS).flat(), groupOf=b=>Object.keys(GROUPS).find(g=>GROUPS[g].includes(b));

function getSelectedPortal() {
  const select = $('#group-select');
  return select ? select.value : 'group1';
}

let PORTAL=getSelectedPortal();
let ALLOWED=PORTAL==='management'?BRANCHES:GROUPS[PORTAL];
const SHIFTS={am:'AM',pm:'PM',overnight:'Overnight',legacy:'Daily (previous version)'};
const reportKey=(d,s)=>s==='legacy'?d:`${d}_${s}`;
const selectedKey=()=>reportKey(date,shift);
const recordShift=r=>r.shift||'legacy';
const LOCAL_KEY='pl_manual_reports_v2';
let records={},db=null,ready=false,dirty=false,busy=false,view='management',draft=[],date='',shift='am',editVersion=null,unsub=[];

const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(n>0?'+':n<0?'−':'')+(Math.abs(n)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const cls=n=>n>0?'pos':n<0?'neg':'muted';
const net=r=>r.cover-r.client;
const pct=(n,d)=>d===0?'—':`${n>0?'+':''}${(n/d*100).toFixed(2)}%`;
const cents=v=>{const s=String(v).trim().replace(/,/g,'');if(!/^[+-]?\d+(\.\d{1,2})?$/.test(s))throw Error('Enter a valid amount with at most two decimals.');const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||Math.abs(n)>1e14)throw Error('Amount is too large.');return n;};
const blank=kind=>({kind,login:'',client:'',cover:''});
const isEmpty=r=>!['login','client','cover'].some(k=>String(r[k]??'').trim());
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function message(t,error=false){$('#status').textContent=t;$('#status').className=error?'error':'success';}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function totals(rows){return rows.reduce((s,r)=>({client:s.client+r.client,cover:s.cover+r.cover,net:s.net+net(r),denom:s.denom+Math.abs(r.client)}),{client:0,cover:0,net:0,denom:0});}
function metric(title,n,isPct=false){return `<div class="metric"><span>${title}</span><strong class="${isPct?'':cls(n)}">${isPct?n:money(n)}</strong></div>`;}
function metricGrid(rows){const t=totals(rows);return `<div class="grid">${metric('Client P/L',t.client)}${metric('Cover Net',t.cover)}${metric('Broker Net',t.net)}${metric('Net % · absolute P/L basis',pct(t.net,t.denom),true)}</div>`;}
function guard(){if(busy){message('Please wait for the current save to finish.',true);return false;}return !dirty||confirm('You have unsaved entries. Discard them and continue?');}

function nav(){
  PORTAL=getSelectedPortal();
  ALLOWED=PORTAL==='management'?BRANCHES:GROUPS[PORTAL];
  let h='';
  if(PORTAL==='management')h='<div class="nav-title">MANAGEMENT</div><button data-view="management">Executive Dashboard</button>';
  for(const [g,bs] of Object.entries(GROUPS)){
    if(PORTAL!=='management'&&PORTAL!==g)continue;
    h+=`<div class="nav-title">GROUP ${g.slice(-1)}</div>`+bs.map(b=>`<button data-view="${b}">${b.toUpperCase()} P/L</button>`).join('');
  }
  h+='<div class="nav-title">RECORDS</div><button data-view="archive">Report Archive</button>';
  $('#nav').innerHTML=h;
  $('#nav').onclick=e=>{const b=e.target.closest('[data-view]');if(!b||!ready||!guard())return;view=b.dataset.view;dirty=false;render();};
}

function draftLoad(){const rec=records[view]?.[selectedKey()];editVersion=rec?.updatedAt||null;draft=['winner','loser'].flatMap(kind=>{const rows=(rec?.rows||[]).filter(r=>r.kind===kind).map(r=>({...r,client:(r.client/100).toFixed(2),cover:(r.cover/100).toFixed(2)}));while(rows.length<3)rows.push(blank(kind));return rows;});}
function entryTable(kind,title){return `<section class="card"><div class="card-head"><h2>${title}</h2><span class="tag">Up to 3 clients</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Login</th><th class="num">Client P/L</th><th class="num">Cover Net</th><th class="num">Broker Net</th><th class="num">Net %</th></tr></thead><tbody>${draft.map((r,i)=>r.kind!==kind?'':`<tr data-row="${i}"><td>${i\%3+1}</td>${['login','client','cover'].map(f=>`<td><input data-i="${i}" data-field="${f}" aria-label="${title} ${i%3+1} ${f}" value="${esc(r[f])}" ${['client','cover'].includes(f)?'inputmode="decimal" placeholder="0.00"':'inputmode="numeric" placeholder="Login"'} autocomplete="off"></td>`).join('')}<td class="num result-net">—</td><td class="num result-pct">—</td></tr>`).join('')}</tbody></table></div></section>`;}
function render(){if(!ready)return;$('#status').textContent='';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='management')renderManagement();else if(view==='archive')renderArchive();else renderEntry();}

function renderEntry(){
  if(!ALLOWED.includes(view)){ view=ALLOWED[0]; }
  draftLoad();
  const rec=records[view]?.[selectedKey()];
  $('#title').textContent=`${view.toUpperCase()} — ${SHIFTS[shift]} report`;
  $('#subtitle').textContent=`Group ${groupOf(view).slice(-1)} · Enter client results and the actual signed Cover Net.`;
  $('#content').innerHTML=`<div class="notice">${rec?'Saved report loaded. Saving again updates this branch, trading date and shift.':'No report submitted for this shift.'} Enter / Tab → next input · Shift+Enter / Shift+Tab → previous input. Enter 0 for clients with no cover.</div><div id="entry-totals"></div>${entryTable('winner','Top 3 Winners')}${entryTable('loser','Top 3 Losers')}<label class="check"><input type="checkbox" id="no-clients" ${rec?.noClients?'checked':''}> No clients to report for this shift</label><p class="muted">Winners have positive Client P/L; losers have negative Client P/L. Leave unused rows entirely empty.</p><div class="actions"><button class="primary" id="save">Save Report</button><button id="clear">Clear entries</button></div>`;
  $('#content').oninput=e=>{if(e.target.matches('[data-field]')){draft[Number(e.target.dataset.i)][e.target.dataset.field]=e.target.value;dirty=true;updateResults();}if(e.target.id==='no-clients')dirty=true;};
  $('#content').onkeydown=e=>{if(e.key!=='Enter'||!e.target.matches('[data-field]')||e.isComposing)return;e.preventDefault();const fields=[...$('#content').querySelectorAll('[data-field]')],i=fields.indexOf(e.target),next=fields[i+(e.shiftKey?-1:1)];if(next){next.focus();next.select();}else if(!e.shiftKey)$('#save').focus();};
  $('#save').onclick=save;
  $('#clear').onclick=()=>{if(!confirm('Clear the current form? Saved reports are unchanged until you save.'))return;draft=draft.map(r=>blank(r.kind));$('#content').querySelectorAll('[data-field]').forEach(i=>i.value='');$('#no-clients').checked=false;dirty=true;updateResults();};
  updateResults();
  if(shift==='legacy'){$('#content').querySelectorAll('input,button').forEach(e=>e.disabled=true);message('Previous daily report: read-only. Choose AM, PM or Overnight to enter a new shift report.');}
}

function updateResults(){const rows=[];draft.forEach((r,i)=>{let n=null,p='—';try{if(r.client.trim()&&r.cover.trim()){const row={client:cents(r.client),cover:cents(r.cover)};rows.push(row);n=net(row);p=pct(n,Math.abs(row.client));}}catch{}const el=$(`[data-row="${i}"]`);el.querySelector('.result-net').textContent=n===null?'—':money(n);el.querySelector('.result-net').className=`num result-net ${cls(n)}`;el.querySelector('.result-pct').textContent=p;el.querySelector('.result-pct').className=`num result-pct ${cls(n)}`;});$('#entry-totals').innerHTML=metricGrid(rows);}
function validateRows(input,noClients){const used=input.filter(r=>!isEmpty(r));if(noClients&&used.length)throw Error('Clear the entries before selecting “No clients to report”.');if(!noClients&&!used.length)throw Error('Enter at least one client or select “No clients to report”.');const seen=new Set(),counts={winner:0,loser:0};return used.map(r=>{const login=String(r.login??'').trim();if(!/^\d+$/.test(login))throw Error('Each client needs a numeric login.');if(seen.has(login))throw Error(`Login ${login} appears more than once.`);seen.add(login);if(!Object.hasOwn(counts,r.kind)||++counts[r.kind]>3)throw Error('Use at most 3 winners and 3 losers.');const client=cents(r.client),cover=cents(r.cover);if((r.kind==='winner'&&client<=0)||(r.kind==='loser'&&client>=0))throw Error(`${login}: winners must have positive Client P/L and losers must have negative Client P/L.`);return {kind:r.kind,login,client,cover};});}

function reportPath(b,d,s){return `pl_manual_reports_v1/${groupOf(b)}/${b}/${reportKey(d,s)}`;}

async function save(){
  if(busy||shift==='legacy')return;
  try{
    const rows=validateRows(draft,$('#no-clients').checked),noClients=$('#no-clients').checked,b=view,d=date,s=shift,key=reportKey(d,s);
    const rec={version:2,branch:b,date:d,shift:s,rows,noClients,updatedAt:new Date().toISOString()};
    busy=true;$('#save').disabled=true;
    if(db){
      await db.ref(reportPath(b,d,s)).set(rec);
    }else{
      const next={...records,[b]:{...(records[b]||{}),[key]:rec}};
      localStorage.setItem(LOCAL_KEY,JSON.stringify(next));
      records=next;
    }
    editVersion=rec.updatedAt;dirty=false;
    message('Report saved and shared in real time.');
  }catch(e){message(e.message,true);}
  finally{busy=false;const b=$('#save');if(b)b.disabled=false;}
}

function readTable(rows,branch=false){if(!rows.length)return '<div class="empty">No clients in this selection.</div>';return `<div class="table-wrap"><table><thead><tr>${branch?'<th>Branch</th>':''}<th>Login</th><th class="num">Client P/L</th><th class="num">Cover Net</th><th class="num">Broker Net</th><th class="num">Net %</th></tr></thead><tbody>${rows.map(r=>`<tr>${branch?`<td>${esc(r.branch.toUpperCase())}</td>`:''}<td>${esc(r.login)}</td><td class="num ${cls(r.client)}">${money(r.client)}</td><td class="num ${cls(r.cover)}">${money(r.cover)}</td><td class="num ${cls(net(r))}">${money(net(r))}</td><td class="num ${cls(net(r))}">${pct(net(r),Math.abs(r.client))}</td></tr>`).join('')}</tbody></table></div>`;}

function executiveBranchCard(branch){
  const report=records[branch]?.[selectedKey()];
  const header=`<div class="card-head"><div><div class="eyebrow">${date} · ${SHIFTS[shift]}</div><h2>${branch.toUpperCase()}</h2></div><div class="actions"><span class="tag">${report?report.noClients?'Submitted · no clients':'Submitted':'Not submitted'}</span><button data-open="${branch}">${report?'View / Edit report':'Enter report'}</button></div></div>`;
  if(!report)return `<section class="card" data-branch-result="${branch}">${header}<div class="empty">No report submitted for this branch, date and shift.</div></section>`;
  const rows=report.rows||[];
  const winners=rows.filter(r=>r.kind==='winner').sort((a,b)=>b.client-a.client);
  const losers=rows.filter(r=>r.kind==='loser').sort((a,b)=>a.client-b.client);
  return `<section class="card" data-branch-result="${branch}">${header}${metricGrid(rows)}${report.noClients?'<div class="empty">No clients reported for this shift.</div>':`<h3>Top 3 Winners</h3>${readTable(winners)}<h3>Top 3 Losers</h3>${readTable(losers)}`}<p class="foot">${branch.toUpperCase()} selected-client totals for this shift.</p></section>`;
}

function renderManagement(){
  const reports=BRANCHES.flatMap(b=>records[b]?.[selectedKey()]?[records[b][selectedKey()]]:[]),rows=reports.flatMap(r=>r.rows.map(x=>({...x,branch:r.branch})));
  $('#title').textContent='Executive Dashboard';
  $('#subtitle').textContent=`${date} · ${SHIFTS[shift]} · ${reports.length}/12 branches submitted · Selected clients only`;
  $('#content').innerHTML=`<div class="eyebrow">ALL SUBMITTED BRANCHES · SELECTED-CLIENT TOTALS</div>${metricGrid(rows)}<section class="card"><div class="card-head"><h2>Branch submissions</h2><span class="tag">${reports.length}/12 submitted</span></div><div class="table-wrap"><table><thead><tr><th>Group</th><th>Branch</th><th>Status</th><th>Clients</th><th class="num">Broker Net</th><th class="num">Net %</th><th></th></tr></thead><tbody>${BRANCHES.map(b=>{const r=records[b]?.[selectedKey()],t=totals(r?.rows||[]);return `<tr><td>${groupOf(b).slice(-1)}</td><td>${b.toUpperCase()}</td><td class="${r?'pos':'muted'}">${r?r.noClients?'Submitted · no clients':'Submitted':'Missing'}</td><td>${r?r.rows.length:'—'}</td><td class="num ${r?cls(t.net):''}">${r?money(t.net):'—'}</td><td class="num">${r?pct(t.net,t.denom):'—'}</td><td><button data-open="${b}">Open</button></td></tr>`;}).join('')}</tbody></table></div></section>${Object.entries(GROUPS).map(([g,branches])=>`<div class="section-heading"><div class="eyebrow">GROUP ${g.slice(-1)}</div><h2>Branch results · ${SHIFTS[shift]}</h2></div>${branches.map(branch=>executiveBranchCard(branch)).join('')}`).join('')}`;
  $('#content').oninput=null;$('#content').onkeydown=null;
  $('#content').onclick=e=>{const b=e.target.closest('[data-open]');if(b){view=b.dataset.open;render();}}
}

function renderArchive(){
  $('#title').textContent='Report Archive';
  $('#subtitle').textContent='All saved shifts by branch. Each date and shift is a separate report.';
  const rs=ALLOWED.flatMap(b=>Object.values(records[b]||{})).sort((a,b)=>b.date.localeCompare(a.date)||a.branch.localeCompare(b.branch)||Object.keys(SHIFTS).indexOf(recordShift(a))-Object.keys(SHIFTS).indexOf(recordShift(b)));
  $('#content').innerHTML=`<section class="card"><div class="card-head"><h2>Branch history</h2><select id="archive-branch" aria-label="Filter archive by branch"><option value="all">All available branches</option>${ALLOWED.map(b=>`<option value="${b}">${b.toUpperCase()}</option>`).join('')}</select></div><div id="archive-list"></div></section>`;
  const fill=()=>{const items=rs.filter(r=>$('#archive-branch').value==='all'||r.branch===$('#archive-branch').value);$('#archive-list').innerHTML=items.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Shift</th><th>Branch</th><th>Clients</th><th class="num">Broker Net</th><th class="num">Net %</th><th></th></tr></thead><tbody>${items.map(r=>{const t=totals(r.rows);return `<tr><td>${r.date}</td><td>${SHIFTS[recordShift(r)]}</td><td>${r.branch.toUpperCase()}</td><td>${r.rows.length}</td><td class="num ${cls(t.net)}">${money(t.net)}</td><td class="num">${pct(t.net,t.denom)}</td><td><button data-branch="${r.branch}" data-date="${r.date}" data-shift="${recordShift(r)}">Open report</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty">No saved reports yet.</div>';};
  fill();$('#archive-branch').onchange=fill;
  $('#content').oninput=null;$('#content').onkeydown=null;
  $('#content').onclick=e=>{const b=e.target.closest('[data-branch]');if(b){view=b.dataset.branch;date=b.dataset.date;shift=b.dataset.shift;$('#date').value=date;$('#shift').value=shift;render();}}
}

function download(){const scoped=Object.fromEntries(ALLOWED.map(b=>[b,records[b]||{}]));const blob=new Blob([JSON.stringify({format:'pl-manual-v2',reports:scoped},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`PL-${PORTAL}-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

async function restore(file){
  if(!file)return;
  try{
    if(!guard())return;
    const data=JSON.parse(await file.text());
    if(!['pl-manual-v1','pl-manual-v2'].includes(data.format)||!data.reports||typeof data.reports!=='object')throw Error('Choose a P/L manual-system backup.');
    const additions=[];
    for(const [b,days] of Object.entries(data.reports)){
      if(!ALLOWED.includes(b))continue;
      for(const [key,r] of Object.entries(days)){
        const d=r.date,s=recordShift(r);
        if(!Object.hasOwn(SHIFTS,s)||!validDate(d)||key!==reportKey(d,s)||r.branch!==b||!Array.isArray(r.rows)||typeof r.noClients!=='boolean')throw Error('Invalid report in backup.');
        const rows=validateRows(r.rows.map(x=>{if(!Number.isSafeInteger(x.client)||!Number.isSafeInteger(x.cover))throw Error('Invalid monetary value in backup.');return {...x,client:(x.client/100).toFixed(2),cover:(x.cover/100).toFixed(2)};}),r.noClients);
        if(!records[b]?.[key])additions.push({version:s==='legacy'?1:2,branch:b,date:d,...(s==='legacy'?{}:{shift:s}),rows,noClients:r.noClients,updatedAt:new Date().toISOString()});
      }
    }
    if(!additions.length){message('No missing reports to restore. Existing shifts are kept.');return;}
    if(!confirm(`Restore ${additions.length} missing reports? Existing reports will be kept.`))return;
    for(const r of additions){await db.ref(reportPath(r.branch,r.date,recordShift(r))).set(r);}
    dirty=false;render();message(`Restored ${additions.length} reports.`);
  }catch(e){message(`Restore failed: ${e.message}`,true);}finally{$('#backup-file').value='';}
}

function normalizeCloud(value){const result={};for(const [b,days] of Object.entries(value||{})){if(!BRANCHES.includes(b))continue;result[b]={};for(const [d,r] of Object.entries(days||{}))result[b][d]={...r,rows:Object.values(r.rows||{})};}return result;}
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Unable to load Firebase.'));document.head.append(s);});}

async function connect(){
  const cfg=window.PL_CONFIG;
  if(!cfg?.enabled){
    try{records=JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}');}catch{}
    ready=true;nav();render();return;
  }
  $('#storage').textContent='Connecting to shared reports…';
  try{
    await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
    firebase.initializeApp(cfg.firebase);
    db=firebase.database();

    unsub.forEach(f=>f()); unsub=[];
    const groups=Object.keys(GROUPS);
    await Promise.all(groups.map(async g=>{
      const ref=db.ref(`pl_manual_reports_v1/${g}`);
      const snap=await ref.once('value');
      Object.assign(records,normalizeCloud(snap.val()));
      const handler=s=>{
        for(const b of GROUPS[g])delete records[b];
        Object.assign(records,normalizeCloud(s.val()));
        if(ready&&!dirty&&!busy)render();
      };
      ref.on('value',handler);
      unsub.push(()=>ref.off('value',handler));
    }));

    ready=true;
    $('#storage').innerHTML='Shared cloud sync active';
    nav();
    view=PORTAL==='management'?'management':ALLOWED[0];
    render();
  }catch(e){
    $('#storage').textContent='Offline mode (Local storage)';
    ready=true;nav();render();
  }
}

date=today();$('#date').value=date;$('#shift').value=shift;
$('#shift').onchange=e=>{if(!guard()){e.target.value=shift;return;}shift=e.target.value;dirty=false;render();};
$('#date').onchange=e=>{if(!validDate(e.target.value)||!guard()){e.target.value=date;return;}date=e.target.value;dirty=false;render();};
$('#backup').onclick=()=>{if(ready)download();};
$('#restore').onclick=()=>{if(ready)$('#backup-file').click();};
$('#backup-file').onchange=e=>restore(e.target.files[0]);

$('#group-select').onchange=e=>{
  if(!guard()){
    $('#group-select').value = PORTAL;
    return;
  }
  nav();
  view=PORTAL==='management'?'management':ALLOWED[0];
  render();
};

window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
connect();
