(function(){
  'use strict';
  const state={users:[],rooms:[],requests:[],connected:false};
  const $=(id)=>document.getElementById(id);
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=(v)=>{if(!v)return '-';const n=Number(v);if(!Number.isFinite(n))return String(v);return new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(n));};
  const entries=(obj)=>Object.entries(obj&&typeof obj==='object'?obj:{});

  const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} 응답 시간 초과 (${Math.round(ms/1000)}초)`)),ms))]);

  async function verifyAdmin(user){
    if(!user)return false;
    showGate('관리자 권한을 확인하고 있습니다.');
    console.info('[Admin Console] admin lookup start', user.uid);

    // 사용자 앱의 관리자 버튼 판정과 동일한 방식으로 조회한다.
    // 별도 페이지에서 getIdToken(true)를 강제하면 일부 브라우저에서
    // 인증 갱신 요청이 멈출 수 있으므로 강제 토큰 갱신은 사용하지 않는다.
    const snap=await withTimeout(
      db.ref(`admins/${user.uid}`).once('value'),
      8000,
      '관리자 권한 조회'
    );
    const value=snap.val();
    console.info('[Admin Console] admin lookup complete', value===true?'allowed':'not-allowed');

    return value===true || (value&&typeof value==='object'&&(
      value.active===true || value.enabled===true || value.role==='admin'
    ));
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
    }catch(error){
      console.error('[Admin Console] load failed',error);
      $('lastUpdated').textContent=`데이터 조회 실패: ${error.message}`;
      throw error;
    }finally{$('refreshAdminBtn').disabled=false;}
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

  let startedUid = '';

  async function startAdminConsole(user, source){
    console.info('[Admin Console] start', source, user ? user.uid : 'no-user');

    if(!user){
      showGate('로그인된 계정이 없습니다. 사용자 앱에서 관리자 계정으로 로그인해 주세요.');
      return;
    }

    if(startedUid === user.uid && !$('adminApp').hidden) return;
    startedUid = user.uid;

    // 관리자 페이지가 먼저 보이도록 한다.
    // 실제 데이터 접근 권한은 Firebase Rules가 최종 검증한다.
    showApp(user);
    $('lastUpdated').textContent = '관리자 데이터를 불러오는 중입니다.';

    try{
      await loadData();
      console.info('[Admin Console] dashboard ready');
    }catch(error){
      console.error('[Admin Console] dashboard start failed', error);
      $('lastUpdated').textContent = `데이터 조회 실패: ${error.message}`;
    }
  }

  babyAuth.onAuthStateChanged((user)=>startAdminConsole(user,'auth-state'));

  // 캐시된 로그인 세션이 있으면 Auth 콜백을 기다리지 않고 즉시 화면을 연다.
  if(babyAuth.currentUser){
    startAdminConsole(babyAuth.currentUser,'current-user');
  }

  // Firebase Auth 응답 자체가 없는 경우에만 안내한다.
  setTimeout(()=>{
    if(!$('adminGate').hidden && !babyAuth.currentUser){
      showGate('로그인 세션을 확인할 수 없습니다. 사용자 앱에서 다시 로그인한 뒤 운영 콘솔을 열어 주세요.');
    }
  },8000);
})();
