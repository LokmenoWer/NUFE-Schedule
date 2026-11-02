// Regression tests for the native Scripting week timetable data projection.
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../widget-data.ts','utf8');
const core=vm.runInNewContext(
  source.replace(/export function /g,'function ')+
  '\n({loadWidgetState,weekStartBeijing,buildWeek,widgetReloadDate,formatWeekLabel})',
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
test('missing cache is an honest empty state; widget never writes, authenticates or reads Keychain',()=>{
  const result=core.loadWidgetState({appGroupDocumentsDirectory:'/group',existsSync:()=>false});
  a.equal(result.kind,'empty');
  a.doesNotMatch(source,/\bKeychain\b|\.writeAsString|\.removeSync|\bfetch\(/);
  const widget=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
  a.match(widget,/Widget\.present\(/);
  a.doesNotMatch(widget,/\bKeychain\b|\bCalendarEvent\b|fetch\(/);
});
