const SOURCES={
 games:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=494547914&single=true&output=csv",
 series:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1321514078&single=true&output=csv",
 streams:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1487247838&single=true&output=csv"
};

// One representative city per real timezone used by Spanish-speaking communities.
const TIMEZONES=[
 ["auto","Automático"],["Europe/Madrid","España — Madrid"],["Atlantic/Canary","España — Canarias"],
 ["America/Argentina/Buenos_Aires","Argentina"],["America/Santiago","Chile — Santiago"],["America/Punta_Arenas","Chile — Punta Arenas"],
 ["America/Asuncion","Paraguay"],["America/Bogota","Colombia"],["America/Lima","Perú"],["America/Guayaquil","Ecuador"],["Pacific/Galapagos","Ecuador — Galápagos"],
 ["America/Caracas","Venezuela"],["America/La_Paz","Bolivia"],["America/Montevideo","Uruguay"],
 ["America/Mexico_City","México — Centro"],["America/Cancun","México — Sureste"],["America/Mazatlan","México — Pacífico"],["America/Tijuana","México — Noroeste"],
 ["America/Guatemala","Guatemala"],["America/El_Salvador","El Salvador"],["America/Tegucigalpa","Honduras"],["America/Managua","Nicaragua"],["America/Costa_Rica","Costa Rica"],["America/Panama","Panamá"],
 ["America/Santo_Domingo","República Dominicana"],["America/Havana","Cuba"],["America/Puerto_Rico","Puerto Rico"],["Africa/Malabo","Guinea Ecuatorial"]
];

let games=[],series=[],streams=[],selectedTZ="auto",weekOffset=0;

