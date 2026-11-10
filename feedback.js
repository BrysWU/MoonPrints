// LT3 binds the navbar button directly through data-lt3-feedback.
// Notification shortcuts reuse that same trigger; never replace its handler.
// LT3 v1 initially mounts a display:flex backdrop at opacity:0. Opacity does
// not remove it from hit testing, so it swallows the first click on the site.
// Its shadow DOM is open; repair the initial closed state before the next paint.
function initializeFeedbackBackdrop(){
  const host=document.querySelector('[data-lt3-root]');
  const root=host?.shadowRoot;
  const backdrop=root?.querySelector('.backdrop');
  if(!backdrop)return false;
  if(!backdrop.classList.contains('open')&&!backdrop.style.display){
    backdrop.style.display='none';
  }
  if(!root.querySelector('[data-moonprints-feedback-style]')){
    const style=document.createElement('style');
    style.setAttribute('data-moonprints-feedback-style','');
    style.textContent='.backdrop:not(.open){pointer-events:none}';
    root.appendChild(style);
  }
  return true;
}
if(!initializeFeedbackBackdrop()){
  const observer=new MutationObserver(()=>{
    if(initializeFeedbackBackdrop())observer.disconnect();
  });
  observer.observe(document.body,{childList:true});
}
function openFeedback(){
  close();
  document.getElementById('feedbackBtn').click();
}
