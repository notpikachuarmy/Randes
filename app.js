const SOURCES = {
  games: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=494547914&single=true&output=csv",
  series: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1321514078&single=true&output=csv",
  streams: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1487247838&single=true&output=csv"
};

const HISPANIC_ZONES = [
  ["auto","Automático (mi dispositivo)"],
  ["Europe/Madrid","España — Madrid"],
  ["Atlantic/Canary","España — Canarias"],
  ["America/Argentina/Buenos_Aires","Argentina — Buenos Aires"],
  ["America/Argentina/Catamarca","Argentina — Catamarca"],
  ["America/Argentina/Cordoba","Argentina — Córdoba"],
  ["America/Argentina/Jujuy","Argentina — Jujuy"],
  ["America/Argentina/La_Rioja","Argentina — La Rioja"],
  ["America/Argentina/Mendoza","Argentina — Mendoza"],
  ["America/Argentina/Rio_Gallegos","Argentina — Río Gallegos"],
  ["America/Argentina/Salta","Argentina — Salta"],
  ["America/Argentina/San_Juan","Argentina — San Juan"],
  ["America/Argentina/San_Luis","Argentina — San Luis"],
  ["America/Argentina/Tucuman","Argentina — Tucumán"],
  ["America/Argentina/Ushuaia","Argentina — Ushuaia"],
  ["America/Santiago","Chile — Santiago"],
  ["America/Punta_Arenas","Chile — Punta Arenas"],
  ["America/Arica","Chile — Arica"],
  ["America/Asuncion","Paraguay — Asunción"],
  ["America/Bogota","Colombia — Bogotá"],
  ["America/Lima","Perú — Lima"],
  ["America/Guayaquil","Ecuador — Guayaquil"],
  ["Pacific/Galapagos","Ecuador — Galápagos"],
  ["America/Caracas","Venezuela — Caracas"],
  ["America/La_Paz","Bolivia — La Paz"],
  ["America/Montevideo","Uruguay — Montevideo"],
  ["America/Mexico_City","México — Ciudad de México"],
  ["America/Cancun","México — Cancún"],
  ["America/Merida","México — Mérida"],
  ["America/Monterrey","México — Monterrey"],
  ["America/Chihuahua","México — Chihuahua"],
  ["America/Hermosillo","México — Hermosillo"],
  ["America/Mazatlan","México — Mazatlán"],
  ["America/Tijuana","México — Tijuana"],
  ["America/Guatemala","Guatemala — Guatemala"],
  ["America/El_Salvador","El Salvador — San Salvador"],
  ["America/Tegucigalpa","Honduras — Tegucigalpa"],
  ["America/Managua","Nicaragua — Managua"],
  ["America/Costa_Rica","Costa Rica — San José"],
  ["America/Panama","Panamá — Panamá"],
  ["America/Santo_Domingo","República Dominicana — Santo Domingo"],
  ["America/Puerto_Rico","Puerto Rico — San Juan"],
  ["America/Havana","Cuba — La Habana"],
  ["America/Martinique","Martinica — Fort-de-France"]
];

let games=[], series=[], streams=[], weekOffset=0, selectedTZ="auto";

function parseCSV(text){
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && quoted && n==='"'){cell+='"';i++;continue}
    if(c==='"'){quoted=!quoted;continue}
    if(c===',' && !quoted){row.push(cell.trim());cell="";continue}
    if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());cell="";if(row.some(x=>x!==''))rows.push(row);row=[];continue}
    cell+=c;
  }
  if(cell||row.length){row.push(cell.trim());rows.push(row)}
  const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