function parseCSV(text){
 const rows=[];let row=[],cell="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){row.push(cell.trim());cell="";continue}if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());cell="";if(row.some(v=>v!==''))rows.push(row);row=[];continue}cell+=c}if(cell||row.length){row.push(cell.trim());rows.push(row)}const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
async function loadCSV(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("CSV");return parseCSV(await r.text())}
function game(id){return games.find(x=>x.ID_JUEGO===id)||{}}
function serie(id){return series.find(x=>x.ID_SERIE===id)||{}}
function cleanDate(v){
 if(!v)return "";v=String(v).trim();
 let m=v.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
 m=v.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
 const d=new Date(v);if(!isNaN(d))return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return v;
}
function madridToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function past(){const today=madridToday();return streams.filter(s=>cleanDate(s.FECHA)<today)}
function tz(){return selectedTZ==='auto'?Intl.DateTimeFormat().resolvedOptions().timeZone:selectedTZ}
function madridToVisitor(date,time){
 if(!time)return "Después del primero";
 const [y,m,d]=cleanDate(date).split('-').map(Number),[hh,mm]=time.split(':').map(Number);let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
 for(let i=0;i<4;i++){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(guess),get=k=>Number(p.find(x=>x.type===k).value);const wall=Date.UTC(get('year'),get('month')-1,get('day'),get('hour')%24,get('minute')),target=Date.UTC(y,m-1,d,hh,mm);guess=new Date(guess.getTime()-(wall-target))}
 return new Intl.DateTimeFormat('es-ES',{timeZone:tz(),hour:'2-digit',minute:'2-digit',hour12:false}).format(guess);
}
function fmtDay(d){return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(d)}
function fmtShort(d){return new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(d)}
function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function madridDateToLocalDate(dateStr){return dateStr}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function streamData(s){const g=game(s.ID_JUEGO),se=serie(s.ID_SERIE);return {g,se,time:madridToVisitor(s.FECHA,s.HORA_ESPAÑA)}}
function streamCard(s){const {g,se,time}=streamData(s);return `<article class="stream-card"><img class="cover" src="images/${escape(g.IMAGEN_VERTICAL||'')}" onerror="this.style.visibility='hidden'"><div class="stream-info"><div class="type">${s.DIRECTO==='1'?'Primer directo':'Segundo directo'}</div><div class="time">${escape(time)}</div><h2>${escape(g.NOMBRE||s.ID_JUEGO)}</h2><p class="series-name">${escape(se.NOMBRE_SERIE||s.ID_SERIE||'')}</p></div></article>`}
function miniStream(s){const {g,se,time}=streamData(s);return `<article class="mini-stream"><img src="images/${escape(g.IMAGEN_VERTICAL||'')}" onerror="this.style.visibility='hidden'"><div class="mini-time">${escape(time)}</div><h3>${escape(g.NOMBRE||s.ID_JUEGO)}</h3><div class="mini-series">${escape(se.NOMBRE_SERIE||s.ID_SERIE||'')}</div></article>`}
function renderToday(){const today=madridToday(),ss=streams.filter(s=>cleanDate(s.FECHA)===today).sort((a,b)=>Number(a.DIRECTO)-Number(b.DIRECTO));document.getElementById('today').innerHTML=ss.length?`<div class="today-grid">${ss.map(streamCard).join('')}</div>`:`<div class="empty">Hoy no hay directo.</div>`}
function monday(d){const x=new Date(d);x.setHours(0,0,0,0);const n=x.getDay();x.setDate(x.getDate()-(n===0?6:n-1));return x}
function renderWeek(){const start=monday(new Date());start.setDate(start.getDate()+weekOffset*7);const end=new Date(start);end.setDate(end.getDate()+6);document.getElementById('weekTitle').textContent=`${fmtShort(start)} — ${fmtShort(end)}`;const today=madridToday();let html='';for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);const ds=localDate(d),ss=streams.filter(s=>cleanDate(s.FECHA)===ds).sort((a,b)=>Number(a.DIRECTO)-Number(b.DIRECTO));html+=`<div class="day-column ${ds===today?'today':''}"><div class="day-head"><div class="day-name">${escape(new Intl.DateTimeFormat('es-ES',{weekday:'long'}).format(d))}</div><div class="day-date">${escape(fmtShort(d))}</div></div><div class="day-streams">${ss.length?ss.map(miniStream).join(''):'<div class="empty">—</div>'}</div></div>`}document.getElementById('week').innerHTML=html}
function renderStats(){const ps=past(),gc={},sc={};ps.forEach(s=>{gc[s.ID_JUEGO]=(gc[s.ID_JUEGO]||0)+1;sc[s.ID_SERIE]=(sc[s.ID_SERIE]||0)+1});const rows=(obj,fn)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([id,n],i)=>`<div class="rank-row"><span class="rank-number">#${i+1}</span><span>${escape(fn(id))}</span><span class="rank-count">${n}</span></div>`).join('');document.getElementById('statsContent').innerHTML=`<div class="stats-grid"><div class="stat"><div class="stat-label">Directos</div><div class="stat-value">${ps.length}</div></div><div class="stat"><div class="stat-label">Juegos</div><div class="stat-value">${Object.keys(gc).length}</div></div><div class="stat"><div class="stat-label">Series</div><div class="stat-value">${Object.keys(sc).length}</div></div></div><div class="ranking"><h2>Juegos más emitidos</h2>${rows(gc,id=>game(id).NOMBRE||id)||'<div class="empty">—</div>'}</div><div class="ranking"><h2>Series más emitidas</h2>${rows(sc,id=>serie(id).NOMBRE_SERIE||id)||'<div class="empty">—</div>'}</div>`}
function renderSeries(){const counts={};past().forEach(s=>counts[s.ID_SERIE]=(counts[s.ID_SERIE]||0)+1);document.getElementById('seriesList').innerHTML=series.map(s=>`<article class="series-card"><h2>${escape(s.NOMBRE_SERIE)}</h2><div class="series-game">${escape(game(s.ID_JUEGO).NOMBRE||s.ID_JUEGO)}</div><div class="series-count">${counts[s.ID_SERIE]||0} directos</div></article>`).join('')||'<div class="empty">—</div>'}
function setupTZ(){const el=document.getElementById('timezoneSelect');el.innerHTML=TIMEZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');el.value='auto';el.onchange=()=>{selectedTZ=el.value;renderToday();renderWeek()}}
function showPage(page,push=true){const valid=['inicio','calendario','series'];if(!valid.includes(page))page='inicio';document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(page==='calendario'){renderToday();renderWeek();renderStats()}if(page==='series')renderSeries();if(push){history.pushState({page},'',`#${page}`)}}
function showSub(sub,push=true){document.querySelectorAll('.subpage').forEach(p=>p.classList.toggle('active',p.id===sub));document.querySelectorAll('.sub-btn').forEach(b=>b.classList.toggle('active',b.dataset.subpage===sub));if(push)history.pushState({page:'calendario',sub},'',`#calendario/${sub}`)}
function setupNav(){document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelector('.brand').onclick=e=>{e.preventDefault();showPage('inicio')};document.querySelectorAll('.sub-btn').forEach(b=>b.onclick=()=>showSub(b.dataset.subpage));window.addEventListener('popstate',()=>{const p=location.hash.replace('#','').split('/');if(p[0]==='calendario'&&p[2])weekOffset=Number(p[2])||0;else if(p[0]!=='calendario')weekOffset=0;showPage(p[0]||'inicio',false);if(p[0]==='calendario'&&p[1])showSub(p[1],false)});}
function setupWeek(){document.getElementById('prevWeek').onclick=()=>{weekOffset--;renderWeek();history.pushState({page:'calendario',sub:'semana',weekOffset},'',`#calendario/semana/${weekOffset}`)};document.getElementById('nextWeek').onclick=()=>{weekOffset++;renderWeek();history.pushState({page:'calendario',sub:'semana',weekOffset},'',`#calendario/semana/${weekOffset}`)};document.getElementById('todayWeek').onclick=()=>{weekOffset=0;renderWeek();history.pushState({page:'calendario',sub:'semana',weekOffset:0},'',`#calendario/semana/0`)}}
function restoreRoute(){const p=location.hash.replace('#','').split('/');showPage(p[0]||'inicio',false);if(p[0]==='calendario'){showSub(p[1]==='stats'?'stats':'semana',false);if(p[2]){weekOffset=Number(p[2])||0;renderWeek()}}}
async function init(){try{[games,series,streams]=await Promise.all([loadCSV(SOURCES.games),loadCSV(SOURCES.series),loadCSV(SOURCES.streams)]);setupTZ();setupNav();setupWeek();renderToday();renderWeek();renderStats();renderSeries();restoreRoute()}catch(e){console.error(e);document.getElementById('today').innerHTML='<div class="empty">No se ha podido cargar el calendario.</div>'}}
init();
