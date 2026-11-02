// Regression tests for the native Scripting week timetable data projection.
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../widget-data.ts','utf8');
const core=vm.runInNewContext(
  source.replace(/export function /g,'function ')+
  '\n({loadWidgetState,readWidgetMirror,loadBestWidgetState,weekStartBeijing,buildWeek,buildRollingDays,selectVisibleCourses,widgetReloadDate,formatWeekLabel})',
  {Date,Math,Number,String,Object,Array,RegExp,Error}
);
const date=(s)=>Date.parse(s);
const ev=(id,title,start,end,location='JB101')=>({
  id,title,start,end,location,week:9,sid:'161',su:3,eu:5,teachers:[]
});
const make=(events)=>({version:1,lastCheck:'2026-11-02T05:00:00Z',
  semesters:{'161':{events}}});

test('weekly timetable has five weekdays and correctly fades only ended classes',()=>{
  const now=date('2026-11-03T06:10:00Z'); // Tuesday 14:10 Beijing
  const state=make([
    ev('a','已上课程','2026-11-03T02:00:00Z','2026-11-03T04:15:00Z'),
    ev('b','正在上课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z'),
    ev('c','稍后上课','2026-11-03T07:10:00Z','2026-11-03T08:35:00Z')
  ]);
  const m=core.buildWeek(state,now),tue=m.days[1];
  a.equal(m.days.length,5);
  a.equal(tue.today,true);
  a.deepEqual(Array.from(tue.courses,c=>c.status),['done','current','upcoming']);
  a.deepEqual(Array.from(tue.courses,c=>c.startLabel),['10:00','13:30','15:10']);
  a.equal(m.nextAt,date('2026-11-03T06:55:00Z'));
});

test('ongoing class remains colored until its actual END, not the next start',()=>{
  const e=ev('x','两节课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z');
  a.equal(core.buildWeek(make([e]),date('2026-11-03T06:54:59Z')).days[1].courses[0].status,'current');
  a.equal(core.buildWeek(make([e]),date('2026-11-03T06:55:00Z')).days[1].courses[0].status,'done');
});

test('week calendar uses school Beijing time regardless of iPhone timezone',()=>{
  const mon=date('2026-11-01T16:30:00Z'); // Monday Nov 2, 00:30 Beijing
  const m=core.buildWeek(make([ev('z','周一课程','2026-11-02T01:00:00Z','2026-11-02T02:00:00Z')]),mon);
  a.equal(new Date(m.start).toISOString(),'2026-11-01T16:00:00.000Z');
  a.equal(m.days[0].number,2);
  a.equal(m.days[0].courses[0].title,'周一课程');
  a.equal(core.formatWeekLabel(m.start),'2026 / 11 / 02');
});

test('weekends appear if any weekend classes exist, always one column per day',()=>{
  const m=core.buildWeek(make([
    ev('s','周六课','2026-11-07T01:00:00Z','2026-11-07T02:00:00Z'),
    ev('u','周日课','2026-11-08T05:00:00Z','2026-11-08T06:00:00Z')
  ]),date('2026-11-04T00:00:00Z'));
  a.equal(m.days.length,7);
  a.equal(m.days[5].courses[0].title,'周六课');
  a.equal(m.days[6].courses[0].title,'周日课');
});

test('historical or future weeks are excluded, and malformed records are ignored',()=>{
  const m=core.buildWeek(make([
    ev('old','上周','2026-10-27T01:00:00Z','2026-10-27T02:00:00Z'),
    ev('next','下周','2026-11-10T01:00:00Z','2026-11-10T02:00:00Z'),
    ev('bad','无效','x','y'),
    ev('ok','本周','2026-11-05T01:00:00Z','2026-11-05T02:00:00Z')
  ]),date('2026-11-04T00:00:00Z'));
  a.equal(m.courses.length,1);
  a.equal(m.days[3].courses[0].title,'本周');
});

test('widget asks for a refresh at the next class boundary without polling every minute',()=>{
  const m=core.buildWeek(make([ev('a','上课','2026-11-03T02:00:00Z','2026-11-03T04:00:00Z')]),
    date('2026-11-03T01:00:00Z'));
  a.equal(core.widgetReloadDate(m).getTime(),date('2026-11-03T02:00:01Z'));
});

