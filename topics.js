
(function(){
  var K='k6eeg_units';
  function get(){ try{ return localStorage.getItem(K)==='si'?'si':'us'; }catch(e){ return 'us'; } }
  function apply(u){
    document.querySelectorAll('.u[data-us]').forEach(function(e){ e.innerHTML = u==='si' ? e.getAttribute('data-si') : e.getAttribute('data-us'); });
    document.querySelectorAll('.unitsw button').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-u')===u)); });
    document.documentElement.setAttribute('data-units', u);
  }
  function set(u){ try{ localStorage.setItem(K,u); }catch(e){} apply(u);
    try{ document.dispatchEvent(new CustomEvent('k6eeg-units',{detail:u})); }catch(e){} }
  if(!window.k6eegUnits){
    window.k6eegUnits={get:get, set:set, apply:function(){ apply(get()); }};
    document.addEventListener('click',function(ev){ var b=ev.target && ev.target.closest ? ev.target.closest('.unitsw button') : null;
      if(b) set(b.getAttribute('data-u')); });
  }
  apply(get());
})();

(function(){
  function nice(lo, hi){ if(lo===hi){lo-=1;hi+=1;} var span=hi-lo, step=Math.pow(10,Math.floor(Math.log10(span/4)));
    [1,2,2.5,5,10].some(function(m){ if(span/(step*m)<=5){step*=m;return true;} });
    return {lo:Math.floor(lo/step)*step, hi:Math.ceil(hi/step)*step, step:step}; }
  function fmt(v,d){ return v.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }
  // US or metric, from the site-wide switch (k6eeg_units): stored values are US units
  function U(d){ var si=d.si && window.k6eegUnits && window.k6eegUnits.get()==='si';
    return si ? {unit:d.si.unit, dec:d.si.dec, f:function(v){return v==null?v:v*d.si.a+d.si.b;}}
              : {unit:d.unit, dec:d.dec, f:function(v){return v;}}; }
  function el(n,a){ var e=document.createElementNS('http://www.w3.org/2000/svg',n); for(var k in a) e.setAttribute(k,a[k]); return e; }
  function draw(box, mode){
    var d=JSON.parse(box.querySelector('script[type="application/json"]').textContent), u=U(d);
    box._mode=mode;
    var svgWrap=box.querySelector('.chart'); svgWrap.innerHTML='';
    var W=640,H=220,L=48,R=12,T=12,B=28, iw=W-L-R, ih=H-T-B;
    var custom = mode==='custom', daily = mode==='daily' || (custom && box._daily);
    var pts = custom ? box._pts
            : mode==='daily' ? d.daily.map(function(r){return {t:Date.parse(r[0]+'T12:00:00'), lo:r[1], v:r[2], hi:r[3], day:r[0]};})
                             : d.recent.map(function(r){return {t:r[0]*1000, v:r[1]};});
    pts = pts.map(function(p){ return {t:p.t, v:u.f(p.v), lo:p.lo==null?null:u.f(p.lo), hi:p.hi==null?null:u.f(p.hi), day:p.day}; });
    if(custom && box._t0){ var c0=box._t0, c1=box._t1; }
    if(!pts.length){ svgWrap.textContent='No data yet.'; return; }
    var vals=[]; pts.forEach(function(p){ vals.push(p.v); if(p.lo!=null){vals.push(p.lo,p.hi);} });
    var vmin=Math.min.apply(null,vals); if(d.zero && vmin>0) vmin=0;
    var y=nice(vmin, Math.max.apply(null,vals));
    var t0=pts[0].t, t1=pts[pts.length-1].t; if(t1===t0) t1=t0+3600e3;
    var X=function(t){return L+(t-t0)/(t1-t0)*iw;}, Y=function(v){return T+ih-(v-y.lo)/(y.hi-y.lo)*ih;};
    if(custom){ t0=c0; t1=c1; }
    var svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':d.label+', '+(custom?'chosen dates':daily?'daily range':'last 7 days')});
    for(var v=y.lo; v<=y.hi+1e-9; v+=y.step){ svg.appendChild(el('line',{x1:L,x2:W-R,y1:Y(v),y2:Y(v),class:'grid'}));
      var tx=el('text',{x:L-6,y:Y(v)+4,'text-anchor':'end',class:'axis'}); tx.textContent=fmt(v,y.step<1?(y.step<0.1?2:1):0); svg.appendChild(tx); }
    var days=(t1-t0)/864e5, every = days>400?60:days>120?30:days>40?7:days>10?2:1;
    var start=new Date(t0); start.setHours(0,0,0,0);
    for(var t=start.getTime()+864e5; t<=t1; t+=864e5){ var dt=new Date(t);
      if((daily||custom) ? ((every>=30) ? dt.getDate()!==1 : (Math.round((t-start.getTime())/864e5)%every)) : 0) continue;
      var lab=el('text',{x:X(t),y:H-8,'text-anchor':'middle',class:'axis'});
      lab.textContent = (daily||custom) ? dt.toLocaleDateString(undefined,{month:'short',day:'numeric'}) : dt.toLocaleDateString(undefined,{weekday:'short'});
      if(X(t)>L+14 && X(t)<W-R-14) svg.appendChild(lab);
      if(!daily) svg.appendChild(el('line',{x1:X(t),x2:X(t),y1:T,y2:T+ih,class:'grid'})); }
    if(daily && pts.length>1){ var a='M'; pts.forEach(function(p,i){a+=(i?'L':'')+X(p.t)+','+Y(p.hi);});
      for(var i=pts.length-1;i>=0;i--) a+='L'+X(pts[i].t)+','+Y(pts[i].lo); svg.appendChild(el('path',{d:a+'Z',class:'band'})); }
    var line='', gap=daily?3*864e5:3*3600e3;
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
      var when = daily ? new Date(best.t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})
                                : new Date(best.t).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'});
      tip.innerHTML='<b>'+fmt(best.v,u.dec)+' '+u.unit+'</b> '+(daily?'average':'')+'<br>'+when+
        (daily?'<br>range '+fmt(best.lo,u.dec)+' to '+fmt(best.hi,u.dec):'');
      tip.style.visibility='visible'; var px=X(best.t)/W*r.width; tip.style.left=Math.min(Math.max(px-60,0),r.width-140)+'px'; }
    function out(){ cross.setAttribute('visibility','hidden'); dot.setAttribute('visibility','hidden'); tip.style.visibility='hidden'; }
    hit.addEventListener('mousemove',move); hit.addEventListener('touchmove',move,{passive:true});
    hit.addEventListener('mouseleave',out); hit.addEventListener('touchend',out);
    svgWrap.appendChild(svg);
  }
  // Chosen dates: the full record comes from /data/<key>.csv, fetched once, only when a date range is asked for.
  var csvCache={};
  function loadCSV(key){ if(!csvCache[key]) csvCache[key]=fetch('/data/'+key+'.csv').then(function(r){return r.text();}).then(function(t){
      return t.split('\n').filter(function(l){return /^\d{4}-/.test(l);}).map(function(l){ var c=l.split(',');
        return {t:Date.parse(c[0].replace('Z',':00Z')), v:parseFloat(c[1])}; }); });
    return csvCache[key]; }
  function dayKey(t){ var x=new Date(t); return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2); }
  function custom(box){
    var f=box.querySelector('.from').value, to=box.querySelector('.to').value, msg=box.querySelector('.pickmsg');
    if(!f||!to) return;
    var t0=Date.parse(f+'T00:00:00'), t1=Date.parse(to+'T23:59:59'); if(t1<t0){var x=t0;t0=t1;t1=x;}
    msg.textContent='Loading…';
    loadCSV(box.dataset.key).then(function(all){
      var sel=all.filter(function(p){return p.t>=t0&&p.t<=t1;});
      if(!sel.length){ msg.textContent='No measurements in those dates.'; return; }
      var days=(t1-t0)/864e5;
      if(days>21){ var by={}; sel.forEach(function(p){ var k=dayKey(p.t); (by[k]=by[k]||[]).push(p.v); });
        box._pts=Object.keys(by).sort().map(function(k){ var v=by[k], s=v.reduce(function(a,b){return a+b;},0);
          return {t:Date.parse(k+'T12:00:00'), lo:Math.min.apply(null,v), v:s/v.length, hi:Math.max.apply(null,v)}; });
        box._daily=true; } else { box._pts=sel; box._daily=false; }
      box._t0=t0; box._t1=t1;
      var d=JSON.parse(box.querySelector('script[type="application/json"]').textContent), u=U(d);
      var vals=sel.map(function(p){return u.f(p.v);}), avg=vals.reduce(function(a,b){return a+b;},0)/vals.length;
      msg.innerHTML=(days>21?'Daily range and average. ':'Every report. ')+'In those dates: avg <b>'+fmt(avg,u.dec)+'</b>, '+
        fmt(Math.min.apply(null,vals),u.dec)+' to '+fmt(Math.max.apply(null,vals),u.dec)+' '+u.unit+' ('+vals.length+' reports).';
      draw(box,'custom');
    }).catch(function(){ msg.textContent='Could not load the data file.'; });
  }
  document.querySelectorAll('.metric').forEach(function(box){
    var btns=box.querySelectorAll('.range button, .pick button');
    btns.forEach(function(b){ b.addEventListener('click',function(){ btns.forEach(function(x){x.setAttribute('aria-pressed',x===b);});
      var msg=box.querySelector('.pickmsg'); if(msg && b.dataset.mode!=='custom') msg.textContent='';
      if(b.dataset.mode==='custom') custom(box); else draw(box,b.dataset.mode); }); });
    box.querySelectorAll('.pick input').forEach(function(i){ i.addEventListener('change',function(){
      btns.forEach(function(x){x.setAttribute('aria-pressed',x.dataset.mode==='custom');}); custom(box); }); });
    draw(box,'recent');
  });
  document.addEventListener('k6eeg-units',function(){ document.querySelectorAll('.metric').forEach(function(box){
    if(!box.querySelector('.chart')) return;
    if(box._mode==='custom') custom(box); else draw(box, box._mode||'recent'); }); });
  document.querySelectorAll('[data-utc]').forEach(function(e){ var t=new Date(e.dataset.utc);
    e.textContent=t.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+(e.dataset.day?' '+t.toLocaleDateString(undefined,{weekday:'short'}):''); });
  document.querySelectorAll('tr[data-end]').forEach(function(r){ var now=Date.now();
    if(Date.parse(r.dataset.end)<now || Date.parse(r.dataset.start)>now+4*3600e3) r.style.display='none'; });
})();
