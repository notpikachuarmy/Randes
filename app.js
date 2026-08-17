// Google Sheets published CSV sources.
const CSV_URLS = {
  games: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=494547914&single=true&output=csv',
  series: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1321514078&single=true&output=csv',
  streams: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1487247838&single=true&output=csv'
};

const IMAGE_DIR = 'images/';
let state = { games: [], series: [], streams: [], weekStart: startOfWeek(new Date()) };
const $ = id => document.getElementById(id);

function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); const diff=(day+6)%7; x.setDate(x.getDate()-diff); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function esc(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

// Small CSV parser: handles quoted cells, commas and escaped quotes.
function parseCSV(text){
  text = text.replace(/^\uFEFF/, '');
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"' && text[i+1]==='"'){ cell+='"'; i++; }
      else if(c==='"') quoted=false;
      else cell+=c;
    } else if(c==='"') quoted=true;
    else if(c===','){ row.push(cell.trim()); cell=''; }
    else if(c==='\n'){ row.push(cell.trim()); rows.push(row); row=[]; cell=''; }
    else if(c!=='\r') cell+=c;
  }
  if(cell!=='' || row.length){ row.push(cell.trim()); rows.push(row); }
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>h.trim());
  return rows.filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h, r[i] ?? ''])));
}

function parseTime(v){
  if(v==null || v==='') return null;
  const s=String(v).trim();
  const m=s.match(/^(\d{1,2})[:.](\d{2})/); return m?{h:+m[1],m:+m[2]}:null;
}
function parseDateKey(v){
  const s=String(v||'').trim();
  let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return '';
}

function madridInstant(dateStr,timeStr){
  const t=parseTime(timeStr); if(!t) return null;
  const [y,mo,d]=dateStr.split('-').map(Number);
  let guess=new Date(Date.UTC(y,mo-1,d,t.h,t.m));
  for(let i=0;i<5;i++){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(guess);
    const get=n=>+parts.find(p=>p.type===n).value;
    const shown=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));
    const target=Date.UTC(y,mo-1,d,t.h,t.m);
    guess=new Date(guess.getTime()+(target-shown));
  }
  return guess;
}
function formatLocal(dateStr,timeStr){
  const instant=madridInstant(dateStr,timeStr); if(!instant) return null;
  const tz=$('timezoneSelect').value==='auto'?Intl.DateTimeFormat().resolvedOptions().timeZone:$('timezoneSelect').value;
  return new Intl.DateTimeFormat('es-ES',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant);
}
function formatDate(d){ return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(d); }
function gameMap(){ return Object.fromEntries(state.games.map(x=>[x.ID_JUEGO,x])); }
function seriesMap(){ return Object.fromEntries(state.series.map(x=>[x.ID_SERIE,x])); }
function imageFor(game){ return game?.IMAGEN_VERTICAL ? `${IMAGE_DIR}${game.IMAGEN_VERTICAL}` : ''; }

function renderCalendar(){
  const games=gameMap(), series=seriesMap(), cal=$('calendar'); cal.innerHTML='';
  for(let i=0;i<7;i++){
    const d=addDays(state.weekStart,i), key=dateKey(d), events=state.streams.filter(x=>x.FECHA===key).sort((a,b)=>Number(a.DIRECTO)-Number(b.DIRECTO));
    const day=document.createElement('article'); day.className='day';
    day.innerHTML=`<div class="day-head"><span class="day-name">${esc(formatDate(d))}</span><span class="day-date">${events.length?events.length+' directo'+(events.length>1?'s':''):'Sin directo'}</span></div>`;
    if(events.length){
      const list=document.createElement('div'); list.className='events';
      events.forEach(ev=>{
        const g=games[ev.ID_JUEGO]||{}, s=series[ev.ID_SERIE]||{}, second=String(ev.DIRECTO)==='2';
        const time=second?'Después':formatLocal(key,ev.HORA_ESPAÑA)||'Hora pendiente';
        list.innerHTML+=`<div class="event"><div class="cover">${imageFor(g)?`<img src="${esc(imageFor(g))}" alt="" onerror="this.style.display='none'">`:'Sin imagen'}</div><div class="event-body"><div class="event-time ${second?'after':''}">${esc(time)}</div><div class="event-slot">${second?'Segundo directo':'Primer directo'}</div><div class="event-game">${esc(g.NOMBRE||ev.ID_JUEGO)}</div><div class="event-series">${esc(s.NOMBRE_SERIE||ev.ID_SERIE||'')}</div></div></div>`;
      });
      day.appendChild(list);
    } else day.innerHTML += '<div class="empty">No hay directo programado.</div>';
    cal.appendChild(day);
  }
}

