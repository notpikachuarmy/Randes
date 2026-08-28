const SOURCES={
 games:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=494547914&single=true&output=csv",
 series:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1321514078&single=true&output=csv",
 streams:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTpdr4JCZEu97iQaTtfQ-3ZIBY7M66-Vmxj9_ihx9PIAnfM-bbya_LKKpFBVW7P-Q/pub?gid=1487247838&single=true&output=csv",
 medals:"https://docs.google.com/spreadsheets/d/1uxeXCUyWi2kLAWEGJjZ91zutr18sr7_QjHqxfPVzgCA/export?format=csv&gid=0",
 users:"https://docs.google.com/spreadsheets/d/1Pri9HhHGipD08e847iUKruXPLzG9tWki3N5rQPu2cMw/export?format=csv&gid=0",
 news:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTo3r5CBaQRbk4Qy_QUKLsAvM4XgzNf4-PD4_ql9cehWdnrRzCPnoSdSBpeqasfISKCuUjqNPz7z5mN/pub?output=csv",
 houses:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRjmega_kIqVK_x3D_Z4z9ALjIMC_ClOOaN14yDvZhrCqxr3L7D9gVGdKXPTwTsQ1aQg7WlXBMkF9qW/pub?gid=0&single=true&output=csv",
 housePoints:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRjmega_kIqVK_x3D_Z4z9ALjIMC_ClOOaN14yDvZhrCqxr3L7D9gVGdKXPTwTsQ1aQg7WlXBMkF9qW/pub?gid=1852577678&single=true&output=csv",
 houseAwards:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRjmega_kIqVK_x3D_Z4z9ALjIMC_ClOOaN14yDvZhrCqxr3L7D9gVGdKXPTwTsQ1aQg7WlXBMkF9qW/pub?gid=131463405&single=true&output=csv",
 fichas:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRjmega_kIqVK_x3D_Z4z9ALjIMC_ClOOaN14yDvZhrCqxr3L7D9gVGdKXPTwTsQ1aQg7WlXBMkF9qW/pub?gid=1177728149&single=true&output=csv"
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

let games=[],series=[],streams=[],medals=[],users=[],news=[],houses=[],housePoints=[],houseAwards=[],fichas=[],selectedTZ="auto",weekOffset=0,selectedExtra="locke",selectedHouse="Tototoclaw",selectedHouseMonth="",selectedFichasTab="info",selectedFichasInfoTab="fichas",selectedFichasMonth="";


function parseCSV(text){
 const rows=[];let row=[],cell="",q=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){row.push(cell.trim());cell="";continue}if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());cell="";if(row.some(v=>v!==''))rows.push(row);row=[];continue}cell+=c}if(cell||row.length){row.push(cell.trim());rows.push(row)}const headers=(rows.shift()||[]).map(h=>h.replace(/^\uFEFF/,'').trim());return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
