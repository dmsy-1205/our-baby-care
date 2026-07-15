// =========================================================
// HearMe2nite v1.0 STEP5.10.4
// sub-routine.js - 기록(Sub) 자기주도 루틴 1단계
// 정의: rooms/{roomCode}/subRoutines/{routineId}
// 완료: rooms/{roomCode}/subRoutineDays/{date}/{routineId}
// =========================================================
const HM_SUB_ROUTINE_MAX = 7;
let hmSubRoutineRoomCode = '';
let hmSubRoutinesRef = null;
let hmSubRoutineDayRef = null;
let hmSubRoutines = {};
let hmSubRoutineChecks = {};
let hmSubRoutineEditingId = '';

function hmCanManageSubRoutine() {
    return !!currentUser && activeRelationshipRole === 'sub';
}
function hmSubRoutineDate() {
    const value = document.getElementById('recordDate')?.value || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0,10);
}
function hmSubRoutineRows() {
    return Object.entries(hmSubRoutines || {}).map(([id,v])=>({id,...(v||{})}))
      .filter(v=>v.deleted!==true).sort((a,b)=>Number(a.order||0)-Number(b.order||0)||Number(a.createdAt||0)-Number(b.createdAt||0));
}
function hmSubRoutineEscape(v){ return typeof escapeHtml==='function'?escapeHtml(String(v||'')):String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function hmSubRoutineId(){ return `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }
function hmOpenSubRoutineOverlay(id) {
    if (typeof openModalOverlayById === 'function') {
        openModalOverlayById(id);
        return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    el.removeAttribute('inert');
    el.style.display = 'flex';
    el.setAttribute('aria-hidden', 'false');
}
function hmCloseSubRoutineOverlay(id) {
    if (typeof closeModalOverlayById === 'function') {
        closeModalOverlayById(id);
        return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
}

function hmStartSubRoutines(roomCode){
    hmStopSubRoutines();
    hmSubRoutineRoomCode = roomCode || '';
    if(!roomCode || !currentUser){ renderSubRoutine(); return; }
    hmSubRoutinesRef=db.ref(`rooms/${roomCode}/subRoutines`);
    hmSubRoutinesRef.on('value',snap=>{hmSubRoutines=snap.val()||{};renderSubRoutine();},err=>hmReportError('hmStartSubRoutines',err,'❌ 나의 루틴 불러오기 실패'));
    hmListenSubRoutineDay();
}
function hmStopSubRoutines(){
    if(hmSubRoutinesRef)hmSubRoutinesRef.off(); if(hmSubRoutineDayRef)hmSubRoutineDayRef.off();
    hmSubRoutinesRef=null;hmSubRoutineDayRef=null;hmSubRoutines={};hmSubRoutineChecks={};hmSubRoutineRoomCode='';renderSubRoutine();
}
function hmListenSubRoutineDay(){
    if(hmSubRoutineDayRef)hmSubRoutineDayRef.off(); hmSubRoutineDayRef=null; hmSubRoutineChecks={};
    if(!hmSubRoutineRoomCode)return renderSubRoutine();
    hmSubRoutineDayRef=db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutineDays/${hmSubRoutineDate()}`);
    hmSubRoutineDayRef.on('value',snap=>{hmSubRoutineChecks=snap.val()||{};renderSubRoutine();},err=>hmReportError('hmListenSubRoutineDay',err,'❌ 나의 루틴 완료 상태 불러오기 실패'));
}
function renderSubRoutine(){
    const rows=hmSubRoutineRows();
    const done=rows.filter(r=>hmSubRoutineChecks?.[r.id]?.done===true).length;
    const sub=document.getElementById('subRoutineHubSub');
    const count=document.getElementById('subRoutineCountText');
    const homeList=document.getElementById('subRoutineHomeList');
    const managerList=document.getElementById('subRoutineManagerList');
    const toolbar=document.getElementById('subRoutineToolbar');
    const manageBtn=document.getElementById('subRoutineManageBtn');

    if(count) count.textContent=hmCanManageSubRoutine()
        ? `${rows.length}개 · ${done}/${rows.length} 완료 · 기록(Sub)가 관리`
        : `${rows.length}개 · ${done}/${rows.length} 완료 · Dom은 확인만`;
    if(sub) sub.textContent=!hmSubRoutineRoomCode
        ? '공간을 연결하면 나의 루틴을 사용할 수 있어요.'
        : !rows.length
            ? (hmCanManageSubRoutine()?'나만의 하루 루틴을 만들어보세요.':'Sub가 루틴을 만들면 여기에 표시됩니다.')
            : `${rows.length}개 루틴 · ${done}/${rows.length} 완료`;

    const add=document.getElementById('subRoutineAddBtn');
    if(add) add.hidden=!hmCanManageSubRoutine();
    if(toolbar) toolbar.hidden=!hmCanManageSubRoutine();
    if(manageBtn) manageBtn.hidden=!hmCanManageSubRoutine();
    const note=document.getElementById('subRoutineRoleNote');
    if(note) note.textContent=hmCanManageSubRoutine()
        ? '여기서는 루틴을 만들고 수정합니다. 실제 완료 체크는 홈 화면의 루틴 카드에서 진행합니다.'
        : '기록(Sub)가 직접 관리하는 루틴입니다. Dom은 홈 화면에서 완료 상태만 확인할 수 있습니다.';

    if(homeList){
        if(!rows.length){
            homeList.innerHTML=`<div class="sub-routine-home-empty">${hmCanManageSubRoutine()?'아직 만든 루틴이 없습니다. 관리 화면에서 첫 루틴을 만들어보세요.':'아직 등록된 나의 루틴이 없습니다.'}</div>`;
        } else {
            homeList.innerHTML=rows.map(r=>{
                const checked=hmSubRoutineChecks?.[r.id]?.done===true;
                const action=hmCanManageSubRoutine()?`onclick="toggleSubRoutine('${hmSubRoutineEscape(r.id)}')"`:'onclick="showSaveStatus(\'🌱 Sub가 직접 관리하는 루틴입니다.\')"';
                return `<button type="button" class="sub-routine-home-card ${checked?'is-done':''}" ${action}>
                    <span class="sub-routine-home-icon">🌱</span>
                    <span class="sub-routine-home-text"><strong>${hmSubRoutineEscape(r.title||'나의 루틴')}</strong><small>${hmSubRoutineEscape(r.description||'내가 정한 하루 루틴')} · ${checked?'완료':'미완료'}</small></span>
                    <span class="sub-routine-home-check">${checked?'✓':'○'}</span>
                </button>`;
            }).join('');
        }
    }

    if(!managerList)return;
    if(!rows.length){
        managerList.innerHTML=`<div class="sub-routine-empty">${hmCanManageSubRoutine()?'아직 만든 루틴이 없습니다.<br>아래 버튼으로 첫 루틴을 만들어보세요.':'아직 등록된 나의 루틴이 없습니다.'}</div>`;
        return;
    }
    managerList.innerHTML=rows.map(r=>{
        const checked=hmSubRoutineChecks?.[r.id]?.done===true;
        return `<article class="sub-routine-row ${checked?'is-done':''}">
            <span class="sub-routine-check is-status" aria-label="${checked?'완료':'미완료'}">${checked?'✓':'○'}</span>
            <div class="sub-routine-row-text"><strong>${hmSubRoutineEscape(r.title||'나의 루틴')}</strong><small>${hmSubRoutineEscape(r.description||'내가 정한 하루 루틴')}</small></div>
            ${hmCanManageSubRoutine()?`<div class="sub-routine-row-actions"><button type="button" onclick="openSubRoutineEditor('${hmSubRoutineEscape(r.id)}')">수정</button><button type="button" class="danger" onclick="deleteSubRoutine('${hmSubRoutineEscape(r.id)}')">삭제</button></div>`:'<span class="sub-routine-readonly">읽기 전용</span>'}
        </article>`;
    }).join('');
}
function openSubRoutineHub(){ if(!hmSubRoutineRoomCode)return alert('먼저 우리의 공간을 연결해 주세요.'); renderSubRoutine();hmOpenSubRoutineOverlay('subRoutineHubOverlay'); }
function closeSubRoutineHub(){hmCloseSubRoutineOverlay('subRoutineHubOverlay');}
function openSubRoutineEditor(id=''){
    if(!hmCanManageSubRoutine())return alert('나의 루틴은 기록(Sub)만 만들고 관리할 수 있습니다.');
    const rows=hmSubRoutineRows(); if(!id&&rows.length>=HM_SUB_ROUTINE_MAX)return alert(`나의 루틴은 최대 ${HM_SUB_ROUTINE_MAX}개까지 만들 수 있습니다.`);
    hmSubRoutineEditingId=id; const row=id?hmSubRoutines[id]||{}:{};
    document.getElementById('subRoutineEditorTitle').textContent=id?'🌱 나의 루틴 수정':'🌱 나의 루틴 만들기';
    document.getElementById('subRoutineTitleInput').value=row.title||''; document.getElementById('subRoutineDescInput').value=row.description||'';
    hmOpenSubRoutineOverlay('subRoutineEditorOverlay'); setTimeout(()=>document.getElementById('subRoutineTitleInput')?.focus(),50);
}
function closeSubRoutineEditor(){hmSubRoutineEditingId='';hmCloseSubRoutineOverlay('subRoutineEditorOverlay');}
async function saveSubRoutine(){
    if(!hmCanManageSubRoutine()||!currentUser||!hmSubRoutineRoomCode)return alert('저장 권한이 없습니다.');
    const title=String(document.getElementById('subRoutineTitleInput')?.value||'').trim().slice(0,30); const description=String(document.getElementById('subRoutineDescInput')?.value||'').trim().slice(0,100);
    if(title.length<2)return alert('루틴 이름을 2자 이상 입력해 주세요.');
    const id=hmSubRoutineEditingId||hmSubRoutineId(); const old=hmSubRoutines[id]||{};
    const payload={title,description,order:Number(old.order||hmSubRoutineRows().length+1),createdByUid:old.createdByUid||currentUser.uid,createdAt:Number(old.createdAt||Date.now()),updatedAt:firebase.database.ServerValue.TIMESTAMP,deleted:false};
    try{await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutines/${id}`).set(payload);showSaveStatus('🌱 나의 루틴 저장 완료');closeSubRoutineEditor();}
    catch(err){hmReportError('saveSubRoutine',err,hmIsFirebasePermissionError(err)?'❌ 기록(Sub)만 나의 루틴을 저장할 수 있습니다.':'❌ 나의 루틴 저장 실패');}
}
async function toggleSubRoutine(id){
    if(!hmCanManageSubRoutine()||!currentUser)return; const done=hmSubRoutineChecks?.[id]?.done===true;
    try{await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutineDays/${hmSubRoutineDate()}/${id}`).set({done:!done,title:hmSubRoutines?.[id]?.title||'나의 루틴',updatedByUid:currentUser.uid,updatedAt:firebase.database.ServerValue.TIMESTAMP});showSaveStatus(!done?'🌱 루틴 완료':'🌱 완료 취소');}
    catch(err){hmReportError('toggleSubRoutine',err,'❌ 나의 루틴 완료 저장 실패');}
}
async function deleteSubRoutine(id){
    if(!hmCanManageSubRoutine())return; if(!confirm('이 루틴을 삭제할까요? 오늘의 완료 기록은 보존됩니다.'))return;
    try{await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutines/${id}`).update({deleted:true,updatedAt:firebase.database.ServerValue.TIMESTAMP});showSaveStatus('🌱 나의 루틴 삭제 완료');}
    catch(err){hmReportError('deleteSubRoutine',err,'❌ 나의 루틴 삭제 실패');}
}
window.addEventListener('DOMContentLoaded',()=>{document.getElementById('recordDate')?.addEventListener('change',()=>hmListenSubRoutineDay());renderSubRoutine();});

// STEP5.10.4: inline 버튼 호출 안정화를 위한 명시적 전역 연결
window.openSubRoutineHub = openSubRoutineHub;
window.closeSubRoutineHub = closeSubRoutineHub;
window.openSubRoutineEditor = openSubRoutineEditor;
window.closeSubRoutineEditor = closeSubRoutineEditor;
window.saveSubRoutine = saveSubRoutine;
window.toggleSubRoutine = toggleSubRoutine;
window.deleteSubRoutine = deleteSubRoutine;
