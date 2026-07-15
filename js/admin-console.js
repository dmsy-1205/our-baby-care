(function(){
  'use strict';
  const state={users:[],rooms:[],requests:[],connected:false};
  const $=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=(v)=>{if(!v)return '-';const n=Number(v);if(!Number.isFinite(n))return String(v);return new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(n));};
  const entries=(obj)=>Object.entries(obj&&typeof obj==='object'?obj:{});

  async function verifyAdmin(user){
    if(!user)return false;
    const snap=await db.ref(`admins/${user.uid}`).once('value');
    return snap.val()===true;
  }

  function showGate(message){$('adminApp').hidden=true;$('adminGate').hidden=false;$('gateMessage').textContent=message;}
  function showApp(user){$('adminGate').hidden=true;$('adminApp').hidden=false;$('adminIdentity').textContent=user.email||user.uid;}

  async function loadData(){
    $('refreshAdminBtn').disabled=true;
    try{
      const [usersSnap,membersSnap,requestsSnap,connectedSnap]=await Promise.all([
        db.ref('users').once('value'),db.ref('roomMembers').once('value'),db.ref('dataDeleteRequests').once('value'),db.ref('.info/connected').once('value')
      ]);
      const usersRaw=usersSnap.val()||{};
      state.users=entries(usersRaw).map(([uid,data])=>({uid,...(data||{})}));
      const membersRaw=membersSnap.val()||{};
      state.rooms=entries(membersRaw).map(([roomCode,members])=>({roomCode,members:entries(members).map(([uid,data])=>({uid,...(data||{})}))}));
      state.requests=[];
      entries(requestsSnap.val()).forEach(([ownerUid,requests])=>entries(requests).forEach(([id,item])=>state.requests.push({ownerUid,id,...(item||{})})));
      state.requests.sort((a,b)=>(b.updatedAt||b.requestedAt||0)-(a.updatedAt||a.requestedAt||0));
      state.connected=connectedSnap.val()===true;
      renderAll();
      $('lastUpdated').textContent=`업데이트 ${fmt(Date.now())}`;
    }catch(error){console.error('[Admin Console] load failed',error);alert(`관리자 데이터 조회 실패: ${error.message}`);}
    finally{$('refreshAdminBtn').disabled=false;}
  }

  function renderAll(){
    const release=window.HM_RELEASE||{};
    $('metricUsers').textContent=state.users.length.toLocaleString();
    $('metricRooms').textContent=state.rooms.length.toLocaleString();
    $('metricRequests').textContent=state.requests.filter(r=>['pending','reviewing','hold','approved','scheduled','processing','failed'].includes(r.status)).length.toLocaleString();
    $('metricRelease').textContent=release.step||'-';$('metricStage').textContent=release.stage||'-';
    renderSystem();renderRequests();renderUsers();renderRooms();renderRecovery();renderRelease();
  }

  function renderSystem(){
    const release=window.HM_RELEASE||{};
    const rows=[['Realtime Database',state.connected?'연결됨':'연결 확인 필요',state.connected],['Authentication',babyAuth.currentUser?'관리자 로그인':'로그아웃',!!babyAuth.currentUser],['Hosting Build',release.build||'-',true],['운영 모드','읽기 전용',true]];
    const html=rows.map(([name,value,ok])=>`<div class="status-row"><span><i class="status-dot ${ok?'':'warn'}"></i>${esc(name)}</span><strong>${esc(value)}</strong></div>`).join('');
    $('systemStatusList').innerHTML=html;$('systemDetails').innerHTML=html;
  }

  function renderRequests(){
    const list=state.requests.slice(0,6);
    $('recentRequests').innerHTML=list.length?list.map(r=>`<div class="list-row"><span><strong>${esc(r.requestedByEmail||r.ownerUid)}</strong><br><small>${esc(r.requestType||'-')} · ${fmt(r.requestedAt)}</small></span><span class="badge ${r.status==='completed'?'ok':'warn'}">${esc(r.status||'pending')}</span></div>`).join(''):'<div class="empty">요청이 없습니다.</div>';
  }

  function userRoomCodes(uid){return state.rooms.filter(r=>r.members.some(m=>m.uid===uid)).map(r=>r.roomCode);}
  function renderUsers(){
    const q=($('userSearch').value||'').trim().toLowerCase();
    const rows=state.users.filter(u=>{const p=u.profile||{};return !q||[u.uid,u.email,p.nickname,...userRoomCodes(u.uid)].join(' ').toLowerCase().includes(q);});
    $('usersTableBody').innerHTML=rows.length?rows.map(u=>{const p=u.profile||{};const rooms=userRoomCodes(u.uid);return `<tr><td><strong>${esc(p.nickname||u.nickname||'-')}</strong><br><small>${esc(u.email||'-')}</small></td><td><span class="badge ${u.emailVerified===true||u.emailVerificationRequired!==true?'ok':'warn'}">${u.emailVerified===true?'인증':'확인 필요'}</span></td><td>${rooms.length?rooms.map(esc).join('<br>'):'-'}</td><td>${fmt(p.updatedAt||u.updatedAt||u.createdAt)}</td><td><code>${esc(u.uid)}</code></td></tr>`;}).join(''):'<tr><td colspan="5" class="empty">검색 결과가 없습니다.</td></tr>';
  }

  function renderRooms(){
    const q=($('roomSearch').value||'').trim().toLowerCase();
    const rows=state.rooms.filter(r=>!q||[r.roomCode,...r.members.flatMap(m=>[m.uid,m.email,m.relationshipRole,m.role])].join(' ').toLowerCase().includes(q));
    $('roomsTableBody').innerHTML=rows.length?rows.map(r=>{const dom=r.members.find(m=>m.relationshipRole==='dom'||m.role==='owner');const sub=r.members.find(m=>m.relationshipRole==='sub'||m.role==='partner');const latest=Math.max(0,...r.members.map(m=>Number(m.joinedAt)||0));return `<tr><td><strong>${esc(r.roomCode)}</strong></td><td>${esc(dom?.email||dom?.uid||'-')}</td><td>${esc(sub?.email||sub?.uid||'-')}</td><td>${r.members.length}</td><td>${fmt(latest)}</td></tr>`;}).join(''):'<tr><td colspan="5" class="empty">검색 결과가 없습니다.</td></tr>';
  }

  function renderRecovery(){
    $('recoveryList').innerHTML=state.requests.length?state.requests.map(r=>`<div class="list-row"><span><strong>${esc(r.requestedByEmail||r.ownerUid)}</strong><br><small>${esc(r.roomCode||'-')} · ${esc(r.requestType||'-')} · ${fmt(r.requestedAt)}</small></span><span class="badge ${r.status==='completed'?'ok':'warn'}">${esc(r.status||'pending')}</span></div>`).join(''):'<div class="empty">삭제 및 복구 요청이 없습니다.</div>';
  }

  function renderRelease(){
    const r=window.HM_RELEASE||{};
    $('releaseDetails').innerHTML=[['제품',r.product],['앱 버전',r.appVersion],['Step',r.step],['Build',r.build],['배포일',r.releaseDate],['단계',r.stage],['제목',r.title]].map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v||'-')}</dd>`).join('');
    $('releaseChanges').innerHTML=`<h3>변경 사항</h3><ul>${(r.changes||[]).map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`;
  }

  function selectView(name){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.querySelectorAll('.admin-view').forEach(v=>{const active=v.dataset.adminView===name;v.hidden=!active;v.classList.toggle('active',active);});const labels={dashboard:'운영 대시보드',users:'사용자 관리',rooms:'Room 관리',recovery:'복구 센터',releases:'릴리스 센터',system:'시스템 상태'};$('viewTitle').textContent=labels[name]||'Admin Console';}

  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
  $('refreshAdminBtn').addEventListener('click',loadData);$('userSearch').addEventListener('input',renderUsers);$('roomSearch').addEventListener('input',renderRooms);
  $('adminLogoutBtn').addEventListener('click',()=>babyAuth.signOut().then(()=>location.href='index.html'));

  babyAuth.onAuthStateChanged(async(user)=>{try{if(!user){showGate('로그인된 계정이 없습니다. 사용자 앱에서 관리자 계정으로 로그인해 주세요.');return;}if(!await verifyAdmin(user)){showGate('이 계정에는 관리자 권한이 없습니다.');return;}showApp(user);await loadData();}catch(error){console.error(error);showGate(`관리자 권한 확인 실패: ${error.message}`);}});
})();
