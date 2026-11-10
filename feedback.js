// LT3 binds the navbar button directly through data-lt3-feedback.
// Notification shortcuts reuse that same trigger; never replace its handler.
function openFeedback(){
  close();
  document.getElementById('feedbackBtn').click();
}
