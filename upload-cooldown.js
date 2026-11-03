// The server owns the deadline; the timer is a display, never authorization.
let uploadCooldownChecking=false,uploadCooldownClose=null;
function uploadWaitSeconds(deadline,time=Date.now()){return Math.max(0,Math.ceil((deadline-time)/1000))}
function showUploadCooldown(data,onUpload){
 uploadCooldownClose?.();
 const seconds=Number(data.retryAfterSeconds);
 if(!Number.isFinite(seconds)||seconds<0||seconds>3600){alertModal('UPLOAD UNAVAILABLE','Please try again shortly.');return}
 const deadline=Date.now()+seconds*1000,previousFocus=document.activeElement,wasModalOpen=document.body.classList.contains('modal-open');
 document.body.classList.add('modal-open');
 const layer=document.createElement('div');layer.className='upload-cooldown-overlay';
 layer.innerHTML=`<div class="panel cooldown-panel" role="dialog" aria-modal="true" aria-labelledby="cooldownTitle"><div class="pad"><div class="modalhead"><h2 id="cooldownTitle">${data.busy?'UPLOAD IN PROGRESS':'PLEASE WAIT TO UPLOAD'}</h2><button type="button" class="close" data-wait-close>✕ CLOSE</button></div><p class="muted">${esc(data.error||'You can upload one new blueprint every 30 seconds. Edits and file replacements are not affected.')}</p><div class="cooldown-clock" role="status" aria-live="polite"></div><p class="muted">You can close this popup and wait elsewhere. The limit is shared by website and in-game uploads.</p><button type="button" class="btn primary" data-wait-upload disabled>UPLOAD</button></div></div>`;
 document.body.append(layer);const button=layer.querySelector('[data-wait-upload]'),clock=layer.querySelector('.cooldown-clock');
 let timer;
 const closeWait=()=>{clearInterval(timer);document.removeEventListener('keydown',escape,true);layer.remove();if(!wasModalOpen&&!$('#modal').classList.contains('open'))document.body.classList.remove('modal-open');if(previousFocus?.isConnected)previousFocus.focus();uploadCooldownClose=null};
 const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeWait()}};
 const tick=()=>{const remaining=uploadWaitSeconds(deadline);clock.textContent=remaining?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Ready to upload';button.disabled=remaining>0;if(!remaining)clearInterval(timer)};
 layer.querySelector('[data-wait-close]').onclick=closeWait;
 layer.onclick=event=>{if(event.target===layer)closeWait()};
 button.onclick=()=>{if(uploadWaitSeconds(deadline))return;closeWait();Promise.resolve(onUpload()).catch(error=>alertModal('UPLOAD UNAVAILABLE',error.message))};
 document.addEventListener('keydown',escape,true);timer=setInterval(tick,250);tick();uploadCooldownClose=closeWait;layer.querySelector('[data-wait-close]').focus();
}
async function beginUploadWithCooldown(){
 if(uploadCooldownChecking)return;uploadCooldownChecking=true;
 try{
  const data=await apiCall('/api/me/upload-status',{signal:AbortSignal.timeout(15000)});
  if(data.retryAfterSeconds>0)showUploadCooldown(data,beginUploadWithCooldown);else upload(true);
 }catch(error){if(error.status===401){authToken='';currentUser=null;localStorage.removeItem('moonprints_session');updateAuthUI();authModal('login',beginUploadWithCooldown)}else alertModal('UPLOAD UNAVAILABLE',error.message)}
 finally{uploadCooldownChecking=false}
}
