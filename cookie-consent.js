"use strict";
(function(){
  const banner=document.getElementById('cookieBanner');
  const acceptAll=document.getElementById('acceptAllCookies');
  const rejectAll=document.getElementById('rejectAllCookies');
  const acceptNecessary=document.getElementById('acceptNecessaryCookies');
  if(!banner||!acceptAll||!rejectAll||!acceptNecessary) return;
  if(localStorage.getItem('cookie-consent')) return;
  banner.removeAttribute('hidden');
  function setConsent(value){
    localStorage.setItem('cookie-consent',value);
    banner.setAttribute('hidden','');
  }
  acceptAll.addEventListener('click',()=>setConsent('all'));
  rejectAll.addEventListener('click',()=>setConsent('none'));
  acceptNecessary.addEventListener('click',()=>setConsent('necessary'));
})();
