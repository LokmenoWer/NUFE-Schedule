// Shared, read-only data projection for the Scripting Home Screen widget.
// The main sync engine remains the only writer of this App Group state.
const HOUR = 3600000;
const DAY = 24 * HOUR;
const BEIJING = 8 * HOUR;
const STATE_DIR = 'CourseSync/CourseSync-v2';
const LEGACY_STATE_DIR = 'NUFE-Local-Scripting/NUFE-Local-Scripting-v2';

// Read the shared snapshots exactly as the sync engine does. Avoid a hard
// dependency on statSync: file metadata isn't necessary to parse our own JSON,
// and unsupported/failed metadata calls used to mask readable caches.
const MIRROR_KEY='CourseSync.Widget.Courses.v1';
const LEGACY_MIRROR_KEY='NUFE.Schedule.Widget.Courses.v1';
// Storage is private to the NUFE-Schedule project (no shared:true). The
// widget can use it even when the extension does not expose a FileManager
// App Group root. The legacy file reader is a fallback for existing installs.
export function readWidgetMirror(storage){
  if(!storage||typeof storage.get!=='function')return {kind:'empty',code:'STORAGE_UNAVAILABLE'};
  let obj;
  try{
    obj=storage.get(MIRROR_KEY);
    if(obj==null)obj=storage.get(LEGACY_MIRROR_KEY);
  }catch(_){return {kind:'invalid',code:'STORAGE_READ'};}
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
  // Legacy preview fields in older cached payloads are intentionally ignored.
  const terms=Array.isArray(obj.terms)?obj.terms.filter(t=>Array.isArray(t)&&t.length===2&&
    t.every(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))):null;
  return {kind:'ready',state:{lastCheck:obj.lastCheck,
    ...(terms&&terms.length?{terms}:{}),semesters:{widget:{events}}}};
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
  let dir = root + '/' + STATE_DIR;
  try{
    if(!files.existsSync(dir)){
      const legacy=root+'/'+LEGACY_STATE_DIR;
      if(!files.existsSync(legacy))return {kind:'empty',code:'NO_CACHE_DIR'};
      dir=legacy;
    }
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

function plainText(value,limit){
  return String(value||'').trim().slice(0,limit);
}
function timeString(ms){
  return new Date(ms+BEIJING).toISOString().slice(11,16);
}
const WEEKDAY=['','一','二','三','四','五','六','日'];
// Same palette and assignment as nufe-kebiao, so one course keeps one color.
const PALETTE=['#4b63e0','#0f8b8d','#2f9e44','#e8590c','#ae3ec9','#1971c2',
  '#c2255c','#5c940d','#e67700','#6741d9','#0b7285','#d9480f',
  '#087f5b','#a61e4d','#3b5bdb','#1098ad','#74b816','#f08c00',
  '#9c36b5','#495057'];
const STALE_MS=2*DAY;       // Header warns after two days without a sync.
const CACHE_SPAN_MS=70*DAY; // The mirror only holds this far ahead of lastCheck.
const UPCOMING_DAYS=14;

// Widget parameter: today (default) or week. Any other word, a trailing number
// from a copied Scriptable parameter, or a family too small for a week is today.
const MODE_ALIASES={today:'today','今天':'today','今日':'today',
  week:'week','本周':'week','周':'week','全部':'week',all:'week'};
export function normalizeFamily(family){
  const value=String(family||'systemMedium');
  if(value.startsWith('accessory'))return value;
  if(value.startsWith('systemExtraLarge'))return 'extraLarge';
  return value.replace(/^system/,'').toLowerCase();
}
export function parseMode(parameter,family){
  const word=String(parameter||'').trim().split(/[\s,，]+/)
    .filter(part=>part&&!/^\d{1,3}$/.test(part))[0]||'';
  const mode=MODE_ALIASES[word.toLowerCase()]||'today';
  return mode==='week'&&(family==='small'||String(family).startsWith('accessory'))?'today':mode;
}

function isoDate(ms){return new Date(ms+BEIJING).toISOString().slice(0,10);}
function addDays(iso,count){return isoDate(Date.parse(iso+'T00:00:00+08:00')+count*DAY);}
function daysBetween(from,to){return Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/DAY);}
function weekdayOf(iso){return (new Date(iso+'T00:00:00Z').getUTCDay()+6)%7+1;}
function toMinutes(value){
  const [h,m]=String(value||'').split(':').map(Number);
  return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:0;
}
function hm(minutes){return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
export function lessonMs(date,time){return Date.parse(date+'T'+time+':00+08:00');}
export function shortDate(iso){
  const [,m,d]=String(iso||'').split('-');
  return m&&d?Number(m)+'/'+Number(d):'';
}
export function daySubtitle(day){return day?'周'+WEEKDAY[day.weekday]+' '+shortDate(day.date):'';}
export function weekSubtitle(block){
  const days=(block&&block.days)||[];
  return days.length?shortDate(days[0].date)+'–'+shortDate(days[days.length-1].date):'';
}
export function weekdayName(day){return '周'+WEEKDAY[day.weekday];}

function hashName(name){
  let h=2166136261;
  for(const ch of String(name)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}
  return h;
}
function colorMap(names){
  const used=new Set(),out=new Map();
  for(const name of [...new Set(names)].sort()){
    let index=hashName(name)%PALETTE.length;
    for(let i=0;i<PALETTE.length&&used.has(index);i++)index=(index+1)%PALETTE.length;
    used.add(index);out.set(name,PALETTE[index]);
  }
  return out;
}
// Mix toward another color; the renderer uses it for opaque tints in both modes.
export function mixHex(hex,other,amount){
  const parse=h=>[1,3,5].map(i=>parseInt(String(h).slice(i,i+2),16)||0);
  const a=parse(hex),b=parse(other);
  return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*amount).toString(16).padStart(2,'0')).join('');
}

