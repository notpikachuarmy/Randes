const SOURCES={
 games:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=494547914&single=true&output=csv",
 series:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1321514078&single=true&output=csv",
 streams:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1487247838&single=true&output=csv",
 medals:"https://docs.google.com/spreadsheets/d/1uxeXCUyWi2kLAWEGJjZ91zutr18sr7_QjHqxfPVzgCA/export?format=csv&gid=0",
 users:"https://docs.google.com/spreadsheets/d/1Pri9HhHGipD08e847iUKruXPLzG9tWki3N5rQPu2cMw/export?format=csv&gid=0",
 news:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTo3r5CBaQRbk4Qy_QUKLsAvM4XgzNf4-PD4_ql9cehWdnrRzCPnoSdSBpeqasfISKCuUjqNPz7z5mN/pub?output=csv"
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

let games=[],series=[],streams=[],medals=[],users=[],news=[],selectedTZ="auto",weekOffset=0,selectedExtra="locke";


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
function directNumber(s, fallback=9999){
 const n=parseInt(String(field(s,"DIRECTO")).match(/\d+/)?.[0]||"",10);
 return Number.isFinite(n)?n:fallback;
}
function scheduledDay(date, dayStreams){
 const ordered=dayStreams.map((s,index)=>({s,index})).sort((a,b)=>directNumber(a.s)-directNumber(b.s)||a.index-b.index);
 // La hora que manda es la del primer directo. A partir de ahí, cada
 // directo siguiente empieza exactamente 1 hora después. Si por algún
 // motivo el primero no tiene hora, usamos una hora disponible como ancla.
 const anchor=ordered.find(x=>String(field(x.s,"HORA_ESPAÑA")||"").trim());
 if(!anchor)return [];
 const anchorTime=String(field(anchor.s,"HORA_ESPAÑA")).trim();
 const anchorNum=directNumber(anchor.s,1);
 return ordered.map(({s})=>{
   const n=directNumber(s,anchorNum);
   const offset=n-anchorNum;
   const start=madridDateWithOffset(date,anchorTime,offset);
   if(isNaN(start.getTime()))return null;
   const displayTime=new Intl.DateTimeFormat('es-ES',{timeZone:tz(),hour:'2-digit',minute:'2-digit',hour12:false}).format(start);
   return {s,start,displayTime};
 }).filter(Boolean);
}
function past(){
 const now=new Date(),byDate={};
 streams.forEach((s,index)=>{
   const date=cleanDate(field(s,"FECHA"));
   if(!date)return;
   (byDate[date] ||= []).push(s);
 });
 const result=[];
 Object.entries(byDate).forEach(([date,dayStreams])=>{
   scheduledDay(date,dayStreams).forEach(({s,start})=>{
     // Consideramos completado cada directo una hora después de su inicio.
     const end=new Date(start.getTime()+3600000);
     if(end<=now)result.push(s);
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
function scheduledDisplayTime(s){
 const date=cleanDate(field(s,"FECHA"));
 if(!date)return "Después del primero";
 const dayStreams=streams.filter(x=>cleanDate(field(x,"FECHA"))===date);
 const item=scheduledDay(date,dayStreams).find(x=>x.s===s);
 return item?item.displayTime:"Después del primero";
}
function streamCard(s){const {g,se}=streamData(s);const time=scheduledDisplayTime(s);return `<article class="stream-card"><img class="cover" src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div class="stream-info"><div class="type">${field(s,"DIRECTO")==='1'?'Primer directo':'Segundo directo'}</div><div class="time">${escape(time)}</div><h2>${escape(gameName(g,field(s,"ID_JUEGO")))}</h2><p class="series-name">${escape(seriesName(se,field(s,"ID_SERIE")))}</p></div></article>`}
function miniStream(s){const {g,se}=streamData(s);const time=scheduledDisplayTime(s);return `<article class="mini-stream"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div class="mini-time">${escape(time)}</div><h3>${escape(gameName(g,field(s,"ID_JUEGO")))}</h3><div class="mini-series">${escape(seriesName(se,field(s,"ID_SERIE")))}</div></article>`}

function dateFromRow(s){const d=cleanDate(field(s,"FECHA"));return d?new Date(`${d}T00:00:00`):new Date(0)}
function completedStreamsFor(predicate){return past().filter(predicate)}
function streamDatesFor(predicate){
 const ps=completedStreamsFor(predicate).sort((a,b)=>dateFromRow(a)-dateFromRow(b));
 return {first:ps[0]?cleanDate(field(ps[0],"FECHA")):"",last:ps.length?cleanDate(field(ps[ps.length-1],"FECHA")):"",count:ps.length};
}
function fmtDate(v){if(!v)return "—";const d=new Date(`${cleanDate(v)}T12:00:00`);return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'long',year:'numeric'}).format(d)}
function currentOrNextStream(){
 const now=new Date(),byDate={};
 streams.forEach((s,index)=>{
   const date=cleanDate(field(s,"FECHA"));
   if(!date)return;
   (byDate[date] ||= []).push(s);
 });
 const scheduled=[];
 Object.entries(byDate).forEach(([date,dayStreams])=>{
   scheduledDay(date,dayStreams).forEach(({s,start,displayTime})=>{
     const {gid,sid,g,se}=streamData(s);
     scheduled.push({gid,sid,g,se,row:s,start,date,time:displayTime});
   });
 });
 scheduled.sort((a,b)=>a.start-b.start);
 return scheduled.find(x=>x.start>now)||null;
}
function renderHub(){
 const box=document.getElementById('hubStatus'); if(!box)return;
 const next=currentOrNextStream();
 if(!next){box.innerHTML='<div class="hub-card"><div class="hub-label">ESTADO</div><h2>⚫ Sin próximos directos programados</h2><p>Cuando haya una nueva fecha en el calendario aparecerá aquí.</p></div>';return}
 const date=cleanDate(field(next.row,"FECHA")), time=next.time;
 box.innerHTML=`<div class="hub-card"><div class="hub-label">PRÓXIMO DIRECTO</div><h2>🟢 ${escape(gameName(next.g,next.gid))}</h2><p>${escape(seriesName(next.se,next.sid))} · ${escape(fmtDate(date))} · ${escape(time)}</p><div class="countdown" id="streamCountdown">Calculando…</div></div>`;
 const countdown=()=>{const el=document.getElementById('streamCountdown');if(!el)return;const diff=next.start-new Date();if(diff<=0){el.textContent='El directo debería estar comenzando ahora';return}const total=Math.floor(diff/1000),d=Math.floor(total/86400),h=Math.floor(total%86400/3600),m=Math.floor(total%3600/60),s=total%60;el.textContent=`Faltan ${d?d+'d ':''}${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;};
 countdown(); clearInterval(window.__hubCountdown); window.__hubCountdown=setInterval(countdown,1000);
}
function parseMedalIds(u){return field(u,"MedallasObtenidas")?field(u,"MedallasObtenidas").split(',').map(x=>x.trim()).filter(Boolean):[]}
function medalRanking(){
 const points={N:1,R:2,SR:3,SSR:4,UR:5};
 return users.map(u=>{const ids=parseMedalIds(u);let pts=0;ids.forEach(id=>{const m=medals.find(x=>field(x,"ID")===id);if(m)pts+=points[field(m,"Rareza")]||0});return {...u,total:ids.length,pts};})
 .sort((a,b)=>b.pts-a.pts||b.total-a.total||field(a,"NombreUsuario").localeCompare(field(b,"NombreUsuario"),'es'));
}
function renderMedalRanking(){
 const host=document.getElementById('medalRanking'); if(!host)return;
 const ranking=medalRanking().slice(0,10);
 host.innerHTML=ranking.length?ranking.map((u,i)=>`<a class="rank-row medal-rank" href="https://notpikachuarmy.github.io/Medallas/perfil.html?user=${encodeURIComponent(field(u,"NombreUsuario"))}" target="_blank" rel="noopener"><span class="rank-number">${i<3?['🥇','🥈','🥉'][i]:'#'+(i+1)}</span><img src="${escape(field(u,"AvatarURL"))}" alt=""><span>${escape(field(u,"NombreUsuario"))}</span><span class="rank-count">${u.total} medallas · ${u.pts} pts</span></a>`).join(''):'<div class="empty">No se ha podido cargar el ranking.</div>';
}
function newsDateValue(n){const v=field(n,"FECHA");const d=cleanDate(v);return d?new Date(`${d}T00:00:00`).getTime():0}
function renderNews(){
 const host=document.getElementById('newsList'); if(!host)return;
 if(!SOURCES.news){host.innerHTML='<div class="empty">Las novedades estarán disponibles cuando se conecte la hoja de noticias.</div>';return}
 const latest=[...news].sort((a,b)=>newsDateValue(b)-newsDateValue(a)).slice(0,5);
 host.innerHTML=latest.length?latest.map(n=>{const type=field(n,"TIPO"),title=field(n,"TITULO")||field(n,"TÍTULO"),desc=field(n,"DESCRIPCION")||field(n,"DESCRIPCIÓN"),link=field(n,"ENLACE");return `<article class="news-item"><div class="news-meta">${escape(type||'NOVEDAD')} · ${escape(fmtDate(field(n,"FECHA")))}</div><h3>${escape(title)}</h3>${desc?`<p>${escape(desc)}</p>`:''}${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Ver más</a>`:''}</article>`}).join(''):'<div class="empty">Todavía no hay novedades.</div>';
}
function setupHome(){
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const route=b.dataset.go.split('/');showPage(route[0]);if(route[0]==='extra'&&route[1])showExtra(route[1]);});
 document.getElementById('refreshNews')?.addEventListener('click',async()=>{if(SOURCES.news){try{news=await loadCSV(SOURCES.news);renderNews()}catch(e){console.error(e)}}});
}
function renderToday(){const today=madridToday(),ss=streams.filter(s=>cleanDate(field(s,"FECHA"))===today).sort((a,b)=>Number(field(a,"DIRECTO"))-Number(field(b,"DIRECTO")));document.getElementById('today').innerHTML=ss.length?`<div class="today-grid">${ss.map(streamCard).join('')}</div>`:`<div class="empty">Hoy no hay directo.</div>`}
function monday(d){const x=new Date(d);x.setHours(0,0,0,0);const n=x.getDay();x.setDate(x.getDate()-(n===0?6:n-1));return x}
function renderWeek(){const start=monday(new Date());start.setDate(start.getDate()+weekOffset*7);const end=new Date(start);end.setDate(end.getDate()+6);document.getElementById('weekTitle').textContent=`${fmtShort(start)} — ${fmtShort(end)}`;const today=madridToday();let html='';for(let i=0;i<7;i++){const d=new Date(start);d.setDate(d.getDate()+i);const ds=localDate(d),ss=streams.filter(s=>cleanDate(field(s,"FECHA"))===ds).sort((a,b)=>Number(field(a,"DIRECTO"))-Number(field(b,"DIRECTO")));html+=`<div class="day-column ${ds===today?'today':''}"><div class="day-head"><div class="day-name">${escape(new Intl.DateTimeFormat('es-ES',{weekday:'long'}).format(d))}</div><div class="day-date">${escape(fmtShort(d))}</div></div><div class="day-streams">${ss.length?ss.map(miniStream).join(''):'<div class="empty">—</div>'}</div></div>`}document.getElementById('week').innerHTML=html}
function renderStats(){const ps=past(),gc={},sc={};ps.forEach(s=>{const gid=field(s,"ID_JUEGO"),sid=field(s,"ID_SERIE");gc[gid]=(gc[gid]||0)+1;sc[sid]=(sc[sid]||0)+1});const rows=(obj,fn)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([id,n],i)=>`<div class="rank-row"><span class="rank-number">#${i+1}</span><span>${escape(fn(id))}</span><span class="rank-count">${n}</span></div>`).join('');document.getElementById('statsContent').innerHTML=`<div class="stats-grid"><div class="stat"><div class="stat-label">Directos</div><div class="stat-value">${ps.length}</div></div><div class="stat"><div class="stat-label">Juegos</div><div class="stat-value">${Object.keys(gc).length}</div></div><div class="stat"><div class="stat-label">Series</div><div class="stat-value">${Object.keys(sc).length}</div></div></div><div class="ranking"><h2>Juegos más emitidos</h2>${rows(gc,id=>gameName(game(id),id))||'<div class="empty">—</div>'}</div><div class="ranking"><h2>Series más emitidas</h2>${rows(sc,id=>seriesName(serie(id),id))||'<div class="empty">—</div>'}</div>`}
function catalogMetaGame(g){
 const id=field(g,"ID_JUEGO"),d=streamDatesFor(s=>field(s,"ID_JUEGO")===id);return {...d,name:gameName(g,id)};
}
function catalogMetaSeries(s){
 const id=field(s,"ID_SERIE"),d=streamDatesFor(x=>field(x,"ID_SERIE")===id);return {...d,name:seriesName(s,id)};
}
function sortCatalog(items,meta){
 const sort=document.getElementById('catalogSort')?.value||'recent';
 return items.sort((a,b)=>{const A=meta(a),B=meta(b);if(sort==='az')return A.name.localeCompare(B.name,'es');if(sort==='za')return B.name.localeCompare(A.name,'es');if(sort==='most')return B.count-A.count||A.name.localeCompare(B.name,'es');if(sort==='least')return A.count-B.count||A.name.localeCompare(B.name,'es');if(sort==='oldest')return (A.last?new Date(A.last):new Date(8640000000000000))-(B.last?new Date(B.last):new Date(8640000000000000))||A.name.localeCompare(B.name,'es');return (B.last?new Date(B.last):0)-(A.last?new Date(A.last):0)||A.name.localeCompare(B.name,'es');});
}
function catalogQuery(){return (document.getElementById('catalogSearch')?.value||'').trim().toLocaleLowerCase('es')}
function renderGames(){
 const q=catalogQuery();
 const list=sortCatalog(games.filter(g=>gameName(g,field(g,"ID_JUEGO")).toLocaleLowerCase('es').includes(q)),catalogMetaGame);
 document.getElementById('gamesList').innerHTML=list.map(g=>{const id=field(g,"ID_JUEGO"),m=catalogMetaGame(g);return `<article class="game-card" data-game="${escape(id)}"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><h2>${escape(m.name)}</h2><div class="muted">${m.count} directos</div></article>`}).join('')||'<div class="empty">No se han encontrado juegos.</div>';document.querySelectorAll('.game-card').forEach(c=>c.onclick=()=>showGame(c.dataset.game));
}
function renderSeries(){
 const q=catalogQuery();
 const list=sortCatalog(series.filter(s=>seriesName(s,field(s,"ID_SERIE")).toLocaleLowerCase('es').includes(q)),catalogMetaSeries);
 document.getElementById('seriesList').innerHTML=list.map(s=>{const sid=field(s,"ID_SERIE"),gid=field(s,"ID_JUEGO"),g=game(gid),link=seriesLink(s),m=catalogMetaSeries(s);return `<article class="series-card" data-series="${escape(sid)}"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div class="series-card-body"><h2>${escape(m.name)}</h2><div class="series-game">${escape(gameName(g,gid))}</div><div class="series-count">${m.count} directos</div>${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Ver playlist</a>`:''}</div></article>`}).join('')||'<div class="empty">No se han encontrado series.</div>';document.querySelectorAll('.series-card').forEach(c=>c.onclick=e=>{if(e.target.closest('a'))return;showSeries(c.dataset.series)});
}
function showGame(id,push=true){const g=game(id),ps=past().filter(s=>field(s,"ID_JUEGO")===id),counts={};ps.forEach(s=>{const sid=field(s,"ID_SERIE");counts[sid]=(counts[sid]||0)+1});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const relevant=series.filter(s=>field(s,"ID_JUEGO")===id);document.getElementById('catalog-juegos').classList.remove('active');document.getElementById('catalog-series').classList.remove('active');const detail=document.getElementById('catalog-detail');detail.classList.add('active');detail.innerHTML=`<button class="back" onclick="backCatalog('juegos')">← Juegos</button><div class="detail-top"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div><h2>${escape(gameName(g,id))}</h2><p class="muted">${ps.length} directos</p><h3>Serie más larga</h3><p>${sorted[0]?`${escape(seriesName(serie(sorted[0][0]),sorted[0][0]))} — ${sorted[0][1]} directos`:'—'}</p><h3>Series</h3><div class="series-list">${relevant.map(s=>{const sid=field(s,"ID_SERIE"),n=counts[sid]||0,link=seriesLink(s);return `<div class="series-item" data-series="${escape(sid)}"><strong>${escape(seriesName(s,sid))}</strong><span class="muted">${n} directos</span>${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Playlist</a>`:''}</div>`}).join('')||'<span class="muted">Sin series.</span>'}</div></div></div>`;detail.querySelectorAll('.series-item').forEach(el=>el.onclick=e=>{if(e.target.closest('a'))return;showSeries(el.dataset.series)});if(push)history.pushState({page:'catalogo',tab:'juegos',detail:'game',id},'',`#catalogo/juegos/game/${encodeURIComponent(id)}`)}
function showSeries(id,push=true){
 const s=serie(id),gid=field(s,"ID_JUEGO"),g=game(gid),ps=past().filter(x=>field(x,"ID_SERIE")===id),link=seriesLink(s);
 const dates=streamDatesFor(x=>field(x,"ID_SERIE")===id);
 document.getElementById('catalog-juegos').classList.remove('active');document.getElementById('catalog-series').classList.remove('active');
 const detail=document.getElementById('catalog-detail');detail.classList.add('active');
 detail.innerHTML=`<button class="back" onclick="backCatalog('series')">← Series</button><div class="detail-top"><img src="images/${escape(gameImage(g))}" onerror="this.style.visibility='hidden'"><div><h2>${escape(seriesName(s,id))}</h2><p class="muted">${escape(gameName(g,gid))}</p><div class="detail-data"><div><span>Primer directo</span><strong>${escape(fmtDate(dates.first))}</strong></div><div><span>Último directo</span><strong>${escape(fmtDate(dates.last))}</strong></div><div><span>Número de directos</span><strong>${ps.length}</strong></div></div>${link?`<a class="playlist big" href="${escape(link)}" target="_blank" rel="noopener">Ver playlist en YouTube</a>`:''}</div></div>`;
 if(push)history.pushState({page:'catalogo',tab:'series',detail:'series',id},'',`#catalogo/series/series/${encodeURIComponent(id)}`);
}
function backCatalog(tab='juegos',push=true){document.getElementById('catalog-detail').classList.remove('active');document.getElementById('catalog-'+tab).classList.add('active');document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog===tab));if(push)history.pushState({page:'catalogo',tab},'',`#catalogo/${tab}`)}
function setupCatalog(){
 document.querySelectorAll('.catalog-btn').forEach(b=>b.onclick=()=>{const tab=b.dataset.catalog;document.querySelectorAll('.catalog-btn').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('catalog-juegos').classList.toggle('active',tab==='juegos');document.getElementById('catalog-series').classList.toggle('active',tab==='series');document.getElementById('catalog-detail').classList.remove('active');history.pushState({page:'catalogo',tab},'',`#catalogo/${tab}`);});
 const refresh=()=>{renderGames();renderSeries()};
 document.getElementById('catalogSearch')?.addEventListener('input',refresh);
 document.getElementById('catalogSort')?.addEventListener('change',refresh);
}
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
async function init(){
 try{
   const [g,s,st,m,u]=await Promise.all([loadCSV(SOURCES.games),loadCSV(SOURCES.series),loadCSV(SOURCES.streams),loadCSV(SOURCES.medals),loadCSV(SOURCES.users)]);
   games=g;series=s;streams=st;medals=m;users=u;
   if(SOURCES.news){try{news=await loadCSV(SOURCES.news)}catch(e){console.warn('Novedades no disponibles',e)}}
   setupTZ();setupNav();setupWeek();setupCatalog();setupExtra();setupHome();
   renderHub();renderNews();renderToday();renderWeek();renderStats();renderGames();renderSeries();renderMedalRanking();restoreRoute(false);
 }catch(e){console.error(e);document.getElementById('today').innerHTML='<div class="empty">No se ha podido cargar el calendario.</div>'}
}
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
