// =========================================================
// HearMe2nite v1.0 STEP5.10.7
// sub-routine.js - 기록(Sub) 자기주도 루틴 2단계
// 정의: rooms/{roomCode}/subRoutines/{routineId}
// 완료: rooms/{roomCode}/subRoutineDays/{date}/{routineId}
// 기능: 매일 / 요일 선택 / 오늘만 / 일시 중지 / 기록실·최종 복사 연동
// =========================================================
const HM_SUB_ROUTINE_MAX = 7;
let hmSubRoutineRoomCode = '';
let hmSubRoutinesRef = null;
let hmSubRoutineDayRef = null;
let hmSubRoutines = {};
let hmSubRoutineChecks = {};
let hmSubRoutineEditingId = '';
let hmSubRoutineDefsLoaded = false;
let hmSubRoutineDayLoaded = false;
let hmSubRoutineSnapshotSyncing = false;

function hmCanManageSubRoutine() {
    return !!currentUser && activeRelationshipRole === 'sub';
}
function hmSubRoutineDate() {
    const value = document.getElementById('recordDate')?.value || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0,10);
}
function hmSubRoutineDateObject(dateText = hmSubRoutineDate()) {
    const [year, month, day] = String(dateText).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}
function hmSubRoutineRows() {
    return Object.entries(hmSubRoutines || {}).map(([id,v])=>({id,...(v||{})}))
      .filter(v=>v.deleted!==true).sort((a,b)=>Number(a.order||0)-Number(b.order||0)||Number(a.createdAt||0)-Number(b.createdAt||0));
}
function hmSubRoutineScheduleType(row) {
    return ['daily','weekdays','once'].includes(row?.scheduleType) ? row.scheduleType : 'daily';
}
function hmSubRoutineWeekdays(row) {
    return Array.isArray(row?.weekdays) ? row.weekdays.map(Number).filter(v=>v>=0&&v<=6) : [];
}
function hmSubRoutineAppliesOnDate(row, dateText = hmSubRoutineDate()) {
    if (row?.paused === true) return false;
    const type = hmSubRoutineScheduleType(row);
    if (type === 'once') return String(row?.activeDate || '') === String(dateText);
    if (type === 'weekdays') return hmSubRoutineWeekdays(row).includes(hmSubRoutineDateObject(dateText).getDay());
    return true;
}
function hmSubRoutineActiveRows(dateText = hmSubRoutineDate()) {
    return hmSubRoutineRows().filter(row=>hmSubRoutineAppliesOnDate(row,dateText));
}
function hmSubRoutineScheduleLabel(row) {
    if (row?.paused === true) return '일시 중지';
    const type = hmSubRoutineScheduleType(row);
    if (type === 'once') return `${row.activeDate || hmSubRoutineDate()} 하루만`;
    if (type === 'weekdays') {
        const names=['일','월','화','수','목','금','토'];
        const days=hmSubRoutineWeekdays(row);
        return days.length ? days.map(day=>names[day]).join('·') + ' 반복' : '요일 미선택';
    }
    return '매일';
}
function hmBuildSubRoutineSnapshot(definitions = {}, checks = {}, dateText = hmSubRoutineDate()) {
    const definitionRows = Object.entries(definitions || {}).map(([id, value]) => ({ id, ...(value || {}) }));
    const byId = new Map(definitionRows.map(row => [row.id, row]));
    const result = [];

    definitionRows
        .filter(row => row.deleted !== true && hmSubRoutineAppliesOnDate(row, dateText))
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || Number(a.createdAt || 0) - Number(b.createdAt || 0))
        .forEach(row => {
            const saved = checks?.[row.id] || {};
            result.push({
                id: row.id,
                title: String(saved.title || row.title || '나의 루틴').slice(0, 30),
                description: String(saved.description || row.description || '').slice(0, 100),
                scheduleLabel: String(saved.scheduleLabel || hmSubRoutineScheduleLabel(row)).slice(0, 40),
                order: Number(saved.order ?? row.order ?? 0),
                done: saved.done === true
            });
        });

    // 과거 날짜에서 루틴이 수정·삭제된 뒤에도 당시 저장된 항목은 보존한다.
    Object.entries(checks || {}).forEach(([id, saved]) => {
        if (!saved || typeof saved !== 'object' || byId.has(id) || id.startsWith('_')) return;
        result.push({
            id,
            title: String(saved.title || '나의 루틴').slice(0, 30),
            description: String(saved.description || '').slice(0, 100),
            scheduleLabel: String(saved.scheduleLabel || '당시 루틴').slice(0, 40),
            order: Number(saved.order || 9999),
            done: saved.done === true
        });
    });

    return result.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title));
}
function hmBuildSubRoutineReportText(snapshot = []) {
    if (!Array.isArray(snapshot) || !snapshot.length) return '';
    const lines = snapshot.map(item => `  - ${item.title || '나의 루틴'}: ${item.done === true ? '완료' : '미완료'}${item.scheduleLabel ? ` (${item.scheduleLabel})` : ''}`);
    return `🌱 나의 루틴:\n${lines.join('\n')}`;
}
async function hmLoadSubRoutineSnapshot(roomCode, dateText) {
    if (!roomCode || !dateText) return [];
    const [definitionsSnap, checksSnap] = await Promise.all([
        db.ref(`rooms/${roomCode}/subRoutines`).once('value'),
        db.ref(`rooms/${roomCode}/subRoutineDays/${dateText}`).once('value')
    ]);
    return hmBuildSubRoutineSnapshot(definitionsSnap.val() || {}, checksSnap.val() || {}, dateText);
}
function hmCurrentSubRoutineSnapshot() {
    return hmBuildSubRoutineSnapshot(hmSubRoutines, hmSubRoutineChecks, hmSubRoutineDate());
}
async function hmPersistSubRoutineSnapshotToDay() {
    if (!hmCanManageSubRoutine() || !currentUser || !hmSubRoutineRoomCode || hmSubRoutineSnapshotSyncing) return;
    const dateText = hmSubRoutineDate();
    const snapshot = hmCurrentSubRoutineSnapshot();
    hmSubRoutineSnapshotSyncing = true;
    try {
        await db.ref(`rooms/${hmSubRoutineRoomCode}/days/${dateText}`).update({
            date: dateText,
            subRoutineSnapshot: snapshot,
            updatedBy: currentUser.uid,
            updatedByEmail: currentUser.email || '',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (err) {
        hmReportError('hmPersistSubRoutineSnapshotToDay', err, hmIsFirebasePermissionError(err) ? '❌ 나의 루틴 기록 저장 권한 없음' : '❌ 나의 루틴 기록 연결 실패');
    } finally {
        hmSubRoutineSnapshotSyncing = false;
    }
}
async function hmEnsureSubRoutineDaySnapshot() {
    if (!hmCanManageSubRoutine() || !hmSubRoutineRoomCode || !hmSubRoutineDefsLoaded || !hmSubRoutineDayLoaded) return;
    const dateText = hmSubRoutineDate();
    const missing = {};
    hmSubRoutineActiveRows(dateText).forEach(row => {
        if (hmSubRoutineChecks?.[row.id]) return;
        missing[row.id] = {
            done: false,
            title: String(row.title || '나의 루틴').slice(0, 30),
            description: String(row.description || '').slice(0, 100),
            scheduleLabel: String(hmSubRoutineScheduleLabel(row)).slice(0, 40),
            order: Number(row.order || 0),
            snapshotAt: firebase.database.ServerValue.TIMESTAMP,
            updatedByUid: currentUser.uid,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
    });
    if (Object.keys(missing).length) {
        try {
            await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutineDays/${dateText}`).update(missing);
        } catch (err) {
            hmReportError('hmEnsureSubRoutineDaySnapshot', err, '❌ 나의 루틴 날짜 기록 준비 실패');
            return;
        }
    }
    await hmPersistSubRoutineSnapshotToDay();
}

function hmSubRoutineEscape(v){ return typeof escapeHtml==='function'?escapeHtml(String(v||'')):String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function hmSubRoutineId(){ return `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }
function hmOpenSubRoutineOverlay(id) {
    if (typeof openModalOverlayById === 'function') { openModalOverlayById(id); return; }
    const el = document.getElementById(id); if (!el) return;
    el.removeAttribute('inert'); el.style.display = 'flex'; el.setAttribute('aria-hidden', 'false');
}
function hmCloseSubRoutineOverlay(id) {
    if (typeof closeModalOverlayById === 'function') { closeModalOverlayById(id); return; }
    const el = document.getElementById(id); if (!el) return;
    el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); el.setAttribute('inert', '');
}

function hmStartSubRoutines(roomCode){
    hmStopSubRoutines(); hmSubRoutineRoomCode = roomCode || '';
    if(!roomCode || !currentUser){ renderSubRoutine(); return; }
    hmSubRoutinesRef=db.ref(`rooms/${roomCode}/subRoutines`);
    hmSubRoutinesRef.on('value',snap=>{hmSubRoutines=snap.val()||{};hmSubRoutineDefsLoaded=true;renderSubRoutine();hmEnsureSubRoutineDaySnapshot();},err=>hmReportError('hmStartSubRoutines',err,'❌ 나의 루틴 불러오기 실패'));
    hmListenSubRoutineDay();
}
function hmStopSubRoutines(){
    if(hmSubRoutinesRef)hmSubRoutinesRef.off(); if(hmSubRoutineDayRef)hmSubRoutineDayRef.off();
    hmSubRoutinesRef=null;hmSubRoutineDayRef=null;hmSubRoutines={};hmSubRoutineChecks={};hmSubRoutineRoomCode='';hmSubRoutineDefsLoaded=false;hmSubRoutineDayLoaded=false;renderSubRoutine();
}
function hmListenSubRoutineDay(){
    if(hmSubRoutineDayRef)hmSubRoutineDayRef.off(); hmSubRoutineDayRef=null; hmSubRoutineChecks={}; hmSubRoutineDayLoaded=false;
    if(!hmSubRoutineRoomCode)return renderSubRoutine();
    hmSubRoutineDayRef=db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutineDays/${hmSubRoutineDate()}`);
    hmSubRoutineDayRef.on('value',snap=>{hmSubRoutineChecks=snap.val()||{};hmSubRoutineDayLoaded=true;renderSubRoutine();hmEnsureSubRoutineDaySnapshot();},err=>hmReportError('hmListenSubRoutineDay',err,'❌ 나의 루틴 완료 상태 불러오기 실패'));
}
function renderSubRoutine(){
    const allRows=hmSubRoutineRows();
    const rows=hmSubRoutineActiveRows();
    const done=rows.filter(r=>hmSubRoutineChecks?.[r.id]?.done===true).length;
    const pausedCount=allRows.filter(r=>r.paused===true).length;
    const sub=document.getElementById('subRoutineHubSub');
    const count=document.getElementById('subRoutineCountText');
    const homeList=document.getElementById('subRoutineHomeList');
    const managerList=document.getElementById('subRoutineManagerList');

    if(count) count.textContent=hmCanManageSubRoutine()
        ? `${rows.length}개 · ${done}/${rows.length} 완료 · 기록(Sub)가 관리`
        : `${rows.length}개 · ${done}/${rows.length} 완료 · Dom은 확인만`;
    if(sub) sub.textContent=!hmSubRoutineRoomCode
        ? '공간을 연결하면 나의 루틴을 사용할 수 있어요.'
        : !allRows.length
            ? (hmCanManageSubRoutine()?'나만의 하루 루틴을 만들어보세요.':'Sub가 루틴을 만들면 여기에 표시됩니다.')
            : `${rows.length}개 오늘 루틴 · ${done}/${rows.length} 완료${pausedCount?` · ${pausedCount}개 중지`:''}`;

    const add=document.getElementById('subRoutineAddBtn');
    if(add) add.hidden=!hmCanManageSubRoutine();
    const note=document.getElementById('subRoutineRoleNote');
    if(note) note.textContent=hmCanManageSubRoutine()
        ? '루틴을 만들고 반복 요일·오늘만·일시 중지를 설정합니다. 완료 체크는 홈 카드에서 진행합니다.'
        : '기록(Sub)가 직접 관리하는 루틴입니다. Dom은 홈 화면에서 완료 상태만 확인할 수 있습니다.';

    if(homeList){
        if(!rows.length){
            homeList.innerHTML=`<div class="sub-routine-home-empty">${allRows.length?(hmCanManageSubRoutine()?'선택한 날짜에 실행할 루틴이 없습니다. 나의 루틴 카드에서 반복 설정을 확인해 주세요.':'선택한 날짜에 실행할 루틴이 없습니다.'):(hmCanManageSubRoutine()?'아직 만든 루틴이 없습니다. 나의 루틴 카드를 눌러 첫 루틴을 만들어보세요.':'아직 등록된 나의 루틴이 없습니다.')}</div>`;
        } else {
            homeList.innerHTML=rows.map(r=>{
                const checked=hmSubRoutineChecks?.[r.id]?.done===true;
                const action=hmCanManageSubRoutine()?`onclick="toggleSubRoutine('${hmSubRoutineEscape(r.id)}')"`:'onclick="showSaveStatus(\'🌱 Sub가 직접 관리하는 루틴입니다.\')"';
                return `<button type="button" class="sub-routine-home-card ${checked?'is-done':''}" ${action}>
                    <span class="sub-routine-home-icon">🌱</span>
                    <span class="sub-routine-home-text"><strong>${hmSubRoutineEscape(r.title||'나의 루틴')}</strong><small>${hmSubRoutineEscape(r.description||'내가 정한 하루 루틴')} · ${hmSubRoutineEscape(hmSubRoutineScheduleLabel(r))} · ${checked?'완료':'미완료'}</small></span>
                    <span class="sub-routine-home-check">${checked?'✓':'○'}</span>
                </button>`;
            }).join('');
        }
    }

    if(!managerList)return;
    if(!allRows.length){
        managerList.innerHTML=`<div class="sub-routine-empty">${hmCanManageSubRoutine()?'아직 만든 루틴이 없습니다.<br>아래 버튼으로 첫 루틴을 만들어보세요.':'아직 등록된 나의 루틴이 없습니다.'}</div>`;
        return;
    }
    managerList.innerHTML=allRows.map(r=>{
        const checked=hmSubRoutineChecks?.[r.id]?.done===true;
        const paused=r.paused===true;
        return `<article class="sub-routine-row ${checked?'is-done':''} ${paused?'is-paused':''}">
            <span class="sub-routine-check is-status" aria-label="${paused?'일시 중지':checked?'완료':'미완료'}">${paused?'Ⅱ':checked?'✓':'○'}</span>
            <div class="sub-routine-row-text"><strong>${hmSubRoutineEscape(r.title||'나의 루틴')}</strong><small>${hmSubRoutineEscape(r.description||'내가 정한 하루 루틴')}</small><em>${hmSubRoutineEscape(hmSubRoutineScheduleLabel(r))}</em></div>
            ${hmCanManageSubRoutine()?`<div class="sub-routine-row-actions"><button type="button" onclick="openSubRoutineEditor('${hmSubRoutineEscape(r.id)}')">수정</button><button type="button" class="danger" onclick="deleteSubRoutine('${hmSubRoutineEscape(r.id)}')">삭제</button></div>`:'<span class="sub-routine-readonly">읽기 전용</span>'}
        </article>`;
    }).join('');
}
function openSubRoutineHub(){ if(!hmSubRoutineRoomCode)return alert('먼저 우리의 공간을 연결해 주세요.'); renderSubRoutine();hmOpenSubRoutineOverlay('subRoutineHubOverlay'); }
function closeSubRoutineHub(){hmCloseSubRoutineOverlay('subRoutineHubOverlay');}
function hmSetSubRoutineScheduleUI(type){
    const weekdays=document.getElementById('subRoutineWeekdays');
    if(weekdays) weekdays.hidden=type!=='weekdays';
}
function hmReadSubRoutineScheduleType(){
    return document.querySelector('input[name="subRoutineScheduleType"]:checked')?.value || 'daily';
}
function openSubRoutineEditor(id=''){
    if(!hmCanManageSubRoutine())return alert('나의 루틴은 기록(Sub)만 만들고 관리할 수 있습니다.');
    const rows=hmSubRoutineRows(); if(!id&&rows.length>=HM_SUB_ROUTINE_MAX)return alert(`나의 루틴은 최대 ${HM_SUB_ROUTINE_MAX}개까지 만들 수 있습니다.`);
    hmSubRoutineEditingId=id; const row=id?hmSubRoutines[id]||{}:{};
    document.getElementById('subRoutineEditorTitle').textContent=id?'🌱 나의 루틴 수정':'🌱 나의 루틴 만들기';
    document.getElementById('subRoutineTitleInput').value=row.title||'';
    document.getElementById('subRoutineDescInput').value=row.description||'';
    const type=hmSubRoutineScheduleType(row);
    const radio=document.querySelector(`input[name="subRoutineScheduleType"][value="${type}"]`);
    if(radio) radio.checked=true;
    const selected=new Set(hmSubRoutineWeekdays(row));
    document.querySelectorAll('#subRoutineWeekdays input[type="checkbox"]').forEach(input=>{input.checked=selected.has(Number(input.value));});
    const pausedInput=document.getElementById('subRoutinePausedInput'); if(pausedInput) pausedInput.checked=row.paused===true;
    hmSetSubRoutineScheduleUI(type);
    hmOpenSubRoutineOverlay('subRoutineEditorOverlay'); setTimeout(()=>document.getElementById('subRoutineTitleInput')?.focus(),50);
}
function closeSubRoutineEditor(){hmSubRoutineEditingId='';hmCloseSubRoutineOverlay('subRoutineEditorOverlay');}
async function saveSubRoutine(){
    if(!hmCanManageSubRoutine()||!currentUser||!hmSubRoutineRoomCode)return alert('저장 권한이 없습니다.');
    const title=String(document.getElementById('subRoutineTitleInput')?.value||'').trim().slice(0,30);
    const description=String(document.getElementById('subRoutineDescInput')?.value||'').trim().slice(0,100);
    if(title.length<2)return alert('루틴 이름을 2자 이상 입력해 주세요.');
    const scheduleType=hmReadSubRoutineScheduleType();
    const weekdays=[...document.querySelectorAll('#subRoutineWeekdays input[type="checkbox"]:checked')].map(input=>Number(input.value)).sort((a,b)=>a-b);
    if(scheduleType==='weekdays'&&!weekdays.length)return alert('반복할 요일을 하나 이상 선택해 주세요.');
    const id=hmSubRoutineEditingId||hmSubRoutineId(); const old=hmSubRoutines[id]||{};
    const payload={
        title, description, scheduleType,
        weekdays:scheduleType==='weekdays'?weekdays:[],
        activeDate:scheduleType==='once'?(old.scheduleType==='once'&&old.activeDate?old.activeDate:hmSubRoutineDate()):'',
        paused:document.getElementById('subRoutinePausedInput')?.checked===true,
        order:Number(old.order||hmSubRoutineRows().length+1),
        createdByUid:old.createdByUid||currentUser.uid,
        createdAt:Number(old.createdAt||Date.now()),
        updatedAt:firebase.database.ServerValue.TIMESTAMP,
        deleted:false
    };
    try{await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutines/${id}`).set(payload);showSaveStatus('🌱 나의 루틴 저장 완료');closeSubRoutineEditor();}
    catch(err){hmReportError('saveSubRoutine',err,hmIsFirebasePermissionError(err)?'❌ 기록(Sub)만 나의 루틴을 저장할 수 있습니다.':'❌ 나의 루틴 저장 실패');}
}
async function toggleSubRoutine(id){
    if(!hmCanManageSubRoutine()||!currentUser)return;
    const routine=hmSubRoutines?.[id];
    if(!routine||!hmSubRoutineAppliesOnDate(routine))return showSaveStatus('🌱 선택한 날짜에는 실행하지 않는 루틴입니다.');
    const done=hmSubRoutineChecks?.[id]?.done===true;
    try{await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutineDays/${hmSubRoutineDate()}/${id}`).update({done:!done,title:routine.title||'나의 루틴',description:routine.description||'',scheduleLabel:hmSubRoutineScheduleLabel(routine),order:Number(routine.order||0),updatedByUid:currentUser.uid,updatedAt:firebase.database.ServerValue.TIMESTAMP});await hmPersistSubRoutineSnapshotToDay();showSaveStatus(!done?'🌱 루틴 완료':'🌱 완료 취소');}
    catch(err){hmReportError('toggleSubRoutine',err,'❌ 나의 루틴 완료 저장 실패');}
}
async function deleteSubRoutine(id){
    if(!hmCanManageSubRoutine())return; if(!confirm('이 루틴을 삭제할까요? 기존 완료 기록은 보존됩니다.'))return;
    try{await db.ref(`rooms/${hmSubRoutineRoomCode}/subRoutines/${id}`).update({deleted:true,updatedAt:firebase.database.ServerValue.TIMESTAMP});showSaveStatus('🌱 나의 루틴 삭제 완료');}
    catch(err){hmReportError('deleteSubRoutine',err,'❌ 나의 루틴 삭제 실패');}
}
window.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('recordDate')?.addEventListener('change',()=>hmListenSubRoutineDay());
    document.querySelectorAll('input[name="subRoutineScheduleType"]').forEach(input=>input.addEventListener('change',()=>hmSetSubRoutineScheduleUI(input.value)));
    renderSubRoutine();
});

window.openSubRoutineHub = openSubRoutineHub;
window.closeSubRoutineHub = closeSubRoutineHub;
window.openSubRoutineEditor = openSubRoutineEditor;
window.closeSubRoutineEditor = closeSubRoutineEditor;
window.saveSubRoutine = saveSubRoutine;
window.toggleSubRoutine = toggleSubRoutine;
window.deleteSubRoutine = deleteSubRoutine;

window.hmBuildSubRoutineSnapshot = hmBuildSubRoutineSnapshot;
window.hmBuildSubRoutineReportText = hmBuildSubRoutineReportText;
window.hmLoadSubRoutineSnapshot = hmLoadSubRoutineSnapshot;
window.hmCurrentSubRoutineSnapshot = hmCurrentSubRoutineSnapshot;
