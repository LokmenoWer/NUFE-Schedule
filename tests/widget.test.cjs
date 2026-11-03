// Regression tests for the native Scripting today and week widget projection.
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../widget-data.ts','utf8');
const core=vm.runInNewContext(
  source.replace(/export function /g,'function ').replace(/export const /g,'const ')+
  '\n({loadWidgetState,readWidgetMirror,loadBestWidgetState,normalizeFamily,parseMode,buildWidgetModel,buildPlan,annotate,termState,weekToShow,weekColumns,weekGrid,gridLayout,chipPlan,chipOptions,fitRoom,headerNote,daySubtitle,weekSubtitle,mixHex,lessonMs,widgetReloadDate})',
  {Date,Math,Number,String,Object,Array,RegExp,Error}
);
const plain=value=>JSON.parse(JSON.stringify(value));
const ui=()=>fs.readFileSync(__dirname+'/../widget.tsx','utf8');
const date=(s)=>Date.parse(s);
const ev=(id,title,start,end,location='JB101',extra={})=>({
  id,title,start,end,location,week:9,sid:'161',su:3,eu:5,teachers:[],...extra
});
const make=(events)=>({version:1,lastCheck:'2026-11-02T05:00:00Z',
  semesters:{'161':{events}}});
// Tuesday 2026-11-03, 14:10 Beijing.
const TUESDAY=date('2026-11-03T06:10:00Z');
const fresh=(events,now=TUESDAY)=>({...make(events),lastCheck:new Date(now-3600000).toISOString()});

