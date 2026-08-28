const SOURCES={
 games:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=494547914&single=true&output=csv",
 series:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1321514078&single=true&output=csv",
 streams:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1487247838&single=true&output=csv"
};

const TIMEZONES=[
 ["auto","Automático"],["Europe/Madrid","España — Madrid"],["Atlantic/Canary","España — Canarias"],
 ["America/Argentina/Buenos_Aires","Argentina"],["America/Santiago","Chile — Santiago"],["America/Punta_Arenas","Chile — Punta Arenas"],
 ["America/Asuncion","Paraguay"],["America/Bogota","Colombia"],["America/Lima","Perú"],["America/Guayaquil","Ecuador"],["Pacific/Galapagos","Ecuador — Galápagos"],
 ["America/Caracas","Venezuela"],["America/La_Paz","Bolivia"],["America/Montevideo","Uruguay"],
 ["America/Mexico_City","México — Centro"],["America/Cancun","México — Sureste"],["America/Mazatlan","México — Pacífico"],["America/Tijuana","México — Noroeste"],
 ["America/Guatemala","Guatemala"],["America/El_Salvador","El Salvador"],["America/Tegucigalpa","Honduras"],["America/Managua","Nicaragua"],["America/Costa_Rica","Costa Rica"],["America/Panama","Panamá"],
 ["America/Santo_Domingo","República Dominicana"],["America/Havana","Cuba"],["America/Puerto_Rico","Puerto Rico"],["Africa/Malabo","Guinea Ecuatorial"]
];

let games=[],series=[],streams=[],selectedTZ="auto",weekOffset=0,selectedExtra="locke";


