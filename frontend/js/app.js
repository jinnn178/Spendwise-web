import { clearToken, getCurrentUser, getToken, loadWorkspace, saveWorkspace, signOut } from './api.js';
import { categoryChart } from './charts.js';
import { createTransaction, renderTransactionRows, renderTransactionsPage, transactionFormMarkup } from './transactions.js';
let activeUser = null;
const VIEWS = ['dashboard','accounts','transactions','reports','settings'];
const LABELS = {dashboard:'Dashboard',accounts:'Accounts',transactions:'Transactions',reports:'Reports',settings:'Settings'};
const today = new Date();
const isoDay = (offset=0) => { const x=new Date(today); x.setDate(x.getDate()+offset); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const currentMonth = isoDay().slice(0,7);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n)||0);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = s => { const [y,m,d]=String(s).split('-').map(Number); return y&&m&&d ? new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : String(s); };

function seed(){
  return {accounts:[],transactions:[]};
}
let data=seed(), view='accounts', reportAccount='all', toastTimer;
let saveQueue=Promise.resolve();

function save(){
  const snapshot=JSON.parse(JSON.stringify(data));
  saveQueue=saveQueue.then(()=>saveWorkspace(snapshot)).catch(()=>toast('Could not save. Check your connection.'));
  return saveQueue;
}

const account=id=>data.accounts.find(a=>a.id===id);
const signedMoney=t=>t.type==='in'?Number(t.amount||0):-Number(t.amount||0);
const transactionImpact=id=>(data.transactions||[]).filter(t=>t.accountId===id).reduce((sum,t)=>sum+signedMoney(t),0);
const balance=id=>(Number(account(id)?.opening)||0)+transactionImpact(id);
const totalBalance=()=>data.accounts.reduce((n,a)=>n+balance(a.id),0);
const monthKey=date=>String(date||'').slice(0,7);
const monthly=(month=currentMonth,accountId='all')=>(data.transactions||[]).filter(t=>monthKey(t.date)===month&&(accountId==='all'||t.accountId===accountId));
const moneyIn=(month=currentMonth,accountId='all')=>monthly(month,accountId).filter(t=>t.type==='in').reduce((sum,t)=>sum+Number(t.amount||0),0);
const moneyOut=(month=currentMonth,accountId='all')=>monthly(month,accountId).filter(t=>t.type==='out').reduce((sum,t)=>sum+Number(t.amount||0),0);

function toast(message){ const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2600); }
const head=(title,subtitle,action='')=>`<div class="page-head"><div><div class="eyebrow">YOUR MONEY, CLEARLY</div><h1>${title}</h1><p>${subtitle}</p></div><div class="page-head-actions">${action}</div></div>`;
const stat=(label,value,foot,icon,cls='')=>`<article class="stat-card"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value ${cls}">${value}</div><div class="stat-foot">${foot}</div></article>`;

const empty=(title,sub,iconClass='ph-leaf')=>`<div class="empty-state" style="padding: 60px 15px;"><div style="font-size: 48px; color: var(--muted); margin-bottom: 12px; opacity:0.5;"><i class="ph ${iconClass}"></i></div><strong style="font-size: 16px; color: var(--ink); margin-bottom: 8px;">${title}</strong><p style="color: var(--muted); margin: 0; font-size: 13px;">${sub}</p></div>`;


function moneyHistoryRows(accountId=reportAccount){
  return renderTransactionRows({transactions:data.transactions,accountId,accountName:id=>account(id)?.name||'Account',money,escapeHtml:esc,formatDate:fmtDate,emptyState:empty});
}

function transactions(){
  return renderTransactionsPage({transactions:data.transactions,accountName:id=>account(id)?.name||'Account',money,escapeHtml:esc,formatDate:fmtDate,emptyState:empty,pageHeader:head});
}

