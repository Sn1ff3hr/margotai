"use strict";
(function(){
  const banner=document.getElementById('cookieBanner');
  const btn=document.getElementById('acceptCookies');
  if(!banner||!btn) return;
  if(localStorage.getItem('cookie-consent')==='true') return;
  banner.removeAttribute('hidden');
  btn.addEventListener('click',()=>{
    localStorage.setItem('cookie-consent','true');
    banner.setAttribute('hidden','');
  });
})();
