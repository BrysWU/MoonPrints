// Device linking never exposes the game's polling secret or bearer credential
// to browser URLs/localStorage. The public code requires explicit approval.
let activeModLinkCode=null;
async function openModLinkFromLocation(){
  const match=/^#link=([A-Fa-f0-9]{5}-[A-Fa-f0-9]{5})$/.exec(location.hash);
  if(!match||activeModLinkCode===match[1])return;
  activeModLinkCode=match[1];
  await restoreSession();
  const approvePage=async()=>{
    try{
      const request=await apiCall(`/api/mod-links/request/${encodeURIComponent(match[1])}`);
      show(`<div class="modalhead"><div><div class="eyebrow">MOONPRINTS // MOD CONNECTION</div><h2 style="font-family:Barlow Condensed;font-size:34px">LINK YOUR GAME</h2></div><button class="close" id="linkClose">✕ CLOSE</button></div><p>Link <strong>${esc(request.deviceName)}</strong> to <strong>${esc(currentUser.username)}</strong>?</p><div class="guide-path">${esc(request.userCode)}</div><p class="muted">Only approve if this code matches the code shown in your running MoonPrints mod. The mod can upload blueprints to your account. It cannot change your password, edit or delete blueprints. You can revoke the connection from My Account.</p><div class="row"><button class="btn primary" id="approveModLink">LINK ACCOUNT</button><button class="btn" id="cancelModLink">CANCEL</button></div><p class="alert-error" id="linkStatus" role="status"></p>`);
      const cancel=()=>{history.replaceState(null,'',location.pathname+location.search);activeModLinkCode=null;close()};
      $('#linkClose').onclick=cancel;$('#cancelModLink').onclick=cancel;
      $('#approveModLink').onclick=async()=>{
        const button=$('#approveModLink');button.disabled=true;
        try{
          await apiCall('/api/mod-links/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userCode:match[1]})});
          history.replaceState(null,'',location.pathname+location.search);activeModLinkCode=null;
          alertModal('ACCOUNT APPROVED','Return to Moon Sweepers to finish linking. The connection will appear in My Account when the mod receives it. In-game uploads will belong to your account and can be managed under My MoonPrints.');
        }catch(error){if(error.status===401){currentUser=null;authModal('login',approvePage);return}const status=$('#linkStatus');if(status)status.textContent=error.message;button.disabled=false}
      };
    }catch(error){if(error.status===401){currentUser=null;authModal('login',approvePage);return}alertModal('LINK UNAVAILABLE',error.message);activeModLinkCode=null}
  };
  if(!currentUser)authModal('login',approvePage);else await approvePage();
}

async function loadLinkedMods(){
  const container=$('#linkedMods');
  if(!container)return;
  container.textContent='Loading linked mods…';
  try{
    const result=await apiCall('/api/account/mod-links');
    if(!document.contains(container))return;
    container.innerHTML=result.links.length?result.links.map(link=>`<div class="manage-card"><h3>${esc(link.deviceName)}</h3><p class="muted">Connected ${esc(new Date(link.createdAt).toLocaleString())}<br>Last upload: ${esc(link.lastUsedAt?new Date(link.lastUsedAt).toLocaleString():'Not yet used')}<br>Expires ${esc(new Date(link.expiresAt).toLocaleDateString())}<br>Permission: upload blueprints</p><button class="btn" data-revoke-mod="${esc(link.id)}">REVOKE CONNECTION</button></div>`).join(''):'<p class="muted">No linked mods. In Moon Sweepers, open the hammer → Blueprints → gear → Link account.</p>';
    container.querySelectorAll('[data-revoke-mod]').forEach(button=>button.onclick=async()=>{
      button.disabled=true;
      try{await apiCall(`/api/account/mod-links/${encodeURIComponent(button.dataset.revokeMod)}`,{method:'DELETE'});await loadLinkedMods()}
      catch(error){container.textContent=error.message}
    });
  }catch(error){if(document.contains(container))container.textContent=error.message}
}
window.addEventListener('hashchange',()=>{activeModLinkCode=null;openModLinkFromLocation()});
window.addEventListener('moonprints-ready',openModLinkFromLocation);
if($('#bootScreen')?.classList.contains('boot-hidden'))openModLinkFromLocation();
