
(function(){
  function nice(lo, hi){ if(lo===hi){lo-=1;hi+=1;} var span=hi-lo, step=Math.pow(10,Math.floor(Math.log10(span/4)));
    [1,2,2.5,5,10].some(function(m){ if(span/(step*m)<=5){step*=m;return true;} });
    return {lo:Math.floor(lo/step)*step, hi:Math.ceil(hi/step)*step, step:step}; }
  function fmt(v,d){ return v.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function el(n,a){ var e=document.createElementNS('http://www.w3.org/2000/svg',n); for(var k in a) e.setAttribute(k,a[k]); return e; }
  function draw(box, mode){
    var d=JSON.parse(box.querySelector('script[type="application/json"]').textContent);
    var svgWrap=box.querySelector('.chart'); svgWrap.innerHTML='';
    var W=640,H=220,L=48,R=12,T=12,B=28, iw=W-L-R, ih=H-T-B;
    var pts = mode==='daily' ? d.daily.map(function(r){return {t:Date.parse(r[0]+'T12:00:00'), lo:r[1], v:r[2], hi:r[3], day:r[0]};})
                             : d.recent.map(function(r){return {t:r[0]*1000, v:r[1]};});
    if(!pts.length){ svgWrap.textContent='No data yet.'; return; }
    var vals=[]; pts.forEach(function(p){ vals.push(p.v); if(p.lo!=null){vals.push(p.lo,p.hi);} });
    var vmin=Math.min.apply(null,vals); if(d.zero && vmin>0) vmin=0;
    var y=nice(vmin, Math.max.apply(null,vals));
    var t0=pts[0].t, t1=pts[pts.length-1].t; if(t1===t0) t1=t0+3600e3;
    var X=function(t){return L+(t-t0)/(t1-t0)*iw;}, Y=function(v){return T+ih-(v-y.lo)/(y.hi-y.lo)*ih;};
    var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':d.label+', '+(mode==='daily'?'daily range':'last 7 days')});
    for(var v=y.lo; v<=y.hi+1e-9; v+=y.step){ svg.appendChild(el('line',{x1:L,x2:W-R,y1:Y(v),y2:Y(v),class:'grid'}));
      var tx=el('text',{x:L-6,y:Y(v)+4,'text-anchor':'end',class:'axis'}); tx.textContent=fmt(v,y.step<1?(y.step<0.1?2:1):0); svg.appendChild(tx); }
    var days=(t1-t0)/864e5, every = days>400?60:days>120?30:days>40?7:days>10?2:1;
    var start=new Date(t0); start.setHours(0,0,0,0);
    for(var t=start.getTime()+864e5; t<=t1; t+=864e5){ var dt=new Date(t);
      if(mode==='daily' ? ((every>=30) ? dt.getDate()!==1 : (Math.round((t-start.getTime())/864e5)%every)) : 0) continue;
      var lab=el('text',{x:X(t),y:H-8,'text-anchor':'middle',class:'axis'});
      lab.textContent = mode==='daily' ? dt.toLocaleDateString(undefined,{month:'short',day:'numeric'}) : dt.toLocaleDateString(undefined,{weekday:'short'});
      if(X(t)>L+14 && X(t)<W-R-14) svg.appendChild(lab);
      if(mode!=='daily') svg.appendChild(el('line',{x1:X(t),x2:X(t),y1:T,y2:T+ih,class:'grid'})); }
    if(mode==='daily' && pts.length>1){ var a='M'; pts.forEach(function(p,i){a+=(i?'L':'')+X(p.t)+','+Y(p.hi);});
      for(var i=pts.length-1;i>=0;i--) a+='L'+X(pts[i].t)+','+Y(pts[i].lo); svg.appendChild(el('path',{d:a+'Z',class:'band'})); }
    var line='', gap=mode==='daily'?3*864e5:3*3600e3;
    pts.forEach(function(p,i){ line+=((i&&p.t-pts[i-1].t<=gap)?'L':'M')+X(p.t).toFixed(1)+','+Y(p.v).toFixed(1); });
    svg.appendChild(el('path',{d:line,class:'line'}));
    if(pts.length===1) svg.appendChild(el('circle',{cx:X(pts[0].t),cy:Y(pts[0].v),r:4,class:'dot'}));
    var cross=el('line',{y1:T,y2:T+ih,class:'cross',visibility:'hidden'}), dot=el('circle',{r:4,class:'dot',visibility:'hidden'});
    svg.appendChild(cross); svg.appendChild(dot);
    var tip=box.querySelector('.tip');
    var hit=el('rect',{x:L,y:T,width:iw,height:ih,fill:'transparent'}); svg.appendChild(hit);
    function move(ev){ var r=svg.getBoundingClientRect(), sx=(ev.touches?ev.touches[0].clientX:ev.clientX)-r.left;
      var t=t0+((sx*W/r.width)-L)/iw*(t1-t0), best=pts[0];
      pts.forEach(function(p){ if(Math.abs(p.t-t)<Math.abs(best.t-t)) best=p; });
      cross.setAttribute('x1',X(best.t)); cross.setAttribute('x2',X(best.t)); cross.setAttribute('visibility','visible');
      dot.setAttribute('cx',X(best.t)); dot.setAttribute('cy',Y(best.v)); dot.setAttribute('visibility','visible');
      var when = mode==='daily' ? new Date(best.t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})
                                : new Date(best.t).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'});
      tip.innerHTML='<b>'+fmt(best.v,d.dec)+' '+d.unit+'</b> '+(mode==='daily'?'average':'')+'<br>'+when+
        (mode==='daily'?'<br>range '+fmt(best.lo,d.dec)+' to '+fmt(best.hi,d.dec):'');
      tip.style.visibility='visible'; var px=X(best.t)/W*r.width; tip.style.left=Math.min(Math.max(px-60,0),r.width-140)+'px'; }
    function out(){ cross.setAttribute('visibility','hidden'); dot.setAttribute('visibility','hidden'); tip.style.visibility='hidden'; }
    hit.addEventListener('mousemove',move); hit.addEventListener('touchmove',move,{passive:true});
    hit.addEventListener('mouseleave',out); hit.addEventListener('touchend',out);
    svgWrap.appendChild(svg);
  }
  document.querySelectorAll('.metric').forEach(function(box){
    var btns=box.querySelectorAll('.range button');
    btns.forEach(function(b){ b.addEventListener('click',function(){ btns.forEach(function(x){x.setAttribute('aria-pressed',x===b);}); draw(box,b.dataset.mode); }); });
    draw(box,'recent');
  });
  document.querySelectorAll('[data-utc]').forEach(function(e){ var t=new Date(e.dataset.utc);
    e.textContent=t.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+(e.dataset.day?' '+t.toLocaleDateString(undefined,{weekday:'short'}):''); });
  document.querySelectorAll('tr[data-end]').forEach(function(r){ var now=Date.now();
    if(Date.parse(r.dataset.end)<now || Date.parse(r.dataset.start)>now+4*3600e3) r.style.display='none'; });
})();
