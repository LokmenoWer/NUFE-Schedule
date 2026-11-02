// Shared, read-only data projection for the Scripting Home Screen widget.
// The main sync engine remains the only writer of this App Group state.
const HOUR = 3600000;
const DAY = 24 * HOUR;
const BEIJING = 8 * HOUR;
const STATE_DIR = 'NUFE-Local-Scripting/NUFE-Local-Scripting-v2';
const NAMES = ['一','二','三','四','五','六','日'];

// Read the shared snapshots exactly as the sync engine does. Avoid a hard
// dependency on statSync: file metadata isn't necessary to parse our own JSON,
// and unsupported/failed metadata calls used to mask readable caches.
const MIRROR_KEY='NUFE.Schedule.Widget.Courses.v1';
// Storage is private to the NUFE-Schedule project (no shared:true). The
// widget can use it even when the extension does not expose a FileManager
// App Group root. The legacy file reader is a fallback for existing installs.
export function readWidgetMirror(storage){
  if(!storage||typeof storage.get!=='function')return {kind:'empty',code:'STORAGE_UNAVAILABLE'};
  let obj;
  try{obj=storage.get(MIRROR_KEY);}
  catch(_){return {kind:'invalid',code:'STORAGE_READ'};}
  if(obj==null)return {kind:'empty',code:'STORAGE_EMPTY'};
  if(!obj||obj.version!==1||!Array.isArray(obj.events)||
     obj.events.length>400||typeof obj.lastCheck!=='string')
    return {kind:'invalid',code:'STORAGE_SCHEMA'};
  const events=[];
  for(const e of obj.events){
    if(!e||typeof e.title!=='string'||typeof e.start!=='string'||
       typeof e.end!=='string'||typeof e.location!=='string'||
       (e.teacher!==undefined&&typeof e.teacher!=='string'))
      return {kind:'invalid',code:'STORAGE_SCHEMA'};
    events.push(e);
  }
  let preview=null;
  if(obj.preview!=null){
    if(!obj.preview||obj.preview.term!=='2025-2026-2'||
       !Array.isArray(obj.preview.events)||obj.preview.events.length>400)
      return {kind:'invalid',code:'STORAGE_SCHEMA'};
    const items=[];
    for(const e of obj.preview.events){
      if(!e||typeof e.title!=='string'||typeof e.location!=='string'||
         typeof e.start!=='string'||typeof e.end!=='string'||
         (e.teacher!==undefined&&typeof e.teacher!=='string'))
        return {kind:'invalid',code:'STORAGE_SCHEMA'};
      items.push(e);
    }
    preview={term:obj.preview.term,events:items};
  }
  return {kind:'ready',state:{lastCheck:obj.lastCheck,preview,
    semesters:{widget:{events}}}};
}
export function loadBestWidgetState(files,storage){
  const mirror=readWidgetMirror(storage);
  if(mirror.kind==='ready')return mirror;
  // Access App Group only as an optional fallback; never fabricate its path.
  const file=loadWidgetState(files);
  if(file.kind==='ready')return file;
  if(file.code==='GROUP_PATH'&&mirror.code==='STORAGE_EMPTY')
    return {kind:'empty',code:'OPEN_MAIN_ONCE'};
  if(file.code==='GROUP_PATH'&&mirror.code==='STORAGE_UNAVAILABLE')
    return {kind:'invalid',code:'STORAGE_UNAVAILABLE'};
  if(mirror.kind==='invalid')return mirror;
  return file;
}