test('reads only latest verified generation of App Group cache without fallback to older data',()=>{
  const dir='/group/NUFE-Local-Scripting/NUFE-Local-Scripting-v2';
  const files={
    appGroupDocumentsDirectory:'/group',
    existsSync:p=>p===dir,
    readDirectorySync:()=>['state-0000000002.json','state-0000000001.json','run-lock.json'],
    // Widget extension may not expose metadata queries; the reader must not require them.
    readAsStringSync:path=>path.endsWith('0000000002.json')?'{broken':JSON.stringify(make([]))
  };
  const broken=core.loadWidgetState(files);
  a.equal(broken.kind,'invalid');
  a.equal(broken.code,'CACHE_JSON');
  files.readAsStringSync=()=>JSON.stringify(make([]));
  a.equal(core.loadWidgetState(files).kind,'ready');
});

test('widget reads the same shared directory and state file as the sync engine without statSync',()=>{
 const target='/shared/NUFE-Local-Scripting/NUFE-Local-Scripting-v2';
 const expected=target+'/state-0000000372.json',seen=[];
 const f={
   appGroupDocumentsDirectory:'/shared',
   existsSync:p=>{seen.push('exists:'+p);return p===target;},
   readDirectorySync:p=>{seen.push('list:'+p);return [expected,'run-lock.json'];},
   readAsStringSync:p=>{seen.push('read:'+p);return JSON.stringify(make([
     ev('course','正常课程','2026-11-03T02:00:00Z','2026-11-03T04:15:00Z')
   ]));}
 };
 const result=core.loadWidgetState(f);
 a.equal(result.kind,'ready');
 a.equal(result.state.semesters['161'].events[0].title,'正常课程');
 a.deepEqual(seen,['exists:'+target,'list:'+target,'read:'+expected]);
});
test('widget diagnoses each cache failure stage without exposing any file contents',()=>{
 const dir='/shared/NUFE-Local-Scripting/NUFE-Local-Scripting-v2';
 const base={
   appGroupDocumentsDirectory:'/shared',
   existsSync:()=>true,
   readDirectorySync:()=>['state-0000000009.json'],
   readAsStringSync:()=>JSON.stringify(make([]))
 };
 a.equal(core.loadWidgetState({...base,appGroupDocumentsDirectory:undefined}).code,'GROUP_PATH');
 a.equal(core.loadWidgetState({...base,existsSync:()=>{throw Error('private path');}}).code,'CACHE_ACCESS');
 a.equal(core.loadWidgetState({...base,readDirectorySync:()=>{throw Error('private path');}}).code,'CACHE_LIST');
 a.equal(core.loadWidgetState({...base,readAsStringSync:()=>{throw Error('sensitive contents');}}).code,'CACHE_READ');
 a.equal(core.loadWidgetState({...base,readAsStringSync:()=>'{private contents'}).code,'CACHE_JSON');
 a.equal(core.loadWidgetState({...base,readAsStringSync:()=>JSON.stringify({version:2,semesters:{}})}).code,'CACHE_SCHEMA');
 a.equal(core.loadWidgetState({...base,readAsStringSync:()=> 'x'.repeat(4*1024*1024+1)}).code,'CACHE_SIZE');
 a.equal(core.loadWidgetState({...base,readDirectorySync:()=>[]}).code,'NO_STATE');
 const out=core.loadWidgetState({...base,existsSync:()=>false});
 a.equal(out.kind,'empty');a.equal(out.code,'NO_CACHE_DIR');
 const ui=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
 a.match(ui,/诊断：\{code\|\|'UNKNOWN'\}/);
});
test('private widget Storage mirror works even when FileManager has no App Group path',()=>{
 const mirror={version:1,lastCheck:'2026-11-02T18:00:00Z',events:[
   ev('a','今天上课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')
 ]};
 const files={appGroupDocumentsDirectory:undefined};
 const storage={get:(key,opts)=>{a.equal(key,'NUFE.Schedule.Widget.Courses.v1');a.equal(opts,undefined);return mirror;}};
 const result=core.loadBestWidgetState(files,storage);
 a.equal(result.kind,'ready');
 a.equal(result.state.semesters.widget.events[0].title,'今天上课');
 const model=core.buildWeek(result.state,date('2026-11-03T06:10:00Z'));
 a.equal(model.days[1].courses[0].status,'current');
});
test('missing private mirror explains opening the main project once',()=>{
 const result=core.loadBestWidgetState({appGroupDocumentsDirectory:undefined},{get:()=>null});
 a.equal(result.kind,'empty');a.equal(result.code,'OPEN_MAIN_ONCE');
});
test('broken Storage mirror never discloses data and can fall back to verified files',()=>{
 const valid={version:1,lastCheck:'2026-11-02T18:00:00Z',events:[]};
 a.equal(core.readWidgetMirror({get:()=>({events:[{password:'SECRET'}],version:1,lastCheck:valid.lastCheck})}).code,'STORAGE_SCHEMA');
 a.equal(core.readWidgetMirror({get:()=>{throw Error('SECRET');}}).code,'STORAGE_READ');
 const dir='/group/NUFE-Local-Scripting/NUFE-Local-Scripting-v2';
 const files={
   appGroupDocumentsDirectory:'/group',existsSync:path=>path===dir,
   readDirectorySync:()=>['state-0000000001.json'],
   readAsStringSync:()=>JSON.stringify(make([
     ev('a','回退课程','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')
   ]))
 };
 const fallback=core.loadBestWidgetState(files,{get:()=>null});
 a.equal(fallback.kind,'ready');
 a.equal(fallback.state.semesters['161'].events[0].title,'回退课程');
});
test('four-column timetable shows yesterday, today, tomorrow and the day after',()=>{
  const now=date('2026-11-03T06:10:00Z'); // Tuesday, Nov 3 14:10 Beijing
  const m=core.buildRollingDays(make([
    ev('y','昨天','2026-11-02T02:00:00Z','2026-11-02T04:00:00Z'),
    ev('t','今天','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z'),
    ev('n','明天','2026-11-04T02:00:00Z','2026-11-04T03:00:00Z'),
    ev('a','后天','2026-11-05T02:00:00Z','2026-11-05T03:00:00Z')
  ]),now);
  a.equal(m.days.length,4);
  a.deepEqual(Array.from(m.days,d=>d.label),['昨天','今天','明天','后天']);
  a.deepEqual(Array.from(m.days,d=>d.weekday),['周一','周二','周三','周四']);
  a.deepEqual(Array.from(m.days,d=>d.dateLabel),['11/2','11/3','11/4','11/5']);
  a.deepEqual(Array.from(m.days,d=>d.courses[0].status),['done','current','upcoming','upcoming']);
  a.equal(m.days[1].today,true);
  a.equal(m.nextAt,date('2026-11-03T06:55:00Z'));
});

