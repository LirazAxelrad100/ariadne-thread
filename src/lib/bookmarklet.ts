/** The bookmarklet source. It never saves: it reads the page in the user's own
 * browser (so paywalled pages work), opens /capture?bm=1 in the tab named
 * "ariadne" (an already-open app tab is reused), and hands the page over by
 * postMessage once that tab says it's ready. A whole article is too big for a
 * URL ("Payload Too Large"), so only a short text may ride in the hash, as a
 * fallback when the tab can't be opened. */
export function bookmarkletHref(origin: string) {
  const js = `(function(){
var g=function(q){var e=document.querySelector(q);return e?(e.getAttribute('content')||e.textContent||'').trim():''};
var s=String(window.getSelection()||'').trim();
if(!s){var a=document.querySelector('.available-content .body.markup')||document.querySelector('.body.markup')||document.querySelector('[itemprop="articleBody"]')||document.querySelector('[data-gu-name="body"]')||document.querySelector('.article-body,.article__body,.post-content,.entry-content')||document.querySelector('article')||document.querySelector('main')||document.body;
var c=a.cloneNode(true);c.querySelectorAll('script,style,nav,aside,footer,header,figure,figcaption,button,form,iframe,.subscription-widget-wrap,.subscribe-widget,.post-ufi,.share-dialog,.button-wrapper,.captioned-image-container').forEach(function(e){e.remove()});
var x=document.createElement('div');x.style.cssText='position:fixed;left:-99999px;top:0;width:800px';x.appendChild(c);document.body.appendChild(x);s=(c.innerText||'').trim();x.remove();
var T=((document.querySelector('h1')||{}).innerText||'').trim();var L=s.split('\\n'),i=0;while(i<L.length){var q=L[i].trim();if(q.length>=60)break;if(q&&q!==T&&!/^published\\b/i.test(q)&&(/[.!?:"\\u201d\\u2019)]$/.test(q)||/^([-*\\u2022]|\\d+\\.)\\s/.test(q)))break;i++}if(i>0&&i<L.length&&/^[A-Z\u00C0-\u024F]$/.test(L[i-1].trim()))L[i]=L[i-1].trim()+L[i].trim();if(i<L.length)s=L.slice(i).join('\\n').trim();
s=s.split('\\n').filter(function(l){var t=l.trim();return !/^(\\d+|share|subscribe|like|comment|restack|become a.*subscriber|upgrade to paid)$/i.test(t)}).join('\\n');
var E=s.search(/\\n\\s*(explore more on these topics|reuse this content|most viewed|related stories|related articles|read more|more from|you might also like|share this post|discussion about this post|ready for more\\?)\\s*\\n/i);if(E>0)s=s.slice(0,E);
L=s.split('\\n');while(L.length>1){var t=L[L.length-1].trim();if(!t||(t.length<60&&!/[.!?:"\\u201d\\u2019)]$/.test(t)))L.pop();else break}
s=L.join('\\n').trim().replace(/\\n{3,}/g,'\\n\\n');}
var w=g('meta[name="author"]')||g('meta[property="article:author"]')||g('[rel="author"]');
if(/^https?:/.test(w))w='';
var h=document.querySelector('h1.post-title,article h1,main h1,h1');
var d={url:location.href,title:(h&&h.innerText.trim())||g('meta[property="og:title"]')||document.title,text:s.slice(0,60000),writer:w.slice(0,120)};
var O=${JSON.stringify(origin)};
var w=window.open(O+'/capture?bm=1','ariadne');
if(!w){var u=O+'/capture#'+encodeURIComponent(JSON.stringify(d));if(u.length<8000){location.href=u}else{alert('Ariadne: allow pop-ups for this site, then click again.')}return}
var f=function(e){if(e.origin===O&&e.data==='ariadne:ready'){try{e.source.postMessage({type:'ariadne:page',d:d},O)}catch(_){}}if(e.origin===O&&e.data==='ariadne:got'){window.removeEventListener('message',f)}};
window.addEventListener('message',f);
try{w.focus()}catch(_){}
})()`;
  return "javascript:" + encodeURIComponent(js.replace(/\n/g, ""));
}
