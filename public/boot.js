// Runs before the app (a plain file: the CSP allows only same-origin scripts, no inline ones).
document.documentElement.classList.add('booting')
setTimeout(function () { if (document.querySelector('#app > .prerender')) document.documentElement.classList.remove('booting') }, 8000)
// A closed announcement stays hidden from the first paint (no jump once the app loads); it is
// matched by its text, so a new announcement shows again. Same key as ComingNotice.vue.
try {
  var hiddenNotice = localStorage.getItem('pms.notice.hidden')
  if (hiddenNotice) {
    var noticeStyle = document.createElement('style')
    noticeStyle.textContent = '[data-notice="' + hiddenNotice.replace(/["\\\n]/g, '') + '"]{display:none!important}'
    document.head.appendChild(noticeStyle)
  }
} catch (e) {}
