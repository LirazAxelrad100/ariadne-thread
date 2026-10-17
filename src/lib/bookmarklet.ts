/** The bookmarklet source. It never saves: it reads the page in the user's own
 * browser (so paywalled pages work), opens /capture?bm=1, and hands the page
 * over by postMessage once that tab says it's ready. The capture tab then
 * becomes Write, so the user sees the page land in the composer. Chrome won't
 * target a user-opened tab by window name, so each press opens the capture
 * tab fresh (Chrome reuses it while it stays open). A whole article is too
 * big for a URL ("Payload Too Large"), so only a short text may ride in the
 * hash, as a fallback when the tab can't be opened. */
export function bookmarkletHref(origin: string) {
  const js = `(function(){
var g=function(q){var e=document.querySelector(q);return e?(e.getAttribute('content')||e.textContent||'').trim():''};
var s=String(window.getSelection()||'').trim();
if(!s){var a=document.querySelector('.available-content .body.markup')||document.querySelector('.body.markup')||document.querySelector('[itemprop="articleBody"]')||document.querySelector('[data-gu-name="body"]')||document.querySelector('.article-body,.article__body,.post-content,.entry-content')||document.querySelector('article')||document.querySelector('main')||document.body;
var c=a.cloneNode(true);c.querySelectorAll('script,style,nav,aside,footer,header,figure,figcaption,button,form,iframe,.subscription-widget-wrap,.subscribe-widget,.post-ufi,.share-dialog,.button-wrapper,.captioned-image-container').forEach(function(e){e.remove()});
var x=document.createElement('div');x.style.cssText='position:fixed;left:-99999px;top:0;width:800px';x.appendChild(c);document.body.appendChild(x);s=(c.innerText||'').trim();x.remove();
var P=['h1.post-title','.reader-article-header__title','article h1','main h1','h1'],h=null,i=0;while(!h&&i<P.length){h=document.querySelector(P[i]);i++}
var T=((h||{}).innerText||'').trim();var OT=g('meta[property="og:title"]');var L=s.split('\\n'),i=0;while(i<L.length){var q=L[i].trim();if(q.length>=60)break;if(q&&q!==T&&q!==OT&&!/^published\\b/i.test(q)&&(/[.!?:"\\u201d\\u2019)]$/.test(q)||/^([-*\\u2022]|\\d+\\.)\\s/.test(q)))break;i++}if(i>0&&i<L.length&&/^[A-Z\u00C0-\u024F]$/.test(L[i-1].trim()))L[i]=L[i-1].trim()+L[i].trim();if(i<L.length)s=L.slice(i).join('\\n').trim();
s=s.split('\\n').filter(function(l){var t=l.trim();return !/^(\\d+|share|subscribe|like|comment|restack|become a.*subscriber|upgrade to paid)$/i.test(t)}).join('\\n');
var E=s.search(/\\n\\s*(explore more on these topics|reuse this content|most viewed|related stories|related articles|read more|more from|you might also like|share this post|discussion about this post|ready for more\\?)\\s*\\n/i);if(E>0)s=s.slice(0,E);
L=s.split('\\n');while(L.length>1){var t=L[L.length-1].trim();if(!t||(t.length<60&&!/[.!?:"\\u201d\\u2019)]$/.test(t)))L.pop();else break}
s=L.join('\\n').trim().replace(/\\n{3,}/g,'\\n\\n');}
var nu=function(v){v=(v||'').replace(/\\s+/g,' ').trim().replace(/^(by|author:?|written by)\\s+/i,'').replace(/^author:\\s*/i,'').trim();if(/^https?:/.test(v)||v.length>80||v.indexOf('|')>=0||/\\b(marketing|communications|web team|staff|editorial|newsroom|university of|magazine|admin)\\b/i.test(v)||/^(our |all |meet the |see all )?(contributors?|authors?|writers?|columnists?)$/i.test(v))return '';return v};
var la=function(){var A=document.querySelectorAll('a[href*="/contributor/"],a[href*="/contributors/"],a[href*="/author/"],a[href*="/authors/"]');for(var k=0;k<A.length;k++){if(A[k].closest('nav,header,footer,[role="navigation"],.menu'))continue;if(!/\\/(contributors?|authors?)\\/[^\\/?#]+/i.test(A[k].getAttribute('href')||''))continue;var r=nu(A[k].textContent);if(r)return r}return ''};
var w=nu(g('[rel="author"]'))||nu(g('[property="author"] [property="name"]'))||nu(g('[itemprop="author"] [itemprop="name"]'))||nu(g('[itemprop="author"]'))||nu(g('.byline a'))||nu(g('.byline,[class*="byline"]'))||la()||nu(g('.reader-author-info__name'))||nu(g('[data-tracking-control-name="public_post_author-name"]'))||nu(g('meta[name="author"]'))||nu(g('meta[name="sailthru.author"]'))||nu(g('meta[name="parsely-author"]'))||nu(g('meta[property="article:author"]'))||nu(g('[class*="author"] [class*="name"]'));
if(!w){try{var jj=document.querySelectorAll('script[type="application/ld+json"]');for(var k=0;k<jj.length;k++){var o=JSON.parse(jj[k].textContent);if(Array.isArray(o))o=o[0];if(o&&o['@graph'])o=o['@graph'].filter(function(z){return z.author})[0]||o['@graph'][0];var au=o&&(o.author||o.creator);if(au){w=nu((Array.isArray(au)?au[0]:au).name||'');if(w)break}}}catch(_){}}
var D=g('[data-fp-dek]')||g('.article-dek,.article-subtitle,.entry__subtitle,[data-testid="article-subtitle"]')||g('meta[property="og:description"]')||g('meta[name="description"]');if(D&&!window.getSelection().toString().trim()&&D.length>20&&s.indexOf(D.slice(0,40))<0&&!/(\\u2026|\\.\\.\\.)$/.test(D))s=D+'\\n\\n'+s;
var d={url:location.href,title:OT||(h&&h.innerText.trim())||document.title,text:s.slice(0,60000),writer:w.slice(0,120)};
var O=${JSON.stringify(origin)};
var w=window.open(O+'/capture?bm=1','ariadne');
if(!w){var u=O+'/capture#'+encodeURIComponent(JSON.stringify(d));if(u.length<8000){location.href=u}else{alert('Ariadne: allow pop-ups for this site, then click again.')}return}
var f=function(e){if(e.origin===O&&e.data==='ariadne:ready'){try{e.source.postMessage({type:'ariadne:page',d:d},O)}catch(_){}}if(e.origin===O&&e.data==='ariadne:got'){window.removeEventListener('message',f)}};
window.addEventListener('message',f);
try{w.focus()}catch(_){}
})()`;
  return "javascript:" + encodeURIComponent(js.replace(/\n/g, ""));
}