function renderHistory(){
  const games=gameMap(), counts={}; state.streams.forEach(x=>counts[x.ID_JUEGO]=(counts[x.ID_JUEGO]||0)+1);
  const arr=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  $('history').innerHTML=arr.map(([id,n])=>{const g=games[id]||{};return `<div class="history-card"><div class="history-cover">${imageFor(g)?`<img src="${esc(imageFor(g))}" alt="">`:''}</div><div><strong>${esc(g.NOMBRE||id)}</strong><span>${n} directo${n===1?'':'s'}</span></div></div>`}).join('')||'<div class="empty">Todavía no hay historial.</div>';
}
function renderStats(){
  const games=gameMap(), series=seriesMap(), gameCounts={}, seriesCounts={};
  state.streams.forEach(x=>{gameCounts[x.ID_JUEGO]=(gameCounts[x.ID_JUEGO]||0)+1; if(x.ID_SERIE)seriesCounts[x.ID_SERIE]=(seriesCounts[x.ID_SERIE]||0)+1});
  const topG=Object.entries(gameCounts).sort((a,b)=>b[1]-a[1])[0], topS=Object.entries(seriesCounts).sort((a,b)=>b[1]-a[1])[0];
  const cards=[['Directos registrados',state.streams.length,'Historial cargado desde Google Sheets'],['Juegos',''+Object.keys(gameCounts).length,'Juegos con al menos un directo'],['Series',''+Object.keys(seriesCounts).length,'Series con al menos un directo'],['Juego más emitido',topG?games[topG[0]]?.NOMBRE||topG[0]:'—',topG?`${topG[1]} directos`:'' ],['Serie más emitida',topS?series[topS[0]]?.NOMBRE_SERIE||topS[0]:'—',topS?`${topS[1]} directos`:'' ]];
  $('stats').innerHTML=cards.map(c=>`<div class="stat-card"><div class="stat-value">${esc(c[1])}</div><div class="stat-label">${esc(c[0])}</div><div class="stat-extra">${esc(c[2])}</div></div>`).join('');
}
function rerender(){ renderCalendar(); renderHistory(); renderStats(); }

async function fetchCSV(url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseCSV(await res.text());
}
async function load(){
  try{
    $('loadStatus').textContent='Cargando calendario…';
    const [games,series,streams]=await Promise.all([fetchCSV(CSV_URLS.games),fetchCSV(CSV_URLS.series),fetchCSV(CSV_URLS.streams)]);
    state.games=games; state.series=series;
    state.streams=streams.filter(x=>x.FECHA).map(x=>({...x,FECHA:parseDateKey(x.FECHA)}));
    rerender(); $('loadStatus').textContent='Datos actualizados desde Google Sheets';
  }catch(e){
    $('calendar').innerHTML=`<div class="error"><strong>No se ha podido cargar el calendario.</strong><br>Si el enlace CSV funciona al abrirlo pero aquí aparece este mensaje, probablemente Google esté bloqueando la lectura directa desde GitHub Pages (CORS). Lo solucionaremos con un pequeño intermediario o una automatización de GitHub, sin que tengas que tocar código.</div>`;
    $('loadStatus').textContent='Error al cargar los datos'; console.error(e);
  }
}

$('prevWeek').onclick=()=>{state.weekStart=addDays(state.weekStart,-7);renderCalendar()};
$('nextWeek').onclick=()=>{state.weekStart=addDays(state.weekStart,7);renderCalendar()};
$('todayBtn').onclick=()=>{state.weekStart=startOfWeek(new Date());renderCalendar()};
$('timezoneSelect').onchange=()=>{localStorage.setItem('twitchTZ',$('timezoneSelect').value);renderCalendar()};
const saved=localStorage.getItem('twitchTZ'); if(saved) $('timezoneSelect').value=saved;
load();