function monthsBack(count){return Array.from({length:count},(_,i)=>{const d=new Date(today.getFullYear(),today.getMonth()-(count-i-1),1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});}
function moneyBarChart(accountId=reportAccount){const months=monthsBack(6),values=months.flatMap(m=>[moneyIn(m,accountId),moneyOut(m,accountId)]),max=Math.max(...values,1);return `<div class="money-chart"><div class="chart-legend"><span><i class="legend-in"></i>Money In</span><span><i class="legend-out"></i>Money Out</span></div><div class="money-bars">${months.map(m=>`<div class="money-bar-group"><div class="money-bar-pair"><div class="money-bar bar-in" style="height:${Math.max(3,moneyIn(m,accountId)/max*180)}px" title="Money In: ${money(moneyIn(m,accountId))}"></div><div class="money-bar bar-out" style="height:${Math.max(3,moneyOut(m,accountId)/max*180)}px" title="Money Out: ${money(moneyOut(m,accountId))}"></div></div><span>${new Date(Number(m.slice(0,4)),Number(m.slice(5))-1,1).toLocaleDateString('en-US',{month:'short'})}</span></div>`).join('')}</div></div>`;}

function recentMoneyRows(){
  const recent=[...(data.transactions||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
  return recent.length?recent.map(t=>`<tr><td><strong>${esc(t.note||t.category||'Entry')}</strong><small>${esc(account(t.accountId)?.name||'Account')}</small></td><td>${fmtDate(t.date)}</td><td><span class="badge ${t.type==='out'?'warn':''}">${t.type==='in'?'Money In':'Money Out'}</span></td><td class="cash-amount ${t.type==='in'?'money-in':'money-out'}">${t.type==='in'?'+':'−'} ${money(t.amount)}</td></tr>`).join(''):`<tr><td colspan="4">${empty('No money entries yet','Open Transactions to add your first entry.','ph-clock-counter-clockwise')}</td></tr>`;
}

function dashboard(){
  const incoming=moneyIn(),outgoing=moneyOut(),net=incoming-outgoing;
  return head('Dashboard','A clear summary of your accounts and transactions.')
    +`<div class="stats-grid dashboard-stats">${stat('Total balance',money(totalBalance()),`${data.accounts.length} accounts`,'<i class="ph-fill ph-wallet"></i>','positive')}${stat('Money In',money(incoming),'This month','<i class="ph-fill ph-arrow-circle-down"></i>','positive')}${stat('Money Out',money(outgoing),'This month','<i class="ph-fill ph-arrow-circle-up"></i>','negative')}${stat('Net cash flow',money(net),'Income minus spending','<i class="ph-fill ph-scales"></i>',net>=0?'positive':'negative')}</div>`
    +`<div class="panel-grid dashboard-panels"><section class="card"><div class="card-title"><div><h2>Six month cash flow</h2><p>Money In compared with Money Out</p></div></div>${moneyBarChart('all')}</section><section class="card"><div class="card-title"><div><h2>Spending by category</h2><p>${currentMonth}</p></div></div>${categoryChart(data.transactions||[],currentMonth,money,esc)}</section></div>`
    +`<section class="card cashflow-card"><div class="card-title"><div><h2>Five latest entries</h2><p>Your most recent money activity</p></div><a class="text-link" href="#reports">View reports</a></div><div class="cashflow-table-wrap"><table class="cashflow-table"><thead><tr><th>Description</th><th>Date</th><th>Type</th><th>Amount</th></tr></thead><tbody>${recentMoneyRows()}</tbody></table></div></section>`;
}
function reports(){
  if(reportAccount!=='all'&&!account(reportAccount))reportAccount='all';
  const selectedAccounts=reportAccount==='all'?data.accounts:data.accounts.filter(a=>a.id===reportAccount);
  const selectedLabel=reportAccount==='all'?'All accounts':account(reportAccount)?.name||'Account';
  const incoming=moneyIn(currentMonth,reportAccount),outgoing=moneyOut(currentMonth,reportAccount),net=incoming-outgoing;
  const selectedBalance=reportAccount==='all'?totalBalance():balance(reportAccount);
  const accountSelect=`<span class="report-account-select"><select id="report-account" aria-label="Report account"><option value="all">All accounts</option>${data.accounts.map(a=>`<option value="${esc(a.id)}" ${reportAccount===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select><i class="ph ph-caret-down" aria-hidden="true"></i></span>`;
  return head('Reports',`Review cash flow and money history for ${selectedLabel}.`,accountSelect)
    +`<div class="stats-grid report-grid">${stat('Money In',money(incoming),'This month','<i class="ph-fill ph-arrow-circle-down"></i>','positive')}${stat('Money Out',money(outgoing),'This month','<i class="ph-fill ph-arrow-circle-up"></i>','negative')}${stat('Net cash flow',money(net),'Money In minus Money Out','<i class="ph-fill ph-scales"></i>',net>=0?'positive':'negative')}${stat('Balance',money(selectedBalance),selectedLabel,'<i class="ph-fill ph-wallet"></i>','positive')}</div>`
    +`<div class="panel-grid report-panels"><section class="card"><div class="card-title"><div><h2>Money flow chart</h2><p>${esc(selectedLabel)} · last six months</p></div></div>${moneyBarChart(reportAccount)}</section><section class="card"><div class="card-title"><div><h2>Account balances</h2><p>Opening balance plus Money In minus Money Out</p></div></div>${selectedAccounts.length?selectedAccounts.map(a=>`<div class="line-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.type)}</small></div><strong>${money(balance(a.id))}</strong></div>`).join(''):empty('No accounts yet','Add an account to include it in this report.','ph-bank')}</section></div>`
    +`<section class="card cashflow-card"><div class="card-title"><div><h2>Money history</h2><p>${esc(selectedLabel)} · Money In and Money Out entries</p></div></div><div class="cashflow-table-wrap"><table class="cashflow-table"><thead><tr><th>Description</th><th>Date</th><th>Type</th><th>Amount</th></tr></thead><tbody>${moneyHistoryRows(reportAccount)}</tbody></table></div></section>`;
}
function accounts(){return head('Accounts','All your money sources and balances together.',`<button class="primary-button" data-action="new-account">＋ Add account</button>`)+`<div class="account-grid">${data.accounts.map(a=>`<article class="card account-card"><div class="account-mark"><i class="ph ph-bank"></i></div><h3>${esc(a.name)}</h3><small>${esc(a.type)}</small><div class="balance">${money(balance(a.id))}</div></article>`).join('')}</div>`;}

function settings(){return head('Settings','Manage your account and workspace.')+`<section class="card" style="max-width:720px"><div class="card-title"><div><h2>Profile & privacy</h2><p>Current account</p></div></div><div class="line-row"><div><strong>${esc(activeUser?.name||'User')}</strong><small>${esc(activeUser?.email||'')}</small></div><button class="mini-action" data-action="logout">Sign out</button></div><div class="line-row"><div><strong>Currency</strong><small>Vietnamese đồng (VND)</small></div></div><div class="line-row"><div><strong>Storage</strong><small>Account and workspace data are stored in your connected database.</small></div></div><div class="line-row"><div><strong>Clear workspace</strong><small>Remove your accounts and money entries.</small></div><button class="mini-action" data-action="reset-data">Clear</button></div></section>`;}

const renderers={dashboard,accounts,transactions,reports,settings};

function onboardingView(){return head('Set up your first account','Enter the balance you actually have to start tracking your money.',`<button class="primary-button" data-action="new-account">＋ Add your first account</button>`)+`<div class="stats-grid" style="margin-bottom:18px">${stat('Total balance',money(0),'No money sources yet','<i class="ph-fill ph-wallet"></i>')}</div><section class="card" style="max-width:650px"><div class="card-title"><div><h2>Your workspace starts empty</h2><p>Nothing has been added to your balance.</p></div></div><p>Create a bank, wallet, cash, or savings account and enter its current balance in VND.</p><button class="primary-button" data-action="new-account" style="margin-top:10px">Add account and balance →</button></section>`;}

function render(){view=VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):'dashboard';document.getElementById('current-section').textContent=LABELS[view];document.querySelectorAll('#main-nav a').forEach(a=>{a.classList.toggle('active',a.dataset.view===view);a.setAttribute('aria-current',a.dataset.view===view?'page':'false')});document.getElementById('view').innerHTML=!data.accounts.length&&view==='accounts'?onboardingView():renderers[view]();document.getElementById('sidebar').classList.remove('open');}

function field(label,name,type='text',value='',extra=''){return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;}
function selectField(label,name,options,value=''){return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}">${options.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;}
function openDialog(kind,type='out'){
  const dlg=document.getElementById('form-dialog'),form=document.getElementById('dialog-form'),fields=document.getElementById('dialog-fields');
  form.dataset.kind=kind;form.dataset.type=type;document.getElementById('form-error').textContent='';
  if(kind==='account'){
    document.getElementById('dialog-title').textContent='Add account';
    document.getElementById('dialog-eyebrow').textContent='NEW ACCOUNT';
    fields.innerHTML=field('Account name','name','text','','required maxlength="50"')+selectField('Type','type',[['Bank account','Bank account'],['E-wallet','E-wallet'],['Cash','Cash'],['Savings','Savings']],'Bank account')+field('Opening balance (VND)','opening','number',0,'step="1" required');
  }else{
    document.getElementById('dialog-title').textContent=type==='in'?'Add Money In':'Add Money Out';
    document.getElementById('dialog-eyebrow').textContent='NEW TRANSACTION';
    fields.innerHTML=transactionFormMarkup({type,accounts:data.accounts,field,selectField,today:isoDay()});
  }
  dlg.showModal();fields.querySelector('input,select')?.focus();
}

function closeDialog(){document.getElementById('form-dialog').close();}

function submitForm(event){
  event.preventDefault();
  const form=event.currentTarget,formData=new FormData(form),value=name=>String(formData.get(name)||'').trim(),number=name=>Number(formData.get(name));
  const showError=message=>{document.getElementById('form-error').textContent=message;};
  if(form.dataset.kind==='account'){
    if(!value('name')||!Number.isFinite(number('opening')))return showError('Enter an account name and a valid balance.');
    data.accounts.push({id:uid(),name:value('name'),type:value('type'),opening:number('opening')});
  }else{
    const result=createTransaction(formData,form.dataset.type,uid);
    if(result.error)return showError(result.error);
    data.transactions.push(result.transaction);
  }
  save();closeDialog();render();toast('Saved successfully');
}

function handleAction(action){if(action==='new-account')return openDialog('account');if(action==='new-transaction-in'||action==='new-transaction-out'){if(!data.accounts.length){location.hash='#accounts';return toast('Add an account first.');}return openDialog('transaction',action.endsWith('-in')?'in':'out');}
  if(action==='logout'){signOut().finally(()=>location.replace('/welcome.html'));return;}
  if(action==='reset-data'){if(!confirm('Clear all accounts and money entries in this workspace?'))return;data=seed();save();location.hash='#accounts';render();toast('Workspace cleared');return;}
  save();render();toast('Updated successfully');}

document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handleAction(b.dataset.action,b.dataset.id);});
document.getElementById('menu-button').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('close-dialog').addEventListener('click',closeDialog);
document.getElementById('cancel-dialog').addEventListener('click',closeDialog);
document.getElementById('dialog-form').addEventListener('submit',submitForm);document.getElementById('view').addEventListener('change',e=>{if(e.target.id==='report-account'){reportAccount=e.target.value;render();}});window.addEventListener('hashchange',render);

const themeBtn = document.getElementById('theme-toggle');
const updateThemeIcon = () => {
    const theme = document.documentElement.getAttribute('data-theme');
    if(themeBtn) themeBtn.innerHTML = theme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
};
updateThemeIcon();
if(themeBtn){
    themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('spendwise-theme', next);
        updateThemeIcon();
    });
}

function normalizeWorkspace(stored){
  if(!stored||!Array.isArray(stored.accounts)||!Array.isArray(stored.transactions))return seed();
  return {
    accounts:stored.accounts,
    transactions:stored.transactions.map(item=>{
      if(item.type==='income')return {...item,type:'in'};
      if(item.type==='expense')return {...item,type:'out'};
      return item;
    }).filter(item=>item.type==='in'||item.type==='out')
  };
}

async function refreshWorkspace(){
  if(!activeUser||document.hidden||document.getElementById('form-dialog').open)return;
  try{
    const fresh=normalizeWorkspace((await loadWorkspace()).state);
    if(JSON.stringify(fresh)!==JSON.stringify(data)){
      data=fresh;
      render();
      toast('Workspace updated');
    }
  }catch{
    // The next automatic refresh will retry if the connection was interrupted.
  }
}

async function initialize(){
  const token=getToken();
  if(!token){location.replace('/welcome.html');return;}
  try{
    activeUser=(await getCurrentUser()).user;
    document.querySelector('.sidebar-bottom strong').textContent=activeUser.name;
    document.querySelector('.sidebar-bottom small').textContent=activeUser.email;
    document.querySelector('.avatar').textContent=activeUser.name.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    const stored=(await loadWorkspace()).state;
    data=normalizeWorkspace(stored);
    if(JSON.stringify(data)!==JSON.stringify(stored))await save();
    if(!location.hash)location.hash=data.accounts.length?'#dashboard':'#accounts';
    render();
  }catch(error){clearToken();location.replace('/welcome.html');}
}
initialize();
window.setInterval(refreshWorkspace,3000);
window.addEventListener('focus',refreshWorkspace);