const CSV_CACHE_TTL=5*60*1000;
const csvMemoryCache=new Map();
const csvPromises=new Map();
async function loadCSV(url,{ttl=CSV_CACHE_TTL,force=false}={}){
 const now=Date.now(),cached=csvMemoryCache.get(url);
 if(!force&&cached&&now-cached.time<ttl)return cached.data;
 if(!force&&csvPromises.has(url))return csvPromises.get(url);
 const request=(async()=>{
   try{
     const r=await fetch(url,{cache:"default"});if(!r.ok)throw new Error("CSV");
     const data=parseCSV(await r.text());csvMemoryCache.set(url,{time:Date.now(),data});return data;
   }catch(e){
     if(cached)return cached.data;
     throw e;
   }finally{csvPromises.delete(url);}
 })();
 if(!force)csvPromises.set(url,request);
 return request;
}
const dataPromises={};
function ensureData(key,urls){
 if(dataPromises[key])return dataPromises[key];
 const request=Promise.all(urls.filter(Boolean).map(loadCSV)).catch(err=>{delete dataPromises[key];throw err});
 dataPromises[key]=request;
 return request;
}
function requestIdle(fn){if('requestIdleCallback' in window)window.requestIdleCallback(fn,{timeout:1800});else setTimeout(fn,250);}
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
 // La hora fija solo puede venir del DIRECTO 1. Los siguientes se estiman
 // a +1h por directo, pero se marcan como aproximados.
 const first=ordered.find(x=>directNumber(x.s)===1);
 const anchorTime=first?String(field(first.s,"HORA_ESPAÑA")||"").trim():"";
 const hasFixedAnchor=!!anchorTime;
 return ordered.map(({s})=>{
   const n=directNumber(s,1);
   if(!hasFixedAnchor){
     return {s,start:null,displayTime:"Hora no fijada",fixedTime:false,approximate:n>1};
   }
   const start=madridDateWithOffset(date,anchorTime,n-1);
   if(isNaN(start.getTime()))return {s,start:null,displayTime:"Hora no fijada",fixedTime:false,approximate:n>1};
   const displayTime=new Intl.DateTimeFormat('es-ES',{timeZone:tz(),hour:'2-digit',minute:'2-digit',hour12:false}).format(start);
   return {s,start,displayTime,fixedTime:n===1,approximate:n>1};
 }).filter(Boolean);
}
let pastMemo={bucket:-1,result:[]};
function past(){
 const bucket=Math.floor(Date.now()/30000);
 if(pastMemo.bucket===bucket)return pastMemo.result;
 const now=new Date(),byDate={};
 streams.forEach((s,index)=>{
   const date=cleanDate(field(s,"FECHA"));
   if(!date)return;
   (byDate[date] ||= []).push(s);
 });
 const result=[];
 Object.entries(byDate).forEach(([date,dayStreams])=>{
   scheduledDay(date,dayStreams).forEach(({s,start})=>{
     // Si no podemos determinar la hora de inicio, no podemos afirmar que
     // el directo ya haya terminado. Simplemente lo dejamos fuera.
     if(!start || isNaN(start.getTime()))return;
     // Consideramos completado cada directo una hora después de su inicio.
     const end=new Date(start.getTime()+3600000);
     if(end<=now)result.push(s);
   });
 });
 pastMemo={bucket,result};
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
 if(!date)return "Hora no fijada";
 const dayStreams=streams.filter(x=>cleanDate(field(x,"FECHA"))===date);
 const item=scheduledDay(date,dayStreams).find(x=>x.s===s);
 if(!item)return "Hora no fijada";
 // En el horario semanal solo mostramos horas que estén realmente escritas en Excel.
 const rawTime=String(field(s,"HORA_ESPAÑA")||"").trim();
 return rawTime ? item.displayTime : "Hora no fijada";
}
function streamCard(s){const {g,se}=streamData(s);const time=scheduledDisplayTime(s);return `<article class="stream-card"><img class="cover" src="images/${escape(gameImage(g))}" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"><div class="stream-info"><div class="type">${field(s,"DIRECTO")==='1'?'Primer directo':'Segundo directo'}</div><div class="time">${escape(time)}</div><h2>${escape(gameName(g,field(s,"ID_JUEGO")))}</h2><p class="series-name">${escape(seriesName(se,field(s,"ID_SERIE")))}</p></div></article>`}
function miniStream(s){
 const {g,se}=streamData(s);
 const rawTime=String(field(s,"HORA_ESPAÑA")||"").trim();
 const time=rawTime ? scheduledDisplayTime(s) : "";
 return `<article class="mini-stream"><img src="images/${escape(gameImage(g))}" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">${time?`<div class="mini-time">${escape(time)}</div>`:''}<h3>${escape(gameName(g,field(s,"ID_JUEGO")))}</h3><div class="mini-series">${escape(seriesName(se,field(s,"ID_SERIE")))}</div></article>`;
}
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
   scheduledDay(date,dayStreams).forEach(({s,start,displayTime,fixedTime,approximate})=>{
     const {gid,sid,g,se}=streamData(s);
     scheduled.push({gid,sid,g,se,row:s,start,date,time:displayTime,fixedTime,approximate});
   });
 });
 // Primero buscamos directos con hora calculable (Directo 1 fija o siguientes +1h).
 const timed=scheduled.filter(x=>x.start && x.start>now).sort((a,b)=>a.start-b.start);
 if(timed.length)return timed[0];

 // Si el próximo directo no tiene hora fija, lo mostramos igualmente para que
 // no desaparezca del calendario, pero sin inventar una cuenta atrás.
 const pending=scheduled.filter(x=>{
   const d=new Date(`${x.date}T23:59:59`);
   return d>=now;
 }).sort((a,b)=>a.date.localeCompare(b.date)||directNumber(a.row)-directNumber(b.row));
 return pending[0]||null;
}
function renderHub(){
 const box=document.getElementById('hubStatus'); if(!box)return;
 const next=currentOrNextStream();
 if(!next){box.innerHTML='<div class="hub-card"><div class="hub-label">ESTADO</div><h2>⚫ Sin próximos directos programados</h2><p>Cuando haya una nueva fecha en el calendario aparecerá aquí.</p></div>';return}
 const date=cleanDate(field(next.row,"FECHA"));
 const hasStart=next.start instanceof Date && !isNaN(next.start.getTime());
 const rawTime=String(field(next.row,"HORA_ESPAÑA")||"").trim();
 let timeText="";
 let countdownText="";
 if(hasStart){
   timeText=next.approximate && !rawTime ? `≈ ${escape(next.time)} (aprox. +1h)` : escape(next.time);
 }else{
   timeText=next.approximate ? "Hora aproximada: ≈ 1h después del primero" : "Hora pendiente de fijar";
 }
 box.innerHTML=`<div class="hub-card"><div class="hub-label">PRÓXIMO DIRECTO</div><h2>🟢 ${escape(gameName(next.g,next.gid))}</h2><p>${escape(seriesName(next.se,next.sid))} · ${escape(fmtDate(date))} · ${timeText}</p>${hasStart?'<div class="countdown" id="streamCountdown">Calculando…</div>':'<div class="countdown countdown-pending">⏱️ Sin cuenta atrás: falta fijar la hora</div>'}</div>`;
 if(!hasStart)return;
 const countdown=()=>{const el=document.getElementById('streamCountdown');if(!el)return;const diff=next.start-new Date();if(diff<=0){el.textContent='El directo debería estar comenzando ahora';return}const total=Math.floor(diff/1000),d=Math.floor(total/86400),h=Math.floor(total%86400/3600),m=Math.floor(total%3600/60),s=total%60;el.textContent=`Faltan ${d?d+'d ':''}${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;};
 countdown(); clearInterval(window.__streamCountdown); window.__streamCountdown=setInterval(countdown,1000);
}
function houseNameForPerson(person){
 const p=String(person||'').trim().toLocaleLowerCase('es');
 const row=houses.find(x=>field(x,"PERSONA").toLocaleLowerCase('es')===p);
 return row?field(row,"CASA"):"";
}
function houseLogo(h){return `images/logos_casas/${escape(h)}.png`;}
function houseList(){
 const fromSheet=houses.map(x=>field(x,"CASA")).filter(Boolean);
 return [...new Set([...fromSheet,"Notpikador","Hojafailpuff","Fotopierin","Tototoclaw"])];
}
function pointValue(r){const n=Number(String(field(r,"Puntos")).replace(',','.'));return Number.isFinite(n)?n:0;}
function pointDate(r){return cleanDate(field(r,"Fecha"));}
function monthKey(date){return date?String(date).slice(0,7):"";}
function monthLabel(key){if(!key)return "Todos los meses";const [y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(y,m-1,15));}
function houseStats(house, month=""){
 const members=houses.filter(x=>field(x,"CASA")===house).map(x=>field(x,"PERSONA")).filter(Boolean);
 const memberSet=new Set(members.map(x=>x.toLocaleLowerCase('es')));
 const rows=housePoints.filter(r=>memberSet.has(field(r,"Estudiante").toLocaleLowerCase('es')) && (!month || monthKey(pointDate(r))===month));
 const byStudent={};rows.forEach(r=>{const n=field(r,"Estudiante");byStudent[n]=(byStudent[n]||0)+pointValue(r)});
 const students=Object.entries(byStudent).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es')).map(([name,points])=>({name,points}));
 return {house,members,total:rows.reduce((a,r)=>a+pointValue(r),0),students};
}
function allHouseTotals(month=""){
 return houseList().map(h=>houseStats(h,month)).sort((a,b)=>b.total-a.total||a.house.localeCompare(b.house,'es'));
}
function availableHouseMonths(){
 const keys=[...new Set(housePoints.map(r=>monthKey(pointDate(r))).filter(Boolean))].sort().reverse();
 return keys;
}
function finalizedHouseMonths(){
 const currentMonth=monthKey(madridToday());
 return availableHouseMonths().filter(month=>month<currentMonth);
}
function monthlyHouseWinners(){
 const result=[];
 finalizedHouseMonths().forEach(month=>{
   const ranked=allHouseTotals(month).filter(x=>x.total>0);
   if(ranked.length) result.push({month,house:ranked[0].house,points:ranked[0].total});
 });
 return result;
}
function houseCupCount(house){return monthlyHouseWinners().filter(x=>x.house===house).length;}
function trophyKey(name,image){return `${name}|||${image||''}`;}
function houseTrophies(house){
 const monthly=monthlyHouseWinners().filter(x=>x.house===house).map(x=>({name:`Copa de la Casa · ${monthLabel(x.month)}`,image:'trofeo_casa.png',date:x.month+'-28',kind:'casa',points:x.points}));
 const members=new Set(houses.filter(x=>field(x,"CASA")===house).map(x=>field(x,"PERSONA").toLocaleLowerCase('es')));
 const extras=houseAwards.filter(r=>members.has(field(r,"PERSONA").toLocaleLowerCase('es')) && field(r,"TROFEO")).map(r=>({name:field(r,"TROFEO"),image:field(r,"IMAGEN TROFEO"),date:cleanDate(field(r,"FECHA")),kind:'evento',person:field(r,"PERSONA")}));
 return [...monthly,...extras];
}
function trophySort(list,sort){
 const arr=[...list];
 if(sort==='date')return arr.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 if(sort==='count'){
   const counts={};arr.forEach(t=>{counts[trophyKey(t.name,t.image)]=(counts[trophyKey(t.name,t.image)]||0)+1});
   return arr.sort((a,b)=>(counts[trophyKey(b.name,b.image)]||0)-(counts[trophyKey(a.name,a.image)]||0)||a.name.localeCompare(b.name,'es'));
 }
 return arr.sort((a,b)=>a.name.localeCompare(b.name,'es')||String(b.date).localeCompare(String(a.date)));
}
function trophyImage(t){return t.image?`images/trofeos/${escape(t.image)}`:'images/trofeos/trofeo_casa.png';}
function renderHouseHub(){
 const host=document.getElementById('houseHub');if(!host)return;
 const ranked=allHouseTotals('').slice(0,4);
 host.innerHTML=ranked.map((x,i)=>`<div class="house-hub-row"><span class="rank-number">#${i+1}</span><img src="${houseLogo(x.house)}" onerror="this.style.visibility='hidden'" alt=""><span><strong>${escape(x.house)}</strong><small>${x.students.length?escape(x.students[0].name):'Sin puntos aún'}</small></span><b>${x.total} pts</b></div>`).join('')||'<div class="empty">Aún no hay puntos.</div>';
}
function renderHouses(){
 const host=document.getElementById('housesContent');if(!host)return;
 const months=availableHouseMonths();
 if(!selectedHouseMonth)selectedHouseMonth=months[0]||'';
 const ranked=allHouseTotals('');
 const current=selectedHouseMonth?allHouseTotals(selectedHouseMonth):ranked;
 const selected=houseList().includes(selectedHouse)?selectedHouse:houseList()[0];selectedHouse=selected;
 const stats=houseStats(selected,selectedHouseMonth);
 const trophies=houseTrophies(selected);
 const counts={};trophies.forEach(t=>{const k=trophyKey(t.name,t.image);counts[k]=(counts[k]||0)+1});
 const memberRows=houseStats(selected,'').students;
 const monthlyRows=stats.students;
 host.innerHTML=`
 <div class="house-intro"><div><p class="eyebrow">COPA DE LAS CASAS</p><h2>Las cuatro casas compiten durante todo el año.</h2><p>Los puntos se suman automáticamente desde la hoja. Cada mes, la casa con más puntos gana la <strong>Copa de la Casa</strong> y queda registrada en su vitrina. Además, pueden organizarse eventos especiales que otorguen otros tipos de copas o trofeos, que también pasarán a formar parte del historial y la vitrina.</p></div><div class="house-cup-total">🏆<strong>${monthlyHouseWinners().length}</strong><span>copas de casa entregadas</span></div></div>
 <div class="house-ranking-grid">${ranked.map((x,i)=>`<button class="house-rank-card ${x.house===selected?'active':''}" data-house="${escape(x.house)}"><span class="house-rank">#${i+1}</span><img src="${houseLogo(x.house)}" onerror="this.style.visibility='hidden'" alt="${escape(x.house)}"><span class="house-rank-name">${escape(x.house)}</span><strong>${x.total} pts</strong><small>🏆 ${houseCupCount(x.house)} copas</small></button>`).join('')}</div>
 <div class="house-controls"><label><span>Mes</span><select id="houseMonthSelect"><option value="">Histórico total</option>${months.map(m=>`<option value="${m}" ${m===selectedHouseMonth?'selected':''}>${escape(monthLabel(m))}</option>`).join('')}</select></label><div class="house-selected-title"><img src="${houseLogo(selected)}" onerror="this.style.visibility='hidden'" alt=""><div><p class="eyebrow">CASA</p><h2>${escape(selected)}</h2></div></div></div>
 <div class="house-view-tabs" role="tablist" aria-label="Vista de la casa">
  <button class="house-view-tab active" data-house-view="score" type="button">Puntuación</button>
  <button class="house-view-tab" data-house-view="showcase" type="button">Vitrina</button>
 </div>
 <div class="house-detail-single">
  <article id="houseScorePanel" class="house-panel house-view-panel active">
   <div class="panel-heading"><div><p class="eyebrow">PUNTUACIÓN</p><h3>${selectedHouseMonth?escape(monthLabel(selectedHouseMonth)):'Histórico total'}</h3></div><div class="score-summary"><strong>${stats.total} pts</strong><span>🏆 ${trophies.length} trofeos totales</span></div></div>
   <h4>Estudiantes destacados del mes</h4>${monthlyRows.length?`<div class="house-students">${monthlyRows.slice(0,8).map((x,i)=>`<div class="house-student"><span>#${i+1}</span><b>${escape(x.name)}</b><strong>${x.points} pts</strong></div>`).join('')}</div>`:'<div class="empty">No hay puntos este mes.</div>'}
   <h4>Total acumulado por estudiante</h4>${memberRows.length?`<div class="house-students">${memberRows.slice(0,8).map((x,i)=>`<div class="house-student"><span>#${i+1}</span><b>${escape(x.name)}</b><strong>${x.points} pts</strong></div>`).join('')}</div>`:'<div class="empty">No hay puntos registrados.</div>'}
  </article>
  <article id="houseShowcasePanel" class="house-panel house-view-panel">
   <div class="panel-heading"><div><p class="eyebrow">VITRINA</p><h3>Trofeos de ${escape(selected)}</h3></div><strong>🏆 ${trophies.length}</strong></div>
   <div class="trophy-tools"><label><span>Ordenar</span><select id="trophySort"><option value="type">Tipo</option><option value="date">Fecha</option><option value="count">Cantidad de trofeo</option></select></label></div>
   <div id="houseTrophyShelf" class="trophy-shelf"></div>
  </article>
 </div>
 <article class="house-panel house-history"><div class="panel-heading"><div><p class="eyebrow">HISTORIAL</p><h3>Historial de trofeos</h3></div><strong>🏆 ${trophies.length}</strong></div><div class="cup-history">${trophySort(trophies,'date').map(t=>`<div class="cup-history-row"><img src="${trophyImage(t)}" onerror="this.src='images/trofeos/trofeo_casa.png'" alt=""><span><b>${escape(t.name)}</b><small>${t.person?`Ganado por ${escape(t.person)} · `:''}${escape(t.date?fmtDate(t.date):'—')}</small></span><strong>${t.kind==='casa'?'Copa de la Casa':'Copa/Trofeo de evento'}</strong></div>`).join('')||'<div class="empty">Esta casa todavía no tiene trofeos registrados.</div>'}</div></article>`;
 const drawTrophies=(sort='type')=>{const shelf=document.getElementById('houseTrophyShelf');const arr=trophySort(trophies,sort);shelf.innerHTML=arr.length?arr.map(t=>`<div class="trophy-card"><img src="${trophyImage(t)}" onerror="this.src='images/trofeos/trofeo_casa.png'" alt=""><div><b>${escape(t.name)}</b>${t.person?`<span>Ganado por ${escape(t.person)}</span>`:''}<small>${t.kind==='casa'?'Copa mensual':'Evento'} · ${escape(t.date?fmtDate(t.date):'—')}</small></div></div>`).join(''):'<div class="empty">No hay trofeos todavía.</div>';};
 drawTrophies();
 document.getElementById('trophySort')?.addEventListener('change',e=>drawTrophies(e.target.value));
 host.querySelectorAll('[data-house-view]').forEach(btn=>btn.onclick=()=>{
   const view=btn.dataset.houseView;
   host.querySelectorAll('[data-house-view]').forEach(x=>x.classList.toggle('active',x===btn));
   document.getElementById('houseScorePanel')?.classList.toggle('active',view==='score');
   document.getElementById('houseShowcasePanel')?.classList.toggle('active',view==='showcase');
 });
 document.getElementById('houseMonthSelect')?.addEventListener('change',e=>{selectedHouseMonth=e.target.value;renderHouses()});
 host.querySelectorAll('[data-house]').forEach(b=>b.onclick=()=>{selectedHouse=b.dataset.house;renderHouses()});
}

renderHouseHub();
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
 document.getElementById('refreshNews')?.addEventListener('click',async()=>{if(SOURCES.news){try{news=await loadCSV(SOURCES.news,{force:true,ttl:0});renderNews()}catch(e){console.error(e)}}});
}
function renderToday(){const today=madridToday(),ss=streams.filter(s=>cleanDate(field(s,"FECHA"))===today).sort((a,b)=>Number(field(a,"DIRECTO"))-Number(field(b,"DIRECTO")));document.getElementById('today').innerHTML=ss.length?`<div class="today-grid">${ss.map(streamCard).join('')}</div>`:`<div class="empty">Hoy no hay directo.</div>`}
function monday(d){const x=new Date(d);x.setHours(0,0,0,0);const n=x.getDay();x.setDate(x.getDate()-(n===0?6:n-1));return x}
function renderWeek(){const start=monday(new Date());start.setDate(start.getDate()+weekOffset*7);const end=new Date(start);end.setDate(end.getDate()+6);document.getElementById('weekTitle').textContent=`${fmtShort(start)} — ${fmtShort(end)}`;const today=madridToday();let html='';for(let i=0;i<7;i++){const d=new Date(start);d.setDate(d.getDate()+i);const ds=localDate(d),ss=streams.filter(s=>cleanDate(field(s,"FECHA"))===ds).sort((a,b)=>Number(field(a,"DIRECTO"))-Number(field(b,"DIRECTO")));html+=`<div class="day-column ${ds===today?'today':''}"><div class="day-head"><div class="day-name">${escape(new Intl.DateTimeFormat('es-ES',{weekday:'long'}).format(d))}</div><div class="day-date">${escape(fmtShort(d))}</div></div><div class="day-streams">${ss.length?ss.map(miniStream).join(''):'<div class="empty">—</div>'}</div></div>`}document.getElementById('week').innerHTML=html}
function renderStats(){
 const ps=past(),gc={},sc={};ps.forEach(s=>{const gid=field(s,"ID_JUEGO"),sid=field(s,"ID_SERIE");gc[gid]=(gc[gid]||0)+1;sc[sid]=(sc[sid]||0)+1});
 const rows=(obj,fn)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([id,n],i)=>`<div class="rank-row"><span class="rank-number">#${i+1}</span><span>${escape(fn(id))}</span><span class="rank-count">${n}</span></div>`).join('');
 document.getElementById('statsContent').innerHTML=`<div class="stats-grid"><div class="stat"><div class="stat-label">Directos</div><div class="stat-value">${ps.length}</div></div><div class="stat"><div class="stat-label">Juegos</div><div class="stat-value">${Object.keys(gc).length}</div></div><div class="stat"><div class="stat-label">Series</div><div class="stat-value">${Object.keys(sc).length}</div></div></div><div class="ranking"><h2>Juegos más emitidos</h2>${rows(gc,id=>gameName(game(id),id))||'<div class="empty">—</div>'}</div><div class="ranking"><h2>Series más emitidas</h2>${rows(sc,id=>seriesName(serie(id),id))||'<div class="empty">—</div>'}</div>`;
}

// Estadísticas del catálogo de juegos.
// Se calculan una sola vez por ciclo de `past()` para evitar repetir el recorrido
// completo de los directos mientras se pinta/ordena el catálogo.
let gameStatsMemo={bucket:-1,result:[],map:new Map()};
function buildGameStats(){
 const bucket=Math.floor(Date.now()/30000);
 if(gameStatsMemo.bucket===bucket)return gameStatsMemo.result;
 const completed=past();
 const byGame=new Map();
 for(const s of completed){
   const gid=field(s,"ID_JUEGO");
   if(!gid)continue;
   let item=byGame.get(gid);
   if(!item){
     item={id:gid,count:0,first:"",last:"",series:new Map()};
     byGame.set(gid,item);
   }
   item.count++;
   const d=cleanDate(field(s,"FECHA"));
   if(d&&(!item.first||d<item.first))item.first=d;
   if(d&&(!item.last||d>item.last))item.last=d;
   const sid=field(s,"ID_SERIE")||"__sin_serie__";
   item.series.set(sid,(item.series.get(sid)||0)+1);
 }
 const result=Array.from(byGame.values()).map(item=>{
   let longestCount=0,longestSeries="";
   for(const [sid,n] of item.series){
     if(n>longestCount){longestCount=n;longestSeries=sid;}
   }
   return {id:item.id,count:item.count,first:item.first,last:item.last,longestCount,longestSeries};
 }).sort((a,b)=>b.count-a.count||a.last.localeCompare(b.last)||gameName(game(a.id),a.id).localeCompare(gameName(game(b.id),b.id),'es'));
 gameStatsMemo={bucket,result,map:new Map(result.map(x=>[x.id,x]))};
 return result;
}
function gameStat(id){
 buildGameStats();
 return gameStatsMemo.map.get(id)||{id,count:0,first:"",last:"",longestCount:0,longestSeries:""};
}

function catalogMetaGame(g){
 const id=field(g,"ID_JUEGO"),x=gameStat(id);
 return {name:gameName(g,id),count:x.count,first:x.first,last:x.last};
}
function catalogMetaSeries(s){
 const id=field(s,"ID_SERIE"),d=streamDatesFor(x=>field(x,"ID_SERIE")===id);
 return {...d,name:seriesName(s,id)};
}
function sortCatalog(items,meta){
 const sort=document.getElementById('catalogSort')?.value||'recent';
 return items.sort((a,b)=>{
   const A=meta(a),B=meta(b);
   if(sort==='az')return A.name.localeCompare(B.name,'es');
   if(sort==='za')return B.name.localeCompare(A.name,'es');
   if(sort==='most')return B.count-A.count||A.name.localeCompare(B.name,'es');
   if(sort==='least')return A.count-B.count||A.name.localeCompare(B.name,'es');
   if(sort==='oldest')return (A.last?new Date(A.last):new Date(8640000000000000))-(B.last?new Date(B.last):new Date(8640000000000000))||A.name.localeCompare(B.name,'es');
   return (B.last?new Date(B.last):0)-(A.last?new Date(A.last):0)||A.name.localeCompare(B.name,'es');
 });
}
function catalogQuery(){return (document.getElementById('catalogSearch')?.value||'').trim().toLocaleLowerCase('es')}
function renderGames(){
 const q=catalogQuery();
 const stats=buildGameStats();
 const metaById=gameStatsMemo.map;
 const list=games.filter(g=>gameName(g,field(g,"ID_JUEGO")).toLocaleLowerCase('es').includes(q));
 const sort=document.getElementById('catalogSort')?.value||'recent';
 list.sort((a,b)=>{
   const aid=field(a,"ID_JUEGO"),bid=field(b,"ID_JUEGO"),A=metaById.get(aid)||{count:0,last:""},B=metaById.get(bid)||{count:0,last:""};
   const an=gameName(a,aid),bn=gameName(b,bid);
   if(sort==='az')return an.localeCompare(bn,'es');
   if(sort==='za')return bn.localeCompare(an,'es');
   if(sort==='most')return B.count-A.count||an.localeCompare(bn,'es');
   if(sort==='least')return A.count-B.count||an.localeCompare(bn,'es');
   if(sort==='oldest')return (A.last?new Date(A.last):new Date(8640000000000000))-(B.last?new Date(B.last):new Date(8640000000000000))||an.localeCompare(bn,'es');
   return (B.last?new Date(B.last):0)-(A.last?new Date(A.last):0)||an.localeCompare(bn,'es');
 });
 document.getElementById('gamesList').innerHTML=list.map(g=>{
   const id=field(g,"ID_JUEGO"),m=metaById.get(id)||{count:0};
   return `<article class="game-card" data-game="${escape(id)}"><img src="images/${escape(gameImage(g))}" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"><h2>${escape(gameName(g,id))}</h2><div class="muted">${m.count} directos</div></article>`;
 }).join('')||'<div class="empty">No se han encontrado juegos.</div>';
 document.querySelectorAll('.game-card').forEach(c=>c.onclick=()=>showGame(c.dataset.game));
}
function renderSeries(){
 const q=catalogQuery();
 const list=series.filter(s=>seriesName(s,field(s,"ID_SERIE")).toLocaleLowerCase('es').includes(q));
 const sort=document.getElementById('catalogSort')?.value||'recent';
 const metaCache=new Map();
 const meta=s=>{const id=field(s,"ID_SERIE");if(!metaCache.has(id))metaCache.set(id,catalogMetaSeries(s));return metaCache.get(id)};
 list.sort((a,b)=>{
   const A=meta(a),B=meta(b);
   if(sort==='az')return A.name.localeCompare(B.name,'es');
   if(sort==='za')return B.name.localeCompare(A.name,'es');
   if(sort==='most')return B.count-A.count||A.name.localeCompare(B.name,'es');
   if(sort==='least')return A.count-B.count||A.name.localeCompare(B.name,'es');
   if(sort==='oldest')return (A.last?new Date(A.last):new Date(8640000000000000))-(B.last?new Date(B.last):new Date(8640000000000000))||A.name.localeCompare(B.name,'es');
   return (B.last?new Date(B.last):0)-(A.last?new Date(A.last):0)||A.name.localeCompare(B.name,'es');
 });
 document.getElementById('seriesList').innerHTML=list.map(s=>{
   const sid=field(s,"ID_SERIE"),gid=field(s,"ID_JUEGO"),g=game(gid),link=seriesLink(s),m=meta(s);
   return `<article class="series-card" data-series="${escape(sid)}"><img src="images/${escape(gameImage(g))}" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"><div class="series-card-body"><h2>${escape(m.name)}</h2><div class="series-game">${escape(gameName(g,gid))}</div><div class="series-count">${m.count} directos</div>${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Ver playlist</a>`:''}</div></article>`;
 }).join('')||'<div class="empty">No se han encontrado series.</div>';
 document.querySelectorAll('.series-card').forEach(c=>c.onclick=e=>{if(e.target.closest('a'))return;showSeries(c.dataset.series)});
}
function gameStatsRows(filter="",search=""){
 const all=buildGameStats(),total=all.reduce((n,x)=>n+x.count,0);
 const topIds=new Set(all.slice(0,6).map(x=>x.id));
 const q=String(search||"").trim().toLocaleLowerCase('es');
 return all.filter(x=>{
   const name=gameName(game(x.id),x.id).toLocaleLowerCase('es');
   if(q&&!name.includes(q))return false;
   if(filter==='others'&&topIds.has(x.id))return false;
   if(filter&&filter!=='others'&&x.id!==filter)return false;
   return true;
 }).map(x=>({...x,name:gameName(game(x.id),x.id),share:total?x.count/total*100:0,seriesShare:x.count?x.longestCount/x.count*100:0}));
}
function renderGameStats(){
 const host=document.getElementById('gameStatsContent');
 if(!host)return;
 try{
   const all=buildGameStats();
   const total=all.reduce((n,x)=>n+x.count,0);
   const top=all.slice(0,6);
   const others=all.slice(6).reduce((n,x)=>n+x.count,0);
   const bar=[...top.map(x=>({...x,name:gameName(game(x.id),x.id),share:total?x.count/total*100:0})),...(others?[{id:'__others__',name:'Otros',count:others,share:total?others/total*100:0}]:[])];
   const segment=(x,i)=>{
     const img=gameImage(game(x.id));
     const share=Number(x.share)||0;
     const count=Number(x.count)||0;
     const tiles=img?`<div class="game-share-tiles" aria-hidden="true"><img src="images/${escape(img)}" alt="" draggable="false" loading="eager" decoding="async" onerror="this.remove()"><img src="images/${escape(img)}" alt="" draggable="false" loading="eager" decoding="async" onerror="this.remove()"><img src="images/${escape(img)}" alt="" draggable="false" loading="eager" decoding="async" onerror="this.remove()"><img src="images/${escape(img)}" alt="" draggable="false" loading="eager" decoding="async" onerror="this.remove()"><img src="images/${escape(img)}" alt="" draggable="false" loading="eager" decoding="async" onerror="this.remove()"></div>`:'';
     return `<button type="button" class="game-share-segment game-share-${i+1}" data-stat-filter="${escape(x.id)}"><div class="game-share-tooltip"><strong>${escape(x.name)}</strong><span>${count} directos · ${share.toFixed(1)}%</span></div>${tiles}<span class="game-share-overlay" aria-hidden="true"></span></button>`;
   };
   const othersShare=total?others/total*100:0;
   const othersGames=all.length-top.length;
   const othersSegment=others?`<button type="button" class="game-share-segment game-share-others" data-stat-filter="others"><div class="game-share-tooltip"><strong>Otros</strong><span>${othersGames} juegos · ${others} directos · ${othersShare.toFixed(1)}%</span></div><span class="game-share-overlay" aria-hidden="true"></span></button>`:'';
   host.innerHTML=`<div class="game-stats-intro"><div><p class="eyebrow">STREAM DISTRIBUTION</p><h2>Juegos más jugados</h2><p>Distribución de todos los directos completados. Los seis juegos principales aparecen individualmente y el resto se agrupa en «Otros».</p></div><div class="game-stats-total"><strong>${total}</strong><span>directos contabilizados</span></div></div><div class="game-share-wrap"><div class="game-share-bar" aria-label="Distribución de directos por juego" style="grid-template-columns:${bar.map(x=>`${Number(x.share)||0}fr`).join(' ')}">${top.map((x,i)=>segment(x,i)).join('')}${othersSegment}</div></div><div class="game-stats-controls"><input id="gameStatsSearch" type="search" placeholder="Buscar juego..." autocomplete="off"><button type="button" class="stats-filter-clear" data-stat-filter="">Todos</button><button type="button" class="stats-filter-clear" data-stat-filter="others">Solo «Otros»</button></div><div class="game-stats-table" id="gameStatsTable"></div>`;
   const draw=(filter='',search='')=>{const rows=gameStatsRows(filter,search),table=document.getElementById('gameStatsTable');if(!table)return;table.innerHTML=rows.length?`<div class="game-stat-header"><span>#</span><span>Juego</span><span>Directos</span><span>Serie más larga</span><span>Primera vez jugado</span><span>Última vez jugado</span></div>${rows.map((x,i)=>{const img=gameImage(game(x.id));return `<button type="button" class="game-stat-row" data-game="${escape(x.id)}"><span class="game-stat-rank">${i+1}</span><span class="game-stat-game">${img?`<img src="images/${escape(img)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`:''}<strong>${escape(x.name)}</strong></span><span class="game-stat-number"><strong>${x.count}</strong><small>${Number(x.share||0).toFixed(1)}% del total</small></span><span class="game-stat-number"><strong>${x.longestCount}</strong><small>${Number(x.seriesShare||0).toFixed(1)}% del juego</small></span><time>${escape(fmtDate(x.first))}</time><time>${escape(fmtDate(x.last))}</time></button>`}).join('')}`:'<div class="empty">No se han encontrado juegos.</div>';table.querySelectorAll('.game-stat-row').forEach(r=>r.onclick=()=>showGame(r.dataset.game));};
   const search=document.getElementById('gameStatsSearch');
   draw(window.__gameStatsFilter||'',search?.value||'');
   if(search)search.oninput=()=>draw(window.__gameStatsFilter||'',search.value);
   host.querySelectorAll('[data-stat-filter]').forEach(el=>el.onclick=()=>{window.__gameStatsFilter=el.dataset.statFilter||'';draw(window.__gameStatsFilter,search?.value||'');host.querySelectorAll('.stats-filter-clear').forEach(b=>b.classList.toggle('active',b.dataset.statFilter===window.__gameStatsFilter));});
 }catch(err){console.error('Error al renderizar las estadísticas de Gameplays:',err);host.innerHTML='<div class="empty">No se han podido calcular las estadísticas. Revisa la consola para más detalles.</div>';}
}
function showGame(id,push=true){const g=game(id),ps=past().filter(s=>field(s,"ID_JUEGO")===id),counts={};ps.forEach(s=>{const sid=field(s,"ID_SERIE");counts[sid]=(counts[sid]||0)+1});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const relevant=series.filter(s=>field(s,"ID_JUEGO")===id);document.getElementById('catalog-juegos').classList.remove('active');document.getElementById('catalog-series').classList.remove('active');document.getElementById('catalog-estadisticas').classList.remove('active');const detail=document.getElementById('catalog-detail');detail.classList.add('active');detail.innerHTML=`<button class="back" onclick="backCatalog('juegos')">← Juegos</button><div class="detail-top"><img src="images/${escape(gameImage(g))}" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"><div><h2>${escape(gameName(g,id))}</h2><p class="muted">${ps.length} directos</p><h3>Serie más larga</h3><p>${sorted[0]?`${escape(seriesName(serie(sorted[0][0]),sorted[0][0]))} — ${sorted[0][1]} directos`:'—'}</p><h3>Series</h3><div class="series-list">${relevant.map(s=>{const sid=field(s,"ID_SERIE"),n=counts[sid]||0,link=seriesLink(s);return `<div class="series-item" data-series="${escape(sid)}"><strong>${escape(seriesName(s,sid))}</strong><span class="muted">${n} directos</span>${link?`<a class="playlist" href="${escape(link)}" target="_blank" rel="noopener">Playlist</a>`:''}</div>`}).join('')||'<span class="muted">Sin series.</span>'}</div></div></div>`;detail.querySelectorAll('.series-item').forEach(el=>el.onclick=e=>{if(e.target.closest('a'))return;showSeries(el.dataset.series)});if(push)history.pushState({page:'catalogo',tab:'juegos',detail:'game',id},'',`#catalogo/juegos/game/${encodeURIComponent(id)}`)}
function showSeries(id,push=true){
 const s=serie(id),gid=field(s,"ID_JUEGO"),g=game(gid),ps=past().filter(x=>field(x,"ID_SERIE")===id),link=seriesLink(s);
 const dates=streamDatesFor(x=>field(x,"ID_SERIE")===id);
 document.getElementById('catalog-juegos').classList.remove('active');document.getElementById('catalog-series').classList.remove('active');
 const detail=document.getElementById('catalog-detail');detail.classList.add('active');
 detail.innerHTML=`<button class="back" onclick="backCatalog('series')">← Series</button><div class="detail-top"><img src="images/${escape(gameImage(g))}" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"><div><h2>${escape(seriesName(s,id))}</h2><p class="muted">${escape(gameName(g,gid))}</p><div class="detail-data"><div><span>Primer directo</span><strong>${escape(fmtDate(dates.first))}</strong></div><div><span>Último directo</span><strong>${escape(fmtDate(dates.last))}</strong></div><div><span>Número de directos</span><strong>${ps.length}</strong></div></div>${link?`<a class="playlist big" href="${escape(link)}" target="_blank" rel="noopener">Ver playlist en YouTube</a>`:''}</div></div>`;
 if(push)history.pushState({page:'catalogo',tab:'series',detail:'series',id},'',`#catalogo/series/series/${encodeURIComponent(id)}`);
}
function backCatalog(tab='juegos',push=true){document.getElementById('catalog-detail').classList.remove('active');document.querySelectorAll('.catalog-page').forEach(x=>x.classList.remove('active'));document.getElementById('catalog-'+tab).classList.add('active');document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog===tab));if(push)history.pushState({page:'catalogo',tab},'',`#catalogo/${tab}`)}
function setupCatalog(){
 document.querySelectorAll('.catalog-btn').forEach(b=>b.onclick=()=>{const tab=b.dataset.catalog;document.querySelectorAll('.catalog-btn').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.catalog-page').forEach(x=>x.classList.remove('active'));document.getElementById(`catalog-${tab}`).classList.add('active');if(tab==='estadisticas')renderGameStats();else if(tab==='juegos')renderGames();else renderSeries();document.getElementById('catalog-detail').classList.remove('active');history.pushState({page:'catalogo',tab},'',`#catalogo/${tab}`);});
 const refresh=()=>{if(document.getElementById('catalog-juegos').classList.contains('active'))renderGames();if(document.getElementById('catalog-series').classList.contains('active'))renderSeries()};
 document.getElementById('catalogSearch')?.addEventListener('input',refresh);
 document.getElementById('catalogSort')?.addEventListener('change',refresh);
}
function setupTZ(){const el=document.getElementById('timezoneSelect');el.innerHTML=TIMEZONES.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');el.value='auto';el.onchange=()=>{selectedTZ=el.value;renderToday();renderWeek()}}
const FICHAS_INFO=[
 {name:"Combo accesorio",description:"Ficha que te permite elegir si Randes se pone peluca, gorro de Papá Noel, máscara Halloween 2023/2025 o gorra.",image:"combo accesorio.png"},
 {name:"Inspector de motes",description:"Ficha que te permite ponerle un mote a un Pokémon, usar antes de tirar dados en no lockes y ruleta en lockes. El Pokémon debe estar atrapado al usarse.",image:"inspector de motes.png"},
 {name:"Himno del chat",description:"Ficha que te permite poner una canción del Discord en el chat.",image:"himno del chat.png"},
 {name:"Speed Art",description:"Puedes seleccionar un Pokémon del equipo o PC, el cual será dibujado en 1 min y colocado en el marco.",image:"speed art.png"},
 {name:"Susurros Futuristas",description:"Permite pedirle un entretenimiento del futuro (chiste, poema, haiku o similares con un Pokémon a la IA y que Randes lo lea).",image:"susurros futuristas.png"},
 {name:"Tototo Star",description:"Permite pedir un Tototo de la lista para colocarse en el directo. Esta ficha es compatible con Tototo Fiel Seguidor. Y durante el Tototo Day no posee límite de cantidad de uso, pero sí de usuario.",image:"tototostar.png"}
];
const FICHA_SONGS={
 "Canciones de Ibram":["Team rocket Randes","Xenorandes","ElRandes","Randes y fotopie","X-men de Randes","Xenorandes español","Arga el mod","Automod del mal","Chat","Mariachis Randes de los mil hijos","Randes mil hijos","Baron de la birra","Pantalla de carga","Gabyangel","Escaleras del mal","Andar y Andar","Combates dobles","Randesito wey","Mrdoom","Xcom2","Freecanciones"],
 "Canciones de Arga":["Zapspark el suertudo","Infernoble Rock","Infernoble Punk","Rey Bug","La pierna de Exodia","Randes leyendas","Red archefiend dragón","Kanto","Lema rocket","ZoriAoA armed dragón","Princesa Randes","Bolita","Randes Randes","Randes dictador","Randes dictador alternativo","Lechuga en tu honor","Randescienta","Zapspark card captor","Mulandes","Lazos de amistad","Copa hojafail","Quién es ibram","NotPikachu","Mega pinsir","Te odio","Líder de gimnasio V2","Leyendas de sinnoh opción A","Leyendas de sinnoh opción B","Cincuenta son cincuenta","Farmear y farmear","Not FC","Luchamos con el corazón NotPikachu FC","Kakuna VS metapod","Kakuna samurái VS metapod ninja","Trubbish el revolucionario","Basurabrothers","NotPikachu FC the final battle","Poochiena","Randes Cumpleaños","Mago del tiempo VS Chica maga oscura","Delibird y su saco mágico","Wartortilla y su amor","Goomink heroe del tiempo","Lejía para el alma","Trubbish","Tacuche puertas, aliens y dados","¡Abrázalos a todos, Tototos!","Chimecho mal sonante","GAME OVER","La-la-la-lava Torchic","Un momento, un momento","Running in the night with revavroom","Guāngzhīluò: Bolita de xīn","Diglet Diglet Dig","Viva la liga","Luvdisc world","Super ball super ball","Mi amigo malamar","Amistad en el Nilo","Tototo superstar","babe babe babe","Despedida","Celia me roba la cordura","Dedenne","Méngméng Dedenne"],
 "Canciones de Pesadilla":["Dios pokémon","Randes el elegido"]
};
const TOTOTOS=[
 ["Tototo Demonio","Tototo demonio.png"],
 ["Tototo Silvally (eléctrico)","Tototo Silvally electrico.png"],
 ["Tototo Profe","Tototo profe.png"],
 ["Tototo (original)","a Tototo.png"],
 ["Tototo Mega Malamar","Tototo MEGA malamar.png"],
 ["Tototo Yugi Muto","Tototo yugi.png"],
 ["Tototo Sad","Tototo sad.png"],
 ["Tototo Lt. Surge (American Lover) and Team","Tototo lt surge american lover and team.png"],
 ["Tototo Spider-Man","Tototo spiderman.png"],
 ["Tototo Cyndaquil","Tototo Cyndaquill.png"],
 ["Tototo Suertudo","Tototo suertudo.png"],
 ["Tototo Banana","Tototo banana.png"],
 ["Tototo Conejo","Tototo conejo.png"],
 ["Tototo Stand (The World)","Tototo stand the world.png"],
 ["Tototo Gafas de Sol","Tototo sol.png"],
 ["Mini Tototo","Tototo Mini.png"],
 ["Tototo Luigi","Tototo luigi.png"],
 ["Tototo Yoda","Tototo Yoda.png"],
 ["Tototo Odín (Marvel)","Tototo odin.png"],
 ["Tototo Dálmata","Tototo Dalmata.png"],
 ["Tototo Boo (disfrazada)","Tototo boo disfrazada.png"]
].map(([name,file])=>({name,file,url:`https://raw.githubusercontent.com/notpikachuarmy/tototos/main/${encodeURIComponent(file).replace(/%2F/g,'/')}`}));
function fichaName(row){return field(row,"Ficha")||field(row,"ficha")}
function fichaMove(row){let v=field(row,"Movimiento")||field(row,"+-")||field(row,"+/-")||field(row,"Cantidad")||"0";v=String(v).replace(',','.');const n=Number(v);return Number.isFinite(n)?n:(String(v).trim().startsWith('-')?-1:1)*Number(String(v).replace(/[^0-9.]/g,'' )||0)}
function fichaUser(row){return field(row,"Usuario")||field(row,"Nombre")||field(row,"Usuario Discord")}
function fichaDate(row){return cleanDate(field(row,"Fecha"))}
function fichaInfoExtra(row){return field(row,"Info extra")||field(row,"Info Extra")||field(row,"Info")||field(row,"Extra")}
function fichaTotals(){const out={};fichas.forEach(r=>{const u=fichaUser(r),f=fichaName(r),n=fichaMove(r);if(!u||!f||!n)return;(out[u]??={})[f]=(out[u]?.[f]||0)+n});return out}
function fichaMonthlyStats(){const months={};fichas.forEach(r=>{const d=fichaDate(r),n=fichaMove(r),u=fichaUser(r),f=fichaName(r);if(!d||!u||!f||!n)return;const m=d.slice(0,7);(months[m]??={gained:0,used:0,byUser:{},byFicha:{}});if(n>0){months[m].gained+=n;months[m].byUser[u]=(months[m].byUser[u]||0)+n;months[m].byFicha[f]=(months[m].byFicha[f]||0)+n}else{months[m].used+=Math.abs(n)}});return months}
function fichaMonthLabel(m){const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))}

function fichaImage(name){
 const f=FICHAS_INFO.find(x=>x.name.toLowerCase()===String(name).toLowerCase());
 return f?.image||"";
}
function renderFichasInfo(){
 const el=document.getElementById('fichasInfoContent');if(!el)return;
 el.innerHTML=`
   <div class="fichas-info-tabs" role="tablist" aria-label="Información de fichas">
     <button class="fichas-info-tab ${selectedFichasInfoTab==='fichas'?'active':''}" data-fichas-info="fichas" role="tab">Fichas</button>
     <button class="fichas-info-tab ${selectedFichasInfoTab==='reglas'?'active':''}" data-fichas-info="reglas" role="tab">Reglas</button>
   </div>
   <div id="fichas-info-fichas" class="fichas-info-page ${selectedFichasInfoTab==='fichas'?'active':''}">
     ${FICHAS_INFO.map(f=>{
       const songs=f.name==='Himno del chat'?Object.entries(FICHA_SONGS).map(([g,arr])=>`<details class="ficha-details"><summary>${escape(g)} <span>${arr.length} canciones</span></summary><ul>${arr.map(x=>`<li>${escape(x)}</li>`).join('')}</ul></details>`).join(''):'';
       const tots=f.name==='Tototo Star'?`<details class="ficha-details tototo-details"><summary>Lista de Tototos disponibles <span>${TOTOTOS.length} Tototos</span></summary><div class="tototo-grid">${TOTOTOS.map(t=>`<figure class="tototo-card"><img src="${t.url}" alt="${escape(t.name)}" loading="lazy"><figcaption>${escape(t.name)}</figcaption></figure>`).join('')}</div></details>`:'';
       return `<article class="ficha-card"><div class="ficha-card-head"><img class="ficha-image" src="images/fichas/${encodeURIComponent(f.image).replace(/%2F/g,'/')}" alt="${escape(f.name)}"><div><h2>${escape(f.name)}</h2></div></div><p>${escape(f.description)}</p>${songs}${tots}</article>`;
     }).join('')}
   </div>
   <div id="fichas-info-reglas" class="fichas-info-page ${selectedFichasInfoTab==='reglas'?'active':''}">
     <article class="ficha-rules-card">
       <div class="ficha-rules-section">
         <p class="eyebrow">REGLAS</p>
         <h2>Reglas de las fichas</h2>
         <ol class="ficha-rules-list">
           <li><strong>Regla número 1</strong><p>Cada persona solo podrá usar una ficha por directo.</p></li>
           <li><strong>Regla número 2</strong><p>Solo se podrá usar una copia de cada ficha por directo, aunque las usen personas diferentes.</p></li>
           <li><strong>Regla número 3</strong><p>Solo se repartirán en los directos de <strong>pokémon</strong> o si <strong>llegamos a 20 espectadores</strong> en directo. (la cifra subirá cuantos más seamos) o si a Randes le apetece.</p></li>
         </ol>
       </div>
       <div class="ficha-rules-section">
         <p class="eyebrow">USO</p>
         <h2>¿Cómo se usa una ficha?</h2>
         <p>Para usar una ficha lo único que tendrás que decir es <strong>ACTIVO MI FICHA (nombre de ficha)</strong></p>
         <p class="ficha-example-label"><strong>Ejemplo:</strong></p>
         <div class="ficha-example-image"><img src="images/fichas/ejemplouso.png" alt="Ejemplo de cómo activar una ficha" loading="lazy"></div>
       </div>
     </article>
   </div>`;
 setupFichasInfoTabs();
}
function renderFichasUsers(){
 const el=document.getElementById('fichasUsersContent');if(!el)return;
 const totals=fichaTotals(), names=Object.keys(totals).sort((a,b)=>a.localeCompare(b,'es'));
 el.innerHTML=`<div class="ficha-user-tools"><input id="fichaUserSearch" list="fichaUserOptions" type="search" placeholder="Buscar usuario..." autocomplete="off"><datalist id="fichaUserOptions">${names.map(u=>`<option value="${escape(u)}">`).join('')}</datalist></div><div id="fichaUserList" class="ficha-user-list">${names.map((u,i)=>`<article class="ficha-user-card"><h3>${escape(u)}</h3><div class="ficha-inventory">${Object.entries(totals[u]).filter(([,n])=>n>0).sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([f,n])=>`<div class="ficha-inventory-item ficha-color-${FICHAS_INFO.findIndex(x=>x.name.toLowerCase()===f.toLowerCase())%6}"><span>${escape(f)}</span><strong>${n}</strong></div>`).join('')||'<p class="muted">Sin fichas disponibles.</p>'}</div></article>`).join('')||'<div class="empty">No hay movimientos de fichas.</div>'}</div>`;
 document.getElementById('fichaUserSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.ficha-user-card').forEach(c=>c.style.display=c.querySelector('h3').textContent.toLowerCase().includes(q)?'':'none')};
}
function renderFichasStats(){
 const el=document.getElementById('fichasStatsContent');if(!el)return;
 const months=fichaMonthlyStats(),keys=Object.keys(months).sort().reverse(),current=keys[0],data=current?months[current]:{gained:0,used:0,byUser:{},byFicha:{}};
 const topUser=Object.entries(data.byUser).sort((a,b)=>b[1]-a[1])[0];
 const topFicha=Object.entries(data.byFicha).sort((a,b)=>b[1]-a[1])[0];
 const usedByUser={};fichas.forEach(r=>{if(current&&fichaDate(r).startsWith(current)&&fichaMove(r)<0){const u=fichaUser(r);if(u)usedByUser[u]=(usedByUser[u]||0)+Math.abs(fichaMove(r))}});
 const topUsed=Object.entries(usedByUser).sort((a,b)=>b[1]-a[1])[0];
 const bestMonth=keys.map(k=>[k,months[k].gained]).sort((a,b)=>b[1]-a[1])[0];
 el.innerHTML=`<div class="ficha-stat-tools"><label>Mes<select id="fichaStatsMonth">${keys.map(k=>`<option value="${k}" ${k===current?'selected':''}>${escape(fichaMonthLabel(k))}</option>`).join('')}</select></label></div><div id="fichaStatsBody" class="ficha-stats-grid"><div class="ficha-stat-card"><span>Fichas ganadas</span><strong>${data.gained}</strong></div><div class="ficha-stat-card"><span>Fichas usadas</span><strong>${data.used}</strong></div><div class="ficha-stat-card"><span>Quién ganó más</span><strong>${topUser?escape(topUser[0]):'—'}</strong><small>${topUser?topUser[1]+' fichas':'—'}</small></div><div class="ficha-stat-card"><span>Quién usó más</span><strong>${topUsed?escape(topUsed[0]):'—'}</strong><small>${topUsed?topUsed[1]+' fichas':'—'}</small></div><div class="ficha-stat-card"><span>Mes con más ganancias</span><strong>${bestMonth?escape(fichaMonthLabel(bestMonth[0])):'—'}</strong><small>${bestMonth?bestMonth[1]+' fichas ganadas':'—'}</small></div><div class="ficha-stat-card"><span>Ficha más ganada</span><strong>${topFicha?escape(topFicha[0]):'—'}</strong><small>${topFicha?topFicha[1]+' fichas':'—'}</small></div></div>`;
 document.getElementById('fichaStatsMonth').onchange=e=>renderFichasStatsMonth(e.target.value)
}
function renderFichasStatsMonth(month){
 const el=document.getElementById('fichaStatsBody');if(!el)return;
 const all=fichaMonthlyStats(),m=all[month]||{gained:0,used:0,byUser:{},byFicha:{}},topUser=Object.entries(m.byUser).sort((a,b)=>b[1]-a[1])[0],topFicha=Object.entries(m.byFicha).sort((a,b)=>b[1]-a[1])[0],usedByUser={};
 fichas.forEach(r=>{if(fichaDate(r).startsWith(month)&&fichaMove(r)<0){const u=fichaUser(r);if(u)usedByUser[u]=(usedByUser[u]||0)+Math.abs(fichaMove(r))}});
 const topUsed=Object.entries(usedByUser).sort((a,b)=>b[1]-a[1])[0];
 el.innerHTML=`<div class="ficha-stat-card"><span>Fichas ganadas</span><strong>${m.gained}</strong></div><div class="ficha-stat-card"><span>Fichas usadas</span><strong>${m.used}</strong></div><div class="ficha-stat-card"><span>Quién ganó más</span><strong>${topUser?escape(topUser[0]):'—'}</strong><small>${topUser?topUser[1]+' fichas':'—'}</small></div><div class="ficha-stat-card"><span>Quién usó más</span><strong>${topUsed?escape(topUsed[0]):'—'}</strong><small>${topUsed?topUsed[1]+' fichas':'—'}</small></div><div class="ficha-stat-card"><span>Ficha más ganada</span><strong>${topFicha?escape(topFicha[0]):'—'}</strong><small>${topFicha?topFicha[1]+' fichas':'—'}</small></div>`
}
function renderFichasHistory(){
 const el=document.getElementById('fichasHistoryContent');if(!el)return;
 const months=[...new Set(fichas.map(fichaDate).filter(Boolean).map(d=>d.slice(0,7)))].sort().reverse(),current=selectedFichasMonth||months[0]||'';
 el.innerHTML=`<div class="ficha-stat-tools"><label>Mes<select id="fichaHistoryMonth">${months.map(m=>`<option value="${m}" ${m===current?'selected':''}>${escape(fichaMonthLabel(m))}</option>`).join('')}</select></label></div><div id="fichaHistoryList" class="ficha-history-list"></div>`;
 const draw=()=>{
   const m=document.getElementById('fichaHistoryMonth')?.value||current;selectedFichasMonth=m;
   const rows=fichas.filter(r=>fichaDate(r).startsWith(m)).sort((a,b)=>fichaDate(b).localeCompare(fichaDate(a)));
   document.getElementById('fichaHistoryList').innerHTML=rows.map(r=>{
     const n=fichaMove(r),positive=n>0;
     const img=fichaImage(fichaName(r));
     return `<article class="ficha-history-row"><div class="ficha-history-movement ${positive?'positive':'negative'}">${positive?'+':''}${n}</div><img class="ficha-history-image" src="images/fichas/${encodeURIComponent(img).replace(/%2F/g,'/')}" alt="${escape(fichaName(r))}" loading="lazy"><div><strong>${escape(fichaUser(r))}</strong><span>${escape(fichaName(r))}</span><small>${escape(fichaInfoExtra(r)||'')}</small></div><time>${escape(fichaDate(r))}</time></article>`
   }).join('')||'<div class="empty">No hay movimientos en este mes.</div>'
 };
 document.getElementById('fichaHistoryMonth').onchange=draw;draw()
}
function setupFichasInfoTabs(){
 document.querySelectorAll('.fichas-info-tab').forEach(b=>b.onclick=()=>{
   selectedFichasInfoTab=b.dataset.fichasInfo;
   document.querySelectorAll('.fichas-info-tab').forEach(x=>x.classList.toggle('active',x.dataset.fichasInfo===selectedFichasInfoTab));
   document.querySelectorAll('.fichas-info-page').forEach(p=>p.classList.toggle('active',p.id===`fichas-info-${selectedFichasInfoTab}`));
 });
}
function renderFichas(){renderFichasInfo();renderFichasUsers();renderFichasStats();renderFichasHistory()}
function showFichasTab(tab='info',push=true){const valid=['info','usuarios','estadisticas','historial'];if(!valid.includes(tab))tab='info';selectedFichasTab=tab;document.querySelectorAll('.fichas-tab').forEach(b=>b.classList.toggle('active',b.dataset.fichas===tab));document.querySelectorAll('.fichas-page').forEach(p=>p.classList.toggle('active',p.id===`fichas-${tab}`));if(push)history.pushState({page:'fichas',sub:tab},'',`#fichas/${tab}`)}
function setupFichas(){document.querySelectorAll('.fichas-tab').forEach(b=>b.onclick=()=>showFichasTab(b.dataset.fichas));}