export function loadWidgetState(files) {
  let root;
  try {
    root = files.appGroupDocumentsDirectory;
    if(typeof root!=='string'||!root) return {kind:'invalid',code:'GROUP_PATH'};
    root = root.replace(/\\/g,'/').replace(/\/$/,'');
  }catch(_){return {kind:'invalid',code:'GROUP_PATH'};}
  const dir = root + '/' + STATE_DIR;
  try {
    if(!files.existsSync(dir)) return {kind:'empty',code:'NO_CACHE_DIR'};
  }catch(_){return {kind:'invalid',code:'CACHE_ACCESS'};}
  let names;
  try {
    names = files.readDirectorySync(dir,false)
      .map(x=>String(x).split('/').pop())
      .filter(x=>/^state-\d{10}\.json$/.test(x)).sort();
  }catch(_){return {kind:'invalid',code:'CACHE_LIST'};}
  if(!names.length)return {kind:'empty',code:'NO_STATE'};
  const filename = dir + '/' + names[names.length-1];
  let raw;
  try {raw=files.readAsStringSync(filename);}
  catch(_){return {kind:'invalid',code:'CACHE_READ'};}
  if(typeof raw!=='string'||!raw.length||raw.length>4*1024*1024)
    return {kind:'invalid',code:'CACHE_SIZE'};
  let state;
  try {state=JSON.parse(raw);}
  catch(_){return {kind:'invalid',code:'CACHE_JSON'};}
  if(!state||state.version!==1||!state.semesters||
     typeof state.semesters!=='object'||Array.isArray(state.semesters))
    return {kind:'invalid',code:'CACHE_SCHEMA'};
  return {kind:'ready',state};
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
  const teacher=typeof event.teacher==='string'?event.teacher:
    Array.isArray(event.teachers)?event.teachers.filter(x=>typeof x==='string').join('、'):'';
  return {id:plainText(event.id,100),title:plainText(event.title,90),
    location:plainText(event.location,65),teacher:plainText(teacher,75),start,end,day,
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

// A rolling four-day view: yesterday, today, tomorrow, the day after.
// It deliberately crosses semester week/month/year boundaries without using
// the calendar week's Monday as a fixed display window.
export function buildRollingDays(state,now=Date.now()){
  const at=now instanceof Date?now.getTime():Number(now);
  if(!Number.isFinite(at))throw Error('WIDGET_TIME');
  const local=new Date(at+BEIJING);
  const todayStart=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-BEIJING;
  const start=todayStart-DAY,end=start+4*DAY;
  const courses=[];
  const semesters=state&&state.semesters&&typeof state.semesters==='object'
    ?Object.values(state.semesters):[];
  for(const semester of semesters){
    if(!semester||!Array.isArray(semester.events))continue;
    for(const ev of semester.events.slice(0,4000)){
      const course=safeCourse(ev,start,end);
      if(course&&course.day<4)courses.push(course);
    }
  }
  courses.sort((a,b)=>a.start-b.start||a.title.localeCompare(b.title));
  const names=['昨天','今天','明天','后天'];
  const days=Array.from({length:4},(_,index)=>{
    const dayStart=start+index*DAY;
    const date=new Date(dayStart+BEIJING);
    const weekday='周'+NAMES[(date.getUTCDay()+6)%7];
    return {
      index,label:names[index],weekday,
      number:date.getUTCDate(),month:date.getUTCMonth()+1,
      dateLabel:(date.getUTCMonth()+1)+'/'+date.getUTCDate(),
      today:index===1,
      courses:courses.filter(c=>c.day===index).map(c=>({
        ...c,status:c.end<=at?'done':c.start<=at?'current':'upcoming'
      }))
    };
  });
  const boundaries=[todayStart+DAY];
  for(const c of courses){
    if(c.start>at)boundaries.push(c.start);
    if(c.end>at)boundaries.push(c.end);
  }
  const nextAt=Math.min(...boundaries.filter(t=>t>at));
  const updated=state&&typeof state.lastCheck==='string'?Date.parse(state.lastCheck):NaN;
  return {start,at,days,courses,today:1,nextAt,
    updated:Number.isFinite(updated)?updated:null,
    outdated:Number.isFinite(updated)&&at-updated>7*DAY,
    empty:courses.length===0};
}

// Fixed chronological order: never jump or auto-focus a different class.
// When layout capacity is reached, the UI prints "+N节课" for the remainder.
export function selectVisibleCourses(day,limit=1){
  const all=Array.isArray(day?.courses)?day.courses:[];
  const n=Math.max(1,Math.min(5,Math.trunc(Number(limit)||1)));
  return {courses:all.slice(0,n),hiddenAfter:Math.max(0,all.length-n),total:all.length};
}

// TEMPORARY TEST MODE: set this to null to restore the live timetable.
// Only the widget presentation is affected; the sync engine and Apple Calendar
// continue to use real semester dates and the normal current schedule.
const WIDGET_PREVIEW_TERM='2025-2026-2';

// Shift the historical teaching week by an integral number of weeks so the
// original weekdays and time-of-day are preserved. Choose a *real* teaching
// week with the most classes today, then with the most classes in the 4-day
// window. Never invent courses, and never mix different historical weeks.
export function buildHistoricalPreview(state,now=Date.now()){
  const at=now instanceof Date?now.getTime():Number(now);
  if(!Number.isFinite(at))throw Error('WIDGET_TIME');
  const src=state?.preview;
  if(!src||src.term!==WIDGET_PREVIEW_TERM||!Array.isArray(src.events))return null;
  const valid=[];
  for(const e of src.events){
    if(!e||typeof e.start!=='string'||typeof e.end!=='string')continue;
    const start=Date.parse(e.start),end=Date.parse(e.end);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>DAY)continue;
    valid.push({e,start,end});
  }
  if(!valid.length)return null;
  const weeks=new Set();
  for(const c of valid){
    const m=weekStartBeijing(c.start);
    weeks.add(m);
    weeks.add(m+7*DAY); // previous Sunday can belong to the 4-day window
  }
  const currentMonday=weekStartBeijing(at);
  let best=null;
  for(const monday of [...weeks].sort((a,b)=>a-b)){
    const from=monday-DAY,to=monday+3*DAY;
    const selected=valid.filter(c=>c.start>=from&&c.start<to);
    if(!selected.length)continue;
    const todayCount=selected.filter(c=>c.start>=monday&&c.start<monday+DAY).length;
    const uniqueDays=new Set(selected.map(c=>Math.floor((c.start-from)/DAY))).size;
    const score=todayCount*100+selected.length*10+uniqueDays*3;
    if(!best||score>best.score||(score===best.score&&monday>best.monday))
      best={monday,selected,score};
  }
  if(!best)return null;
  const shift=currentMonday-best.monday;
  const events=best.selected.map(({e,start,end})=>({
    id:plainText(e.id,100),title:plainText(e.title,90),
    location:plainText(e.location,65),teacher:plainText(e.teacher,75),
    start:new Date(start+shift).toISOString(),
    end:new Date(end+shift).toISOString()
  }));
  const model=buildRollingDays({
    lastCheck:state.lastCheck,
    semesters:{preview:{events}}
  },at);
  return {...model,previewTerm:src.term,
    previewSourceWeek:new Date(best.monday+BEIJING).toISOString().slice(0,10)};
}
export function buildWidgetModel(state,now=Date.now()){
  return WIDGET_PREVIEW_TERM
    ?buildHistoricalPreview(state,now)
    :buildRollingDays(state,now);
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
