// Private, authenticated inbox. Only the signed-in account's rows are returned.
const userNotificationState={token:'',rows:[],next:null,unread:0,request:0,paged:false,error:'',loading:false};
function positionNotificationDropdown(){
 const button=$('#notificationsBtn'),panel=$('#notificationDropdown');if(!button||!panel||panel.hidden)return;
 const rect=button.getBoundingClientRect();
 panel.style.top=Math.min(rect.bottom+8,innerHeight-100)+'px';
 panel.style.right=Math.max(12,innerWidth-rect.right)+'px';
}
function closeNotificationDropdown(){const panel=$('#notificationDropdown');if(panel)panel.hidden=true;userNotificationState.paged=false;$('#notificationsBtn')?.setAttribute('aria-expanded','false')}
function renderUserNotifications(){
 const panel=$('#notificationDropdown'),badge=$('#notificationBadge');if(!panel||!badge)return;
 badge.hidden=!userNotificationState.unread;badge.textContent=userNotificationState.unread>99?'99+':String(userNotificationState.unread);
 panel.innerHTML=`<div class="notification-heading"><strong>NOTIFICATIONS</strong><button type="button" class="close" id="closeNotifications" aria-label="Close notifications">✕</button></div><div class="notification-list">${userNotificationState.rows.map(note=>`<button type="button" class="notification-entry ${note.readAt?'':'unread'}" data-notification-id="${esc(note._id)}"><strong>${esc(note.subject)}</strong><span>From: ${esc(note.from)}${note.sender?' · '+esc(note.sender):''}</span><time>${esc(new Date(note.createdAt).toLocaleString())}</time></button>`).join('')||`<p class="muted notification-empty">${userNotificationState.loading?'Loading notifications…':'You have no notifications.'}</p>`}</div>${userNotificationState.error?`<p class="alert-error">${esc(userNotificationState.error)}</p>`:''}<div class="notification-footer"><button class="btn" id="refreshNotifications">REFRESH</button>${userNotificationState.next?'<button class="btn" id="olderNotifications">LOAD OLDER</button>':''}</div>`;
 $('#closeNotifications').onclick=closeNotificationDropdown;
 $('#refreshNotifications').onclick=()=>refreshUserNotifications();
 if($('#olderNotifications'))$('#olderNotifications').onclick=()=>refreshUserNotifications(true);
 panel.querySelectorAll('[data-notification-id]').forEach(button=>button.onclick=()=>openUserNotification(button.dataset.notificationId));
 positionNotificationDropdown();
}
async function refreshUserNotifications(append=false){
 if(!currentUser||!authToken||userNotificationState.loading)return;
 userNotificationState.loading=true;renderUserNotifications();
 const token=authToken,request=++userNotificationState.request;
 try{
  const data=await apiCall('/api/me/notifications'+(append&&userNotificationState.next?'?before='+encodeURIComponent(userNotificationState.next):''),{signal:AbortSignal.timeout(15000)});
  if(token!==authToken||request!==userNotificationState.request)return;
  userNotificationState.rows=append?[...userNotificationState.rows,...data.notifications]:data.notifications;
  userNotificationState.next=data.nextCursor;userNotificationState.unread=data.unread;userNotificationState.paged=append;userNotificationState.error='';
 }catch(error){if(token!==authToken||request!==userNotificationState.request)return;userNotificationState.error=error.message}
 userNotificationState.loading=false;renderUserNotifications();
}
function syncNotificationCenter(){
 const center=$('#notificationCenter');if(!center)return;
 center.hidden=!currentUser;
 if(!currentUser){userNotificationState.token='';userNotificationState.loading=false;userNotificationState.request++;userNotificationState.rows=[];userNotificationState.unread=0;userNotificationState.next=null;userNotificationState.error='';closeNotificationDropdown();renderUserNotifications();return}
 if(userNotificationState.token!==authToken){userNotificationState.token=authToken;userNotificationState.loading=false;userNotificationState.rows=[];userNotificationState.unread=0;userNotificationState.next=null;userNotificationState.paged=false;userNotificationState.error='';refreshUserNotifications()}
}
function openUserNotification(id){
 const note=userNotificationState.rows.find(row=>String(row._id)===id);if(!note)return;
 closeNotificationDropdown();
 showPanel('notification',`<div class="modalhead"><div><div class="eyebrow">MOONPRINTS // NOTIFICATION</div><h2>${esc(note.subject)}</h2></div><button class="close" id="closeNotice">✕ CLOSE</button></div><p class="muted">From: <strong>${esc(note.from)}</strong>${note.sender?' · '+esc(note.sender):''} · ${esc(new Date(note.createdAt).toLocaleString())}</p><div class="notification-message">${esc(note.message)}</div><div class="row">${note.bugReportId?'<button class="btn" id="noticeBugReport">VIEW BUG REPORT</button>':''}${note.category==='welcome'?'<a class="btn" href="https://ko-fi.com/khk" target="_blank" rel="noopener noreferrer">SUPPORT ON KO-FI</a><button class="btn" id="welcomeBugReport">BUG REPORTS</button>':''}<button class="btn primary" id="clearNotice">CLEAR NOTIFICATION</button><button class="btn" id="dismissNotice">CLOSE</button></div><p class="alert-error" id="noticeStatus" role="status"></p>`);
 if($('#noticeBugReport'))$('#noticeBugReport').onclick=()=>{if(typeof openBugReports==='function')openBugReports({id:note.bugReportId})};
 if($('#welcomeBugReport'))$('#welcomeBugReport').onclick=()=>{if(typeof openBugReports==='function')openBugReports()};
 $('#closeNotice').onclick=close;$('#dismissNotice').onclick=close;
 apiCall(`/api/me/notifications/${encodeURIComponent(id)}/read`,{method:'POST'}).then(()=>refreshUserNotifications()).catch(()=>{});
 $('#clearNotice').onclick=async()=>{
  const button=$('#clearNotice'),token=authToken;button.disabled=true;
  try{await apiCall(`/api/me/notifications/${encodeURIComponent(id)}`,{method:'DELETE'});if(token!==authToken)return;userNotificationState.request++;userNotificationState.loading=false;if(document.contains(button))close();await refreshUserNotifications()}
  catch(error){if(document.contains(button)){$('#noticeStatus').textContent=error.message;button.disabled=false}}
 };
}
$('#notificationsBtn').onclick=()=>{const panel=$('#notificationDropdown');panel.hidden=!panel.hidden;$('#notificationsBtn').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){positionNotificationDropdown();refreshUserNotifications()}};
document.addEventListener('click',event=>{if(!$('#notificationCenter')?.contains(event.target))closeNotificationDropdown()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeNotificationDropdown()});
window.addEventListener('resize',positionNotificationDropdown);window.addEventListener('scroll',positionNotificationDropdown,{passive:true});
setInterval(()=>{if(currentUser&&!document.hidden&&!userNotificationState.paged)refreshUserNotifications()},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)refreshUserNotifications()});
syncNotificationCenter();