test('reads only latest verified generation of App Group cache without fallback to older data',()=>{
  const dir='/group/CourseSync/CourseSync-v2';
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
 const target='/shared/CourseSync/CourseSync-v2';
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
 const dir='/shared/CourseSync/CourseSync-v2';
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
 a.match(ui(),/诊断：\{code\|\|'UNKNOWN'\}/);
});
test('private widget Storage mirror works even when FileManager has no App Group path',()=>{
 const mirror={version:1,lastCheck:'2026-11-02T18:00:00Z',events:[
   ev('a','今天上课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')
 ]};
 const files={appGroupDocumentsDirectory:undefined};
 const storage={get:(key,opts)=>{a.equal(key,'CourseSync.Widget.Courses.v1');a.equal(opts,undefined);return mirror;}};
 const result=core.loadBestWidgetState(files,storage);
 a.equal(result.kind,'ready');
 a.equal(result.state.semesters.widget.events[0].title,'今天上课');
 const model=core.buildWidgetModel(result.state,TUESDAY);
 a.equal(core.buildPlan(model).lessons[0].state,'live');
});
test('missing private mirror explains opening the main project once',()=>{
 const result=core.loadBestWidgetState({appGroupDocumentsDirectory:undefined},{get:()=>null});
 a.equal(result.kind,'empty');a.equal(result.code,'OPEN_MAIN_ONCE');
});
test('broken Storage mirror never discloses data and can fall back to verified files',()=>{
 const valid={version:1,lastCheck:'2026-11-02T18:00:00Z',events:[]};
 a.equal(core.readWidgetMirror({get:()=>({events:[{password:'SECRET'}],version:1,lastCheck:valid.lastCheck})}).code,'STORAGE_SCHEMA');
 a.equal(core.readWidgetMirror({get:()=>{throw Error('SECRET');}}).code,'STORAGE_READ');
 const dir='/group/CourseSync/CourseSync-v2';
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
test('teacher names appear from new mirror or older semester cache',()=>{
 const base=make([ev('a','新课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')]);
 base.semesters['161'].events[0].teachers=['张老师','李老师'];
 let m=core.buildWidgetModel(base,TUESDAY);
 a.equal(m.today.lessons[0].teachers,'张老师、李老师');
 const cached={version:1,lastCheck:'2026-11-03T06:00:00Z',events:[{
   id:'t',title:'统计学',location:'A101',teacher:'高老师',
   start:'2026-11-03T05:30:00Z',end:'2026-11-03T06:55:00Z'
 }]};
 const read=core.loadBestWidgetState({appGroupDocumentsDirectory:undefined},{get:()=>cached});
 a.equal(read.kind,'ready');
 m=core.buildWidgetModel(read.state,TUESDAY);
 a.equal(m.today.lessons[0].teachers,'高老师');
 const legacy={...cached,events:[Object.fromEntries(Object.entries(cached.events[0]).filter(([k])=>k!=='teacher'))]};
 a.equal(core.readWidgetMirror({get:()=>legacy}).kind,'ready');
});
test('parameter selects today or week, falling back like the reference',()=>{
 for(const word of ['today','今天','今日','','tomorrow','full','nonsense','today 15'])a.equal(core.parseMode(word,'medium'),'today');
 for(const word of ['week','WEEK','本周','周','全部','all','week 15'])a.equal(core.parseMode(word,'large'),'week');
 a.equal(core.parseMode(undefined,'large'),'today');
 for(const family of ['small','accessoryRectangular','accessoryInline','accessoryCircular'])a.equal(core.parseMode('week',family),'today');
 a.equal(core.normalizeFamily('systemSmall'),'small');
 a.equal(core.normalizeFamily('systemExtraLargePortrait'),'extraLarge');
 a.equal(core.normalizeFamily('accessoryInline'),'accessoryInline');
});
test('today drops finished classes and marks live and next at exact boundaries',()=>{
 const state=fresh([
  ev('a','已上','2026-11-03T02:00:00Z','2026-11-03T04:15:00Z'),
  ev('b','正在上','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z'),
  ev('c','下一节','2026-11-03T07:10:00Z','2026-11-03T08:35:00Z'),
  ev('d','之后','2026-11-03T10:30:00Z','2026-11-03T12:00:00Z')
 ]);
 const plan=plain(core.buildPlan(core.buildWidgetModel(state,TUESDAY)));
 a.deepEqual(plan.lessons.map(l=>l.name),['正在上','下一节','之后']);
 a.deepEqual(plan.lessons.map(l=>l.state),['live','next','later']);
 a.equal(plan.total,4);a.equal(plan.lessons[0].start,'13:30');a.equal(plan.lessons[0].end,'14:55');
 const boundary=date('2026-11-03T06:55:00Z');
 a.deepEqual(plain(core.buildPlan(core.buildWidgetModel(state,boundary)).lessons.map(l=>l.state)),['next','later']);
});
test('finished or empty day previews the next real class day',()=>{
 const tomorrow=ev('t','明天的课','2026-11-04T01:00:00Z','2026-11-04T02:00:00Z');
 let plan=core.buildPlan(core.buildWidgetModel(fresh([ev('a','上完','2026-11-03T02:00:00Z','2026-11-03T03:00:00Z'),tomorrow]),TUESDAY));
 a.equal(plan.empty,'今天的课都上完了');a.equal(plan.ahead.title,'明天 · 周三');
 a.equal(plan.ahead.lessons[0].state,'later');
 const term=[['2026-09-07','2026-12-31']];
 plan=core.buildPlan(core.buildWidgetModel({...fresh([ev('m','周五','2026-11-06T01:00:00Z','2026-11-06T02:00:00Z')]),terms:term},TUESDAY));
 a.equal(plan.empty,'今天没有课');a.equal(plan.ahead.title,'下次上课 · 周五 11/6');
 plan=core.buildPlan(core.buildWidgetModel({...fresh([ev('far','太远','2026-12-01T01:00:00Z','2026-12-01T02:00:00Z')]),terms:term},TUESDAY));
 a.equal(plan.ahead,undefined);
});
test('empty states are honest about term phase and an expired cache',()=>{
 const terms=[['2026-09-07','2026-12-31'],['2027-03-01','2027-06-30']];
 a.deepEqual(plain(core.termState(terms,'2026-11-03')),{phase:'during'});
 a.deepEqual(plain(core.termState(terms,'2027-02-27')),{phase:'before',days:2,first:'2027-03-01'});
 a.deepEqual(plain(core.termState(terms,'2027-07-01')),{phase:'after'});
 a.deepEqual(plain(core.termState(undefined,'2027-07-01')),{phase:'during'});
 const at=date('2027-02-27T02:00:00Z');
 a.equal(core.buildPlan(core.buildWidgetModel({lastCheck:'2027-02-26T02:00:00Z',terms,semesters:{}},at)).empty,'距开学还有 2 天');
 const after=date('2027-07-01T02:00:00Z');
 a.equal(core.buildPlan(core.buildWidgetModel({lastCheck:'2027-06-30T02:00:00Z',terms,semesters:{}},after)).empty,'本学期课程已结束');
 const old=core.buildWidgetModel(make([ev('x','旧缓存','2026-11-03T01:00:00Z','2026-11-03T02:00:00Z')]),date('2027-03-20T02:00:00Z'));
 a.equal(old.stale,true);a.equal(core.buildPlan(old).empty,'数据过旧，点开刷新');
});
test('term phase is derived from verified files when the mirror has no terms',()=>{
 const state=make([ev('a','开学','2027-03-01T01:00:00Z','2027-03-01T02:00:00Z')]);
 state.lastCheck='2027-02-27T01:00:00Z';
 a.equal(core.buildPlan(core.buildWidgetModel(state,date('2027-02-27T02:00:00Z'))).empty,'距开学还有 2 天');
});
test('mirror keeps only well-formed term dates and carries week and period fields',()=>{
 const mirror={version:1,lastCheck:'2026-11-02T18:00:00Z',terms:[['2026-09-07','2026-12-31'],['bad'],[1,2]],
  events:[ev('a','课','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')]};
 const read=core.readWidgetMirror({get:()=>mirror});
 a.deepEqual(plain(read.state.terms),[['2026-09-07','2026-12-31']]);
 const m=core.buildWidgetModel(read.state,TUESDAY);
 a.equal(m.today.week,9);a.deepEqual(plain(m.today.lessons[0].units),[3,5]);
 delete mirror.terms;
 a.equal(Object.hasOwn(core.readWidgetMirror({get:()=>mirror}).state,'terms'),false);
});
test('week uses Beijing time and hides empty weekend columns',()=>{
 const monday=date('2026-11-01T16:30:00Z'); // Monday Nov 2, 00:30 Beijing
 let m=core.buildWidgetModel(fresh([ev('z','周一课','2026-11-02T01:00:00Z','2026-11-02T02:00:00Z')],monday),monday);
 let cols=plain(core.weekColumns(core.weekToShow(m).block,m.clock));
 a.equal(cols.length,5);a.equal(cols[0].date,'2026-11-02');a.equal(cols[0].isToday,true);
 a.equal(core.weekSubtitle(m.week),'11/2–11/8');a.equal(cols[0].lessons[0].state,'next');
 m=core.buildWidgetModel(fresh([ev('s','周六课','2026-11-07T01:00:00Z','2026-11-07T02:00:00Z')]),TUESDAY);
 a.equal(core.weekColumns(m.week,m.clock).length,6);
 m=core.buildWidgetModel(fresh([ev('u','周日课','2026-11-08T01:00:00Z','2026-11-08T02:00:00Z')]),TUESDAY);
 a.equal(core.weekColumns(m.week,m.clock).length,7);
});
test('week columns mark past days past, future days later, and only today has next',()=>{
 const m=core.buildWidgetModel(fresh([
  ev('m','昨天','2026-11-02T01:00:00Z','2026-11-02T02:00:00Z'),
  ev('t','今天','2026-11-03T07:00:00Z','2026-11-03T08:00:00Z'),
  ev('w','明天','2026-11-04T01:00:00Z','2026-11-04T02:00:00Z')
 ]),TUESDAY);
 const cols=plain(core.weekColumns(m.week,m.clock));
 a.deepEqual(cols.slice(0,3).map(c=>c.lessons[0].state),['past','next','later']);
 a.deepEqual(cols.map(c=>c.isToday),[false,true,false,false,false]);
});
test('a weekend with nothing left switches to next week',()=>{
 const sunday=date('2026-11-08T02:00:00Z');
 const next=ev('n','下周一','2026-11-09T01:00:00Z','2026-11-09T02:00:00Z');
 let shown=core.weekToShow(core.buildWidgetModel(fresh([next],sunday),sunday));
 a.equal(shown.title,'下周');a.equal(shown.block.days[0].date,'2026-11-09');
 const today=ev('s','今天周日','2026-11-08T08:00:00Z','2026-11-08T09:00:00Z');
 a.equal(core.weekToShow(core.buildWidgetModel(fresh([next,today],sunday),sunday)).title,'本周');
 a.equal(core.weekToShow(core.buildWidgetModel(fresh([next]),TUESDAY)).title,'本周');
});
test('grid rows follow periods, and missing periods fall back to real time',()=>{
 const m=core.buildWidgetModel(fresh([
  ev('a','上午','2026-11-03T00:20:00Z','2026-11-03T01:45:00Z','A1',{su:1,eu:2}),
  ev('b','下午','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z','A2',{su:6,eu:7}),
  ev('c','同节','2026-11-04T05:30:00Z','2026-11-04T06:55:00Z','A3',{su:undefined,eu:undefined})
 ]),TUESDAY);
 const cols=core.weekColumns(m.week,m.clock);
 const grid=plain(core.gridLayout(cols,200));
 a.equal(grid.scale,'unit');
 a.deepEqual(grid.labels.map(l=>l.text),['08:20','13:30']);
 a.deepEqual(grid.labels.map(l=>l.unit),[1,6]);
 a.equal(grid.cols[2][0].top,grid.cols[1][1].top);
 const lost=core.buildWidgetModel(fresh([ev('x','无节次','2026-11-03T02:00:00Z','2026-11-03T03:00:00Z','A',{su:undefined,eu:undefined})]),TUESDAY);
 a.equal(core.gridLayout(core.weekColumns(lost.week,lost.clock),200).scale,'time');
});
test('overlapping classes draw the first card and count the rest, none vanish silently',()=>{
 const m=core.buildWidgetModel(fresh([
  ev('a','甲','2026-11-03T02:00:00Z','2026-11-03T03:00:00Z'),
  ev('b','乙','2026-11-03T02:30:00Z','2026-11-03T03:00:00Z')
 ]),TUESDAY);
 const grid=core.gridLayout(core.weekColumns(m.week,m.clock),200);
 a.equal(grid.cols[1].length,1);a.equal(grid.cols[1][0].more,1);
});
test('week grid fits inside measured sizes and keeps every class on the page',()=>{
 const titles=['创新创业实践：财会视角','财务审计','经济学前沿','信用管理学','成本管理会计','中外古典园林史','Python 程序设计'];
 const events=[];
 titles.forEach((title,i)=>{
  const day=String(2+i%5).padStart(2,'0');
  events.push(ev('m'+i,title,`2026-11-${day}T00:20:00Z`,`2026-11-${day}T01:45:00Z`,'德业楼Z4-10'+i,{su:1,eu:2}));
  events.push(ev('p'+i,title,`2026-11-${day}T05:30:00Z`,`2026-11-${day}T07:50:00Z`,'博文楼JA20'+i,{su:6,eu:9}));
 });
 const m=core.buildWidgetModel(fresh(events),TUESDAY);
 const cols=core.weekColumns(m.week,m.clock);
 for(const [family,size] of [['large',{width:338,height:354}],['large',{width:376,height:390}],['medium',{width:338,height:158}],['extraLarge',{width:715,height:342}]]){
  const g=core.weekGrid(cols,size,family);
  a.ok(g.colWidth>0);
  a.equal(g.layout.cols.flat().length,cols.flatMap(c=>c.lessons).length-g.layout.cols.flat().reduce((n,c)=>n+c.more,0));
  for(const chip of g.layout.cols.flat())a.ok(chip.top>=0&&chip.height>0);
  if(family!=='medium')for(const chip of g.layout.cols.flat())a.ok(chip.top+chip.height<=g.gridHeight+1e-6);
 }
});
test('card text degrades by priority: room code stays, building name goes first',()=>{
 const lesson={name:'财务审计',start:'08:20',end:'09:45',room:'德业楼Z4-106',teachers:'张老师'};
 const options={width:52,padV:3,sizes:{time:9,name:10,room:8.5}};
 const roomy=core.chipPlan(lesson,lesson.name,{...options,height:120});
 a.equal(roomy.level,0);a.ok(roomy.room.includes('德业楼'));a.ok(roomy.time.includes('09:45'));
 const tight=core.chipPlan(lesson,lesson.name,{...options,height:30});
 a.ok(tight.room==='Z4-106');a.equal(tight.nameFull,true);
 a.equal(core.fitRoom('食工楼203',0,8),'食工楼203');
 a.equal(core.chipPlan(lesson,lesson.name,{...options,height:30,needTime:true}).time.startsWith('08:20'),true);
});
test('one course always keeps one palette color across its lessons',()=>{
 const m=core.buildWidgetModel(fresh([
  ev('a','高等数学','2026-11-03T01:00:00Z','2026-11-03T02:00:00Z'),
  ev('b','高等数学','2026-11-04T01:00:00Z','2026-11-04T02:00:00Z'),
  ev('c','线性代数','2026-11-04T03:00:00Z','2026-11-04T04:00:00Z')
 ]),TUESDAY);
 a.equal(m.today.lessons[0].color,m.tomorrow.lessons[0].color);
 a.notEqual(m.tomorrow.lessons[0].color,m.tomorrow.lessons[1].color);
 a.match(m.today.lessons[0].color,/^#[0-9a-f]{6}$/);
 a.equal(core.mixHex('#000000','#ffffff',0.5),'#808080');
});
test('header warns about a stale sync before showing the week number',()=>{
 const state=make([ev('a','课','2026-11-03T07:00:00Z','2026-11-03T08:00:00Z')]);
 const recent=core.buildWidgetModel({...state,lastCheck:'2026-11-03T05:00:00Z'},TUESDAY);
 a.deepEqual(plain(core.headerNote(recent,recent.today,'medium')),{text:'第 9 周',tone:'faint'});
 a.equal(core.headerNote(recent,recent.today,'small'),null);
 const late=core.buildWidgetModel({...state,lastCheck:'2026-10-30T05:00:00Z'},TUESDAY);
 a.deepEqual(plain(core.headerNote(late,late.today,'small')),{text:'4 天未更新',tone:'warn'});
 a.equal(core.daySubtitle(recent.today),'周二 11/3');
});
test('widget asks for a refresh at class boundaries and midnight without minute polling',()=>{
 const e=ev('a','上课','2026-11-03T02:00:00Z','2026-11-03T04:00:00Z');
 let m=core.buildWidgetModel(fresh([e],date('2026-11-03T01:00:00Z')),date('2026-11-03T01:00:00Z'));
 a.equal(core.widgetReloadDate(m).getTime(),date('2026-11-03T02:00:01Z'));
 m=core.buildWidgetModel(fresh([e],date('2026-11-03T03:00:00Z')),date('2026-11-03T03:00:00Z'));
 a.equal(core.widgetReloadDate(m).getTime(),date('2026-11-03T04:00:01Z'));
 m=core.buildWidgetModel(fresh([e],date('2026-11-03T05:00:00Z')),date('2026-11-03T05:00:00Z'));
 a.equal(core.widgetReloadDate(m).getTime(),date('2026-11-03T16:00:01Z'));
});
test('malformed and overnight records are ignored, old preview payloads never appear',()=>{
 const state=fresh([ev('bad','无效','x','y'),ev('long','跨夜','2026-11-03T15:00:00Z','2026-11-03T17:00:00Z'),
  ev('ok','当期课程','2026-11-03T07:00:00Z','2026-11-03T08:00:00Z')]);
 state.preview={term:'2024-2025-2',events:[ev('past','历史学期','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')]};
 const m=core.buildWidgetModel(state,TUESDAY);
 a.deepEqual(plain(m.today.lessons.map(l=>l.name)),['当期课程']);
 const obj={version:1,lastCheck:'2026-11-02T07:00:00Z',
  events:[ev('real','真实课表','2026-11-03T05:30:00Z','2026-11-03T06:55:00Z')],
  preview:{term:'2024-2025-2',events:[{invalid:'legacy-data'}]}};
 const result=core.readWidgetMirror({get:()=>obj});
 a.equal(result.state.semesters.widget.events[0].title,'真实课表');
 a.equal(Object.hasOwn(result.state,'preview'),false);
});
test('renderer offers exactly today and week, chosen by the widget parameter',()=>{
 const source=ui();
 a.match(source,/parseMode\(Widget\.parameter,family\)/);
 a.match(source,/mode==='week'\?<WeekPanel/);
 a.match(source,/<TodayPanel/);
 a.match(source,/GeometryReader/);
 a.match(source,/proxy\.size\.width/);
 a.doesNotMatch(source,/Widget\.displaySize|RollingPanel|DayColumn|TodayPairColumn|昨天|buildRollingDays/);
 a.doesNotMatch(fs.readFileSync(__dirname+'/../widget-data.ts','utf8'),/buildRollingDays|selectToday|selectVisibleCourses/);
});
test('renderer follows the reference palette, type scale and live countdown',()=>{
 const source=ui();
 a.match(source,/const BG=\{light:'#f6f7fb',dark:'#16181d'\}/);
 a.match(source,/accent:'#4b63e0',live:'#e03131',warn:'#e8590c'/);
 a.match(source,/const PADDING=\{top:14,leading:14,bottom:12,trailing:14\}/);
 a.match(source,/widgetBackground=\{BG\}/);
 a.match(source,/const max=large\?7:3/);
 a.match(source,/style=\{live\?'timer':'relative'\}/);
 a.match(source,/'上课中':'下一节'/);
 a.match(source,/还有 \{rest\} 节/);
 a.match(source,/之后还有 \{others\} 节/);
 a.match(source,/这一周没有课/);
 a.match(source,/第'\+label\.unit\+'节/);
});
test('tapping opens the CourseSync menu through the same run URL as notifications',()=>{
 const source=ui();
 a.match(source,/Script\.createRunURLScheme\(Script\.name,\{mode:'menu'\}\)/);
 a.match(source,/widgetURL=\{url\}/);
});
test('README documents today and week widgets without screenshots',()=>{
 const readme=fs.readFileSync(__dirname+'/../README.md','utf8');
 a.match(readme,/## 项目介绍/);
 a.match(readme,/## 用户指南/);
 a.match(readme,/今日课表/);
 a.match(readme,/本周课表/);
 a.match(readme,/Parameter/);
 a.doesNotMatch(readme,/昨天、今天|四天|四日|临时组件测试模式|自动登录凭据.*查看/);
 a.equal(readme.includes('docs/images/'),false);
 a.equal(readme.includes('<img'),false);
 a.equal(readme.includes('!['),false);
 a.match(readme,/releases\/download\/stable\/CourseSync\.zip/);
 a.match(readme,/退出登录/);
 a.match(readme,/不需要重新导入项目|不需要重新创建/);
});
test('production widget maps actual synced courses without invented timetable',()=>{
 const source=ui();
 a.ok(source.includes('buildWidgetModel(snapshot.state,Date.now())'));
 a.ok(!source.includes('SHOW_SAMPLE_COURSES'));
 a.ok(!source.includes('buildSamplePreview'));
 a.doesNotMatch(source,/测试 · 2025-2|历史课表预览|PREVIEW_TERM_MISSING/);
 const m=core.buildWidgetModel(fresh([]),TUESDAY);
 a.equal(m.today.lessons.length,0);
 a.equal(core.buildPlan(m).empty,'今天没有课');
});
test('missing cache is an honest empty state; widget never writes, authenticates or reads Keychain',()=>{
  const result=core.loadWidgetState({appGroupDocumentsDirectory:'/group',existsSync:()=>false});
  a.equal(result.kind,'empty');
  a.doesNotMatch(source,/\bKeychain\b|\.writeAsString|\.removeSync|\bfetch\(/);
  const widget=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
  a.match(widget,/Widget\.present\(/);
  a.doesNotMatch(widget,/\bKeychain\b|\bCalendarEvent\b|fetch\(/);
});
