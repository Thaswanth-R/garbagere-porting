'use strict';
(() => {
  const STORE_KEY = 'cleancity_demo_v1';
  const SESSION_KEY = 'cleancity_session_v1';
  const $ = (id) => document.getElementById(id);
  const now = () => new Date().toISOString();
  const uid = (prefix = 'CC') => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (value) => { try { return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); } catch { return 'Unknown date'; } };
  const statusLabel = s => ({pending:'Pending',assigned:'Assigned',in_progress:'In progress',resolved:'Resolved',rejected:'Rejected'}[s] || 'Pending');
  const statusClass = s => `status-${String(s).replace('_','-')}`;
  const categories = ['Household waste','Street garbage','Overflowing public bin','Construction waste','Plastic waste','Other'];
  let db = null; let currentUser = null; let currentPage = 'overview'; let toastTimer = null;

  function seedData() {
    const stamp = now();
    return {
      users: [
        {id:'u-admin',name:'City Administrator',email:'admin@cleancity.demo',password:'Admin@123',role:'admin',createdAt:stamp},
        {id:'u-worker',name:'Demo Sanitation Worker',email:'worker@cleancity.demo',password:'Worker@123',role:'worker',createdAt:stamp},
        {id:'u-citizen',name:'Demo Citizen',email:'citizen@cleancity.demo',password:'Citizen@123',role:'citizen',createdAt:stamp}
      ],
      reports: [
        {id:'CC-DEMO-001',title:'Overflowing bin near central bus stop',description:'The public waste bin is full and garbage has spread onto the footpath.',category:'Overflowing public bin',address:'Central Bus Stand, Main Road',priority:'high',status:'assigned',citizenId:'u-citizen',workerId:'u-worker',createdAt:stamp,updatedAt:stamp,history:[{status:'pending',note:'Report submitted by citizen',at:stamp},{status:'assigned',note:'Assigned to sanitation team',at:stamp}]},
        {id:'CC-DEMO-002',title:'Plastic waste beside community park',description:'Plastic covers and bottles have been left near the park entrance.',category:'Plastic waste',address:'Community Park, East Street',priority:'medium',status:'pending',citizenId:'u-citizen',workerId:null,createdAt:stamp,updatedAt:stamp,history:[{status:'pending',note:'Report submitted by citizen',at:stamp}]}
      ]
    };
  }
  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) { db = seedData(); saveData(); return; }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.reports)) throw new Error('Saved browser data has an invalid format.');
      db = parsed;
    } catch (error) {
      console.error('Storage load error:', error);
      db = seedData();
      try { saveData(); } catch { showToast('Browser storage is unavailable. Changes may not persist.', true); }
    }
  }
  function saveData() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); return true; }
    catch (error) { console.error('Storage save error:', error); showToast('Could not save data. Browser storage may be full or disabled.', true); return false; }
  }
  function showToast(message, isError = false) {
    const el = $('toast'); el.textContent = message; el.className = `toast show${isError ? ' error' : ''}`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
  }
  function getUser(id) { return db.users.find(u => u.id === id) || null; }
  function canSeeReport(report) {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || (currentUser.role === 'citizen' && report.citizenId === currentUser.id) || (currentUser.role === 'worker' && report.workerId === currentUser.id);
  }
  function login(email, password) {
    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!user) { showToast('Email or password is incorrect.', true); return; }
    currentUser = user; sessionStorage.setItem(SESSION_KEY, user.id); $('auth-view').classList.add('hidden'); $('app-view').classList.remove('hidden'); renderApp(); showToast(`Welcome, ${user.name.split(' ')[0]}.`);
  }
  function logout() { currentUser = null; sessionStorage.removeItem(SESSION_KEY); $('app-view').classList.add('hidden'); $('auth-view').classList.remove('hidden'); $('login-password').value = ''; }
  function register(name,email,password) {
    if (name.trim().length < 2) return showToast('Enter a valid full name.', true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return showToast('Enter a valid email address.', true);
    if (password.length < 6) return showToast('Password must contain at least 6 characters.', true);
    if (db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) return showToast('An account with this email already exists.', true);
    const user = {id:uid('USER'),name:name.trim(),email:email.trim().toLowerCase(),password,role:'citizen',createdAt:now()};
    db.users.push(user); if (!saveData()) return; showToast('Citizen account created. You can now sign in.'); $('register-form').reset(); $('register-area').classList.add('hidden'); $('login-form').classList.remove('hidden'); $('auth-title').textContent='Sign in'; $('auth-subtitle').textContent='Access your reporting workspace.'; $('toggle-register').textContent='New here? Create a citizen account'; $('login-email').value=user.email;
  }
  function navItems() {
    const common = [{id:'overview',icon:'⌂',label:'Overview'},{id:'reports',icon:'▤',label:currentUser.role==='citizen'?'My reports':'All reports'}];
    if (currentUser.role === 'citizen') common.splice(1,0,{id:'new-report',icon:'＋',label:'Submit a report'});
    if (currentUser.role === 'admin') common.push({id:'workers',icon:'♙',label:'Workers'});
    if (currentUser.role === 'worker') common.push({id:'tasks',icon:'✓',label:'My tasks'});
    return common;
  }
  function renderApp() {
    if (!currentUser) return;
    $('user-name').textContent=currentUser.name; $('user-role').textContent=currentUser.role; $('user-avatar').textContent=currentUser.name.slice(0,1).toUpperCase();
    $('side-nav').innerHTML=navItems().map(n=>`<button class="nav-btn ${currentPage===n.id?'active':''}" data-page="${n.id}"><span class="nav-icon">${n.icon}</span>${n.label}</button>`).join('');
    $('side-nav').querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{currentPage=b.dataset.page;$('sidebar').classList.remove('open');renderApp();}));
    const titles={overview:'Overview','new-report':'Submit a report',reports:currentUser.role==='citizen'?'My reports':'All reports',workers:'Worker management',tasks:'My tasks'};
    $('page-title').textContent=titles[currentPage]||'Overview';
    const allowed=navItems().some(n=>n.id===currentPage); if(!allowed) currentPage='overview';
    const pages={overview:renderOverview,'new-report':renderNewReport,reports:renderReports,workers:renderWorkers,tasks:renderTasks};
    try { $('page-content').innerHTML=(pages[currentPage]||renderOverview)(); bindPageEvents(); }
    catch(error){console.error('Render error:',error);$('page-content').innerHTML='<div class="empty-state"><div class="empty-symbol">!</div><h3>Unable to display this page</h3><p>Please refresh the page. Your saved browser data has not been intentionally cleared.</p></div>';}
  }
  function visibleReports() { return db.reports.filter(canSeeReport).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
  function statCard(label,value,icon,foot){return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${foot}</small></article>`;}
  function renderOverview() {
    const reports=visibleReports(); const counts={total:reports.length,pending:reports.filter(r=>r.status==='pending').length,active:reports.filter(r=>['assigned','in_progress'].includes(r.status)).length,resolved:reports.filter(r=>r.status==='resolved').length};
    const heading=currentUser.role==='admin'?'Good day, Administrator':`Welcome back, ${escapeHtml(currentUser.name.split(' ')[0])}`;
    const intro=currentUser.role==='admin'?'Here is the current sanitation activity across your portal.':currentUser.role==='worker'?'Here is a snapshot of the work assigned to you.':'Track your reports and see how your community is improving.';
    const bars=categories.map(c=>({name:c,count:reports.filter(r=>r.category===c).length})); const max=Math.max(1,...bars.map(x=>x.count));
    const recent=reports.slice(0,5);
    return `<div class="page-heading"><div><p class="eyebrow green">YOUR WORKSPACE</p><h1>${heading}</h1><p>${intro}</p></div>${currentUser.role==='citizen'?'<button class="btn btn-primary" data-go="new-report">＋ New report</button>':''}</div>
      <div class="stats-grid">${statCard('Total reports',counts.total,'▤','Reports visible to your account')}${statCard('Pending',counts.pending,'◷','Waiting for action')}${statCard('In progress',counts.active,'↗','Assigned or being handled')}${statCard('Resolved',counts.resolved,'✓','Successfully completed')}</div>
      <div class="content-grid"><section class="panel"><div class="panel-heading"><div><h3>Reports by category</h3><p>Distribution of visible reports</p></div><span class="subtle-tag">${reports.length} total</span></div><div class="bar-list">${bars.map(b=>`<div class="bar-row"><span>${escapeHtml(b.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(b.count/max*100)}%"></div></div><b>${b.count}</b></div>`).join('')}</div></section>
      <section class="panel"><div class="panel-heading"><div><h3>Recent activity</h3><p>Latest report updates</p></div><button class="link-button" data-go="reports">View all</button></div><div class="activity-list">${recent.length?recent.map(r=>`<div class="activity-item"><span class="activity-dot"></span><div><strong>${escapeHtml(r.title)}</strong><small>${statusLabel(r.status)} · ${fmt(r.updatedAt||r.createdAt)}</small></div></div>`).join(''):'<div class="empty-mini">No activity yet. Submit a report to get started.</div>'}</div></section></div>`;
  }
  function renderNewReport() {
    return `<div class="panel form-panel"><div class="panel-heading"><div><p class="eyebrow green">CITIZEN SERVICES</p><h2>Report a garbage issue</h2><p class="muted">Share the location and details so the issue can be reviewed.</p></div><span class="subtle-tag">NEW REPORT</span></div>
    <form id="report-form" class="report-form"><div class="field"><label for="report-title">Report title *</label><input id="report-title" required minlength="5" maxlength="100" placeholder="e.g. Overflowing garbage bin near bus stop" /></div>
    <div class="field-grid"><div class="field"><label for="report-category">Waste category *</label><select id="report-category" required>${categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select></div><div class="field"><label for="report-priority">Priority *</label><select id="report-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div></div>
    <div class="field"><label for="report-address">Location / address *</label><input id="report-address" required minlength="5" maxlength="180" placeholder="Street, landmark, area, city" /></div>
    <div class="field"><label for="report-description">Description *</label><textarea id="report-description" required minlength="10" maxlength="1000" placeholder="Describe the issue, how long it has been there, and nearby landmarks..."></textarea></div>
    <div class="form-actions"><small>* Required fields. Do not include private or sensitive information.</small><button class="btn btn-primary" type="submit">Submit report →</button></div></form></div>`;
  }
  function reportCard(r, controls=false) {
    const worker=getUser(r.workerId); const citizen=getUser(r.citizenId);
    let actions='';
    if (controls && currentUser.role==='admin') {
      const workerOptions=db.users.filter(u=>u.role==='worker').map(w=>`<option value="${w.id}" ${r.workerId===w.id?'selected':''}>${escapeHtml(w.name)}</option>`).join('');
      actions=`<div class="report-bottom"><small>Citizen: ${escapeHtml(citizen?.name||'Unknown')} · Worker: ${escapeHtml(worker?.name||'Unassigned')}</small><div class="action-row"><select class="control-select" data-worker-for="${r.id}" aria-label="Assign worker"><option value="">Unassigned</option>${workerOptions}</select><select class="control-select" data-status-for="${r.id}" aria-label="Update status"><option value="pending" ${r.status==='pending'?'selected':''}>Pending</option><option value="assigned" ${r.status==='assigned'?'selected':''}>Assigned</option><option value="in_progress" ${r.status==='in_progress'?'selected':''}>In progress</option><option value="resolved" ${r.status==='resolved'?'selected':''}>Resolved</option><option value="rejected" ${r.status==='rejected'?'selected':''}>Rejected</option></select><button class="small-btn green" data-save-report="${r.id}">Save</button></div></div>`;
    } else if (controls && currentUser.role==='worker') {
      actions=`<div class="report-bottom"><small>Assigned task · ${escapeHtml(r.address)}</small><div class="action-row">${r.status==='assigned'?`<button class="small-btn" data-worker-status="in_progress" data-report="${r.id}">Start work</button>`:''}${r.status!=='resolved'&&r.status!=='rejected'?`<button class="small-btn green" data-worker-status="resolved" data-report="${r.id}">Mark resolved</button>`:''}</div></div>`;
    } else {
      actions=`<div class="report-bottom"><small>${currentUser.role==='admin'?`Citizen: ${escapeHtml(citizen?.name||'Unknown')}`:r.workerId?`Assigned to: ${escapeHtml(worker?.name||'Sanitation worker')}`:'Awaiting assignment'}</small><small>Updated ${fmt(r.updatedAt||r.createdAt)}</small></div>`;
    }
    return `<article class="report-card"><div class="report-head"><div><h3>${escapeHtml(r.title)}</h3><div class="report-meta">${escapeHtml(r.id)} · ${escapeHtml(r.category)} · ${fmt(r.createdAt)}</div></div><span class="status ${statusClass(r.status)}">${statusLabel(r.status)}</span></div><p class="report-desc">${escapeHtml(r.description)}</p><div class="report-info"><span>⌖ ${escapeHtml(r.address)}</span><span>Priority: <b class="priority-${r.priority}">${r.priority.toUpperCase()}</b></span></div>${actions}</article>`;
  }
  function renderReports() {
    const reports=visibleReports();
    return `<div class="page-heading"><div><p class="eyebrow green">REPORT MANAGEMENT</p><h1>${currentUser.role==='citizen'?'Your reports':'All reports'}</h1><p>Search and review garbage reports and their current status.</p></div></div><div class="toolbar"><input id="report-search" class="search-input" placeholder="Search title, location, category or reference..." /><select id="status-filter" class="filter-select"><option value="all">All statuses</option><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select></div><div id="report-results" class="report-list">${reports.length?reports.map(r=>reportCard(r,currentUser.role==='admin')).join(''):'<div class="empty-state"><div class="empty-symbol">▤</div><h3>No reports yet</h3><p>Submitted reports will appear here.</p></div>'}</div>`;
  }
  function renderWorkers() {
    const workers=db.users.filter(u=>u.role==='worker');
    return `<div class="page-heading"><div><p class="eyebrow green">OPERATIONS</p><h1>Worker management</h1><p>Register demo worker accounts and monitor assigned workload.</p></div></div><div class="panel form-panel" style="margin:0 0 16px;max-width:none"><div class="panel-heading"><div><h3>Add a sanitation worker</h3><p>Create a local demo account for task assignment.</p></div><span class="subtle-tag">${workers.length} workers</span></div><form id="worker-form" class="field-grid"><div class="field"><label for="worker-name">Full name</label><input id="worker-name" required minlength="2" maxlength="70" placeholder="Worker full name" /></div><div class="field"><label for="worker-email">Email</label><input id="worker-email" type="email" required placeholder="worker@example.com" /></div><div class="field"><label for="worker-password">Temporary password</label><input id="worker-password" type="password" required minlength="6" placeholder="At least 6 characters" /></div><div class="field" style="align-self:end"><button class="btn btn-primary" type="submit">＋ Add worker</button></div></form></div><div class="worker-grid">${workers.map(w=>{const assigned=db.reports.filter(r=>r.workerId===w.id&&r.status!=='resolved').length;return `<div class="worker-card"><div class="avatar">${escapeHtml(w.name.slice(0,1).toUpperCase())}</div><div><strong>${escapeHtml(w.name)}</strong><small>${escapeHtml(w.email)}</small></div><span class="worker-count">${assigned} active</span></div>`}).join('')||'<div class="empty-state"><h3>No workers yet</h3><p>Add a worker account to assign reports.</p></div>'}</div>`;
  }
  function renderTasks() {
    const reports=visibleReports();
    return `<div class="page-heading"><div><p class="eyebrow green">FIELD OPERATIONS</p><h1>My assigned tasks</h1><p>Update each task when work starts or is completed.</p></div></div><div class="report-list">${reports.length?reports.map(r=>reportCard(r,true)).join(''):'<div class="empty-state"><div class="empty-symbol">✓</div><h3>No tasks assigned</h3><p>New assignments from the administrator will appear here.</p></div>'}</div>`;
  }
  function updateReport(reportId, changes, note) {
    const r=db.reports.find(x=>x.id===reportId); if(!r) return showToast('Report could not be found.',true);
    if(currentUser.role!=='admin' && !(currentUser.role==='worker' && r.workerId===currentUser.id)) return showToast('You are not allowed to update this report.',true);
    if(changes.status && !['pending','assigned','in_progress','resolved','rejected'].includes(changes.status)) return showToast('Invalid report status.',true);
    if(changes.workerId && !db.users.some(u=>u.id===changes.workerId&&u.role==='worker')) return showToast('Selected worker does not exist.',true);
    if(currentUser.role==='worker' && changes.status==='pending') return showToast('Workers cannot return a task to pending.',true);
    Object.assign(r,changes,{updatedAt:now()}); r.history=Array.isArray(r.history)?r.history:[]; r.history.push({status:r.status,note:note||`Status changed to ${statusLabel(r.status)}`,at:now(),by:currentUser.id});
    if(!saveData()) return; showToast('Report updated successfully.'); renderApp();
  }
  function bindPageEvents() {
    document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{currentPage=b.dataset.go;renderApp();}));
    const reportForm=$('report-form'); if(reportForm) reportForm.addEventListener('submit',e=>{e.preventDefault();const title=$('report-title').value.trim(),address=$('report-address').value.trim(),description=$('report-description').value.trim();if(title.length<5||address.length<5||description.length<10)return showToast('Please provide a little more detail in all required fields.',true);const stamp=now();db.reports.push({id:uid(),title,category:$('report-category').value,priority:$('report-priority').value,address,description,status:'pending',citizenId:currentUser.id,workerId:null,createdAt:stamp,updatedAt:stamp,history:[{status:'pending',note:'Report submitted by citizen',at:stamp,by:currentUser.id}]});if(saveData()){showToast('Your report has been submitted.');currentPage='reports';renderApp();}});
    const workerForm=$('worker-form'); if(workerForm) workerForm.addEventListener('submit',e=>{e.preventDefault();if(currentUser.role!=='admin')return showToast('Administrator access required.',true);const name=$('worker-name').value.trim(),email=$('worker-email').value.trim().toLowerCase(),password=$('worker-password').value;if(name.length<2||password.length<6)return showToast('Check the worker details and password length.',true);if(db.users.some(u=>u.email===email))return showToast('That email is already registered.',true);db.users.push({id:uid('WORKER'),name,email,password,role:'worker',createdAt:now()});if(saveData()){showToast('Worker account created.');renderApp();}});
    const search=$('report-search'),filter=$('status-filter'); if(search&&filter){const apply=()=>{const q=search.value.trim().toLowerCase(),s=filter.value;const rows=visibleReports().filter(r=>(s==='all'||r.status===s)&&[r.id,r.title,r.address,r.category,r.description].some(v=>String(v).toLowerCase().includes(q)));$('report-results').innerHTML=rows.length?rows.map(r=>reportCard(r,currentUser.role==='admin')).join(''):'<div class="empty-state"><h3>No matching reports</h3><p>Try changing your search or status filter.</p></div>';bindReportControls();};search.addEventListener('input',apply);filter.addEventListener('change',apply);}
    bindReportControls();
  }
  function bindReportControls() {
    document.querySelectorAll('[data-save-report]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.saveReport,workerId=document.querySelector(`[data-worker-for="${id}"]`)?.value||null,status=document.querySelector(`[data-status-for="${id}"]`)?.value||'pending';if(status==='assigned'&&!workerId)return showToast('Assign a worker before setting the report to Assigned.',true);if(workerId&&status==='pending')return showToast('Choose Assigned or another suitable status for an assigned worker.',true);updateReport(id,{workerId,status},'Administrator updated assignment or status');}));
    document.querySelectorAll('[data-worker-status]').forEach(b=>b.addEventListener('click',()=>updateReport(b.dataset.report,{status:b.dataset.workerStatus},'Worker updated task status')));
  }
  function exportData() {
    if(currentUser.role!=='admin')return showToast('Only the administrator can export the full demo dataset.',true);
    try { const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`cleancity-demo-export-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast('Demo data exported.'); } catch(error){console.error(error);showToast('Could not export data.',true);}
  }
  function resetDemo() {
    if(!window.confirm('Reset all CleanCity demo data in this browser? This will remove registered users and reports and restore the sample data.'))return;
    db=seedData();if(saveData()){currentUser=getUser('u-admin');sessionStorage.setItem(SESSION_KEY,currentUser.id);currentPage='overview';renderApp();showToast('Demo data has been reset.');}
  }
  $('login-form').addEventListener('submit',e=>{e.preventDefault();login($('login-email').value,$('login-password').value);});
  $('toggle-register').addEventListener('click',()=>{const open=$('register-area').classList.toggle('hidden');$('login-form').classList.toggle('hidden',open);$('auth-title').textContent=open?'Create an account':'Sign in';$('auth-subtitle').textContent=open?'Register to submit and track local waste reports.':'Access your reporting workspace.';$('toggle-register').textContent=open?'Already registered? Sign in':'New here? Create a citizen account';});
  $('register-form').addEventListener('submit',e=>{e.preventDefault();register($('register-name').value,$('register-email').value,$('register-password').value);});
  $('logout-btn').addEventListener('click',logout);$('reset-demo').addEventListener('click',resetDemo);$('export-data').addEventListener('click',exportData);$('menu-toggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  window.addEventListener('storage',e=>{if(e.key===STORE_KEY){loadData();if(currentUser){currentUser=getUser(currentUser.id);if(currentUser)renderApp();else logout();}}});
  window.addEventListener('error',e=>{console.error('Unhandled application error:',e.error||e.message);showToast('An unexpected error occurred. Please try again.',true);});
  window.addEventListener('unhandledrejection',e=>{console.error('Unhandled promise rejection:',e.reason);showToast('An unexpected operation failed. Please refresh and try again.',true);});
  loadData();
  try { const id=sessionStorage.getItem(SESSION_KEY); if(id){currentUser=getUser(id);if(currentUser){$('auth-view').classList.add('hidden');$('app-view').classList.remove('hidden');renderApp();}else sessionStorage.removeItem(SESSION_KEY);} } catch(error){console.warn('Session storage unavailable:',error);}
})();
