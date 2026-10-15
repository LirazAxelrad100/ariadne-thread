/** The bookmarklet source. It never saves: it reads the page in the user's own
 * browser (so paywalled pages work) and opens the app's /capture page in a new
 * tab with everything in the URL fragment, which never reaches a server. */
export function bookmarkletHref(origin: string) {
  const js = `(function(){
var g=function(q){var e=document.querySelector(q);return e?(e.getAttribute('content')||e.textContent||'').trim():''};
var s=String(window.getSelection()||'').trim();
if(!s){var a=document.querySelector('article')||document.querySelector('main')||document.body;s=(a.innerText||'').trim();}
var w=g('meta[name="author"]')||g('meta[property="article:author"]')||g('[rel="author"]');
if(/^https?:/.test(w))w='';
var d={url:location.href,title:g('meta[property="og:title"]')||document.title,text:s.slice(0,60000),writer:w.slice(0,120)};
window.open(${JSON.stringify(origin)}+'/capture#'+encodeURIComponent(JSON.stringify(d)),'_blank');
})()`;
  return "javascript:" + encodeURIComponent(js.replace(/\n/g, ""));
}