test('Monday view includes previous Sunday and keeps the next two days',()=>{
 const now=date('2026-11-01T17:00:00Z'); // Monday Nov 2, 1 AM Beijing
 const m=core.buildRollingDays(make([
   ev('sun','周日课','2026-11-01T05:00:00Z','2026-11-01T06:00:00Z'),
   ev('mon','周一课','2026-11-02T01:00:00Z','2026-11-02T02:00:00Z'),
   ev('wed','周三课','2026-11-04T01:00:00Z','2026-11-04T02:00:00Z')
 ]),now);
 a.deepEqual(Array.from(m.days,d=>d.weekday),['周日','周一','周二','周三']);
 a.equal(m.days[0].courses[0].title,'周日课');
 a.equal(m.days[1].courses[0].title,'周一课');
 a.equal(m.days[3].courses[0].title,'周三课');
});

test('Sunday view crosses into next week, showing Monday and Tuesday classes',()=>{
 const now=date('2026-11-08T10:00:00Z');
 const m=core.buildRollingDays(make([
   ev('sat','周六课','2026-11-07T01:00:00Z','2026-11-07T02:00:00Z'),
   ev('mon','下周一','2026-11-09T01:00:00Z','2026-11-09T02:00:00Z'),
   ev('tue','下周二','2026-11-10T01:00:00Z','2026-11-10T02:00:00Z')
 ]),now);
 a.deepEqual(Array.from(m.days,d=>d.weekday),['周六','周日','周一','周二']);
 a.equal(m.days[2].courses[0].title,'下周一');
 a.equal(m.days[3].courses[0].title,'下周二');
});

test('four-day view crosses the new year with accurate date labels',()=>{
 const now=date('2026-12-31T08:00:00Z'); // Dec 31, 16:00 Beijing
 const m=core.buildRollingDays(make([
   ev('new-year','元旦课','2027-01-01T01:00:00Z','2027-01-01T02:00:00Z')
 ]),now);
 a.deepEqual(Array.from(m.days,d=>d.dateLabel),['12/30','12/31','1/1','1/2']);
 a.equal(m.days[2].courses[0].title,'元旦课');
});

test('rolling view only greys classes after end time and changes at exact boundary',()=>{
 const course=ev('active','中国税制','2026-11-02T10:30:00Z','2026-11-02T12:50:00Z');
 let m=core.buildRollingDays(make([course]),date('2026-11-02T11:37:00Z'));
 a.equal(m.days[1].courses[0].status,'current');
 a.equal(core.widgetReloadDate(m).getTime(),date('2026-11-02T12:50:01Z'));
 m=core.buildRollingDays(make([course]),date('2026-11-02T12:50:00Z'));
 a.equal(m.days[1].courses[0].status,'done');
});