function toLesson(event){
  if(!event||typeof event!=='object'||typeof event.title!=='string')return null;
  if(typeof event.start!=='string'||typeof event.end!=='string')return null;
  const start=Date.parse(event.start),end=Date.parse(event.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
  const date=isoDate(start);
  if(isoDate(end-1)!==date)return null;
  const teachers=typeof event.teacher==='string'?event.teacher:
    Array.isArray(event.teachers)?event.teachers.filter(x=>typeof x==='string').join('、'):'';
  const su=event.su,eu=event.eu;
  return {id:plainText(event.id,100),name:plainText(event.title,90),room:plainText(event.location,65),
    teachers:plainText(teachers,75),date,start:timeString(start),end:timeString(end),
    units:Number.isInteger(su)&&Number.isInteger(eu)&&eu>=su?[su,eu]:null,
    week:Number.isInteger(event.week)?event.week:null};
}

function termSpans(state){
  if(Array.isArray(state&&state.terms))return state.terms;
  const spans=[];
  const semesters=state&&state.semesters&&typeof state.semesters==='object'?Object.values(state.semesters):[];
  for(const semester of semesters){
    const dates=(semester&&Array.isArray(semester.events)?semester.events:[])
      .map(e=>e&&typeof e.start==='string'?Date.parse(e.start):NaN)
      .filter(Number.isFinite).map(isoDate).sort();
    if(dates.length)spans.push([dates[0],dates[dates.length-1]]);
  }
  return spans;
}
// before / after / during. A gap between two terms counts down to the next one.
export function termState(spans,today){
  if(!Array.isArray(spans)||!spans.length)return {phase:'during'};
  if(spans.some(s=>s[0]<=today&&today<=s[1]))return {phase:'during'};
  const next=spans.map(s=>s[0]).filter(first=>first>today).sort()[0];
  return next?{phase:'before',days:daysBetween(today,next),first:next}:{phase:'after'};
}

// The same shape as nufe-kebiao's feed, but derived only from the local cache.
export function buildWidgetModel(state,now=Date.now()){
  const at=now instanceof Date?now.getTime():Number(now);
  if(!Number.isFinite(at))throw Error('WIDGET_TIME');
  const local=new Date(at+BEIJING);
  const clock={ms:at,date:isoDate(at),minutes:local.getUTCHours()*60+local.getUTCMinutes(),
    weekday:(local.getUTCDay()+6)%7+1};
  const lessons=[];
  const semesters=state&&state.semesters&&typeof state.semesters==='object'?Object.values(state.semesters):[];
  for(const semester of semesters){
    if(!semester||!Array.isArray(semester.events))continue;
    for(const event of semester.events.slice(0,4000)){
      const lesson=toLesson(event);
      if(lesson)lessons.push(lesson);
    }
  }
  const colors=colorMap(lessons.map(l=>l.name));
  const byDate=new Map(),weeks=new Map();
  for(const lesson of lessons){
    lesson.color=colors.get(lesson.name);
    if(!byDate.has(lesson.date))byDate.set(lesson.date,[]);
    byDate.get(lesson.date).push(lesson);
    if(lesson.week!==null)weeks.set(addDays(lesson.date,1-weekdayOf(lesson.date)),lesson.week);
  }
  const dayOf=date=>({date,weekday:weekdayOf(date),
    week:weeks.has(addDays(date,1-weekdayOf(date)))?weeks.get(addDays(date,1-weekdayOf(date))):null,
    lessons:(byDate.get(date)||[]).slice().sort((a,b)=>toMinutes(a.start)-toMinutes(b.start)||a.name.localeCompare(b.name))});
  const weekOf=monday=>({days:Array.from({length:7},(_,i)=>dayOf(addDays(monday,i)))});
  const monday=addDays(clock.date,1-clock.weekday);
  const parsed=state&&typeof state.lastCheck==='string'?Date.parse(state.lastCheck):NaN;
  const updated=Number.isFinite(parsed)?parsed:null;
  const stale=updated!==null&&at-updated>CACHE_SPAN_MS;
  let upcoming=null;
  for(let i=1;i<=UPCOMING_DAYS&&!upcoming;i++){
    const day=dayOf(addDays(clock.date,i));
    if(day.lessons.length)upcoming=day;
  }
  const today=stale?null:dayOf(clock.date);
  const midnight=lessonMs(addDays(clock.date,1),'00:00');
  const marks=[midnight];
  for(const lesson of (today&&today.lessons)||[])
    marks.push(lessonMs(lesson.date,lesson.start),lessonMs(lesson.date,lesson.end));
  return {at,clock,updated,stale,today,tomorrow:stale?null:dayOf(addDays(clock.date,1)),
    upcoming:stale?null:upcoming,week:weekOf(monday),nextWeek:weekOf(addDays(monday,7)),
    term:termState(termSpans(state),clock.date),
    nextAt:Math.min(...marks.filter(t=>t>at))};
}

// past / live / next / later. Only today marks a next class.
export function annotate(lessons,nowMinutes,markNext=true){
  let marked=!markNext;
  return (lessons||[]).map(lesson=>{
    const start=toMinutes(lesson.start),end=toMinutes(lesson.end);
    let state='later';
    if(end<=nowMinutes)state='past';
    else if(start<=nowMinutes)state='live';
    else if(!marked){state='next';marked=true;}
    return {...lesson,state};
  });
}

function emptyText(model){
  if(model.term.phase==='before')return '距开学还有 '+model.term.days+' 天';
  if(model.term.phase==='after')return '本学期课程已结束';
  return '今天没有课';
}
function nextDayLabel(day,model){
  if(day.date===addDays(model.clock.date,1))return '明天 · 周'+WEEKDAY[day.weekday];
  return '下次上课 · 周'+WEEKDAY[day.weekday]+' '+shortDate(day.date);
}
// Finished classes leave the list; an empty day previews the next real class day.
export function buildPlan(model){
  const {today,tomorrow,upcoming,clock}=model;
  if(!today)return {title:'今天',day:null,lessons:[],empty:'数据过旧，点开刷新'};
  const all=annotate(today.lessons,clock.minutes);
  const remaining=all.filter(l=>l.state!=='past');
  if(remaining.length)return {title:'今天',day:today,lessons:remaining,total:all.length,empty:''};
  const plan={title:'今天',day:today,lessons:[],empty:all.length?'今天的课都上完了':emptyText(model)};
  const next=tomorrow&&tomorrow.lessons.length?tomorrow:upcoming;
  if(next)plan.ahead={title:nextDayLabel(next,model),day:next,lessons:annotate(next.lessons,-1,false)};
  return plan;
}
// On a weekend with nothing left this week, show next week instead.
export function weekToShow(model){
  const {clock,week,nextWeek}=model;
  const rest=week.days.some(d=>d.date>=clock.date&&d.lessons.length);
  const hasNext=nextWeek.days.some(d=>d.lessons.length);
  if(clock.weekday>=6&&!rest&&hasNext)return {title:'下周',block:nextWeek};
  return {title:'本周',block:week};
}
// Monday to Friday always; weekend columns only up to the last day with classes.
export function weekColumns(block,clock){
  const days=(block&&block.days)||[];
  let count=5;
  days.forEach((d,i)=>{if(i>=5&&d.lessons.length)count=i+1;});
  return days.slice(0,count).map(d=>({...d,isToday:d.date===clock.date,
    lessons:annotate(d.lessons,d.date===clock.date?clock.minutes:d.date<clock.date?24*60:-1,d.date===clock.date)}));
}
export function headerNote(model,day,family){
  const age=model.updated===null?0:model.at-model.updated;
  if(age>STALE_MS)return {text:Math.floor(age/DAY)+' 天未更新',tone:'warn'};
  if(day&&day.week&&family!=='small')return {text:'第 '+day.week+' 周',tone:'faint'};
  return null;
}

// ---- Week grid: every class at its real position, sized for its own text. ----
export const LABEL_H=13;
const FULL_GAP=6;
const DETAIL_LEVELS=5;
const CHIP_SCALES=[1,0.9,0.8];
const CHIP_SLACK=1;
const SF_WIDTHS={'0':0.665,'1':0.494,'2':0.628,'3':0.653,'4':0.671,'5':0.647,'6':0.667,'7':0.592,'8':0.674,'9':0.667,a:0.576,b:0.638,c:0.577,d:0.638,e:0.59,f:0.391,g:0.632,h:0.616,i:0.272,j:0.272,k:0.58,l:0.279,m:0.909,n:0.611,o:0.609,p:0.633,q:0.633,r:0.415,s:0.551,t:0.395,u:0.611,v:0.568,w:0.82,x:0.56,y:0.577,z:0.556,A:0.711,B:0.68,C:0.732,D:0.74,E:0.612,F:0.588,G:0.755,H:0.768,I:0.3,J:0.578,K:0.691,L:0.585,M:0.895,N:0.759,O:0.781,P:0.66,Q:0.781,R:0.679,S:0.661,T:0.65,U:0.752,V:0.704,W:0.994,X:0.711,Y:0.688,Z:0.67,' ':0.267,':':0.329,'.':0.329,'-':0.479,'–':0.611,'+':0.656,'(':0.412,')':0.412,'/':0.324,'·':0.329};
const WIDTH_MARGIN=1.06,LINE_RATIO=1.2,CJK_LINE_RATIO=1.42;
const NO_LINE_START='）】」』》〉，。、：；！？·)]}%,.:;!?',NO_LINE_END='（【「『《〈([{';

function isWide(ch){return ch.charCodeAt(0)>=0x2e80;}
export function textWidth(text,size){
  let width=0;
  for(const ch of String(text||''))width+=isWide(ch)?1:(SF_WIDTHS[ch]||0.75)*WIDTH_MARGIN;
  return width*size;
}
function lineHeight(text,size,lines=1){
  return size*([...String(text||'')].some(isWide)?CJK_LINE_RATIO:LINE_RATIO)*lines;
}
function breakUnits(line){
  const out=[];let glue='';
  for(const ch of line){
    const last=out[out.length-1];
    if(glue){
      glue+=ch;
      if(!NO_LINE_END.includes(ch)){out.push(glue);glue='';}
    }else if(NO_LINE_END.includes(ch))glue=ch;
    else if(last!==undefined&&(NO_LINE_START.includes(ch)||(/[A-Za-z0-9\-]/.test(ch)&&/[A-Za-z0-9\-]$/.test(last))))
      out[out.length-1]=last+ch;
    else out.push(ch);
  }
  if(glue)out.push(glue);
  return out;
}
export function linesNeeded(text,width,size,max=3){
  let lines=0;
  for(const line of String(text||'').split('\n')){
    lines+=1;
    let used=0;
    for(const unit of breakUnits(line)){
      const unitWidth=textWidth(unit,size);
      if(unitWidth>width){
        for(const ch of unit){
          const charWidth=textWidth(ch,size);
          if(used>0&&used+charWidth>width){lines+=1;used=0;}
          used+=charWidth;
        }
        continue;
      }
      if(used>0&&used+unitWidth>width){lines+=1;used=0;}
      used+=unitWidth;
    }
  }
  return Math.min(max,Math.max(1,lines));
}
// Narrow cells keep the room code ("Z4-106"), not a truncated building name.
export function fitRoom(room,width,size){
  if(!room||textWidth(room,size)<=width)return room||'';
  return room.replace(/^[一-鿿]+(?=[A-Za-z])/,'')||room;
}
function splitRoom(room,width,size){
  const short=fitRoom(room,width,size);
  if(!room||short===room)return null;
  return room.slice(0,room.length-short.length)+'\n'+short;
}

// Fill a card by priority: name line, room code, full name, start, end,
// building, teacher. needTime: the axis omits this start, so it comes first.
export function chipPlan(lesson,name,{width,height,padV,sizes,teacher=false,needTime=false,scales=CHIP_SCALES}){
  const inner=width-7;
  const fullRoom=lesson.room||'';
  let best=null;
  for(const scale of scales){
    const sz={time:sizes.time*scale,name:sizes.name*scale,room:sizes.room*scale};
    let left=height-padV-CHIP_SLACK-lineHeight(name,sz.name);
    const take=h=>{
      if(h>left+0.5)return false;
      left-=h;
      return true;
    };
    const plan={scale,sz,time:'',timeSize:sz.time,timeLines:1,nameLines:1,nameFull:false,room:'',roomLines:1,teacher:false,score:0};
    const fitTime=(...parts)=>Math.min(sz.time,...parts.map(t=>inner/textWidth(t,1)));
    const addTime=()=>{
      const size=fitTime(lesson.start);
      if(size<sizes.time*0.7||!take(lineHeight(lesson.start,size)))return;
      plan.time=lesson.start;plan.timeSize=size;plan.score+=needTime?32:4;
    };
    if(needTime)addTime();
    if(fullRoom){
      const code=fitRoom(fullRoom,0,sz.room);
      const lines=linesNeeded(code,inner,sz.room,2);
      if(take(lineHeight(code,sz.room,lines)))Object.assign(plan,{room:code,roomLines:lines,score:plan.score+16});
    }
    const need=linesNeeded(name,inner,sz.name,6);
    while(plan.nameLines<need&&take(lineHeight(name,sz.name))){plan.nameLines+=1;plan.score+=5;}
    if(plan.nameLines>=need){plan.nameFull=true;plan.score+=8;}
    if(!needTime)addTime();
    if(plan.time){
      const one=lesson.start+'–'+lesson.end;
      const fit=inner/textWidth(one,1);
      const twoSize=fitTime(lesson.start+'–',lesson.end);
      if(fit>=sizes.time*0.8){
        left+=lineHeight(lesson.start,plan.timeSize)-lineHeight(lesson.start,Math.min(sz.time,fit));
        plan.time=one;plan.timeSize=Math.min(sz.time,fit);plan.score+=2;
      }else if(twoSize>=sizes.time*0.7&&take(lineHeight(lesson.end,twoSize)*2-lineHeight(lesson.start,plan.timeSize))){
        plan.time=lesson.start+'–\n'+lesson.end;plan.timeSize=twoSize;plan.timeLines=2;plan.score+=2;
      }else if(!needTime&&fitTime('–'+lesson.end)>=sizes.time*0.7){
        const size=fitTime('–'+lesson.end);
        left+=lineHeight(lesson.start,plan.timeSize)-lineHeight(lesson.end,size);
        plan.time='–'+lesson.end;plan.timeSize=size;plan.score+=1;
      }
    }
    if(plan.room&&plan.room!==fullRoom){
      const two=splitRoom(fullRoom,0,sz.room);
      const options=[[fullRoom,linesNeeded(fullRoom,inner,sz.room,3)],two&&[two,linesNeeded(two,inner,sz.room,3)]]
        .filter(o=>o&&o[1]<=(o[0].includes('\n')?2:1));
      for(const [text,lines] of options){
        if(take(lineHeight(text,sz.room,lines)-lineHeight(plan.room,sz.room,plan.roomLines))){
          plan.room=text;plan.roomLines=lines;plan.score+=1;
          break;
        }
      }
    }
    if(teacher&&lesson.teachers&&textWidth(lesson.teachers,sz.room)<=inner&&take(lineHeight(lesson.teachers,sz.room)))plan.teacher=true;
    plan.left=left;
    const roomOk=!fullRoom||plan.room;
    const roomFull=!fullRoom||plan.room===fullRoom||plan.room.includes('\n');
    const ended=plan.time.includes('–');
    plan.level=!plan.nameFull||!roomOk?4:!plan.time?3:!ended?2:!roomFull?1:0;
    if(!best||plan.level<best.level||(plan.level===best.level&&plan.score>best.score))best=plan;
  }
  return best;
}
function chipNeed(lesson,name,options,fontScale,level){
  const fits=height=>chipPlan(lesson,name,{...options,height,scales:[fontScale]}).level<=level;
  let hi=400;
  if(!fits(hi))return Infinity;
  let lo=0;
  for(let i=0;i<12;i++){
    const mid=(lo+hi)/2;
    if(fits(mid))hi=mid;else lo=mid;
  }
  return hi;
}
function chipSizes(large,columnWidth){
  const k=Math.min(1.12,Math.max(1,columnWidth/52));
  const base=large?{time:9,name:10,room:8.5}:{time:8.5,name:9.5,room:8};
  return {time:base.time*k,name:base.name*k,room:base.room*k};
}
export function chipOptions(large,width){
  return {width,padV:3,sizes:chipSizes(large,width),teacher:large};
}
export function chipName(lesson,more){return lesson.name+(more?' +'+more:'');}

function gridItems(columns){
  return columns.map((column,col)=>(column.lessons||[])
    .map(item=>({item,col,s:toMinutes(item.start),e:toMinutes(item.end),units:item.units}))
    .filter(it=>it.e>it.s).sort((a,b)=>a.s-b.s));
}
// A lesson without periods borrows them from one with the same times this week;
// if any cannot, the whole grid falls back to real time.
function fillUnits(all){
  const first=new Map(),last=new Map();
  for(const it of all){
    if(!it.units)continue;
    first.set(it.s,it.units[0]);last.set(it.e,it.units[1]);
  }
  for(const it of all){
    if(it.units)continue;
    const a=first.get(it.s),b=last.get(it.e);
    if(a===undefined||b===undefined||b<a)return false;
    it.units=[a,b];
  }
  return all.length>0;
}
function gridSegments(all,mode){
  const segs=[];
  if(mode==='unit'){
    const used=new Set(),startOf=new Map(),endOf=new Map();
    for(const it of all){
      for(let u=it.units[0];u<=it.units[1];u++)used.add(u);
      startOf.set(it.units[0],Math.min(startOf.has(it.units[0])?startOf.get(it.units[0]):Infinity,it.s));
      endOf.set(it.units[1],Math.max(endOf.has(it.units[1])?endOf.get(it.units[1]):-Infinity,it.e));
    }
    const units=[...used].sort((a,b)=>a-b),top=new Map(),bottom=new Map();
    units.forEach((u,i)=>{
      if(i>0&&(u!==units[i-1]+1||(startOf.has(u)&&endOf.has(u-1)&&startOf.get(u)-endOf.get(u-1)>=30)))segs.push({gap:true});
      top.set(u,segs.length);
      segs.push({ideal:1});
      bottom.set(u,segs.length);
    });
    return {segs,startIdx:it=>top.get(it.units[0]),endIdx:it=>bottom.get(it.units[1])};
  }
  const spans=all.map(it=>[it.s,it.e]).sort((a,b)=>a[0]-b[0]),blocks=[];
  for(const [s,e] of spans){
    const last=blocks[blocks.length-1];
    if(last&&s<=last[1])last[1]=Math.max(last[1],e);
    else blocks.push([s,e]);
  }
  const at=new Map();
  blocks.forEach(([from,to],i)=>{
    if(i>0)segs.push({gap:true});
    const marks=[...new Set(all.flatMap(it=>[it.s,it.e]).filter(t=>t>=from&&t<=to))].sort((a,b)=>a-b);
    marks.forEach((t,j)=>{
      if(j>0)segs.push({ideal:t-marks[j-1]});
      at.set(t,segs.length);
    });
  });
  return {segs,startIdx:it=>at.get(it.s),endIdx:it=>at.get(it.e)};
}
function placeBounds(segs,cons,labelIdx,height,t){
  const gaps=segs.filter(s=>s.gap).length*FULL_GAP;
  const ideal=segs.reduce((sum,s)=>sum+(s.ideal||0),0);
  const unit=ideal?(height-gaps)/ideal:0;
  const ending=segs.map(()=>[]);
  for(const c of cons)ending[c.b-1].push(c);
  const previous=new Map(labelIdx.map((k,i)=>[k,i?labelIdx[i-1]:-1]));
  const y=[0];
  segs.forEach((seg,k)=>{
    let v=y[k]+(seg.gap?FULL_GAP:t*unit*seg.ideal);
    for(const c of ending[k])v=Math.max(v,y[c.a]+c.need);
    const p=previous.get(k+1);
    if(p!==undefined&&p>=0)v=Math.max(v,y[p]+LABEL_H);
    y.push(v);
  });
  if(labelIdx.length)y[segs.length]=Math.max(y[segs.length],y[labelIdx[labelIdx.length-1]]+LABEL_H);
  return y;
}
function solveBounds(segs,cons,labelIdx,height){
  const fits=t=>placeBounds(segs,cons,labelIdx,height,t)[segs.length]<=height+1e-6;
  if(fits(1))return placeBounds(segs,cons,labelIdx,height,1);
  if(!fits(0))return null;
  let lo=0,hi=1;
  for(let i=0;i<24;i++){
    const mid=(lo+hi)/2;
    if(fits(mid))lo=mid;else hi=mid;
  }
  return placeBounds(segs,cons,labelIdx,height,lo);
}
// Rows are periods; a real overlap draws the first class and marks it "+1".
export function gridLayout(columns,height,{need}={}){
  const perCol=gridItems(columns),all=perCol.flat();
  if(!all.length)return {scale:'unit',labels:[],cols:columns.map(()=>[])};
  const mode=fillUnits(all)?'unit':'time';
  const {segs,startIdx,endIdx}=gridSegments(all,mode);
  const drawn=perCol.map(items=>{
    const out=[];
    let busyUntil=-1;
    for(const it of items){
      if(it.s<busyUntil){
        if(out.length)out[out.length-1].more+=1;
        continue;
      }
      out.push({...it,a:startIdx(it),b:endIdx(it),more:0});
      busyUntil=it.e;
    }
    return out;
  });
  const flat=drawn.flat();
  const labelIdx=[...new Set(flat.map(it=>it.a))].sort((a,b)=>a-b);
  let bounds=null,level=null,fontScale=null;
  if(need){
    search:for(let lv=0;lv<DETAIL_LEVELS;lv++){
      for(const scale of CHIP_SCALES){
        const cons=flat.map(it=>({a:it.a,b:it.b,need:need(it,scale,lv)}));
        if(cons.some(c=>!Number.isFinite(c.need)))continue;
        bounds=solveBounds(segs,cons,labelIdx,height);
        if(bounds){level=lv;fontScale=scale;break search;}
      }
    }
  }
  if(!bounds)bounds=solveBounds(segs,[],[],height);
  const labels=[];
  for(const k of labelIdx){
    const first=flat.filter(it=>it.a===k).sort((x,y)=>x.s-y.s)[0],top=bounds[k];
    if(labels.length&&top<labels[labels.length-1].top+LABEL_H-1e-6)continue;
    labels.push({top,text:hm(first.s),minutes:first.s,unit:mode==='unit'?first.units[0]:null,idx:k});
  }
  const labeled=new Map(labels.map(l=>[l.idx,l.minutes]));
  const cols=drawn.map(items=>items.map(it=>({item:it.item,top:bounds[it.a],height:bounds[it.b]-bounds[it.a],
    more:it.more,labeled:labeled.get(it.a)===it.s})));
  return {scale:mode,level,fontScale,labels,cols};
}
// All measurements for one week grid, from the real measured widget size.
export function weekGrid(columns,size,family){
  const large=family==='large'||family==='extraLarge';
  const gap=3,axisSize=large?9:8.5;
  const axisWidth=Math.ceil(textWidth('00:00',axisSize))+gap+1;
  const contentWidth=size.width-28;
  const colWidth=Math.floor((contentWidth-axisWidth-columns.length*gap)/Math.max(columns.length,1));
  const gridHeight=Math.max(60,size.height-26-18-6-15-4-4);
  const need=(it,scale,level)=>1.5+chipNeed(it.item,chipName(it.item,it.more),chipOptions(large,colWidth),scale,level);
  return {large,gap,axisSize,axisWidth,colWidth,gridHeight,layout:gridLayout(columns,gridHeight,{need})};
}

export function widgetReloadDate(model){
  // WidgetKit schedules are best effort. Do not continuously request minute
  // updates; only request an update at the next class boundary or day rollover.
  const at=model.at,delta=Math.max(60000,model.nextAt-at+1000);
  return new Date(at+Math.min(delta,DAY));
}
