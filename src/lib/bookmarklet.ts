/** The bookmarklet source. It never saves: it reads the page in the user's own
 * browser (so paywalled pages work) and opens the app's /capture page in the
 * same tab with everything in the URL fragment, which never reaches a server.
 * Same-tab navigation keeps the user's existing session, so no re-sign-in. */
export function bookmarkletHref(origin: string) {
  const js = `(function(){
var g=function(q){var e=document.querySelector(q);return e?(e.getAttribute('content')||e.textContent||'').trim():''};
var s=String(window.getSelection()||'').trim();
if(!s){var a=document.querySelector('.available-content .body.markup')||document.querySelector('.body.markup')||document.querySelector('[itemprop="articleBody"]')||document.querySelector('[data-gu-name="body"]')||document.querySelector('.article-body,.article__body,.post-content,.entry-content')||document.querySelector('article')||document.querySelector('main')||document.body;
var c=a.cloneNode(true);c.querySelectorAll('script,style,nav,aside,footer,header,figure,figcaption,button,form,iframe,.subscription-widget-wrap,.subscribe-widget,.post-ufi,.share-dialog,.button-wrapper,.captioned-image-container').forEach(function(e){e.remove()});
var x=document.createElement('div');x.style.cssText='position:fixed;left:-99999px;top:0;width:800px';x.appendChild(c);document.body.appendChild(x);s=(c.innerText||'').trim();x.remove();
var L=s.split('\\n'),i=0;while(i<L.length&&L[i].trim().length<60)i++;if(i<L.length)s=L.slice(i).join('\\n').trim();
s=s.split('\\n').filter(function(l){var t=l.trim();return !/^(\\d+|share|subscribe|like|comment|restack|become a.*subscriber|upgrade to paid)$/i.test(t)}).join('\\n').replace(/\\n{3,}/g,'\\n\\n');}
var w=g('meta[name="author"]')||g('meta[property="article:author"]')||g('[rel="author"]');
if(/^https?:/.test(w))w='';
var h=document.querySelector('h1.post-title,article h1,main h1,h1');
var d={url:location.href,title:(h&&h.innerText.trim())||g('meta[property="og:title"]')||document.title,text:s.slice(0,60000),writer:w.slice(0,120)};
var u=${JSON.stringify(origin)}+'/capture#'+encodeURIComponent(JSON.stringify(d));
location.href=u;
})()`;
  return "javascript:" + encodeURIComponent(js.replace(/\n/g, ""));
}