test('widget UI uses four rolling columns with legible multi-line names and classroom',()=>{
 const ui=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
 a.match(ui,/buildRollingDays\(snapshot\.state/);
 a.match(ui,/model\.days\.map\(day/);
 a.match(ui,/lineLimit=\{compact\?3:4\}/);
 a.match(ui,/day\.weekday/);
 a.match(ui,/day\.dateLabel/);
 a.match(ui,/course\.location/);
 a.doesNotMatch(ui,/family==='systemLarge'\?9/);
 a.doesNotMatch(ui,/WeeklyPanel/);
});
test('auto-focus prefers current then upcoming class without losing previous courses from memory',()=>{
 const mk=(status,title)=>({status,title});
 const classes=[mk('done','早课'),mk('done','第二节'),mk('current','第三节'),mk('upcoming','第四节')];
 let day={index:1,today:true,courses:classes};
 let pick=core.selectVisibleCourses(day,1);
 a.deepEqual(Array.from(pick.courses,c=>c.title),['第三节']);
 a.equal(pick.hiddenBefore,2);a.equal(pick.hiddenAfter,1);
 pick=core.selectVisibleCourses(day,2);
 a.deepEqual(Array.from(pick.courses,c=>c.title),['第三节','第四节']);
 day={...day,courses:classes.map((c,i)=>({...c,status:i<3?'done':'upcoming'}))};
 a.equal(core.selectVisibleCourses(day,1).courses[0].title,'第四节');
 day={...day,courses:classes.map(c=>({...c,status:'done'}))};
 a.equal(core.selectVisibleCourses(day,1).courses[0].title,'第四节');
});
test('yesterday focuses on last classes while future days start at first class',()=>{
 const courses=Array.from({length:4},(_,i)=>({title:String(i+1),status:'done'}));
 a.deepEqual(Array.from(core.selectVisibleCourses({index:0,today:false,courses},2).courses,c=>c.title),['3','4']);
 a.deepEqual(Array.from(core.selectVisibleCourses({index:2,today:false,courses},2).courses,c=>c.title),['1','2']);
 a.equal(core.selectVisibleCourses({index:1,today:true,courses:[]},1).total,0);
});
test('teacher names appear from new mirror or older semester cache',()=>{
 const base=make([ev('a','新课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')]);
 base.semesters['161'].events[0].teachers=['张老师','李老师'];
 let m=core.buildRollingDays(base,date('2026-11-03T06:10:00Z'));
 a.equal(m.days[1].courses[0].teacher,'张老师、李老师');
 const cached={version:1,lastCheck:'2026-11-03T06:00:00Z',events:[{
   id:'t',title:'统计学',location:'A101',teacher:'高老师',
   start:'2026-11-03T05:30:00Z',end:'2026-11-03T06:55:00Z'
 }]};
 const read=core.loadBestWidgetState({appGroupDocumentsDirectory:undefined},{get:()=>cached});
 a.equal(read.kind,'ready');
 m=core.buildRollingDays(read.state,date('2026-11-03T06:10:00Z'));
 a.equal(m.days[1].courses[0].teacher,'高老师');
 const legacy={...cached,events:[Object.fromEntries(Object.entries(cached.events[0]).filter(([k])=>k!=='teacher'))]};
 a.equal(core.readWidgetMirror({get:()=>legacy}).kind,'ready');
});
test('renderer measures actual widget geometry, omits overflow-prone footer and renders teacher',()=>{
 const ui=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
 a.match(ui,/GeometryReader/);
 a.match(ui,/proxy\.size\.width/);
 a.match(ui,/proxy\.size\.height/);
 a.match(ui,/selectVisibleCourses\(day,maxRows\)/);
 a.match(ui,/course\.teacher/);
 a.doesNotMatch(ui,/Widget\.displaySize/);
 a.doesNotMatch(ui,/下课后变灰 · 上课中高亮/);
});
test('missing cache is an honest empty state; widget never writes, authenticates or reads Keychain',()=>{
  const result=core.loadWidgetState({appGroupDocumentsDirectory:'/group',existsSync:()=>false});
  a.equal(result.kind,'empty');
  a.doesNotMatch(source,/\bKeychain\b|\.writeAsString|\.removeSync|\bfetch\(/);
  const widget=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
  a.match(widget,/Widget\.present\(/);
  a.doesNotMatch(widget,/\bKeychain\b|\bCalendarEvent\b|fetch\(/);
});
