// Runs before the app (a plain file: the CSP allows only same-origin scripts, no inline ones).
document.documentElement.classList.add('booting')
setTimeout(function () { if (document.querySelector('#app > .prerender')) document.documentElement.classList.remove('booting') }, 8000)