async function loadCSV(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("No se pudo cargar el CSV");return parseCSV(await r.text())}
const localDateString=d=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`};
function dateAtLocal(date,time){const [y,m,d]=date.split("-").map(Number);const [hh,mm]=(time||"00:00").split(":").map(Number);return new Date(y,m-1,d,hh,mm)}
function fmtDate(date){return new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long"}).format(date)}
function tz(){return selectedTZ==="auto"?Intl.DateTimeFormat().resolvedOptions().timeZone:selectedTZ}
function madridToVisitor(dateStr,timeStr){
  const [y,m,d]=dateStr.split("-").map(Number),[hh,mm]=timeStr.split(":").map(Number);
  // Convert Europe/Madrid wall time to UTC by iterating around the target.
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
  for(let i=0;i<4;i++){
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Madrid",hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(guess);
    const get=k=>Number(parts.find(p=>p.type===k).value);
    const wall=Date.UTC(get("year"),get("month")-1,get("day"),get("hour")%24,get("minute"));
    const target=Date.UTC(y,m-1,d,hh,mm);
    guess=new Date(guess.getTime()-(wall-target));
  }
  return new Intl.DateTimeFormat("es-ES",{timeZone:tz(),hour:"2-digit",minute:"2-digit",hour12:false}).format(guess);
}
function gameById(id){return games.find(g=>g.ID_JUEGO===id)||{}}
function seriesById(id){return series.find(s=>s.ID_SERIE===id)||{}}
function normalizeDate(value){
  const v=String(value||"").trim();
  if(!v) return "";
  // Google Sheets can export dates as DD/MM/YYYY, DD-MM-YYYY or YYYY-MM-DD.
  let m=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  m=v.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  const d=new Date(v);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function streamDate(s){return normalizeDate(s.FECHA)}
function pastStreams(){const today=localDateString(new Date());return streams.filter(s=>{const d=streamDate(s); return d && d<today})}
function streamCard(s){
  const g=gameById(s.ID_JUEGO), se=seriesById(s.ID_SERIE), cover=g.IMAGEN_VERTICAL||"";
  const time=s.HORA_ESPAÑA ? madridToVisitor(streamDate(s),s.HORA_ESPAÑA) : "Después del primer directo";
  return `<article class="stream-card"><img class="cover" src="images/${escapeAttr(cover)}" onerror="this.style.visibility='hidden'"><div><div class="type">${s.DIRECTO==="1"?"Primer directo":"Segundo directo"}</div><div class="time">${escapeHtml(time)}</div><h3>${escapeHtml(g.NOMBRE||s.ID_JUEGO)}</h3><p class="series">${escapeHtml(se.NOMBRE_SERIE||s.ID_SERIE||"")}</p></div></article>`;
}
function renderDay(date){
  const ds=localDateString(date), ss=streams.filter(s=>streamDate(s)===ds).sort((a,b)=>Number(a.DIRECTO)-Number(b.DIRECTO));
  return `<div class="day-card"><div class="day-head"><h3>${capitalize(fmtDate(date))}</h3><span>${ss.length} directo${ss.length===1?"":"s"}</span></div>${ss.length?`<div class="streams">${ss.map(streamCard).join("")}</div>`:`<div class="empty">No hay directo programado.</div>`}</div>`;
}
function renderToday(){
  const today=new Date(), ds=localDateString(today), ss=streams.filter(s=>streamDate(s)===ds).sort((a,b)=>Number(a.DIRECTO)-Number(b.DIRECTO));
  document.getElementById("today").innerHTML=ss.length?`<div class="streams">${ss.map(streamCard).join("")}</div>`:`<div class="day-card"><div class="empty">Hoy no hay directo programado.</div></div>`;
}
function mondayOf(d){const x=new Date(d);x.setHours(0,0,0,0);const day=x.getDay();x.setDate(x.getDate()-(day===0?6:day-1));return x}
function renderWeek(){
  const start=mondayOf(new Date());start.setDate(start.getDate()+weekOffset*7);
  const arr=[];for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);arr.push(renderDay(d))}
  document.getElementById("week").innerHTML=arr.join("");
}
function renderHistory(){
  const container=document.getElementById("history");
  container.innerHTML=`<div class="history-grid">${games.map(g=>{
    const count=pastStreams().filter(s=>s.ID_JUEGO===g.ID_JUEGO).length;
    return `<article class="game-card" data-game="${escapeAttr(g.ID_JUEGO)}"><img src="images/${escapeAttr(g.IMAGEN_VERTICAL||"")}" onerror="this.style.visibility='hidden'"><h3>${escapeHtml(g.NOMBRE)}</h3><div class="muted">${count} directo${count===1?"":"s"}</div></article>`
  }).join("")}</div>`;
  container.querySelectorAll(".game-card").forEach(c=>c.onclick=()=>showGame(c.dataset.game));
}
function showGame(id){
  const g=gameById(id), ps=pastStreams().filter(s=>s.ID_JUEGO===id);
  const counts={};ps.forEach(s=>counts[s.ID_SERIE]=(counts[s.ID_SERIE]||0)+1);
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  document.getElementById("history").innerHTML=`<div class="detail"><button class="back" onclick="renderHistory()">← Volver a juegos</button><div class="detail-top"><img src="images/${escapeAttr(g.IMAGEN_VERTICAL||"")}" onerror="this.style.visibility='hidden'"><div><h2>${escapeHtml(g.NOMBRE)}</h2><p class="muted">${ps.length} directos emitidos</p><h3>Serie más larga</h3><p>${sorted[0]?`${escapeHtml(seriesById(sorted[0][0]).NOMBRE_SERIE||sorted[0][0])} — ${sorted[0][1]} directos`:"Todavía no hay directos registrados."}</p><h3>Todas las series</h3><div class="series-list">${sorted.map(([sid,n])=>`<div class="series-item"><strong>${escapeHtml(seriesById(sid).NOMBRE_SERIE||sid)}</strong><span class="muted">${n} directos</span></div>`).join("")||"<div class='muted'>Sin series registradas.</div>"}</div></div></div></div>`;
}
function renderStats(){
  const ps=pastStreams(), gc={},sc={};ps.forEach(s=>{gc[s.ID_JUEGO]=(gc[s.ID_JUEGO]||0)+1;sc[s.ID_SERIE]=(sc[s.ID_SERIE]||0)+1});
  const rank=(obj,lookup)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([id,n],i)=>`<div class="rank-row"><span class="rank-number">#${i+1}</span><span>${escapeHtml(lookup(id))}</span><span class="rank-count">${n}</span></div>`).join("");
  document.getElementById("stats").innerHTML=`<div class="stats-grid"><div class="stat"><div class="label">Directos realizados</div><div class="value">${ps.length}</div></div><div class="stat"><div class="label">Juegos emitidos</div><div class="value">${Object.keys(gc).length}</div></div><div class="stat"><div class="label">Series emitidas</div><div class="value">${Object.keys(sc).length}</div></div></div><div class="ranking"><h3>Juegos más emitidos</h3>${rank(gc,id=>gameById(id).NOMBRE||id)||'<div class="empty">Todavía no hay datos.</div>'}</div><div class="ranking"><h3>Series más emitidas</h3>${rank(sc,id=>seriesById(id).NOMBRE_SERIE||id)||'<div class="empty">Todavía no hay datos.</div>'}</div>`;
}
function setupTZ(){
  const sel=document.getElementById("timezoneSelect");
  sel.innerHTML=HISPANIC_ZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join("");
  sel.value="auto";sel.onchange=()=>{selectedTZ=sel.value;renderToday();renderWeek()};
}
function setupNav(){
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(b.dataset.page).classList.add("active");if(b.dataset.page==="historial")renderHistory();if(b.dataset.page==="estadisticas")renderStats()});
}
function escapeHtml(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escapeAttr(x){return escapeHtml(x)}
function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}
async function init(){
  try{
    [games,series,streams]=await Promise.all([loadCSV(SOURCES.games),loadCSV(SOURCES.series),loadCSV(SOURCES.streams)]);
    setupTZ();setupNav();renderToday();renderWeek();renderHistory();renderStats();
    document.getElementById("prevWeek").onclick=()=>{weekOffset--;renderWeek()};
    document.getElementById("nextWeek").onclick=()=>{weekOffset++;renderWeek()};
    document.getElementById("todayWeek").onclick=()=>{weekOffset=0;renderWeek()};
  }catch(e){document.getElementById("today").innerHTML=`<div class="day-card"><div class="empty">No se han podido cargar los datos de Google Sheets. Comprueba que las pestañas estén publicadas como CSV.</div></div>`;console.error(e)}
}
init();