function showExtra(sub='locke',push=true){
 const valid=['locke','medallas','minijuegos'];if(!valid.includes(sub))sub='locke';selectedExtra=sub;
 document.querySelectorAll('.extra-tab').forEach(b=>b.classList.toggle('active',b.dataset.extra===sub));document.querySelectorAll('.extra-page').forEach(p=>p.classList.toggle('active',p.id===`extra-${sub}`));
 if(sub==='medallas'){const host=document.getElementById('medalRanking');if(host)host.innerHTML='<div class="empty">Cargando ranking…</div>';ensureData('medals',[SOURCES.medals,SOURCES.users]).then(([m,u])=>{medals=m;users=u;renderMedalRanking()}).catch(e=>console.error(e));}
 if(push)history.pushState({page:'extra',sub},'',`#extra/${sub}`);
}

function setupExtra(){
 document.querySelectorAll('.extra-tab').forEach(b=>b.onclick=()=>showExtra(b.dataset.extra));
}
function showPage(page,push=true){
 const valid=['inicio','calendario','catalogo','casas','fichas','extra'];if(!valid.includes(page))page='inicio';
 document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 if(page==='calendario'){renderToday();renderWeek();renderStats()}
 if(page==='casas'){document.getElementById('housesContent').innerHTML='<div class="empty">Cargando casas…</div>';ensureData('houses',[SOURCES.houses,SOURCES.housePoints,SOURCES.houseAwards]).then(([h,p,a])=>{houses=h;housePoints=p;houseAwards=a;renderHouses();renderHouseHub()}).catch(e=>console.error(e))}
 if(page==='fichas'){document.getElementById('fichasUsersContent').innerHTML='<div class="empty">Cargando fichas…</div>';ensureData('fichas',[SOURCES.fichas]).then(([f])=>{fichas=f;renderFichas()}).catch(e=>console.error(e))}
 if(page==='catalogo'){renderGames();document.getElementById('catalog-detail').classList.remove('active');document.querySelectorAll('.catalog-page').forEach(x=>x.classList.remove('active'));document.getElementById('catalog-juegos').classList.add('active');document.querySelectorAll('.catalog-btn').forEach(b=>b.classList.toggle('active',b.dataset.catalog==='juegos'));}
 if(push)history.pushState({page},'',`#${page}`)
}

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
 }else if(page==='casas'){
   showPage('casas',push);
 }else if(page==='fichas'){
   showPage('fichas',push);
   showFichasTab(p[1]||'info',push);
 }else if(page==='catalogo'){
   showPage('catalogo',push);
   const tab=p[1]==='series'?'series':p[1]==='estadisticas'?'estadisticas':'juegos';
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
     document.getElementById('catalog-estadisticas').classList.toggle('active',tab==='estadisticas');
     if(tab==='estadisticas')renderGameStats();
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
   const [g,s,st]=await ensureData('core',[SOURCES.games,SOURCES.series,SOURCES.streams]);
   games=g;series=s;streams=st;
   setupTZ();setupNav();setupWeek();setupCatalog();setupExtra();setupFichas();setupHome();
   renderHub();renderWeek();renderStats();renderGames();restoreRoute(false);
   requestIdle(()=>{
     Promise.all([
       ensureData('home',[SOURCES.news,SOURCES.houses,SOURCES.housePoints]),
     ]).then(([data])=>{news=data[0];houses=data[1];housePoints=data[2];renderNews();renderHouseHub()}).catch(e=>console.warn('Datos secundarios no disponibles',e));
   });
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