function parseCSV(text){
 const rows=[];let row=[],cell="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){row.push(cell.trim());cell="";continue}if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());cell="";if(row.some(v=>v!==''))rows.push(row);row=[];continue}cell+=c}if(cell||row.length){row.push(cell.trim());rows.push(row)}const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
async function loadCSV(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("CSV");return parseCSV(await r.text())}
function field(obj,name){const key=Object.keys(obj||{}).find(k=>k.trim().toLowerCase()===name.trim().toLowerCase());return key?String(obj[key]??"").trim():""}
function game(id){return games.find(x=>field(x,"ID_JUEGO")===id)||{}}
function serie(id){return series.find(x=>field(x,"ID_SERIE")===id)||{}}
function cleanDate(v){if(!v)return "";v=String(v).trim();let m=v.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;m=v.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;const d=new Date(v);if(!isNaN(d))return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return v}
function madridToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function madridDateWithOffset(date,time,hours=0){
 const clean=cleanDate(date);
 if(!clean||!time)return new Date(NaN);
 const [y,m,d]=clean.split('-').map(Number);
 const parts=String(time).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
 if(!parts)return new Date(NaN);
 const hh=Number(parts[1]),mm=Number(parts[2]);
 if(hh>23||mm>59)return new Date(NaN);
 let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
 for(let i=0;i<6;i++){
   const p=new Intl.DateTimeFormat('en-US',{
     timeZone:'Europe/Madrid',hour12:false,year:'numeric',month:'2-digit',
     day:'2-digit',hour:'2-digit',minute:'2-digit'
   }).formatToParts(guess);
   const get=k=>Number(p.find(x=>x.type===k).value);
   const wall=Date.UTC(get('year'),get('month')-1,get('day'),get('hour')%24,get('minute'));
   const target=Date.UTC(y,m-1,d,hh,mm);
   guess=new Date(guess.getTime()-(wall-target));
 }
 guess.setTime(guess.getTime()+Number(hours||0)*3600000);
 return guess;
}
function past(){
  const now = new Date();
  const byDate = {};

  // Cada directo se evalúa por separado. El segundo (y siguientes) no
  // dependen de que cambie el día: se calculan a partir del primero
  // que tenga una hora válida.
  streams.forEach(s => {
    const date = cleanDate(field(s,"FECHA"));
    if(!date) return;
    (byDate[date] ||= []).push(s);
  });

  const result = [];

  Object.entries(byDate).forEach(([date, dayStreams]) => {
    // Ordenamos por número de directo. Si no existe, conservamos el orden
    // de la hoja como desempate.
    const ordered = dayStreams.map((s,index)=>({s,index})).sort((a,b)=>{
      const na = parseInt(String(field(a.s,"DIRECTO")).match(/\d+/)?.[0] || "9999",10);
      const nb = parseInt(String(field(b.s,"DIRECTO")).match(/\d+/)?.[0] || "9999",10);
      return na-nb || a.index-b.index;
    }).map(x=>x.s);

    const firstWithTime = ordered.find(s => String(field(s,"HORA_ESPAÑA")||"").trim());
    const firstTime = firstWithTime ? String(field(firstWithTime,"HORA_ESPAÑA")).trim() : "";

    ordered.forEach((s,index)=>{
      let time = String(field(s,"HORA_ESPAÑA")||"").trim();

      // Si un directo no tiene hora propia, usamos la del primero del día.
      if(!time) time = firstTime;
      if(!time) return;

      // Un directo con hora propia termina/cuenta una hora después.
      // Los siguientes sin hora propia terminan según su posición:
      // 1.º = +1h, 2.º = +2h, 3.º = +3h, etc.
      const hours = String(field(s,"HORA_ESPAÑA")||"").trim()
        ? 1
        : index + 1;

      const end = madridDateWithOffset(date,time,hours);
      if(!isNaN(end.getTime()) && end <= now) result.push(s);
    });
  });

  return result;
}
function tz(){return selectedTZ==='auto'?Intl.DateTimeFormat().resolvedOptions().timeZone:selectedTZ}
function madridToVisitor(date,time){
 if(!time)return "Después del primero";
 const [y,m,d]=cleanDate(date).split('-').map(Number),[hh,mm]=time.split(':').map(Number);let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
 for(let i=0;i<4;i++){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(guess),get=k=>Number(p.find(x=>x.type===k).value);const wall=Date.UTC(get('year'),get('month')-1,get('day'),get('hour')%24,get('minute')),target=Date.UTC(y,m-1,d,hh,mm);guess=new Date(guess.getTime()-(wall-target))}
 return new Intl.DateTimeFormat('es-ES',{timeZone:tz(),hour:'2-digit',minute:'2-digit',hour12:false}).format(guess);
}
function fmtShort(d){return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(d)}
function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function gameName(g,id){return field(g,"NOMBRE")||id}
function gameImage(g){return field(g,"IMAGEN_VERTICAL")}
function seriesName(s,id){return field(s,"NOMBRE_SERIE")||id}
function seriesLink(s){return field(s,"ENLACE")||field(s,"Enlace")}
function streamData(s){const gid=field(s,"ID_JUEGO"),sid=field(s,"ID_SERIE"),g=game(gid),se=serie(sid);return {gid,sid,g,se,time:madridToVisitor(field(s,"FECHA"),field(s,"HORA_ESPAÑA"))}}
function streamCard(s){const {g,se,time}=streamData(s);return `<article class="stream-card"><img class="cover" src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div class="stream-info"><div class="type">${field(s,"DIRECTO")==='1'?'Primer directo':'Segundo directo'}</div><div class="time">${escape(time)}</div><h2>${escape(gameName(g,field(s,"ID_JUEGO")))}</h2><p class="series-name">${escape(seriesName(se,field(s,"ID_SERIE")))}</p></div></article>`}
function miniStream(s){const {g,se,time}=streamData(s);return `<article class="mini-stream"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div class="mini-time">${escape(time)}</div><h3>${escape(gameName(g,field(s,"ID_JUEGO")))}</h3><div class="mini-series">${escape(seriesName(se,field(s,"ID_SERIE")))}</div></article>`}
function renderToday(){const today=madridToday(),ss=streams.filter(s=>cleanDate(field(s,"FECHA"))===today).sort((a,b)=>Number(field(a,"DIRECTO"))-Number(field(b,"DIRECTO")));document.getElementById('today').innerHTML=ss.length?`<div class="today-grid">${ss.map(streamCard).join('')}</div>`:`<div class="empty">Hoy no hay directo.</div>`}
function monday(d){const x=new Date(d);x.setHours(0,0,0,0);const n=x.getDay();x.setDate(x.getDate()-(n===0?6:n-1));return x}
function renderWeek(){const start=monday(new Date());start.setDate(start.getDate()+weekOffset*7);const end=new Date(start);end.setDate(end.getDate()+6);document.getElementById('weekTitle').textContent=`${fmtShort(start)} — ${fmtShort(end)}`;const today=madridToday();let html='';for(let i=0;i<7;i++){const d=new Date(start);d.setDate(d.getDate()+i);const ds=localDate(d),ss=streams.filter(s=>cleanDate(field(s,"FECHA"))===ds).sort((a,b)=>Number(field(a,"DIRECTO"))-Number(field(b,"DIRECTO")));html+=`<div class="day-column ${ds===today?'today':''}"><div class="day-head"><div class="day-name">${escape(new Intl.DateTimeFormat('es-ES',{weekday:'long'}).format(d))}</div><div class="day-date">${escape(fmtShort(d))}</div></div><div class="day-streams">${ss.length?ss.map(miniStream).join(''):'<div class="empty">—</div>'}</div></div>`}document.getElementById('week').innerHTML=html}
function renderStats(){
 const ps=past(),gc={},sc={};
 ps.forEach(s=>{
   const gid=field(s,"ID_JUEGO"),sid=field(s,"ID_SERIE");
   gc[gid]=(gc[gid]||0)+1;
   sc[sid]=(sc[sid]||0)+1;
 });
 const rows=(obj,fn)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([id,n],i)=>`<div class="rank-row"><span class="rank-number">#${i+1}</span><span>${escape(fn(id))}</span><span class="rank-count">${n}</span></div>`).join('');

 // Distribución visual: cada juego ocupa exactamente su porcentaje del ancho.
 // Se muestran los 10 juegos con más directos y el resto agrupado en "Otros".
 const total=ps.length;
 const sortedGames=Object.entries(gc).sort((a,b)=>b[1]-a[1]);
 const topGames=sortedGames.slice(0,10);
 const otherCount=sortedGames.slice(10).reduce((sum,[,n])=>sum+n,0);
 const distribution=[...topGames];
 if(otherCount>0) distribution.push(['__other__',otherCount]);
 const distributionHtml=distribution.map(([id,n])=>{
   const pct=total ? (n/total)*100 : 0;
   const name=id==='__other__' ? `Otros ${Math.max(0,sortedGames.length-10)} juegos` : gameName(game(id),id);
   const image=id==='__other__' ? '' : gameImage(game(id));
   return `<div class="distribution-segment" style="--segment-pct:${pct}" title="${escape(name)} — ${pct.toFixed(1)}%">
     <div class="distribution-percent">${pct.toFixed(1)}%</div>
     <div class="distribution-image ${image?'':'distribution-other'}">
       ${image?`<img src="images/${escape(image)}" alt="${escape(name)}" onerror="this.style.visibility='hidden'">`:'<span>🎮</span>'}
     </div>
   </div>`;
 }).join('');

 document.getElementById('statsContent').innerHTML=`
   <div class="stats-grid">
     <div class="stat"><div class="stat-label">Directos</div><div class="stat-value">${ps.length}</div></div>
     <div class="stat"><div class="stat-label">Juegos</div><div class="stat-value">${Object.keys(gc).length}</div></div>
     <div class="stat"><div class="stat-label">Series</div><div class="stat-value">${Object.keys(sc).length}</div></div>
   </div>
   <div class="distribution-card">
     <div class="distribution-title">STREAM TIME DISTRIBUTION</div>
     <div class="distribution-bar">${distributionHtml||'<div class="empty">—</div>'}</div>
   </div>
   <div class="ranking"><h2>Juegos más emitidos</h2>${rows(gc,id=>gameName(game(id),id))||'<div class="empty">—</div>'}</div>
   <div class="ranking"><h2>Series más emitidas</h2>${rows(sc,id=>seriesName(serie(id),id))||'<div class="empty">—</div>'}</div>`;
}
function renderGames(){document.getElementById('gamesList').innerHTML=games.map(g=>{const id=field(g,"ID_JUEGO"),count=past().filter(s=>field(s,"ID_JUEGO")===id).length;return `<article class="game-card" data-game="${escape(id)}"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><h2>${escape(gameName(g,id))}</h2><div class="muted">${count} directos</div></article>`}).join('')||'<div class="empty">—</div>';document.querySelectorAll('.game-card').forEach(c=>c.onclick=()=>showGame(c.dataset.game))}
function renderSeries(){const counts={};past().forEach(s=>{const id=field(s,"ID_SERIE");counts[id]=(counts[id]||0)+1});document.getElementById('seriesList').innerHTML=series.map(s=>{const sid=field(s,"ID_SERIE"),gid=field(s,"ID_JUEGO"),g=game(gid),link=seriesLink(s);return `<article class="series-card" data-series="${escape(sid)}"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div class="series-card-body"><h2>${escape(seriesName(s,sid))}</h2><div class="series-game">${escape(gameName(g,gid))}</div><div class="series-count">${counts[sid]||0} directos</div>${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Ver playlist</a>`:''}</div></article>`}).join('')||'<div class="empty">—</div>';document.querySelectorAll('.series-card').forEach(c=>c.onclick=e=>{if(e.target.closest('a'))return;showSeries(c.dataset.series)})}
function showGame(id,push=true){const g=game(id),ps=past().filter(s=>field(s,"ID_JUEGO")===id),counts={};ps.forEach(s=>{const sid=field(s,"ID_SERIE");counts[sid]=(counts[sid]||0)+1});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const relevant=series.filter(s=>field(s,"ID_JUEGO")===id);document.getElementById('catalog-juegos').classList.remove('active');document.getElementById('catalog-series').classList.remove('active');const detail=document.getElementById('catalog-detail');detail.classList.add('active');detail.innerHTML=`<button class="back" onclick="backCatalog('juegos')">← Juegos</button><div class="detail-top"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div><h2>${escape(gameName(g,id))}</h2><p class="muted">${ps.length} directos</p><h3>Serie más larga</h3><p>${sorted[0]?`${escape(seriesName(serie(sorted[0][0]),sorted[0][0]))} — ${sorted[0][1]} directos`:'—'}</p><h3>Series</h3><div class="series-list">${relevant.map(s=>{const sid=field(s,"ID_SERIE"),n=counts[sid]||0,link=seriesLink(s);return `<div class="series-item" data-series="${escape(sid)}"><strong>${escape(seriesName(s,sid))}</strong><span class="muted">${n} directos</span>${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Playlist</a>`:''}</div>`}).join('')||'<span class="muted">Sin series.</span>'}</div></div></div>`;detail.querySelectorAll('.series-item').forEach(el=>el.onclick=e=>{if(e.target.closest('a'))return;showSeries(el.dataset.series)});if(push)history.pushState({page:'catalogo',tab:'juegos',detail:'game',id},'',`#catalogo/juegos/game/${encodeURIComponent(id)}`)}
function showSeries(id,push=true){const s=serie(id),gid=field(s,"ID_JUEGO"),g=game(gid),ps=past().filter(x=>field(x,"ID_SERIE")===id),link=seriesLink(s);document.getElementById('catalog-juegos').classList.remove('active');document.getElementById('catalog-series').classList.remove('active');const detail=document.getElementById('catalog-detail');detail.classList.add('active');detail.innerHTML=`<button class="back" onclick="backCatalog('series')">← Series</button><div class="detail-top"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div><h2>${escape(seriesName(s,id))}</h2><p class="muted">${escape(gameName(g,gid))}</p><p>${ps.length} directos</p>${link?`<a class="playlist big" href="${escape(link)}" target="_blank" rel="noopener">Ver playlist en YouTube</a>`:''}</div></div>`;if(push)history.pushState({page:'catalogo',tab:'series',detail:'series',id},'',`#catalogo/series/series/${encodeURIComponent(id)}`)}
function backCatalog(tab='juegos',push=true){document.getElementById('catalog-detail').classList.remove('active');document.getElementById('catalog-'+tab).classList.add('active');document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog===tab));if(push)history.pushState({page:'catalogo',tab},'',`#catalogo/${tab}`)}
function setupCatalog(){document.querySelectorAll('.catalog-btn').forEach(b=>b.onclick=()=>{const tab=b.dataset.catalog;document.querySelectorAll('.catalog-btn').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('catalog-juegos').classList.toggle('active',tab==='juegos');document.getElementById('catalog-series').classList.toggle('active',tab==='series');document.getElementById('catalog-detail').classList.remove('active');history.pushState({page:'catalogo',tab},'',`#catalogo/${tab}`)});}
function setupTZ(){const el=document.getElementById('timezoneSelect');el.innerHTML=TIMEZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');el.value='auto';el.onchange=()=>{selectedTZ=el.value;renderToday();renderWeek()}}
function showExtra(sub='locke',push=true){
 const valid=['locke','medallas','minijuegos'];
 if(!valid.includes(sub))sub='locke';
 selectedExtra=sub;
 document.querySelectorAll('.extra-tab').forEach(b=>b.classList.toggle('active',b.dataset.extra===sub));
 document.querySelectorAll('.extra-page').forEach(p=>p.classList.toggle('active',p.id===`extra-${sub}`));
 if(push)history.pushState({page:'extra',sub},'',`#extra/${sub}`);
}
function setupExtra(){
 document.querySelectorAll('.extra-tab').forEach(b=>b.onclick=()=>showExtra(b.dataset.extra));
}
function showPage(page,push=true){const valid=['inicio','calendario','catalogo','extra'];if(!valid.includes(page))page='inicio';document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(page==='calendario'){renderToday();renderWeek();renderStats()}if(page==='catalogo'){renderGames();renderSeries();document.getElementById('catalog-detail').classList.remove('active');document.getElementById('catalog-juegos').classList.add('active');document.getElementById('catalog-series').classList.remove('active');document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog==='juegos'));}if(push)history.pushState({page},'',`#${page}`)}
function showSub(sub,push=true){document.querySelectorAll('.subpage').forEach(p=>p.classList.toggle('active',p.id===sub));document.querySelectorAll('.sub-btn').forEach(b=>b.classList.toggle('active',b.dataset.subpage===sub));if(push)history.pushState({page:'calendario',sub},'',`#calendario/${sub}`)}
function setupNav(){document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelector('.brand').onclick=e=>{e.preventDefault();showPage('inicio')};document.querySelectorAll('.sub-btn').forEach(b=>b.onclick=()=>showSub(b.dataset.subpage));window.addEventListener('popstate',()=>{restoreRoute(false)})}
function setupWeek(){document.getElementById('prevWeek').onclick=()=>{weekOffset--;renderWeek();history.pushState({page:'calendario',sub:'semana',weekOffset},'',`#calendario/semana/${weekOffset}`)};document.getElementById('nextWeek').onclick=()=>{weekOffset++;renderWeek();history.pushState({page:'calendario',sub:'semana',weekOffset},'',`#calendario/semana/${weekOffset}`)};document.getElementById('todayWeek').onclick=()=>{weekOffset=0;renderWeek();history.pushState({page:'calendario',sub:'semana',weekOffset:0},'',`#calendario/semana/0`)}}
function restoreRoute(push=false){
 const p=location.hash.replace('#','').split('/');
 const page=p[0]||'inicio';
 if(page==='calendario'){
   showPage('calendario',push);
   showSub(p[1]==='stats'?'stats':'semana',push);
   weekOffset=p[2]?Number(p[2])||0:0;
   renderWeek();
 }else if(page==='catalogo'){
   showPage('catalogo',push);
   const tab=p[1]==='series'?'series':'juegos';
   if(p[2]==='game'&&tab==='juegos'&&p[3]){
     document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog==='juegos'));
     showGame(decodeURIComponent(p[3]),false);
   }else if(p[2]==='series'&&tab==='series'&&p[3]){
     document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog==='series'));
     showSeries(decodeURIComponent(p[3]),false);
   }else{
     document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog===tab));
     document.getElementById('catalog-juegos').classList.toggle('active',tab==='juegos');
     document.getElementById('catalog-series').classList.toggle('active',tab==='series');
     document.getElementById('catalog-detail').classList.remove('active');
   }
 }else if(page==='extra'){
   showPage('extra',push);
   showExtra(p[1]||'locke',push);
 }else{
   showPage('inicio',push);
 }
}
async function init(){try{[games,series,streams]=await Promise.all([loadCSV(SOURCES.games),loadCSV(SOURCES.series),loadCSV(SOURCES.streams)]);setupTZ();setupNav();setupWeek();setupCatalog();setupExtra();renderToday();renderWeek();renderStats();renderGames();renderSeries();restoreRoute(false)}catch(e){console.error(e);document.getElementById('today').innerHTML='<div class="empty">No se ha podido cargar el calendario.</div>'}}
init();

// Las estadísticas dependen de la hora actual, no del cambio de día.
// Refrescamos cada 30 segundos para que un directo pase a "contado"
// automáticamente cuando se cumple su hora de finalización.
setInterval(()=>{
  if(streams.length){
    renderStats();
    if(document.getElementById('calendario')?.classList.contains('active')){
      renderToday();
      renderWeek();
    }
  }
},30000);
