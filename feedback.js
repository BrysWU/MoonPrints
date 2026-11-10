// LT3's documented embed creates its own trigger inside this mount. Keep that
// trigger hidden and forward our existing navbar button to it, preserving the
// site's button styling without depending on an undocumented LT3 global API.
function openFeedback(){
  const trigger=document.querySelector('#lt3FeedbackMount button, #lt3FeedbackMount a, #lt3FeedbackMount [role="button"]');
  if(trigger){close();trigger.click();return}
  alertModal('FEEDBACK LOADING','The feedback service is still loading or could not be reached. Please try again in a moment.');
}
$('#feedbackBtn').onclick=openFeedback;
