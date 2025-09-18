"use strict";
(function(){
  const STORAGE_KEY='cookie-consent';

  function parseStored(value){
    if(!value) return null;
    try{
      const parsed=JSON.parse(value);
      if(parsed && typeof parsed==='object' && typeof parsed.value==='string'){ return parsed; }
    }catch{}
    return { value, timestamp:new Date().toISOString() };
  }

  function persist(choice,banner){
    const record={ value:choice, timestamp:new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(record));
    const secure=location.protocol==='https:'?'; Secure':'';
    document.cookie=`cookie-consent=${encodeURIComponent(choice)}; Max-Age=31536000; Path=/; SameSite=Strict${secure}`;
    applyPreferences(choice);
    banner.remove();
    window.dispatchEvent(new CustomEvent('cookie-consent-change',{ detail:record }));
  }

  function applyPreferences(choice){
    if(choice==='all'){
      localStorage.setItem('analytics-consent','allowed');
    }else{
      localStorage.removeItem('analytics-consent');
    }
    if(choice==='none'){
      ['lang','theme'].forEach(key=>localStorage.removeItem(key));
    }
  }

  function init(){
    const banner=document.getElementById('cookieBanner');
    const acceptAll=document.getElementById('acceptAllCookies');
    const rejectAll=document.getElementById('rejectAllCookies');
    const acceptNecessary=document.getElementById('acceptNecessaryCookies');
    if(!banner||!acceptAll||!rejectAll||!acceptNecessary) return;
    const stored=parseStored(localStorage.getItem(STORAGE_KEY));
    if(stored){
      applyPreferences(stored.value);
      return;
    }
    banner.removeAttribute('hidden');
    acceptAll.addEventListener('click',ev=>{ev?.preventDefault();persist('all',banner);});
    rejectAll.addEventListener('click',ev=>{ev?.preventDefault();persist('none',banner);});
    acceptNecessary.addEventListener('click',ev=>{ev?.preventDefault();persist('necessary',banner);});
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
