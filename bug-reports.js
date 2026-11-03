const bugUi={id:null,report:null,messages:[],before:0,page:1,pages:1,status:'active',listSerial:0,chatSerial:0,draft:'',pendingText:'',pendingId:'',postingId:null,chatRequest:null,listRequest:null,ticks:0};
const bugStatusLabel=value=>({open:'Open',reviewing:'Being looked at',solved:'Solved'}[value]||value);
function bugPanelActive(){return $('#modal')?.classList.contains('open')&&$('#modal').dataset.panel==='bugs'}
async function openBugReports(options={}){
 bugUi.id=null;bugUi.messages=[];bugUi.draft='';bugUi.page=1;bugUi.listSerial++;bugUi.chatSerial++;bugUi.chatRequest=null;bugUi.listRequest=null;
 showPanel('bugs',`<div class="modalhead"><div><div class="eyebrow">MOONPRINTS // COMMUNITY SUPPORT</div><h2>BUG REPORTS</h2></div><button class="close" id="closeBugs">✕ CLOSE</button></div><p class="muted">Browse known issues and discuss them with the team. Reports and chats are public; keep passwords, tokens and private save data out of posts.</p><div class="bug-toolbar"><select id="bugFilter" aria-label="Report status"><option value="active">Open reports</option><option value="all">All reports</option><option value="open">Open</option><option value="reviewing">Being looked at</option><option value="solved">Solved</option></select><button class="btn" id="refreshBugs">REFRESH</button><button class="btn primary" id="createBug">NEW BUG REPORT</button></div><div class="bug-workspace"><aside><div id="bugList" class="bug-list"></div><div class="row bug-pagination"><button class="btn" id="bugPrevious">←</button><span id="bugPage" class="status"></span><button class="btn" id="bugNext">→</button></div></aside><section id="bugThread" class="bug-thread"><p class="muted">Choose a report to read its discussion.</p></section></div><p id="bugPanelStatus" class="alert-error" role="status"></p>`);
 $('#closeBugs').onclick=close;$('#bugFilter').value=bugUi.status;
 $('#bugFilter').onchange=()=>{bugUi.status=$('#bugFilter').value;bugUi.page=1;loadBugList()};
 $('#refreshBugs').onclick=()=>{loadBugList();if(bugUi.id)refreshBugChat()};
 $('#createBug').onclick=showBugCreate;
 $('#bugPrevious').onclick=()=>{if(bugUi.page>1){bugUi.page--;loadBugList()}};
 $('#bugNext').onclick=()=>{if(bugUi.page<bugUi.pages){bugUi.page++;loadBugList()}};
 startBugLive();
 await loadBugList();
 if(!bugPanelActive())return;
 if(options.id)await selectBugReport(options.id);else if(options.create)showBugCreate();
}
async function loadBugList(){
 const key=bugUi.status+':'+bugUi.page;if(bugUi.listRequest?.key===key)return;
 const request={key};bugUi.listRequest=request;
 const serial=++bugUi.listSerial;
 try{
  const data=await apiCall(`/api/bug-reports?status=${encodeURIComponent(bugUi.status)}&page=${bugUi.page}`,{signal:AbortSignal.timeout(20000)});
  if(!bugPanelActive()||serial!==bugUi.listSerial)return;
  if(bugUi.page>data.pages){bugUi.page=data.pages;bugUi.listRequest=null;await loadBugList();return}
  bugUi.pages=data.pages;
  $('#bugList').innerHTML=data.reports.length?data.reports.map(report=>`<button class="bug-list-item ${String(report._id)===bugUi.id?'selected':''}" data-bug-id="${esc(report._id)}"><strong>${esc(report.title)}</strong><span>${esc(bugStatusLabel(report.status))}${report.chatClosed?' · Chat closed':''}</span><small>${esc(report.createdBy)} · ${report.messageCount} messages</small></button>`).join(''):'<p class="muted">No reports match this filter.</p>';
  $('#bugList').querySelectorAll('[data-bug-id]').forEach(button=>button.onclick=()=>selectBugReport(button.dataset.bugId));
  $('#bugPage').textContent=`${data.page} / ${data.pages}`;$('#bugPrevious').disabled=bugUi.page<=1;$('#bugNext').disabled=bugUi.page>=bugUi.pages;
 }catch(error){if(bugPanelActive()&&serial===bugUi.listSerial)$('#bugPanelStatus').textContent=error.message}
 finally{if(bugUi.listRequest===request)bugUi.listRequest=null}
}
async function selectBugReport(id){
 bugUi.id=String(id);bugUi.messages=[];bugUi.draft='';bugUi.pendingId='';bugUi.chatSerial++;bugUi.chatRequest=null;
 $('#bugThread').innerHTML='<p class="muted">Loading discussion…</p>';
 await refreshBugChat(false,true);
}
function renderBugThread(report){
 $('#bugThread').innerHTML=`<div class="bug-thread-heading"><h3>${esc(report.title)}</h3><span class="bug-status" id="bugStatusLabel">${esc(bugStatusLabel(report.status))}</span></div><p class="status">Reported by ${esc(report.createdBy)} · ${esc(new Date(report.createdAt).toLocaleString())}</p><div class="bug-description">${esc(report.description)}</div><button class="btn" id="olderBugMessages">LOAD EARLIER MESSAGES</button><div class="bug-messages" id="bugMessages" role="log" aria-label="Report discussion"></div><p class="status" id="bugChatState"></p>${currentUser?'<form id="bugReplyForm"><label for="bugReply">REPLY TO DISCUSSION</label><textarea id="bugReply" maxlength="2000" rows="3" required placeholder="Add details, reproduction steps or a reply…"></textarea><button class="btn primary" id="sendBugReply">SEND REPLY</button></form>':'<button class="btn" id="bugLogin">LOG IN TO JOIN THE DISCUSSION</button>'}<p class="alert-error" id="bugReplyStatus" role="status"></p>`;
 $('#olderBugMessages').onclick=()=>refreshBugChat(true);
 if($('#bugLogin'))$('#bugLogin').onclick=()=>authModal('login',()=>openBugReports({id:bugUi.id}));
 if($('#bugReplyForm')){
  $('#bugReply').value=bugUi.draft;$('#bugReply').oninput=()=>bugUi.draft=$('#bugReply').value;
  $('#bugReplyForm').onsubmit=sendBugReply;
 }
}
async function refreshBugChat(older=false,initial=false){
 const id=bugUi.id;if(!id||!bugPanelActive())return;
 if(bugUi.chatRequest?.id===id)return;
 const request={id};bugUi.chatRequest=request;
 const serial=++bugUi.chatSerial;
 try{
  const data=await apiCall(`/api/bug-reports/${encodeURIComponent(id)}`+(older?'?before='+bugUi.before:''),{signal:AbortSignal.timeout(20000)});
  if(!bugPanelActive()||id!==bugUi.id||serial!==bugUi.chatSerial)return;
  bugUi.report=data.report;
  if(initial||!$('#bugMessages'))renderBugThread(data.report);
  const pane=$('#bugMessages'),height=pane.scrollHeight,scroll=pane.scrollTop,atBottom=scroll+pane.clientHeight>=height-40;
  const existing=new Map(bugUi.messages.map(message=>[String(message._id),message]));for(const message of data.messages)existing.set(String(message._id),message);
  bugUi.messages=[...existing.values()].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)||String(a._id).localeCompare(String(b._id)));
  if(older||initial||!bugUi.messages.length)bugUi.before=data.beforeIndex;else bugUi.before=Math.min(bugUi.before,data.beforeIndex);
  pane.innerHTML=bugUi.messages.length?bugUi.messages.map(message=>`<article class="bug-message ${message.isAdmin?'admin-message':''}"><div><strong>${esc(message.author)}${message.isAdmin?' · ADMIN':''}</strong><time>${esc(new Date(message.createdAt).toLocaleString())}</time></div><p>${esc(message.text)}</p></article>`).join(''):'<p class="muted">No replies yet.</p>';
  pane.scrollTop=older?scroll+pane.scrollHeight-height:atBottom?pane.scrollHeight:scroll;
  $('#olderBugMessages').hidden=bugUi.before<=0;
  $('#bugStatusLabel').textContent=bugStatusLabel(data.report.status);
  $('#bugChatState').textContent=data.report.chatClosed?(data.report.messageLimitReached?'This discussion reached its message limit and is read-only.':'Chat is closed. An administrator can reopen the report.'):'Discussion is open to signed-in users.';
  if($('#bugReply'))$('#bugReply').disabled=data.report.chatClosed;
  if($('#sendBugReply'))$('#sendBugReply').disabled=data.report.chatClosed||bugUi.postingId===id;
 }catch(error){if(bugPanelActive()&&id===bugUi.id){$('#bugPanelStatus').textContent=error.message;if(error.status===404){$('#bugThread').innerHTML='<p class="muted">This report was deleted and its chat is no longer available.</p>';bugUi.id=null;bugUi.messages=[];bugUi.report=null;bugUi.draft='';loadBugList()}}}
 finally{if(bugUi.chatRequest===request)bugUi.chatRequest=null}
}
async function sendBugReply(event){
 event.preventDefault();const id=bugUi.id,text=$('#bugReply').value.trim(),button=$('#sendBugReply');if(!text||!id||bugUi.postingId===id)return;
 if(text!==bugUi.pendingText||!bugUi.pendingId){bugUi.pendingId=crypto.randomUUID();bugUi.pendingText=text}
 button.disabled=true;bugUi.postingId=id;
 try{
  await apiCall(`/api/bug-reports/${encodeURIComponent(id)}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,clientId:bugUi.pendingId}),signal:AbortSignal.timeout(30000)});
  if(!bugPanelActive()||bugUi.id!==id)return;
  bugUi.draft='';bugUi.pendingId='';$('#bugReply').value='';$('#bugReplyStatus').textContent='';await refreshBugChat();loadBugList();
 }catch(error){if(bugPanelActive()&&bugUi.id===id){$('#bugReplyStatus').textContent=error.message;if(error.status===409)refreshBugChat()}}
 finally{if(bugUi.postingId===id)bugUi.postingId=null;if(document.contains(button))button.disabled=!!bugUi.report?.chatClosed}
}
function showBugCreate(){
 if(!currentUser){authModal('login',()=>openBugReports({create:true}));return}
 bugUi.id=null;bugUi.chatSerial++;
 $('#bugThread').innerHTML='<h3>REPORT A BUG</h3><p class="muted">Describe what happened and how to reproduce it. Check existing reports first. Reports and chats are public.</p><form id="bugCreateForm"><label for="bugTitle">TITLE</label><input id="bugTitle" required minlength="3" maxlength="120"><label for="bugDescription">WHAT HAPPENED?</label><textarea id="bugDescription" required minlength="10" maxlength="4000" rows="7" placeholder="Include steps to reproduce, what you expected, what happened, and your mod/game version."></textarea><button class="btn primary" id="submitBug">SUBMIT REPORT</button></form><p class="alert-error" id="bugCreateStatus" role="status"></p>';
 $('#bugCreateForm').onsubmit=async event=>{
  event.preventDefault();const button=$('#submitBug');button.disabled=true;
  try{
   const data=await apiCall('/api/bug-reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('#bugTitle').value,description:$('#bugDescription').value}),signal:AbortSignal.timeout(30000)});
   if(!bugPanelActive())return;bugUi.status='active';bugUi.page=1;$('#bugFilter').value='active';await loadBugList();await selectBugReport(data.report._id);
  }catch(error){if($('#bugCreateStatus'))$('#bugCreateStatus').textContent=error.message}
  finally{if(document.contains(button))button.disabled=false}
 };
}
$('#bugReportsBtn').onclick=()=>openBugReports();
// Coalesce live events and wait out in-flight reads instead of losing their updates.
let bugLive=null,bugLiveReady=false,bugLiveTimer=null,bugLivePending=false;
function queueBugLiveRefresh(){
 bugLivePending=true;
 if(bugLiveTimer)return;
 bugLiveTimer=setTimeout(async()=>{
  bugLiveTimer=null;if(!bugPanelActive()||document.hidden)return;
  if(bugUi.chatRequest||bugUi.listRequest){queueBugLiveRefresh();return}
  bugLivePending=false;
  await Promise.allSettled([loadBugList(),bugUi.id?refreshBugChat():Promise.resolve()]);
  if(bugLivePending)queueBugLiveRefresh();
 },100);
}
function stopBugLive(){bugLive?.close();bugLive=null;bugLiveReady=false;clearTimeout(bugLiveTimer);bugLiveTimer=null}
function startBugLive(){
 if(bugLive||!bugPanelActive()||document.hidden||typeof EventSource==='undefined')return;
 bugLive=new EventSource(API_BASE+'/api/bug-report-events');
 bugLive.addEventListener('sync',()=>{bugLiveReady=true;queueBugLiveRefresh()});
 bugLive.addEventListener('bug-change',()=>queueBugLiveRefresh());
 bugLive.onerror=()=>{bugLiveReady=false};
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopBugLive();else if(bugPanelActive()){startBugLive();queueBugLiveRefresh()}});
// Modal closure immediately releases the stream; a later reopen takes a fresh snapshot.
if(typeof MutationObserver!=='undefined')new MutationObserver(()=>{if(!bugPanelActive())stopBugLive()}).observe($('#modal'),{attributes:true,attributeFilter:['class','data-panel']});
setInterval(()=>{
 if(!bugPanelActive()||document.hidden){stopBugLive();return}
 startBugLive();
 // Fallback for blocked/disconnected streams, plus reconciliation after missed events.
 if(!bugLiveReady||++bugUi.ticks%6===0)queueBugLiveRefresh();
},5000);
