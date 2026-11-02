// Shared, read-only data projection for the Scripting Home Screen widget.
// The main sync engine remains the only writer of this App Group state.
const HOUR = 3600000;
const DAY = 24 * HOUR;
const BEIJING = 8 * HOUR;
const STATE_DIR = 'NUFE-Local-Scripting/NUFE-Local-Scripting-v2';
const NAMES = ['一','二','三','四','五','六','日'];

export function loadWidgetState(files) {
  try {
    const dir = files.appGroupDocumentsDirectory.replace(/\/$/,'') + '/' + STATE_DIR;
    if(!files.existsSync(dir)) return {kind:'empty'};
    const names = files.readDirectorySync(dir,false)
      .map(x=>String(x).split('/').pop())
      .filter(x=>/^state-\d{10}\.json$/.test(x)).sort();
    if(!names.length) return {kind:'empty'};
    const filename = dir + '/' + names[names.length-1];
    const stat = files.statSync(filename);
    if(stat.size > 4000000) return {kind:'invalid'};
    const raw = files.readAsStringSync(filename);
    if(typeof raw!=='string'||raw.length>4000000) return {kind:'invalid'};
    const data = JSON.parse(raw);
    if(!data||data.version!==1||!data.semesters||typeof data.semesters!=='object'
        ||Array.isArray(data.semesters)) return {kind:'invalid'};
    return {kind:'ready',state:data};
  }catch(_){return {kind:'invalid'};}
}

export function weekStartBeijing(now){
  const ms = now instanceof Date ? now.getTime() : Number(now);
  if(!Number.isFinite(ms)) throw Error('WIDGET_TIME');
  const local = new Date(ms+BEIJING);
  const daysSinceMonday = (local.getUTCDay()+6)%7;
  return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-
    daysSinceMonday*DAY-BEIJING;
}

function plainText(value,limit){
  return String(value||'').trim().slice(0,limit);
}
function timeString(ms){
  return new Date(ms+BEIJING).toISOString().slice(11,16);
}
function safeCourse(event,weekStart,weekEnd){
  if(!event||typeof event!=='object'||typeof event.title!=='string')return null;
  if(typeof event.start!=='string'||typeof event.end!=='string')return null;
  const start=Date.parse(event.start),end=Date.parse(event.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||
     start<weekStart||start>=weekEnd||end-start>DAY) return null;
  const day=Math.floor((start-weekStart)/DAY);
  if(day<0||day>6)return null;
  return {id:plainText(event.id,100),title:plainText(event.title,90),
    location:plainText(event.location,65),start,end,day,
    startLabel:timeString(start),endLabel:timeString(end)};
}

export function buildWeek(state,now=Date.now()){
  const at=now instanceof Date?now.getTime():Number(now);
  const start=weekStartBeijing(at),end=start+7*DAY;
  const courses=[];
  const semesters=state&&state.semesters&&typeof state.semesters==='object'
    ?Object.values(state.semesters):[];
  for(const semester of semesters){
    if(!semester||!Array.isArray(semester.events))continue;
    for(const ev of semester.events.slice(0,4000)){
      const course=safeCourse(ev,start,end);
      if(course)courses.push(course);
    }
  }
  courses.sort((a,b)=>a.start-b.start||a.title.localeCompare(b.title));
  const weekend=courses.some(e=>e.day>=5);
  const count=weekend?7:5;
  const today=Math.floor((at-start)/DAY);
  const days=Array.from({length:count},(_,idx)=>({
    index:idx,label:'周'+NAMES[idx],number:new Date(start+idx*DAY+BEIJING).getUTCDate(),
    today:idx===today,
    courses:courses.filter(c=>c.day===idx).map(c=>({
      ...c,status:c.end<=at?'done':c.start<=at?'current':'upcoming'
    }))
  }));
  const boundaries=[start+7*DAY];
  for(const c of courses){
    if(c.start>at)boundaries.push(c.start);
    if(c.end>at)boundaries.push(c.end);
  }
  const nextMidnight=start+(today+1)*DAY;
  if(nextMidnight>at)boundaries.push(nextMidnight);
  const nextAt=Math.min(...boundaries.filter(t=>t>at));
  const update=state&&typeof state.lastCheck==='string'?Date.parse(state.lastCheck):NaN;
  const outdated=Number.isFinite(update)&&at-update>7*DAY;
  return {start,at,days,courses,weekend,today,nextAt,
    updated:Number.isFinite(update)?update:null,outdated,empty:courses.length===0};
}

export function widgetReloadDate(model){
  // WidgetKit schedules are best effort. Do not continuously request minute
  // updates; only request an update at the next class boundary or day rollover.
  const at=model.at,delta=Math.max(60000,model.nextAt-at+1000);
  return new Date(at+Math.min(delta,DAY));
}

export function formatWeekLabel(start){
  const d=new Date(start+BEIJING);
  const y=d.getUTCFullYear(),m=d.getUTCMonth()+1,date=d.getUTCDate();
  return y+' / '+String(m).padStart(2,'0')+' / '+String(date).padStart(2,'0');
}
