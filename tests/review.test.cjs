// Modified 2026-11-02: classroom, front-end entry, semester-selection and note-migration regression tests.
const {test}=require('node:test');const a=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../index.tsx','utf8')
 .replace('import * as Scripting from "scripting";', 'const Scripting=globalThis.__sdk;')
 .replace("import { presentNativeCredentialForm, presentNativeTextForm } from './login-native';",
   'const presentNativeCredentialForm=(...args)=>globalThis.__nativeCredentialMock(...args);const presentNativeTextForm=(...args)=>globalThis.__nativeTextMock(...args);')
 .replace("import { createNativeProgressView } from './progress-native';",
   'const createNativeProgressView=(...args)=>globalThis.__progressUIFactory(...args);');
async function env({mode="sync",hostEnv="intent"}={}){
 const files=new Map(),keys=new Map(),widgetRecords=new Map(),db=[],notices=[],requests=[];let serial=0,failSave=false,dropSave=false,failRemove=false,noRemove=false,seriesMode=false;
 const fm={joinPath:(x,y)=>x+'/'+y,libraryDirectory:()=>'/local',fileExists:p=>files.has(p)||p==='/local/NUFE-Local-Scripting/NUFE-Local-Scripting-v2',createDirectory:()=>{},writeString:(p,s)=>files.set(p,s),readString:p=>{if(!files.has(p))throw Error('missing');return files.get(p);},listContents:p=>[...files.keys()].filter(k=>k.startsWith(p+'/')).map(k=>k.slice(p.length+1)),remove:p=>files.delete(p),move:(from,to)=>{if(files.has(to))throw Error('exists');files.set(to,files.get(from));files.delete(from);}};
 const calendar={identifier:'calendar-dedicated',title:'课表',allowsContentModifications:true,isSubscribed:false},other={...calendar,identifier:'calendar-personal',title:'个人'};
 class Event{
  constructor(){this.identifier=null;this.attendees=[];this.isAllDay=false;this.notes='';this.location='';}
  async save(){requests.push(['save',this.identifier]);if(failSave)throw Error('save failed');if(dropSave)return;if(!this.identifier)this.identifier='event-'+(++serial);const row=copy(this),i=db.findIndex(e=>e.identifier===this.identifier&&+e.startDate===+this._originalStart);if(i>=0)db[i]=row;else{const j=db.findIndex(e=>e.identifier===this.identifier);if(j>=0)db[j]=row;else db.push(row);}}
  async remove(){requests.push(['remove',this.identifier,+this.startDate]);if(failRemove)throw Error('remove failed');if(noRemove)return;for(let i=db.length-1;i>=0;i--)if(db[i].identifier===this.identifier&&(seriesMode||+db[i].startDate===+this.startDate))db.splice(i,1);}
  async presentEdit(){requests.push(['edit',this.identifier]);return this;}
  static async between(lo,hi,cals){return db.filter(e=>+e.endDate>+lo&&+e.startDate<+hi&&cals.some(c=>c.identifier===e.calendar.identifier)).map(copy);}
 }
 function copy(x){const e=Object.assign(new Event(),x);e.startDate=new Date(x.startDate);e.endDate=new Date(x.endDate);e._originalStart=+e.startDate;return e;}
 class Notification{async schedule(){notices.push({title:this.title,body:this.body,identifier:this.identifier});}setTriggerDate(d){this.nextTriggerDate=d;}static async allPending(){return [];}static async removePending(){} }
 const sandbox={module:{exports:{}},process:{versions:{node:'24'}},console:{log(){},error(){}},FileManager:{local:()=>fm},UUID:{string:()=>crypto.randomUUID()},Timer:{schedule:(ms,repeat,cb)=>{const t=setTimeout(cb,ms);return {invalidate:()=>clearTimeout(t)}}},Keychain:{contains:k=>keys.has(k),get:k=>keys.get(k),set:(k,v)=>keys.set(k,v),remove:k=>keys.delete(k)},CalendarEvent:Event,Notification,Calendar:{forEvents:async()=>[calendar,other]},config:{runsInApp:false,runsWithSiri:true},args:{shortcutParameter:'sync'},Script:{name:()=> 'NUFE-Schedule',complete(){},setShortcutOutput(s){sandbox.output=s;}},Alert:class{constructor(){throw Error('UNEXPECTED FRONTEND PROMPT')}},Request:class{constructor(){throw Error('NETWORK NOT MOCKED')}}};
 Event.getAll=Event.between;
 const nativeScript={name:'NUFE-Schedule',env:hostEnv,queryParameters:mode==='menu'?{mode:'menu'}:{},exit:r=>{sandbox.output=r;},createRunURLScheme:(name,q)=>'scripting://run/'+encodeURIComponent(name)+'?mode='+q.mode};
 const sdk={Storage:{set:(key,value)=>{widgetRecords.set(key,JSON.parse(JSON.stringify(value)));return true;},get:key=>widgetRecords.get(key)||null},Script:nativeScript,Intent:{text:x=>x},FileManager:{appGroupDocumentsDirectory:'/local',existsSync:fm.fileExists,createDirectorySync:fm.createDirectory,readDirectorySync:fm.listContents,readAsStringSync:fm.readString,writeAsStringSync:fm.writeString,removeSync:fm.remove,renameSync:fm.move},Keychain:{contains:k=>keys.has(k),get:k=>keys.get(k)??null,set:(k,v)=>{keys.set(k,v);return true;},remove:k=>{keys.delete(k);return true;}},UUID:sandbox.UUID,CalendarEvent:Event,Calendar:{forEvents:async()=>[calendar,other],presentChooser:async()=>[calendar]},Notification:{schedule:async o=>{notices.push(o);return 'notice-'+notices.length;},getAllPendingsOfCurrentScript:async()=>[],removePendings:async()=>{}},Dialog:{actionSheet:async opts=>{const alert=new sandbox.Alert();alert.title=opts.title;alert.message=opts.message;for(const x of opts.actions)alert.addAction(x.label);if(opts.cancelButton)alert.addCancelAction('取消');return alert.presentSheet();},alert:async opts=>{const alert=new sandbox.Alert();alert.title=opts.title;alert.message=opts.message;alert.addAction('好');return alert.presentAlert();},confirm:async()=>{throw Error('UNEXPECTED CONFIRM');},prompt:async()=>{throw Error('UNEXPECTED PROMPT');}},fetch:async(...args)=>{if(sandbox.fetchImpl)return sandbox.fetchImpl(...args);throw Error('NETWORK NOT MOCKED');}};
 sandbox.__sdk=sdk;sandbox.__NUFE_TEST__=true;sandbox.setTimeout=setTimeout;sandbox.clearTimeout=clearTimeout;sandbox.setInterval=setInterval;sandbox.clearInterval=clearInterval;sandbox.crypto=crypto.webcrypto;
 await vm.runInNewContext('(async()=>{'+source+'\nawait globalThis.__NUFE_LAUNCH__;})()',sandbox);
 sandbox.config=sandbox.module.exports.ScriptingAdapter.config;sandbox.args=sandbox.module.exports.ScriptingAdapter.args;
 const m=sandbox.module.exports,store=new m.Store();store.acquire();
 const state={version:1,owner:'installation-owner',calendarId:calendar.identifier,anchors:{'161':'2026-09-07'},semesters:{},minutes:0,failures:0};
 function add(rec,{owner=state.owner,cal=calendar,id,notes,offset=0,allDay=false}={}){const e=new Event();e.identifier=id||'event-'+(++serial);e.calendar=cal;e.title=rec.title;e.location=rec.location;e.notes=notes===undefined?m.notes(rec,owner,'2026-11-01T00:00:00Z'):notes;e.startDate=new Date(Date.parse(rec.start)+offset);e.endDate=new Date(Date.parse(rec.end)+offset);e.isAllDay=allDay;db.push(e);return e;}
 function baseline(events){state.semesters['161']={events,index:{},anchor:'2026-09-07',name:'2026-2027-1',lastSuccess:'2026-11-01T00:00:00Z'};return state;}
 return {m,sandbox,store,state,db,files,keys,widgetRecords,notices,requests,calendar,other,add,baseline,Event,setSaveFailure:v=>failSave=v,setDropSave:v=>dropSave=v,setRemoveFailure:v=>failRemove=v,setNoRemove:v=>noRemove=v,setSeries:v=>seriesMode=v};
}
const lesson=(extra={})=>({id:'lesson-1',sid:'161',title:'高等数学',week:1,su:1,eu:2,start:'2026-09-07T00:00:00.000Z',end:'2026-09-07T01:40:00.000Z',location:'仙林 教A101',teachers:['张老师'],...extra});
const raw=(activities)=>({studentTableVms:[{code:'sample-local',activities}]});
const activity=(x={})=>({courseName:'高等数学',weekday:1,startUnit:1,endUnit:2,weekIndexes:[1,2],startTime:'08:00',endTime:'09:40',campus:'仙林',room:'教A101',teachers:[{name:'张老师(001)'}],...x});
const tx=(before,target)=>({id:crypto.randomUUID(),sid:'161',anchor:'2026-09-07',name:'学期',before,target,stamp:new Date().toISOString(),changes:{added:0,removed:0,changed:0,examples:[]},skipped:[]});
const code=c=>e=>e&&e.code===c;

test('native foreground progress shows once, pauses for verification and resumes only when done',async()=>{
 const e=await env({hostEnv:'index'}),calls=[];
 e.sandbox.__sdk.Navigation={present:()=>Promise.resolve()};
 e.sandbox.__progressUIFactory=()=>({
   show:()=>calls.push('show'),
   pause:()=>calls.push('pause'),
   resume:()=>calls.push('resume'),
   finish:()=>calls.push('finish')
 });
 const progress=e.m.createProgress(e.state,e.store,true);
 progress('检查目标日历');await progress.start();
 progress('读取学期 161');
 progress('等待输入学校登录信息');
 progress('提交学校认证请求');
 progress('等待二次认证');
 progress('发送短信');
 a.deepEqual(calls,['show','pause','pause']);
 progress('认证完成后读取课表页面');
 progress('写入学期 161 的日历事件');
 progress('写入学期 162 的日历事件');
 progress.finish();progress.finish();
 a.deepEqual(calls,['show','pause','pause','resume','finish']);
 a.equal(e.state.lastStage,'写入学期 162 的日历事件');
 a.equal(e.state.stageHistory.at(-1).stage,'写入学期 162 的日历事件');
});

test('progress stage returns a dismissal promise before opening native challenges',async()=>{
 const e=await env({hostEnv:'index'});let done;
 e.sandbox.__sdk.Navigation={present:()=>Promise.resolve()};
 e.sandbox.__progressUIFactory=()=>({
   show(){},pause(){return new Promise(resolve=>{done=resolve;});},
   resume(){},finish(){}
 });
 const p=e.m.createProgress(e.state,e.store,true);
 await p.start();
 const release=p('等待输入学校登录信息');
 a.equal(typeof release?.then,'function');
 done();await release;
 p.finish();
});
test('native progress can be hidden for CAPTCHA and never reopens between requests',async()=>{
 const e=await env({hostEnv:'index'}),calls=[];
 e.sandbox.__sdk.Navigation={present:()=>Promise.resolve()};
 e.sandbox.__progressUIFactory=()=>({
   show:()=>calls.push('show'),pause:()=>calls.push('pause'),
   resume:()=>calls.push('resume'),finish:()=>calls.push('finish')
 });
 const progress=e.m.createProgress(e.state,e.store,true);
 await progress.start();
 progress('等待图形验证');
 progress('查询是否需要验证码');
 progress('本机加密登录密码（原生安全随机数）');
 progress('提交学校认证请求');
 a.deepEqual(calls,['show','pause']);
 progress('读取学期 161');
 progress.finish();
 a.deepEqual(calls,['show','pause','resume','finish']);
});

test('native progress unavailable never blocks foreground synchronization',async()=>{
 const e=await env({hostEnv:'index'});
 e.sandbox.__sdk.Navigation={present:()=>Promise.resolve()};
 e.sandbox.__progressUIFactory=()=>{throw Error('UI_NOT_AVAILABLE');};
 const progress=e.m.createProgress(e.state,e.store,true);
 progress('检查目标日历');await progress.start();
 progress('请求学期 161 课表数据');progress.finish();
 a.equal(e.state.lastStage,'请求学期 161 课表数据');
});

test('native progress requires a foreground Navigation API',async()=>{
 const e=await env({hostEnv:'index'});let created=0;
 e.sandbox.__progressUIFactory=()=>{created++;return {show(){},pause(){},resume(){},finish(){}};};
 const progress=e.m.createProgress(e.state,e.store,true);
 await progress.start();progress('读取学期 161');progress.finish();
 a.equal(created,0);
 a.equal(e.state.lastStage,'读取学期 161');
});

test('background sync never opens any interactive progress UI',async()=>{
 const e=await env({hostEnv:'intent'}),calls=[];
 e.sandbox.__sdk.Navigation={present:()=>Promise.resolve()};
 e.sandbox.__progressUIFactory=()=>{calls.push('created');return {};};
 const progress=e.m.createProgress(e.state,e.store,false);
 progress('读取学期 161');await progress.start();progress.finish();
 a.deepEqual(calls,[]);
 a.equal(e.state.lastStage,'读取学期 161');
});

test('progress has no HTML and no artificial percentages',()=>{
 const start=source.indexOf('function createProgress(state,store,interactive)');
 const end=source.indexOf('// Recognize a previously bound calendar',start);
 a.ok(start>0&&end>start);
 const body=source.slice(start,end);
 a.match(body,/createNativeProgressView\(\)/);
 a.doesNotMatch(body,/WebView|loadHTML|evaluateJavaScript|window\.updateStage|percentage/);
});
test('widget mirror publishes only non-sensitive verified course fields',async()=>{
 const e=await env();
 const now=Date.parse('2026-11-03T06:10:00.000Z');
 e.baseline([lesson({start:'2026-11-03T05:30:00.000Z',end:'2026-11-03T06:55:00.000Z'})]);
 e.state.lastCheck='2026-11-03T06:00:00.000Z';
 e.state.personId='SENSITIVE_ID';e.state.password='SENSITIVE_PASSWORD';
 a.equal(e.m.publishWidgetCache(e.state,now),true);
 const saved=e.widgetRecords.get('NUFE.Schedule.Widget.Courses.v1');
 a.equal(saved.version,1);a.equal(saved.events.length,1);
 a.deepEqual(Object.keys(saved.events[0]).sort(),['end','id','location','start','teacher','title']);
 a.equal(saved.events[0].teacher,'张老师');
 a.doesNotMatch(JSON.stringify(saved),/SENSITIVE|password|owner|calendarId|Cookie/);
});
test('widget cache mirrors only verified 2024-2025-2 past lessons as separate preview',async()=>{
 const e=await env();
 const now=Date.parse('2026-11-02T08:00:00Z');
 e.baseline([lesson({id:'real',start:'2026-11-03T02:00:00Z',end:'2026-11-03T03:30:00Z'})]);
 e.state.semesters.historical={
   name:'2024-2025-2',lastSuccess:'2025-06-15T08:00:00Z',
   events:[
     lesson({id:'old1',start:'2025-04-08T05:30:00Z',end:'2025-04-08T06:55:00Z'}),
     lesson({id:'old2',start:'2025-04-08T07:10:00Z',end:'2025-04-08T08:35:00Z'})
   ]
 };
 e.state.lastCheck='2026-11-02T07:00:00Z';
 const previous=JSON.stringify(e.state);
 a.equal(e.m.publishWidgetCache(e.state,now),true);
 const saved=e.widgetRecords.get('NUFE.Schedule.Widget.Courses.v1');
 a.equal(saved.events.length,1);
 a.equal(saved.preview.term,'2024-2025-2');
 a.equal(saved.preview.events.length,2);
 a.equal(saved.preview.events[0].start,'2025-04-08T05:30:00Z');
 a.equal(JSON.stringify(e.state),previous);
 a.doesNotMatch(JSON.stringify(saved),/password|cookie|calendarId/);
});
test('widget mirror blocks unverified transactions, filters old semesters, and keeps calendar sync independent',async()=>{
 const e=await env();
 const now=Date.parse('2026-11-03T06:10:00.000Z');
 e.baseline([lesson({start:'2026-11-03T05:30:00Z',end:'2026-11-03T06:55:00Z'}),
   lesson({id:'old',start:'2025-03-03T05:30:00Z',end:'2025-03-03T06:55:00Z'})]);
 e.state.lastCheck='2026-11-03T06:00:00.000Z';
 a.equal(e.m.publishWidgetCache(e.state,now),true);
 a.equal(e.widgetRecords.get('NUFE.Schedule.Widget.Courses.v1').events.length,1);
 e.state.tx=tx([],[]);
 a.equal(e.m.publishWidgetCache(e.state,now),false);
 a.equal(e.widgetRecords.get('NUFE.Schedule.Widget.Courses.v1').events.length,1);
});
test('widget mirroring fails safely if native Storage is absent or rejects writes',async()=>{
 const e=await env();
 e.baseline([lesson()]);e.state.lastCheck='2026-11-02T00:00:00Z';
 e.sandbox.__sdk.Storage.set=()=>{throw Error('private system detail');};
 a.equal(e.m.publishWidgetCache(e.state),false);
 a.equal(e.widgetRecords.size,0);
});
test('single file loads all APIs without Scriptable or network',async()=>{const e=await env();a.equal(typeof e.m.run,'function');});
test('school URL whitelist blocks credentials and other hosts',async()=>{const {m}=await env();for(const u of ['http://jwxt.nufe.edu.cn/','https://evil.test/','https://jwxt.nufe.edu.cn@evil.test/','https://jwxt.nufe.edu.cn:443/'])a.throws(()=>m.safeURL(u),code('DOMAIN_BLOCKED'));});
test('relative redirects resolve only inside trusted hosts',async()=>{const {m}=await env();a.equal(m.resolveURL('https://jwxt.nufe.edu.cn/student/login','../sso/login'),'https://jwxt.nufe.edu.cn/sso/login');a.throws(()=>m.resolveURL('https://jwxt.nufe.edu.cn/','//evil.test/'),code('DOMAIN_BLOCKED'));});
test('redacted request labels exclude all query credentials',async()=>{const {m}=await env();a.doesNotMatch(m.requestLabel('https://authserver.nufe.edu.cn/authserver/login?password=SECRET&username=STUDENT'),/SECRET|STUDENT|password|username/);});
test('nested semester id does not override top-level semester',async()=>{const {m}=await env();a.equal(m.topId('var currentSemester={calendarAssoc:{id:1},"id":161}','currentSemester'),161);});
test('week anchor requires real Monday',async()=>{const {m}=await env();a.equal(m.monday('2026-09-07'),'2026-09-07');for(const s of ['2026-09-08','2026-02-30','2026-9-7'])a.throws(()=>m.monday(s),code('ANCHOR'));});
test('generic semester start is not silently accepted as teaching anchor',async()=>{const {m}=await env();a.equal(m.explicitTeachingMonday({startDate:'2026-09-01'}),null);});
test('explicit first teaching week recognized',async()=>{const {m}=await env();a.equal(m.explicitTeachingMonday({firstTeachingWeekMonday:'2026-09-07'}),'2026-09-07');});
test('expand school activities uses UTC+8 and week indexes',async()=>{const {m}=await env();const r=m.expand(raw([activity()]),161,'2026-09-07');a.equal(r.events.length,2);a.equal(r.events[0].start,'2026-09-07T00:00:00.000Z');a.equal(r.events[1].start,'2026-09-14T00:00:00.000Z');a.equal(r.events[0].teachers[0],'张老师');});
test('duplicate source fails before writing',async()=>{const {m}=await env();a.throws(()=>m.expand(raw([activity(),activity()]),161,'2026-09-07'),code('DUPLICATE_SOURCE'));});
test('missing source table fails instead of becoming cancellation',async()=>{const {m}=await env();a.throws(()=>m.expand({},161,'2026-09-07'),code('SCHEMA'));});
test('missing lesson time fails closed',async()=>{const {m}=await env();a.throws(()=>m.expand(raw([activity({startTime:'',endTime:''})]),161,'2026-09-07'),code('TIME_MISSING'));});
test('week ranges outside 1..60 fail closed',async()=>{const {m}=await env();a.throws(()=>m.expand(raw([activity({weekIndexes:[0,61]})]),161,'2026-09-07'),code('SCHEMA'));});
test('identical schedules preserve logical IDs',async()=>{const {m}=await env();const p=m.plan([lesson()],[lesson({id:undefined})],()=> 'new');a.equal(p.events[0].id,'lesson-1');a.equal(p.added.length,0);a.equal(p.removed.length,0);a.equal(p.changed.length,0);});
test('classroom adjustment updates existing ID',async()=>{const {m}=await env();const p=m.plan([lesson()],[lesson({id:undefined,location:'教B202'})],()=> 'new');a.equal(p.events[0].id,'lesson-1');a.equal(p.changed.length,1);});
test('unique same-week move preserves ID and reports inference',async()=>{const {m}=await env();const p=m.plan([lesson()],[lesson({id:undefined,start:'2026-09-08T00:00:00.000Z',end:'2026-09-08T01:40:00.000Z'})],()=> 'new');a.equal(p.inferred.length,1);a.equal(p.events[0].id,'lesson-1');});
test('cancelled class leaves explicit deletion plan',async()=>{const {m}=await env();const p=m.plan([lesson()],[],()=> 'new');a.equal(p.removed.length,1);});
test('same includes teaching week metadata',async()=>{const {m}=await env();a.equal(m.same(lesson(),lesson({week:2})),false);});
test('AES CBC matches Node crypto for all supported key sizes',async()=>{const {m}=await env();for(const n of [16,24,32]){const key='K'.repeat(n),iv='I'.repeat(16),plain='学校密码\nlocal only';const cipher=crypto.createCipheriv('aes-'+n*8+'-cbc',Buffer.from(key),Buffer.from(iv));a.equal(m.aesCBC(plain,key,iv),Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]).toString('base64'));}});
test('CAS fields never fall back to unrelated forms',async()=>{const {m}=await env();a.equal(await m.fieldsFrom('<form id="other"><input name="execution" value="secret"></form>','pwdFromId'),null);});
test('CAS form entities are decoded inertly',async()=>{const {m}=await env();const f=await m.fieldsFrom('<form id="pwdFromId"><input name="execution" value="e1&amp;s1"><input id="pwdEncryptSalt" value="1234567890123456"></form>','pwdFromId');a.equal(f.execution,'e1&s1');});
test('credentials save in Keychain only',async()=>{const e=await env();e.m.saveCredentials('  sample-student  ','not-a-real-password');a.equal(e.m.readSavedCredentials().username,'sample-student');a.ok(e.keys.has('NUFE.Schedule.v1.icloud-credentials'));a.ok(![...e.files.values()].some(s=>s.includes('not-a-real-password')));});
test('legacy credential removal alone does not revoke an existing school session',async()=>{
 const e=await env();e.keys.set('NUFE.Local.v1.cookies','[]');
 e.m.saveCredentials('sample','local');e.m.removeSavedCredentials();
 a.equal(e.m.hasSavedCredentials(),false);
 a.ok(e.keys.has('NUFE.Local.v1.cookies'));
});
test('real sign-out removes both device cookies and synced/legacy credentials but preserves calendar',async()=>{
 const e=await env();e.baseline([lesson()]);e.add(lesson());
 const before=JSON.stringify(e.db.map(ev=>({id:ev.identifier,title:ev.title,notes:ev.notes})));
 e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'SESSION',value:'local-session',domain:'jwxt.nufe.edu.cn',path:'/',expires:0}]));
 e.m.saveCredentials('sample','local-secret');
 e.keys.set('NUFE.Local.v1.saved-login',JSON.stringify({version:1,username:'stale',password:'old-secret'}));
 e.sandbox.__sdk.Dialog.confirm=async()=>true;e.sandbox.__sdk.Dialog.alert=async()=>{};
 a.equal(await e.m.signOut(e.state,e.store),true);
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),false);
 a.equal(e.keys.has('NUFE.Local.v1.saved-login'),false);
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
 a.equal(e.m.hasSavedCredentials(),false);
 a.equal(e.state.signedOut,true);
 a.equal(e.state.authPaused,true);
 a.equal(e.state.runStatus,'signed_out');
 a.equal(e.state.calendarId,e.calendar.identifier);
 a.equal(JSON.stringify(e.db.map(ev=>({id:ev.identifier,title:ev.title,notes:ev.notes}))),before);
 a.equal(e.requests.length,0);
 a.match(e.m.statusText(e.state),/已退出登录/);
 a.match(e.m.statusText(e.state),/立即刷新/);
 a.doesNotMatch(JSON.stringify(e.state),/local-secret|old-secret|local-session/);
});
test('cancelling sign-out retains the existing session and credentials',async()=>{
 const e=await env();
 e.keys.set('NUFE.Local.v1.cookies','[]');
 e.m.saveCredentials('sample','not-real');
 e.sandbox.__sdk.Dialog.confirm=async()=>false;
 a.equal(await e.m.signOut(e.state,e.store),false);
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),true);
 a.equal(e.m.hasSavedCredentials(),true);
 a.equal(e.state.signedOut,undefined);
});
test('incomplete Keychain removal stays safely signed out and supports retry',async()=>{
 const e=await env();e.keys.set('NUFE.Local.v1.cookies','[]');
 e.m.saveCredentials('sample','not-real');
 e.sandbox.__sdk.Dialog.confirm=async()=>true;
 e.sandbox.__sdk.Keychain.remove=()=>false;
 await a.rejects(()=>e.m.signOut(e.state,e.store),code('LOGOUT_INCOMPLETE'));
 a.equal(e.state.signedOut,true);
 a.equal(e.state.authPaused,true);
 a.equal(e.store.read().signedOut,true);
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),true);
 a.match(e.m.statusText(e.state),/已退出登录/);
});
test('invalid saved credentials do not leak raw errors',async()=>{const e=await env();e.keys.set('NUFE.Local.v1.saved-login','{"password":"SENSITIVE"}');a.throws(()=>e.m.readSavedCredentials(),code('CREDENTIALS_INVALID'));});
test('Cookie storage rejects header injection',async()=>{const e=await env();e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'x',value:'bad\r\nInjected',domain:'jwxt.nufe.edu.cn',path:'/',expires:0}]));a.throws(()=>e.m.readCookieJar(),code('COOKIE_STORAGE'));});
test('Cookie storage rejects foreign domain',async()=>{const e=await env();e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'x',value:'token',domain:'evil.test',path:'/',expires:0}]));a.throws(()=>e.m.readCookieJar(),code('COOKIE_STORAGE'));});
test('school cookie uses allowed parent domain only',async()=>{const {m}=await env();const jar=new m.CookieJar();jar.ingest('https://authserver.nufe.edu.cn/authserver/login',{'Set-Cookie':'good=v; Domain=.nufe.edu.cn; Path=/, bad=x; Domain=.evil.test; Path=/'});a.equal(jar.header('https://jwxt.nufe.edu.cn/'),'good=v');a.equal(jar.rejected,1);});
test('expired cookie is removed instead of sent',async()=>{const {m}=await env();const jar=new m.CookieJar();jar.ingest('https://jwxt.nufe.edu.cn/student/login',{'set-cookie':'x=v; Path=/; Max-Age=0'});a.equal(jar.header('https://jwxt.nufe.edu.cn/'),'');});
test('empty store creates initial state',async()=>{const e=await env();a.equal(e.store.read().version,1);});
test('latest corrupt state never falls back to empty',async()=>{const e=await env();e.store.write(e.state);e.files.set('/local/NUFE-Local-Scripting/NUFE-Local-Scripting-v2/state-9999999999.json','{bad');a.throws(()=>e.store.read(),code('STATE_CORRUPT'));});
test('state duplicate IDs rejected before calendar access',async()=>{const e=await env();e.baseline([lesson(),lesson()]);a.throws(()=>e.m.validateState(e.state),code('STATE_CORRUPT'));});
test('state with lost owner never causes a fresh parallel import',async()=>{const e=await env();e.baseline([lesson()]);e.state.owner=null;a.throws(()=>e.m.validateState(e.state),code('STATE_CORRUPT'));});
test('lock rejects simultaneous writer',async()=>{const e=await env();const other=new e.m.Store();a.throws(()=>other.acquire(),code('BUSY'));});
test('lock loss blocks mutation',async()=>{const e=await env();e.files.delete('/local/NUFE-Local-Scripting/NUFE-Local-Scripting-v2/run-lock.json');a.throws(()=>e.store.write(e.state),code('LOCK_LOST'));});
test('owned markers parse exactly; foreign markers ignored',async()=>{const e=await env();const ev=e.add(lesson());a.equal(e.m.eventRecord(ev,e.state.owner).id,'lesson-1');a.equal(e.m.eventRecord(ev,'other-owner'),null);});
test('corrupt owned marker fails closed',async()=>{const e=await env();const ev=e.add(lesson(),{notes:'[NUFE_LOCAL_V1 installation-owner lesson-1]\n{"id":"wrong"}'});a.throws(()=>e.m.eventRecord(ev,e.state.owner),code('MARKER_CORRUPT'));});
test('adapter never scans personal calendar',async()=>{const e=await env();e.add(lesson());e.add(lesson({id:'foreign'}),{cal:e.other});const rows=await new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store).scan('2026-09-07',[lesson()]);a.equal(rows.length,1);});
test('series same native ID at different weeks is not collapsed',async()=>{const e=await env();e.add(lesson(),{id:'series'});e.add(lesson(),{id:'series',offset:7*86400000});const rows=await new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store).scan('2026-09-07',[lesson()]);a.equal(rows.length,2);});
test('different native IDs sharing logical marker retain both dates for replacement',async()=>{const e=await env();e.add(lesson());e.add(lesson(),{offset:7*86400000});const rows=await new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store).scan('2026-09-07',[lesson()]);a.equal(rows.length,2);});
test('unattended identical sync is idempotent',async()=>{const e=await env();e.add(lesson());const adapter=new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store);await e.m.applyTransaction(tx([lesson()],[lesson()]),adapter);await e.m.applyTransaction(tx([lesson()],[lesson()]),adapter);a.equal(e.db.length,1);a.equal(e.requests.length,0);});
test('write interruption after save resumes without duplicate',async()=>{const e=await env();const adapter=new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),t=tx([],[lesson()]);let calls=0;await a.rejects(()=>e.m.applyTransaction(t,adapter,()=>{if(++calls===2)throw Error('interrupted')}));a.equal(e.db.length,1);await e.m.applyTransaction(t,adapter);a.equal(e.db.length,1);});
test('exact managed duplicates are automatically reduced to one',async()=>{const e=await env();e.add(lesson());e.add(lesson());await e.m.applyTransaction(tx([lesson()],[lesson()]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store));a.equal(e.db.length,1);});
test('cancellation deletes only authorized logical ID',async()=>{const e=await env();e.add(lesson());e.add(lesson(),{cal:e.other});await e.m.applyTransaction(tx([lesson()],[]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store));a.equal(e.db.length,1);a.equal(e.db[0].calendar.identifier,e.other.identifier);});
test('room change updates one event rather than appending',async()=>{const e=await env();e.add(lesson());await e.m.applyTransaction(tx([lesson()],[lesson({location:'教B'})]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store));a.equal(e.db.length,1);a.equal(e.db[0].location,'教B');});
test('silent save no-op fails post-write verification',async()=>{const e=await env();e.setDropSave(true);await a.rejects(()=>e.m.applyTransaction(tx([],[lesson()]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store)),code('CALENDAR_VERIFY'));});
test('silent deletion no-op fails post-write verification',async()=>{const e=await env();e.add(lesson());e.setNoRemove(true);await a.rejects(()=>e.m.applyTransaction(tx([lesson()],[]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store)),code('CALENDAR_VERIFY'));});
test('calendar write error retains transaction for recovery',async()=>{const e=await env();e.state.tx=tx([],[lesson()]);e.setSaveFailure(true);await a.rejects(()=>e.m.finishTx(e.state,e.store,new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),()=>{}));a.ok(e.state.tx);a.ok(e.files.has(e.store.path(e.state.tx.backupName)));});
test('transaction snapshot exists before first mutation',async()=>{const e=await env();e.state.tx=tx([],[lesson()]);const adapter=new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store);const save=adapter.save.bind(adapter);adapter.save=async(...args)=>{a.ok(e.state.tx.backupName);a.ok(e.files.has(e.store.path(e.state.tx.backupName)));return save(...args)};await e.m.finishTx(e.state,e.store,adapter,()=>{});a.equal(e.state.tx,null);});
test('backup failure prevents every calendar write',async()=>{const e=await env();e.state.tx=tx([],[lesson()]);const old=e.store.fm.writeString;e.store.fm.writeString=(p,t)=>{if(p.includes('同步前'))return;old(p,t)};await a.rejects(()=>e.m.finishTx(e.state,e.store,new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),()=>{}),code('BACKUP_FAILED'));a.equal(e.requests.length,0);});
test('dedicated cleanup requires an existing verified baseline',async()=>{const e=await env();e.add(lesson(),{notes:'old'});await a.rejects(()=>e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store),code('EMPTY_SOURCE'));a.equal(e.requests.length,0);});
test('dedicated cleanup refuses to delete old entries when new lesson missing',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson(),{notes:'old'});await a.rejects(()=>e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store),code('CALENDAR_VERIFY'));a.equal(e.requests.length,0);});
test('dedicated cleanup automatically removes unmarked old content and preserves new lesson',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old ICS'});await e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store);a.equal(e.db.length,1);a.equal(e.m.eventRecord(e.db[0],e.state.owner).id,'lesson-1');a.equal(e.state.lastLegacyCleanupRemaining,0);});
test('dedicated cleanup never deletes any other calendar content',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old'});const foreign=e.add(lesson(),{cal:e.other,notes:'personal'});await e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store);a.ok(e.db.some(x=>x.identifier===foreign.identifier));});
test('series removal of individual occurrences covers every visible date',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());for(let i=0;i<4;i++)e.add(lesson(),{id:'old-series',notes:'old recurring',offset:i*7*86400000});await e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store);a.equal(e.db.length,1);a.equal(e.state.lastLegacyCleanupCount,4);});
test('whole-series native removal does not retry stale occurrence objects',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.setSeries(true);for(let i=0;i<4;i++)e.add(lesson(),{id:'old-series',notes:'old recurring',offset:i*7*86400000});await e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store);a.equal(e.db.length,1);a.equal(e.state.lastLegacyCleanupCount,1);});
test('unverified legacy deletion reports failure, never success',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old'});e.setNoRemove(true);await a.rejects(()=>e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store),code('LEGACY_VERIFY'));a.equal(e.state.lastLegacyCleanupRemaining,1);});
test('legacy snapshot includes all observed occurrences before removal',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());for(let i=0;i<2;i++)e.add(lesson(),{id:'old-series',notes:'old recurring',offset:i*7*86400000});await e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store);const backup=e.files.get(e.store.path(e.state.lastLegacyReportName));a.equal(JSON.parse(backup).events.length,3);a.match(JSON.parse(backup).limitation,/series deletion/);});
test('legacy invitation is preserved, preventing outbound cancellation',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());const ev=e.add(lesson(),{notes:'meeting invitation'});ev.attendees=[{name:'someone'}];await a.rejects(()=>e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store),code('LEGACY_INVITATION'));a.ok(e.db.some(x=>x.identifier===ev.identifier));});
test('unbound calendar cannot be purged',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());await a.rejects(()=>e.m.replaceDedicatedLegacy(e.other,e.state,e.store),code('CALENDAR_READONLY'));a.equal(e.requests.length,0);});
test('ICS output escapes text and folds at 75 UTF8 bytes',async()=>{const {m}=await env();const text=m.ics([lesson({title:'中文'.repeat(80)+'\nX;,'})]);a.match(text,/\\nX\\;\\,/);for(const line of text.split('\r\n'))a.ok(Buffer.byteLength(line)<=75);a.match(text,/DTSTART:20260907T000000Z/);});
test('result notification only reports final status without exposing credentials',async()=>{const e=await env();await e.m.refreshResult(true);await e.m.refreshResult(false,'AUTH_INTERACTIVE_REQUIRED');a.equal(e.notices.length,2);a.match(e.notices[0].title,/成功/);a.match(e.notices[1].title,/失败/);a.doesNotMatch(e.notices[1].body,/sample-student|password|cookie=/i);});
test('diagnostics never expose native raw error contents',async()=>{const {m}=await env();a.doesNotMatch(m.errorMessage(Error('password=VERY_SECRET'),{lastStage:'测试阶段'}),/VERY_SECRET/);});
test('bounded work rejects hung WebView and clears timer',async()=>{const {m}=await env();await a.rejects(()=>m.bounded(new Promise(()=>{}),10,'WEBVIEW_TIMEOUT'),code('WEBVIEW_TIMEOUT'));});
test('paused background authentication sends one actionable notification, never daily repeats',async()=>{
 const e=await env();e.state.authPaused=true;e.state.lastError='AUTH_INTERACTIVE_REQUIRED';e.store.write(e.state);e.store.release();
 await e.m.run();
 a.equal(e.notices.length,1);a.match(e.notices[0].title,/登录已失效/);
 a.match(e.notices[0].body,/验证码|二次认证/);a.match(e.sandbox.output,/刷新失败/);
 a.ok(e.store.read().authExpiryNotifiedAt);
 await e.m.run();a.equal(e.notices.length,1);
});
function loggedIn(e,sourceRaw){
 e.m.HTTP.prototype.get=async function(url){return {url:'https://jwxt.nufe.edu.cn/student/for-std/course-table',text:'var personId=100;var currentSemester={"id":161};<select id="allSemesters"><option value="161">2026-2027-1</option></select>'}};
 e.m.HTTP.prototype.json=async function(url){return typeof sourceRaw==='function'?sourceRaw(url):sourceRaw;};
}
async function executeDaily(e){e.store.write(e.state);e.store.release();await e.m.run();}
test('notification failure preserves verified sync and allows the next refresh',async()=>{
 const e=await env();loggedIn(e,raw([activity({weekIndexes:[1]})]));
 e.sandbox.__sdk.Notification.schedule=async()=>{throw Error('notification denied');};
 await executeDaily(e);
 const s=e.store.read();a.equal(s.runStatus,'success');a.equal(s.lastError,null);
 a.equal(s.failures,0);a.equal(s.nextAttempt,0);a.equal(s.resultNoticeError,'NOTIFICATION_FAILED');
 a.match(e.sandbox.output,/刷新成功/);a.equal(e.db.length,1);
 const id=e.db[0].identifier;
 e.sandbox.__sdk.Notification.schedule=async()=> 'delivered';
 await e.m.run();a.equal(e.store.read().resultNoticeError,null);a.equal(e.db.length,1);a.equal(e.db[0].identifier,id);
});
test('failure notification errors preserve the original network failure',async()=>{
 const e=await env();e.m.HTTP.prototype.get=async()=>{const error=Error('offline');error.code='NETWORK';throw error;};
 e.sandbox.__sdk.Notification.schedule=async()=>{throw Error('notification denied');};
 await executeDaily(e);const s=e.store.read();
 a.equal(s.lastError,'NETWORK');a.equal(s.failures,1);a.equal(s.resultNoticeError,'NOTIFICATION_FAILED');
 a.notEqual(s.authNoticeError,'NOTIFICATION_FAILED');a.equal(e.db.length,0);
});
test('partial refresh notification failure keeps partial status and semester errors',async()=>{
 const e=await env();e.state.runStatus='partial';e.state.termErrors=[{sid:'160',code:'ANCHOR'}];
 e.sandbox.__sdk.Notification.schedule=async()=>{throw Error('notification denied');};
 await e.m.reportRefreshResult(false,'PARTIAL_SYNC',e.state,e.store);
 a.equal(e.store.read().runStatus,'partial');a.equal(e.state.termErrors[0].code,'ANCHOR');a.equal(e.state.failures,0);
});
test('compact status shows outcome and hides technical diagnostics',async()=>{
 const e=await env();
 for(const [status,label] of Object.entries({success:'上次刷新成功',partial:'部分学期未完成',failed:'上次刷新失败',cancelled:'上次操作已取消'})){
  e.state.runStatus=status;a.ok(e.m.statusText(e.state).includes('结果：'+label));
 }
 e.state.runStatus='success';e.state.lastCheck='2026-11-02T06:30:00.000Z';
 const concise=e.m.statusText(e.state);
 a.match(concise,/上次完成检查：2026-11-02 14:30/);
 a.doesNotMatch(concise,/未实时核验|非实时状态|最近步骤（北京时间）|自动登录凭据：|连续失败：|已导入学期：/);
 a.match(concise,/课表日历：/);
 e.state.resultNoticeError='NOTIFICATION_FAILED';
 a.match(e.m.statusText(e.state),/不影响已完成的课表同步/);
});

test('retry deadline explicitly waits for a future automation trigger',async()=>{
 const {m}=await env();a.match(m.automaticRetryText({nextAttempt:Date.now()+60000}),/等待自动化触发/);
});
test('first unattended authentication failure delivers one specific alert and records it',async()=>{
 const e=await env();
 e.m.HTTP.prototype.get=async function(url){if(url.includes('/student/sso/login'))return {url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"></form>'};const er=new Error('AUTH_REQUIRED');er.code='AUTH_REQUIRED';throw er;};
 await executeDaily(e);
 const state=e.store.read();
 a.equal(state.lastError,'AUTH_REQUIRED');a.equal(state.authPaused,true);
 a.equal(e.notices.length,1);a.match(e.notices[0].title,/登录已失效/);
 a.match(e.notices[0].body,/手动登录/);a.ok(state.authExpiryNotifiedAt);
 await e.m.run();a.equal(e.notices.length,1);
});
test('auth notification may be sent again after a successful-login reset',async()=>{
 const e=await env();
 e.state.lastError='AUTH_INTERACTIVE_REQUIRED';
 a.equal(await e.m.notifyAuthExpiredOnce(e.state,e.store),true);
 a.equal(await e.m.notifyAuthExpiredOnce(e.state,e.store),false);
 a.equal(e.notices.length,1);
 e.state.authExpiryNotifiedAt=null;
 a.equal(await e.m.notifyAuthExpiredOnce(e.state,e.store),true);
 a.equal(e.notices.length,2);
});
test('notification denial records a safe status without throwing or deleting calendar data',async()=>{
 const e=await env();
 e.sandbox.__sdk.Notification.schedule=async()=>{throw Error('permission denied');};
 e.state.authPaused=true;e.state.lastError='AUTH_INTERACTIVE_REQUIRED';
 await e.m.reportBackgroundFailure('AUTH_INTERACTIVE_REQUIRED',e.state,e.store);
 a.equal(e.state.authNoticeError,'NOTIFICATION_FAILED');
 a.equal(e.state.authExpiryNotifiedAt,undefined);
 a.equal(e.db.length,0);
});
test('retry guidance shows a concrete Beijing-time estimate without changing schedule',async()=>{
 const e=await env();
 const now=Date.parse('2026-11-02T00:00:00.000Z');
 e.state.nextAttempt=now+90*60000;
 a.match(e.m.automaticRetryText(e.state,now),/2026-11-02 09:30/);
 e.state.nextAttempt=Date.now()+90*60000;
 a.match(e.m.statusText(e.state),/下次自动尝试：/);
 e.state.authPaused=true;
 a.match(e.m.automaticRetryText(e.state,now),/手动处理/);
});
test('unclassified HTTP throttling and oversized replies have actionable explanations',async()=>{
 const e=await env();
 a.match(e.m.reasonFor('HTTP_429'),/429/);
 a.match(e.m.actionFor('HTTP_429'),/限流/);
 a.match(e.m.reasonFor('TOO_LARGE'),/上限/);
 a.match(e.m.actionFor('CALENDAR_READONLY'),/原日历/);
});
test('end-to-end daily refresh adds, adjusts, cancels and purges old series with one result',async()=>{
 const e=await env(),old=lesson(),cancelled=lesson({id:'cancelled',week:2,start:'2026-09-14T00:00:00.000Z',end:'2026-09-14T01:40:00.000Z'});
 e.baseline([old,cancelled]);e.add(old);e.add(cancelled);for(let i=0;i<3;i++)e.add(old,{id:'old-ics',notes:'legacy recurring course',offset:i*7*86400000});const personal=e.add(old,{cal:e.other,notes:'personal'});
 loggedIn(e,raw([activity({weekIndexes:[1,3],room:'教B202'})]));await executeDaily(e);
 const own=e.db.filter(x=>x.calendar.identifier===e.calendar.identifier);a.equal(own.length,2);a.ok(own.every(x=>x.location==='教B202'));a.ok(e.db.some(x=>x.identifier===personal.identifier));a.equal(e.notices.length,1);a.match(e.notices[0].title,/成功/);a.equal(e.store.read().runStatus,'success');a.equal(e.store.read().tx,null);a.ok(e.keys.has('NUFE.Local.v1.person'));a.ok(e.keys.has('NUFE.Local.v1.student'));
 // A second entire run must change neither logical nor native event IDs.
 const ids=own.map(x=>x.identifier).sort().join(',');e.notices.length=0;await e.m.run();a.equal(e.db.filter(x=>x.calendar.identifier===e.calendar.identifier).map(x=>x.identifier).sort().join(','),ids);a.equal(e.notices.length,1);a.match(e.notices[0].title,/成功/);
});
test('end-to-end malformed source preserves every old event and reports one failure',async()=>{const e=await env();e.baseline([lesson()]);const own=e.add(lesson()),legacy=e.add(lesson(),{notes:'old'});loggedIn(e,{});await executeDaily(e);a.ok(e.db.some(x=>x.identifier===own.identifier));a.ok(e.db.some(x=>x.identifier===legacy.identifier));a.equal(e.requests.length,0);a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);a.equal(e.store.read().lastError,'SCHEMA');});
test('end-to-end unexpected empty source preserves old course and import',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old'});loggedIn(e,raw([]));await executeDaily(e);a.equal(e.db.length,2);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'EMPTY_SOURCE');a.match(e.notices[0].title,/失败/);});
test('end-to-end failed calendar save never purges legacy data',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old'});e.setSaveFailure(true);loggedIn(e,raw([activity({weekIndexes:[1],room:'changed'})]));await executeDaily(e);a.equal(e.db.length,2);a.ok(e.store.read().tx);a.equal(e.requests.filter(x=>x[0]==='remove').length,0);a.match(e.notices[0].title,/失败/);});
test('end-to-end school person change blocks all calendar writes',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.keys.set('NUFE.Local.v1.person','another-person');loggedIn(e,raw([activity()]));await executeDaily(e);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'ACCOUNT_CHANGED');a.equal(e.store.read().authPaused,true);a.match(e.notices[0].title,/登录需要处理/);});
test('end-to-end changed student identity in data blocks replacement',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.keys.set('NUFE.Local.v1.student','another-student');loggedIn(e,raw([activity()]));await executeDaily(e);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'ACCOUNT_CHANGED');});
test('end-to-end missing bound calendar never falls back to personal calendar',async()=>{const e=await env();e.state.calendarId='missing-calendar';e.add(lesson(),{cal:e.other,notes:'personal'});loggedIn(e,raw([activity()]));await executeDaily(e);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'CALENDAR_MISSING');a.equal(e.notices.length,1);});
test('second background invocation does not start while a previous lock is held',async()=>{
 const e=await env();e.store.write(e.state);
 const prev=e.m.acquireSyncSlot;
 // The OS budget is bounded; simulate a single wait tick with a short timeout.
 const result=await prev(new e.m.Store(),false,{backgroundWait:1,poll:2});
 a.equal(result,'still-running');
 a.equal(e.requests.length,0);
 a.equal(e.db.length,0);
 a.equal(e.store.read().failures,0);
});
test('manual school login saves to Keychain only after verified success',async()=>{
  const e=await env({hostEnv:'index'});let tableVisits=0;
  e.sandbox.__sdk.Navigation={present:()=>true};
  e.sandbox.__nativeCredentialMock=async()=>({
    username:'verified-student',password:'verified-password'
  });
  const html='var personId=100;var currentSemester={"id":161};';
  const http={jar:new e.m.CookieJar(),get:async(url,opt={})=>{
    if(url==='https://jwxt.nufe.edu.cn/student/for-std/course-table'){
      return {url,text:++tableVisits===1?'<html>login required</html>':html};
    }
    if(url==='https://jwxt.nufe.edu.cn/student/sso/login')return {
      url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"><input name="execution" value="e123"><input id="pwdEncryptSalt" value="1234567890123456"></form>'
    };
    if(opt.body)return {url:'https://jwxt.nufe.edu.cn/student/for-std/course-table',text:html};
    return {url,text:''};
  },authJSON:async()=>({isNeed:false})};
  const page=await e.m.coursePage(http,true);
  a.match(page,/personId=100/);
  const saved=e.m.readSavedCredentials();
  a.equal(saved.username,'verified-student');a.equal(saved.password,'verified-password');
  a.ok(e.keys.has('NUFE.Schedule.v1.icloud-credentials'));
  a.ok(![...e.files.values()].some(v=>String(v).includes('verified-password')));
});

test('failed school authentication never saves a password',async()=>{
  const e=await env({hostEnv:'index'});let visits=0;
  e.sandbox.__sdk.Navigation={present:()=>true};
  e.sandbox.__nativeCredentialMock=async()=>({
    username:'student',password:'invalid-password'
  });
  const http={jar:new e.m.CookieJar(),get:async(url,opt={})=>{
    if(url==='https://jwxt.nufe.edu.cn/student/for-std/course-table')return {url,text:'not authenticated'};
    if(url==='https://jwxt.nufe.edu.cn/student/sso/login')return {url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"><input name="execution" value="abc"><input id="pwdEncryptSalt" value="1234567890123456"></form>'};
    if(opt.body){visits++;return {url:'https://authserver.nufe.edu.cn/authserver/login',text:'invalid'};}
    return {url,text:''};
  },authJSON:async()=>({isNeed:false})};
  await a.rejects(()=>e.m.coursePage(http,true),code('LOGIN_FAILED'));
  a.equal(visits,1);
  a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
});
test('one SMS challenge requires only its code and selects the schools trusted-device option',async()=>{
 const e=await env();let prompts=0,codePosts=0,submitBodies=[];
 e.sandbox.__sdk.Dialog.prompt=async()=>{prompts++;return '654321';};
 const http={authJSON:async(url,opt)=>{
   if(url.includes('getDynamicCodeByReauth.do')){codePosts++;return {res:'success'};}
   submitBodies.push(opt.body);return {code:'success'};
 },get:async()=>({})};
 const page={url:'https://authserver.nufe.edu.cn/authserver/login',text:JSON.stringify({
   reAuthType:'3',service:'https://jwxt.nufe.edu.cn/student/sso/login',
   isSleepAccount:'0',isMultifactor:'true',reAuthUserId:'student'
 })};
 await e.m.mfa(http,page);
 a.equal(prompts,1);a.equal(codePosts,1);a.equal(submitBodies.length,1);
 a.match(submitBodies[0],/skipTmpReAuth=true/);
 a.match(submitBodies[0],/dynamicCode=654321/);
});
test('automatic login without credentials stops before submitting password',async()=>{const e=await env();let count=0;const http={get:async()=>{count++;return {url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"><input name="execution" value="e1"></form>'}}};await a.rejects(()=>e.m.coursePage(http,false),code('AUTH_REQUIRED'));a.equal(count,2);});
test('automatic login encountering MFA never opens UI or attempts codes',async()=>{const e=await env();const http={get:async()=>({url:'https://authserver.nufe.edu.cn/authserver/login',text:'isMultifactor=true'})};await a.rejects(()=>e.m.coursePage(http,false),code('AUTH_INTERACTIVE_REQUIRED'));});
test('automatic captcha requirement never encrypts or submits password',async()=>{const e=await env();let posts=0;const http={jar:new e.m.CookieJar(),get:async(url,opt)=>{if(opt&&opt.body)posts++;return {text:''}},authJSON:async()=>({isNeed:true})};const page={url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"><input name="execution" value="e1s1"><input id="pwdEncryptSalt" value="1234567890123456"></form>'};await a.rejects(()=>e.m.passwordLogin(http,page,'sample','local-password',false),code('AUTH_INTERACTIVE_REQUIRED'));a.equal(posts,0);});
test('cookie RFC default path also applies to directory endpoint itself',async()=>{const {m}=await env();const jar=new m.CookieJar();jar.ingest('https://jwxt.nufe.edu.cn/student/login',{'set-cookie':'x=v'});a.equal(jar.header('https://jwxt.nufe.edu.cn/student'),'x=v');a.equal(jar.header('https://jwxt.nufe.edu.cn/student/course'),'x=v');a.equal(jar.header('https://jwxt.nufe.edu.cn/students'),'');});
test('an invitation anywhere stops dedicated deletion before first remove',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old'});const invitation=e.add(lesson(),{notes:'invitation'});invitation.attendees=[{name:'guest'}];await a.rejects(()=>e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store),code('LEGACY_INVITATION'));a.equal(e.requests.filter(x=>x[0]==='remove').length,0);});

test('owned series is replaced with a standalone new target after backup',async()=>{const e=await env();e.add(lesson(),{id:'owned-series'});e.add(lesson(),{id:'owned-series',offset:7*86400000});e.setSeries(true);e.state.tx=tx([lesson()],[lesson()]);await e.m.finishTx(e.state,e.store,new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),()=>{});a.equal(e.db.length,1);a.notEqual(e.db[0].identifier,'owned-series');a.equal(e.m.eventRecord(e.db[0],e.state.owner,e.m.storedEventIndex(e.state)).id,'lesson-1');});
test('orphan owned marker is removed only in successfully fetched term',async()=>{const e=await env();e.add(lesson());e.add(lesson({id:'orphan'}));e.add(lesson({id:'other-term',sid:'999'}));await e.m.applyTransaction(tx([lesson()],[lesson()]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store));a.equal(e.db.length,2);a.ok(e.db.some(x=>e.m.eventRecord(x,e.state.owner).sid==='999'));});
test('pending transaction does not resume before a fresh complete school fetch',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.state.tx=tx([lesson()],[]);loggedIn(e,{});await executeDaily(e);a.equal(e.db.length,1);a.equal(e.requests.length,0);a.ok(e.store.read().tx);a.equal(e.store.read().lastError,'SCHEMA');});
test('pending stale cancellation is rebased when fresh school data still includes class',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.state.tx=tx([lesson()],[]);loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.equal(e.db.length,1);a.equal(e.requests.filter(x=>x[0]==='remove').length,0);a.equal(e.store.read().tx,null);a.match(e.notices[0].title,/成功/);});
test('main menu exposes only refresh, run status and a destructive sign-out',async()=>{
 const e=await env({mode:'menu',hostEnv:'index'}),menus=[];
 e.sandbox.config.runsInApp=true;e.sandbox.args.shortcutParameter=null;
 e.keys.set('NUFE.Local.v1.cookies','[]');
 e.sandbox.__sdk.Dialog.actionSheet=async opts=>{menus.push(opts.actions);return null;};
 e.store.write(e.state);e.store.release();await e.m.run();
 a.deepEqual(Array.from(menus[0],x=>x.label),['立即刷新','运行状态','退出登录']);
 a.deepEqual(Array.from(menus[0],x=>!!x.destructive),[false,false,true]);
 a.equal(e.requests.length,0);
});
test('shortcut sync suppresses menus even while Scriptable is foregrounded',async()=>{const e=await env();e.sandbox.config.runsInApp=true;e.baseline([lesson()]);e.add(lesson());loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.equal(e.notices.length,1);a.match(e.notices[0].title,/成功/);});
test('upgrade disables old course reminders and retains result-only preference',async()=>{const e=await env();e.state.minutes=10;e.baseline([lesson()]);e.add(lesson());loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.equal(e.store.read().minutes,0);a.equal(e.store.read().notificationMode,'result-only-v1.9');a.equal(e.notices.length,1);});
test('Scripting foreground defaults to management menu',async()=>{const e=await env({hostEnv:'index'});a.equal(e.m.ScriptingAdapter.__mode,'menu');});
test('Scripting first provisioning creates a named iCloud calendar and syncs without a main menu',async()=>{
 const e=await env({hostEnv:'index'});e.state.calendarId=null;const alerts=[],all=[e.other];
 e.sandbox.__sdk.Calendar.forEvents=async()=>all;
 e.sandbox.__sdk.Calendar.create=async opts=>({identifier:'new-icloud',title:opts.title,source:{type:'calDAV',title:'iCloud'},allowsContentModifications:true,isSubscribed:false,save:async function(){all.push(this);}});
 e.sandbox.__sdk.Dialog.prompt=async()=> 'Custom Calendar';
 e.sandbox.__sdk.Dialog.alert=async o=>alerts.push(o);
 loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);
 a.equal(e.store.read().calendarId,'new-icloud');
 a.equal(e.store.read().calendarTitle,'Custom Calendar');
 a.equal(e.store.read().runStatus,'success');
 a.equal(alerts.length,1);a.match(alerts[0].title,/成功/);
});
test('Scripting native secure random encrypts password with no WebView dependency',async()=>{const e=await env();const ciphertext=await e.m.encryptPassword('local-test-secret','1234567890123456');const cipher=crypto.createDecipheriv('aes-128-cbc',Buffer.from('1234567890123456'),Buffer.alloc(16));const plain=Buffer.concat([cipher.update(Buffer.from(ciphertext,'base64')),cipher.final()]);a.ok(plain.toString('utf8').endsWith('local-test-secret'));});
test('Scripting Keychain boolean failure prevents false saved-credential success',async()=>{const e=await env();e.sandbox.__sdk.Keychain.set=()=>false;a.throws(()=>e.m.saveCredentials('sample','local'),code('CREDENTIALS_UNAVAILABLE'));a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);});
test('Scripting native fetch cancels redirect and exposes parsed cookie metadata',async()=>{const e=await env();let stopped=false;e.sandbox.fetchImpl=async(url,opt)=>{a.equal(opt.allowInsecureRequest,false);a.equal(await opt.handleRedirect({url:'https://jwxt.nufe.edu.cn/student/login'}),null);stopped=true;return {status:302,headers:{forEach:fn=>{fn('/student/login','location');},get:()=>null},cookies:[{name:'school',value:'local-token',domain:'jwxt.nufe.edu.cn',path:'/',expiresDate:null}],mimeType:'text/html',text:async()=>''};};const req=new e.m.ScriptingAdapter.Request('https://jwxt.nufe.edu.cn/student/sso/login');let redirected='';req.onRedirect=r=>{redirected=r.url;return null;};await req.loadString();a.ok(stopped);a.equal(redirected,'https://jwxt.nufe.edu.cn/student/login');a.equal(req.response.cookies[0].name,'school');});
test('remaining slider WebView is ephemeral, does not expose JS evaluation and presents only local HTML',async()=>{
 const e=await env();let initialized=null;
 e.sandbox.__sdk.WebViewController=class{
   constructor(options){initialized=options;}
   async loadHTML(html){a.match(html,/Content-Security-Policy/);return true;}
   async present(options){a.equal(options.navigationTitle,'滑块验证');}
   dispose(){}
 };
 const w=new e.m.ScriptingAdapter.WebView();
 a.equal(initialized.ephemeral,true);
 a.equal(typeof w.evaluateJavaScript,'undefined');
 a.equal(typeof w.shouldAllowRequest,'undefined');
 await w.loadHTML('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'">');
 await w.present('滑块验证');
 w.inner.dispose();
});
test('Scripting recurrence flag detects even a single visible series instance',async()=>{const e=await env();const old=e.add(lesson());old.hasRecurrenceRules=true;old.recurrenceRules=[{frequency:'weekly',interval:1}];e.state.tx=tx([lesson()],[lesson()]);await e.m.finishTx(e.state,e.store,new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),()=>{});a.equal(e.db.length,1);a.notEqual(e.db[0].identifier,old.identifier);});
test('Scripting process/module compatibility globals do not turn production startup into export-only mode',async()=>{const e=await env();e.store.write(e.state);e.store.release();e.sandbox.__NUFE_TEST__=false;await vm.runInNewContext('(async()=>{'+source+'\nawait globalThis.__NUFE_LAUNCH__;})()',e.sandbox);a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);});

test('Scripting 3.2.1 entry parses as an ordinary script without a module async wrapper',()=>{a.doesNotThrow(()=>new vm.Script(source));});
test('production ordinary-script entry runs even with process and module compatibility globals',async()=>{const e=await env();e.store.write(e.state);e.store.release();e.sandbox.__NUFE_TEST__=false;await vm.runInNewContext(source,e.sandbox);a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);});
test('storage-constructor failures now reach startup error UI',async()=>{const e=await env(),alerts=[];e.store.release();e.sandbox.__sdk.FileManager.existsSync=()=>{throw new TypeError('private native detail must never be logged');};e.sandbox.__sdk.Dialog.alert=async o=>alerts.push(o);e.sandbox.__NUFE_TEST__=false;await vm.runInNewContext(source,e.sandbox);a.equal(alerts.length,1);a.match(alerts[0].title,/启动失败/);a.match(alerts[0].message,/STARTUP_TYPE/);a.doesNotMatch(alerts[0].message,/private native detail/);});
test('Notification schedules with specified identifier and trigger',async()=>{const e=await env();let scheduled=null;e.sandbox.__sdk.Notification.schedule=async o=>{scheduled=o;return 'notice-1';};const n=new e.m.ScriptingAdapter.Notification();n.identifier='nufe-test-123';n.title='Test';n.body='Body';n.setTriggerDate(new Date(Date.now()+60000));await n.schedule();a.equal(scheduled.identifier,'nufe-test-123');a.ok(scheduled.triggerDate||scheduled.trigger);});
test('VERIFIED_TERM_ANCHORS supports multiple academic years',async()=>{const {m}=await env();a.ok(m.VERIFIED_TERM_ANCHORS['2024-2025-1']);a.ok(m.VERIFIED_TERM_ANCHORS['2025-2026-1']);a.ok(m.VERIFIED_TERM_ANCHORS['2026-2027-1']);});
test('widget has a single dedicated Scripting entry with no legacy ListWidget renderer',()=>{
 const native=fs.readFileSync(__dirname+'/../index.tsx','utf8');
 const widget=fs.readFileSync(__dirname+'/../widget.tsx','utf8');
 a.doesNotMatch(native,/ListWidget|runsInWidget|widgetParameter|async function widget\(/);
 a.match(widget,/Widget\.present\(/);
});

test('course location omits campus while preserving room or building',async()=>{const {m}=await env();a.equal(m.expand(raw([activity()]),161,'2026-09-07').events[0].location,'教A101');a.equal(m.expand(raw([activity({room:'',building:'德业楼'})]),161,'2026-09-07').events[0].location,'德业楼');});
test('every manual refresh checks all available semesters, including already synced historical ones',async()=>{
 const {m}=await env();
 const info={current:161,semesters:[{id:158},{id:159},{id:160},{id:161}]};
 const state={cursor:2,semesters:{
  158:{lastSuccess:new Date().toISOString()},
  159:{lastSuccess:new Date().toISOString()},
  160:{lastSuccess:new Date().toISOString()}
 }};
 a.deepEqual(Array.from(m.selectTermIds(info,state,true)),[161,158,159,160]);
 a.deepEqual(Array.from(m.selectTermIds(info,state,true)),[161,158,159,160]);
 a.equal(state.cursor,2);
});
test('full foreground sync selects unique school-listed semester identifiers once',async()=>{
 const {m}=await env();
 const info={current:161,semesters:[{id:161},{id:158},{id:158},{id:159},{id:160}]};
 a.deepEqual(Array.from(m.selectTermIds(info,{},true)),[161,158,159,160]);
});
test('background rotates over all school-listed older semesters',async()=>{const {m}=await env();const state={cursor:0},info={current:161,semesters:[{id:158},{id:159},{id:160},{id:161}]};a.deepEqual(Array.from(m.selectTermIds(info,state,false)),[161,158,159]);a.deepEqual(Array.from(m.selectTermIds(info,state,false)),[161,160,158]);a.deepEqual(Array.from(m.selectTermIds(info,state,false)),[161,159,160]);});

test('readable event notes contain the synchronization timestamp only',async()=>{
 const {m}=await env();
 const text=m.readableNotes(lesson({teachers:['戴靓']}),'2026-11-01T17:22:37.760Z');
 a.equal(text,'同步：2026-11-02 01:22');
 a.doesNotMatch(text,/教师|NUFE_LOCAL|sid|week|JSON|第 2 周/);
});
test('indexed unmarked event remains identifiable after note migration',async()=>{
 const e=await env();const rec=lesson();e.baseline([rec]);const ev=e.add(rec);
 e.state.semesters['161'].index={[rec.id]:ev.identifier};
 ev.notes='教师：张老师\n同步：2026-11-02 01:22';
 const map=e.m.storedEventIndex(e.state);
 a.equal(e.m.eventRecord(ev,e.state.owner,map).id,rec.id);
});
test('legacy title with teacher suffix matches a verified new lesson',async()=>{
 const e=await env();const rec=lesson({title:'住宅产品开发与设计',teachers:['戴靓']});
 const ev=e.add(rec);ev.title='住宅产品开发与设计 - 戴靓';
 a.equal(e.m.matchesOldCourse(ev,rec),true);
 ev.title='其他个人事项';
 a.equal(e.m.matchesOldCourse(ev,rec),false);
});

test('notes migration keeps the same native event ID',async()=>{
  const e=await env(),rec=lesson();e.baseline([rec]);const ev=e.add(rec);
  e.state.semesters['161'].index={[rec.id]:ev.identifier};
  e.store.write(e.state);
  await e.m.polishTermNotes(e.calendar,e.state,e.store,'161',()=>{});
  a.equal(e.db.length,1);
  a.match(e.db[0].notes,/^同步：/);
   a.equal(e.db[0].title,'高等数学（张老师）');
  a.doesNotMatch(e.db[0].notes,/教师|NUFE_LOCAL_V1|\\bweek\\b|\\bsid\\b/);
  a.equal(e.m.eventRecord(e.db[0],e.state.owner,e.m.storedEventIndex(e.state)).id,rec.id);
});
test('verified duplicated legacy title is removed without touching kept lesson',async()=>{
  const e=await env(),rec=lesson();e.baseline([rec]);const good=e.add(rec);
  e.state.semesters['161'].index={[rec.id]:good.identifier};
  const old=e.add(rec,{notes:'legacy calendar import'});old.title='高等数学 - 张老师';
  e.store.write(e.state);
  await e.m.removeMatchedOldCourses(e.calendar,e.state,e.store,'161',()=>{});
  a.equal(e.db.length,1);a.equal(e.db[0].identifier,good.identifier);
});

test('renaming a bound calendar never triggers an automatic rename',async()=>{
 const e=await env({hostEnv:'index'});
 e.calendar.title='My Calendar';let saves=0;e.calendar.save=async()=>{saves++;};
 e.state.calendarId=e.calendar.identifier;e.store.write(e.state);
 const selected=await e.m.pickCalendar(e.state,e.store);
 a.equal(selected.title,'My Calendar');a.equal(saves,0);
 a.equal(e.store.read().calendarTitle,'My Calendar');
});
test('calendar identity is independent of its title',async()=>{
 const e=await env();e.state.calendarId=e.calendar.identifier;e.calendar.title='Study 2026';
 const picked=await e.m.pickCalendar(e.state,e.store);
 a.equal(picked.identifier,e.state.calendarId);a.equal(picked.title,'Study 2026');
});
function missingCalendar(e,{lost=false}={}){
 const list=[e.other],created=[];
 e.sandbox.__sdk.Calendar.forEvents=async()=>list;
 e.sandbox.__sdk.Calendar.create=async o=>{
   created.push(o);
   return {identifier:'calendar-new',title:o.title,source:{type:'calDAV',title:'iCloud'},
     allowsContentModifications:true,isSubscribed:false,save:async function(){list.push(this);}};
 };
 e.sandbox.config.runsInApp=true;e.sandbox.args.shortcutParameter='setup';
 e.state.calendarId=lost?'calendar-gone':null;
 return {list,created};
}
const setConfirm=(e,answer)=>{const asked=[];e.sandbox.__sdk.Dialog.confirm=async o=>{asked.push(o);return answer;};return asked;};
const setName=(e,name='Custom lessons')=>{const asked=[];e.sandbox.__sdk.Dialog.prompt=async o=>{asked.push(o);return name;};return asked;};
test('first setup creates a custom-named iCloud calendar and binds its ID',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e),prompt=setName(e,'Semester ✨');
 const picked=await e.m.pickCalendar(e.state,e.store);
 a.equal(prompt.length,1);a.equal(h.created.length,1);
 a.equal(h.created[0].sourceType,'calDAV');a.equal(h.created[0].title,'Semester ✨');
 a.equal(picked.title,'Semester ✨');a.equal(e.store.read().calendarId,'calendar-new');
});
test('canceling calendar naming never creates or binds a calendar',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e);setName(e,null);
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CANCELLED'));
 a.equal(h.created.length,0);a.equal(e.state.calendarId,null);
});
test('iCloud creation never falls back to a local calendar',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e);setName(e);
 e.sandbox.__sdk.Calendar.create=async options=>{h.created.push(options);throw Error('calendar unavailable');};
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_CREATE_FAILED'));
 a.deepEqual(h.created.map(x=>x.sourceType),['calDAV']);
});
test('non-iCloud CalDAV creation must not silently bind a different account',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e);setName(e);
 e.sandbox.__sdk.Calendar.create=async o=>{h.created.push(o);return {identifier:'wrong-source',title:o.title,source:{type:'calDAV',title:'Other Account'},allowsContentModifications:true,isSubscribed:false,save:async function(){h.list.push(this);}};};
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_NOT_ICLOUD'));
 a.equal(e.state.calendarId,null);a.equal(h.created.length,1);
});
test('failed create readback never adopts an unrelated same-name calendar',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e);setName(e,'School');
 e.sandbox.__sdk.Calendar.create=async o=>{h.created.push(o);return {identifier:'uncertain',title:o.title,save:async()=>{h.list.push({identifier:'other',title:o.title,source:{type:'calDAV',title:'iCloud'},allowsContentModifications:true,isSubscribed:false});}};};
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_CREATE_FAILED'));
 a.equal(h.created.length,1);a.equal(e.state.calendarId,null);
});
test('empty calendar list reports permission instead of creating',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e);h.list.length=0;setName(e);
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_PERMISSION'));
 a.equal(h.created.length,0);
});
test('missing former calendar permits choosing a matching owned calendar',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e,{lost:true});setConfirm(e,true);
 e.sandbox.__sdk.Dialog.actionSheet=async()=>0;
 e.sandbox.__sdk.Calendar.presentChooser=async()=>[e.calendar];
 h.list.push(e.calendar);
 const rec=lesson();e.baseline([rec]);e.add(rec);e.state.calendarId='calendar-gone';
 const picked=await e.m.pickCalendar(e.state,e.store);
 a.equal(picked.identifier,e.calendar.identifier);
 a.equal(e.store.read().calendarId,e.calendar.identifier);
});
test('an existing calendar cannot be rebound when there is no owned baseline',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e,{lost:true});setConfirm(e,true);
 e.sandbox.__sdk.Dialog.actionSheet=async()=>0;
 e.sandbox.__sdk.Calendar.presentChooser=async()=>[e.other];
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_REBIND_UNSAFE'));
 a.equal(e.state.calendarId,'calendar-gone');
});
test('missing former calendar blocks rebinding a personal calendar without owned lessons',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e,{lost:true});setConfirm(e,true);
 e.sandbox.__sdk.Dialog.actionSheet=async()=>0;
 e.sandbox.__sdk.Calendar.presentChooser=async()=>[e.other];
 e.baseline([lesson()]);
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_REBIND_UNSAFE'));
 a.equal(e.state.calendarId,'calendar-gone');
});
test('missing calendar can create a replacement after a duplicate warning',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e,{lost:true}),asked=setConfirm(e,true);setName(e,'Replacement');
 e.sandbox.__sdk.Dialog.actionSheet=async()=>1;
 const picked=await e.m.pickCalendar(e.state,e.store);
 a.equal(picked.title,'Replacement');
 a.equal(asked.length,1);a.match(asked[0].message,/重复/);
 a.equal(e.state.calendarId,'calendar-new');
});
test('pending transaction blocks selection or creation of a different calendar',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e,{lost:true});setName(e);
 e.state.tx=tx([],[]);
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_REBIND_UNSAFE'));
 a.equal(h.created.length,0);
});
test('canceled calendar creation does not proceed after another run owns cancellation',async()=>{
 const e=await env({hostEnv:'index'}),h=missingCalendar(e);
 e.sandbox.__sdk.Dialog.prompt=async()=>{a.equal(e.store.requestCancelActive(),true);return 'My schedule';};
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('SYNC_SUPERSEDED'));
 a.equal(h.created.length,0);
});
test('background sync never creates a calendar',async()=>{
 const e=await env(),created=[];e.state.calendarId='missing-calendar';
 e.sandbox.__sdk.Calendar.create=async o=>{created.push(o);throw Error('unexpected');};
 await a.rejects(()=>e.m.pickCalendar(e.state,e.store),code('CALENDAR_MISSING'));
 a.equal(created.length,0);
});
test('school semester start automatically anchors historical spring timetable without prompting',async()=>{
 const e=await env({hostEnv:'intent'});
 const http={json:async url=>{
   a.ok(url.endsWith('/student/ws/semester/get/140'));
   return {startDate:'2024-02-26'};
 }};
 const anchor=await e.m.chooseAnchor(140,'2023-2024-2',http,e.state,e.store,false);
 a.equal(anchor,'2024-02-26');
 a.equal(e.state.anchors['140'],'2024-02-26');
 a.equal(e.state.anchorSources['140'],'school-semester-start');
});
test('school non-Monday semester date is normalized to Monday automatically',async()=>{
 const e=await env();
 const anchor=await e.m.chooseAnchor(140,'2023-2024-2',{json:async()=>({beginDate:'2024-02-28'})},e.state,e.store,false);
 a.equal(anchor,'2024-02-26');
});
test('explicit teaching-week date is preferred over a generic term start date',async()=>{
 const e=await env();
 const date=await e.m.chooseAnchor(140,'2023-2024-2',
   {json:async()=>({startDate:'2024-02-19',firstTeachingWeekMonday:'2024-02-26'})},e.state,e.store,false);
 a.equal(date,'2024-02-26');
 a.equal(e.state.anchorSources['140'],'school-teaching-week');
});
test('missing official semester dates fails closed without importing or guessing',async()=>{
 const e=await env();
 await a.rejects(()=>e.m.chooseAnchor(140,'2023-2024-2',{json:async()=>({name:'2023-2024-2'})},e.state,e.store,false),
   code('ANCHOR'));
 a.equal(e.state.anchors['140'],undefined);
});

test('logout is direct with no save-password submenu and no calendar mutation',async()=>{
 const e=await env({hostEnv:'index'}),menus=[],alerts=[];
 e.keys.set('NUFE.Local.v1.cookies','[]');
 e.m.saveCredentials('student','test-only-secret');
 e.store.write(e.state);e.store.release();
 e.sandbox.__sdk.Dialog.actionSheet=async options=>{
   menus.push(options.actions.map(x=>x.label));
   return 2; // direct destructive logout
 };
 e.sandbox.__sdk.Dialog.confirm=async options=>{
   a.match(options.message,/Cookie/);
   a.match(options.message,/课表与日历不会删除/);
   return true;
 };
 e.sandbox.__sdk.Dialog.alert=async o=>alerts.push(o);
 await e.m.run();
 a.deepEqual(Array.from(menus[0]),['立即刷新','运行状态','退出登录']);
 a.equal(menus.length,1);
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),false);
 a.equal(e.m.hasSavedCredentials(),false);
 a.equal(e.store.read().signedOut,true);
 a.equal(e.store.read().calendarId,e.calendar.identifier);
 a.equal(e.requests.length,0);
 a.equal(alerts.at(-1).title,'已退出登录');
});
test('after logout, existing calendar opens normal menu rather than first-setup workflow',async()=>{
 const e=await env({hostEnv:'index'}),menus=[];
 e.state.signedOut=true;e.state.authPaused=true;
 e.store.write(e.state);e.store.release();
 e.sandbox.__sdk.Dialog.actionSheet=async o=>{menus.push(o.actions.map(x=>x.label));return null;};
 await e.m.run();
 a.deepEqual(Array.from(menus[0]),['立即刷新','运行状态']);
 a.equal(e.store.read().calendarId,e.calendar.identifier);
 a.equal(e.requests.length,0);
});
test('successful verified synchronization clears signed-out state without changing calendar identity',async()=>{
 const e=await env();e.state.signedOut=true;e.state.authPaused=true;
 e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'SESSION',value:'stale',domain:'jwxt.nufe.edu.cn',path:'/',expires:0}]));
 e.baseline([lesson()]);e.add(lesson());
 loggedIn(e,raw([activity({weekIndexes:[1]})]));
 const cookieHeaders=[];const get=e.m.HTTP.prototype.get;
 e.m.HTTP.prototype.get=async function(...args){cookieHeaders.push(this.jar.header('https://jwxt.nufe.edu.cn/student/for-std/course-table'));return get.apply(this,args);};
 await e.m.synchronize(e.state,e.store,e.calendar,true,false,()=>{});
 a.ok(cookieHeaders.length>0);
 a.ok(cookieHeaders.every(header=>!header.includes('SESSION=stale')));
 a.equal(e.state.signedOut,false);
 a.equal(e.state.authPaused,false);
 a.equal(e.state.calendarId,e.calendar.identifier);
 a.equal(e.db.length,1);
});
test('a crash after persisting logout intent still offers credential cleanup retry',async()=>{
 const e=await env({hostEnv:'index'}),menus=[];
 e.state.signedOut=true;e.state.authPaused=true;
 e.keys.set('NUFE.Local.v1.cookies','[]');
 e.m.saveCredentials('sample','stale-test');
 e.store.write(e.state);e.store.release();
 e.sandbox.__sdk.Dialog.actionSheet=async opts=>{menus.push(opts.actions.map(x=>x.label));return null;};
 await e.m.run();
 a.deepEqual(Array.from(menus[0]),['立即刷新','运行状态','退出登录']);
 a.equal(e.requests.length,0);
});
test('signed-out environment diagnostics never reuse an undeleted school cookie',async()=>{
 const e=await env(),seen=[];
 e.state.signedOut=true;e.state.authPaused=true;
 e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'SESSION',value:'old-session',domain:'jwxt.nufe.edu.cn',path:'/',expires:0}]));
 e.sandbox.fetchImpl=async(url,options)=>{
   seen.push(options);
   return {status:200,headers:new Map(),cookies:[],mimeType:'text/html',text:async()=>'<html>login required</html>'};
 };
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(seen.length,1);
 a.equal(seen[0].headers?.Cookie||'', '');
 a.equal(checks.find(c=>c.name==='登录会话').level,'正常');
 a.match(checks.find(c=>c.name==='Cookie 存储').detail,/已退出登录/);
});
test('background sync after deliberate logout makes no school request or extra notification',async()=>{
 const e=await env();
 e.state.signedOut=true;e.state.authPaused=true;
 e.keys.set('NUFE.Local.v1.cookies','[]');
 e.m.saveCredentials('student','test-secret');
 e.store.write(e.state);e.store.release();
 await e.m.run();
 a.equal(e.requests.length,0);
 a.equal(e.notices.length,0);
 a.equal(e.store.read().signedOut,true);
 a.equal(e.store.read().calendarId,e.calendar.identifier);
 a.match(e.sandbox.output,/已退出登录/);
});
test('project metadata uses stable NUFE-Schedule branding',()=>{
 const project=JSON.parse(fs.readFileSync(__dirname+'/../script.json','utf8'));
 a.equal(project.name,'NUFE-Schedule');
 a.match(project.description,/NUFE/);
});
test('source omits obsolete school name and supports existing calendar aliases',()=>{
 const oldName=String.fromCharCode(0x5357,0x8d22);
 const fullName=String.fromCharCode(0x5357,0x4eac,0x8d22,0x7ecf,0x5927,0x5b66);
 a.equal(source.includes(oldName),false);
 a.equal(source.includes(fullName),false);
 a.ok(source.includes('LEGACY_CALENDAR_TITLE'));
});

test('iCloud credentials use a synchronizable first-unlock entry without cloud cookies',async()=>{
 const e=await env();const calls=[],api=e.sandbox.__sdk.Keychain;
 const set=api.set.bind(api),get=api.get.bind(api),contains=api.contains.bind(api);
 api.set=(key,value,options)=>{calls.push(['set',key,options]);return set(key,value,options);};
 api.get=(key,options)=>{calls.push(['get',key,options]);return get(key,options);};
 api.contains=(key,options)=>{calls.push(['contains',key,options]);return contains(key,options);};
 e.m.saveCredentials('test-user','test-pass');
 a.ok(calls.some(([kind,key,opt])=>kind==='set'&&key==='NUFE.Schedule.v1.icloud-credentials'&&opt?.synchronizable===true&&opt.accessibility==='first_unlock'));
 a.ok(calls.some(([kind,key,opt])=>kind==='get'&&key==='NUFE.Schedule.v1.icloud-credentials'&&opt?.synchronizable===true));
 a.equal(e.keys.has('NUFE.Local.v1.saved-login'),false);
 e.keys.set('NUFE.Local.v1.cookies','[]');
 a.equal(e.keys.get('NUFE.Local.v1.cookies'),'[]');
});
test('legacy local password migrates only after cloud read-back verification',async()=>{
 const e=await env();
 e.keys.set('NUFE.Local.v1.saved-login',JSON.stringify({version:1,username:'sample',password:'secret'}));
 a.equal(e.m.migrateSavedCredentials(),'migrated');
 a.equal(e.keys.has('NUFE.Local.v1.saved-login'),false);
 a.equal(e.m.readSavedCredentials().password,'secret');
});
test('cloud migration failure preserves old local password and cookie',async()=>{
 const e=await env(),old=JSON.stringify({version:1,username:'sample',password:'secret'});
 e.keys.set('NUFE.Local.v1.saved-login',old);e.keys.set('NUFE.Local.v1.cookies','[]');
 e.sandbox.__sdk.Keychain.set=(key,value,opts)=>opts?.synchronizable?false:(e.keys.set(key,value),true);
 a.throws(()=>e.m.migrateSavedCredentials(),code('CREDENTIALS_UNAVAILABLE'));
 a.equal(e.keys.get('NUFE.Local.v1.saved-login'),old);
 a.equal(e.keys.get('NUFE.Local.v1.cookies'),'[]');
});
test('a different iCloud account is not silently overwritten on migration',async()=>{
 const e=await env();
 const local=JSON.stringify({version:1,username:'local-user',password:'local-pass'});
 const cloud=JSON.stringify({version:1,username:'cloud-user',password:'cloud-pass'});
 e.keys.set('NUFE.Local.v1.saved-login',local);
 e.keys.set('NUFE.Schedule.v1.icloud-credentials',cloud);
 a.equal(e.m.migrateSavedCredentials(),'conflict');
 a.equal(e.m.readSavedCredentials().username,'local-user');
 a.equal(e.keys.get('NUFE.Schedule.v1.icloud-credentials'),cloud);
});

test('native SMS input prepares the OTP UI and never saves a code',async()=>{
 const e=await env({hostEnv:'index'}),requests=[];
 e.sandbox.__sdk.Navigation={present:()=>true};
 e.sandbox.__nativeTextMock=async options=>{requests.push(options);return '123456';};
 const code=await e.m.input('学校二次认证','短信验证码',false,{kind:'sms'});
 a.equal(code,'123456');a.equal(requests.length,1);
 a.equal(requests[0].kind,'sms');
 a.equal(requests[0].label,'短信验证码');
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
});
test('native input cancellation never prompts twice',async()=>{
 const e=await env({hostEnv:'index'});let prompted=0;
 e.sandbox.__sdk.Navigation={present:()=>true};
 e.sandbox.__nativeTextMock=async()=>null;
 e.sandbox.__sdk.Dialog.prompt=async()=>{prompted++;throw Error('WRONG_PROMPT');};
 await a.rejects(()=>e.m.input('学校二次认证','短信验证码',false,{kind:'sms'}),code('CANCELLED'));
 a.equal(prompted,0);
});
test('native image captcha passes local image without exposing the answer',async()=>{
 const e=await env({hostEnv:'index'}),observed=[];const picture={id:'mock-image'};
 e.sandbox.__sdk.Navigation={present:()=>true};
 e.sandbox.__nativeTextMock=async options=>{observed.push(options);return 'ABCD';};
 a.equal(await e.m.input('图形验证码','输入图片中的字符',false,{kind:'captcha',image:picture}),'ABCD');
 a.equal(observed[0].image,picture);
 a.equal(observed[0].kind,'captcha');
});
test('password login contains no QR entry points',()=>{
 a.equal(source.includes('qrLogin('),false);
 a.equal(source.includes('qrCode/getToken'),false);
 a.equal(source.includes('QR_EXPIRED'),false);
 a.equal(source.includes('选择学校登录方式'),false);
});
test('foreground native login receives passwords only after explicit submission',async()=>{
 const e=await env({hostEnv:'index'});
 const requests=[];
 e.sandbox.__sdk.Navigation={present:()=>true};
 e.sandbox.__nativeCredentialMock=async title=>{
   requests.push(title);
   return {username:'student',password:'secret'};
 };
 const r=await e.m.credentialForm({title:'保存登录凭据'});
 a.equal(r.username,'student');
 a.equal(r.password,'secret');
 a.deepEqual(requests,['保存登录凭据']);
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
});

test('dismissed native login cancels instead of launching a fallback form',async()=>{
 const e=await env({hostEnv:'index'});let prompts=0,confirmations=0;
 e.sandbox.__sdk.Navigation={present:()=>true};
 e.sandbox.__nativeCredentialMock=async()=>null;
 e.sandbox.__sdk.Dialog.prompt=async()=>{prompts++;throw Error('WRONG_PROMPT');};
 e.sandbox.__sdk.Dialog.confirm=async()=>{confirmations++;throw Error('WRONG_CONFIRM');};
 await a.rejects(()=>e.m.credentialForm(),code('CANCELLED'));
 a.equal(prompts,0);a.equal(confirmations,0);
});

test('native credential sheet failure asks consent before system prompts',async()=>{
 const e=await env({hostEnv:'index'});
 e.sandbox.__sdk.Navigation={present:()=>true};
 e.sandbox.__nativeCredentialMock=async()=>{throw Error('NATIVE_FAILURE');};
 let confirms=0;
 e.sandbox.__sdk.Dialog.confirm=async options=>{
   confirms++;
   a.match(options.message,/NATIVE_FORM_UNAVAILABLE/);
   return false;
 };
 await a.rejects(()=>e.m.credentialForm(),code('CANCELLED'));
 a.equal(confirms,1);
});

test('when native navigation is unavailable, system prompts require consent',async()=>{
 const e=await env({hostEnv:'index'}),prompts=[],confirms=[];
 e.sandbox.__sdk.Dialog.confirm=async o=>{confirms.push(o);return true;};
 e.sandbox.__sdk.Dialog.prompt=async o=>{prompts.push(o);return prompts.length===1?'student-id':'safe-password';};
 const result=await e.m.credentialForm();
 a.equal(result.username,'student-id');a.equal(result.password,'safe-password');
 a.equal(confirms.length,1);a.equal(prompts.length,2);
 a.equal(prompts[1].obscureText,true);
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
});

test('declining native fallback cancels before requesting any password',async()=>{
 const e=await env({hostEnv:'index'});let prompted=0;
 e.sandbox.__sdk.Dialog.confirm=async()=>false;
 e.sandbox.__sdk.Dialog.prompt=async()=>{prompted++;return 'SHOULD_NOT_BE_USED';};
 await a.rejects(()=>e.m.credentialForm(),code('CANCELLED'));
 a.equal(prompted,0);
});

test('interactive credential screen cannot open in background jobs',async()=>{
 const e=await env({hostEnv:'intent'});
 await a.rejects(()=>e.m.credentialForm(),code('AUTH_INTERACTIVE_REQUIRED'));
});

test('slider only accepts plausible bounded, manually-dragged trajectories',async()=>{
 const e=await env();const validate=e.m.validSliderResult;
 const valid={canvasLength:280,moveLength:122,tracks:[
   {a:0,b:0,c:0},{a:40,b:1,c:110},{a:122,b:2,c:50}
 ]};
 a.equal(validate(valid),true);
 a.equal(validate({...valid,moveLength:1000}),false);
 a.equal(validate({...valid,tracks:[{a:0,b:0,c:0}]}),false);
 a.equal(validate({...valid,tracks:[{a:0,b:0,c:0},{a:'100',b:0,c:10}]}),false);
 a.equal(validate({...valid,tracks:new Array(1001).fill({a:2,b:0,c:20})}),false);
});
test('calendar title appends all teachers once and does not invent unknown teacher',async()=>{
 const {m}=await env();
 a.equal(m.calendarTitle(lesson()),'高等数学（张老师）');
 a.equal(m.calendarTitle(lesson({teachers:['张老师','李老师','张老师']})),'高等数学（张老师、李老师）');
 a.equal(m.calendarTitle(lesson({teachers:[]})),'高等数学');
});
test('old school title and new teacher suffix both map to the same canonical course',async()=>{
 const e=await env(),rec=lesson(),old=e.add(rec),indexed=e.m.storedEventIndex(e.state);
 a.equal(e.m.eventRecord(old,e.state.owner,indexed).title,'高等数学');
 old.title='高等数学（张老师）';
 a.equal(e.m.eventRecord(old,e.state.owner,indexed).title,'高等数学');
 a.equal(e.m.matchesOldCourse(old,rec),true);
});
test('a newly written marked event recovers the base title without an index',async()=>{
 const e=await env(),rec=lesson();
 await new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store).save(rec,null,'2026-11-02T03:00:00Z');
 a.equal(e.db.length,1);
 a.equal(e.db[0].title,'高等数学（张老师）');
 a.equal(e.m.eventRecord(e.db[0],e.state.owner).title,'高等数学');
});
test('teacher change keeps logical identity and updates the same native event',async()=>{
 const e=await env(),rec=lesson(),after=lesson({teachers:['李老师']});
 e.add(rec);
 const native=e.db[0].identifier;
 const p=e.m.plan([rec],[{...after,id:undefined}],()=> 'different-id');
 a.equal(p.events[0].id,rec.id);
 await e.m.applyTransaction(tx([rec],[after]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store));
 a.equal(e.db.length,1);
 a.equal(e.db[0].identifier,native);
 a.equal(e.db[0].title,'高等数学（李老师）');
});
test('v2 readable notes migrate to v3 title and timestamp in place',async()=>{
 const e=await env(),rec=lesson(),ev=e.add(rec,{notes:'教师：张老师\\n同步：2026-11-02 01:22'.replace('\\n','\n')});
 e.baseline([rec]);e.state.semesters['161'].notesFormat=2;
 e.state.semesters['161'].index={[rec.id]:ev.identifier};
 const before=ev.identifier;
 e.store.write(e.state);
 await e.m.polishTermNotes(e.calendar,e.state,e.store,'161',()=>{});
 a.equal(e.db.length,1);a.equal(e.db[0].identifier,before);
 a.equal(e.db[0].title,'高等数学（张老师）');
 a.match(e.db[0].notes,/^同步：/);
 a.doesNotMatch(e.db[0].notes,/教师：/);
 a.equal(e.state.semesters['161'].notesFormat,3);
});

test('full teacher names from the school remain intact in calendar titles',async()=>{
 const {m}=await env();
 const rec=m.expand(raw([activity({courseName:'中国税制',teachers:[{name:'高玉胭(001)'}]})]),161,'2026-09-07').events[0];
 a.equal(rec.teachers[0],'高玉胭');
 a.equal(m.calendarTitle(rec),'中国税制（高玉胭）');
});

test('credential status identifies legacy-only and synchronized item read-back',async()=>{
 const e=await env();
 a.equal(e.m.credentialStorageStatus(),'未保存账号密码');
 const legacy=JSON.stringify({version:1,username:'legacy',password:'placeholder'});
 e.keys.set('NUFE.Local.v1.saved-login',legacy);
 a.match(e.m.credentialStorageStatus(),/仅检测到本机旧凭据/);
 e.m.saveCredentials('school-id','fake-password');
 a.equal(e.m.credentialStorageStatus(),'iCloud 可同步凭据已保存');
 a.doesNotMatch(e.m.credentialStorageStatus(),/其他设备|未核验/);
 a.doesNotMatch(e.m.credentialStorageStatus(),/fake-password|school-id/);
});
test('Keychain diagnostics report only the local readable state, not cross-device verification',async()=>{
 const e=await env();
 e.m.saveCredentials('student','secret');
 const report=e.m.environmentCheckText(await e.m.inspectEnvironment(e.state,e.store),e.state);
 a.match(report,/自动登录凭据：本机凭据读取正常/);
 a.doesNotMatch(report,/其他设备|云同步.*核验/);
 a.doesNotMatch(report,/secret|student/);
});
test('credential status cannot claim success for invalid stored JSON',async()=>{
 const e=await env();
 e.keys.set('NUFE.Schedule.v1.icloud-credentials','{broken');
 a.match(e.m.credentialStorageStatus(),/数据异常/);
 a.doesNotMatch(e.m.credentialStorageStatus(),/iCloud 可同步凭据已保存/);
});
test('credential status surfaces dual-key migration instead of hiding it',async()=>{
 const e=await env(),r=JSON.stringify({version:1,username:'test',password:'placeholder'});
 e.keys.set('NUFE.Local.v1.saved-login',r);
 e.keys.set('NUFE.Schedule.v1.icloud-credentials',r);
 a.match(e.m.credentialStorageStatus(),/旧本机凭据，请检查迁移/);
});


test('v3 notes refresh after another successful unchanged-term sync',async()=>{
 const e=await env(),rec=lesson(),ev=e.add(rec);
 e.baseline([rec]);const term=e.state.semesters['161'];
 term.index={[rec.id]:ev.identifier};
 term.notesFormat=3;
 term.lastSuccess='2026-11-02T00:35:00.000Z';
 ev.title=e.m.calendarTitle(rec);ev.notes='同步：2026-11-02 08:35';
 e.store.write(e.state);
 const original=ev.identifier;
 const beforeWrites=e.requests.filter(x=>x[0]==='save').length;
 await e.m.polishTermNotes(e.calendar,e.state,e.store,'161',()=>{});
 a.equal(e.db.length,1);
 a.equal(e.db[0].identifier,original);
 a.equal(e.db[0].title,'高等数学（张老师）');
 a.equal(e.db[0].notes,'同步：2026-11-02 08:35');
 a.equal(e.requests.filter(x=>x[0]==='save').length,beforeWrites);
 term.lastSuccess='2026-11-02T01:07:00.000Z';
 e.store.write(e.state);
 await e.m.polishTermNotes(e.calendar,e.state,e.store,'161',()=>{});
 a.equal(e.db.length,1);
 a.equal(e.db[0].identifier,original);
 a.equal(e.db[0].notes,'同步：2026-11-02 09:07');
 a.equal(e.state.semesters['161'].notesFormat,3);
 a.equal(e.requests.filter(x=>x[0]==='save').length,beforeWrites+1);
});
test('no-op event save cannot falsely report a timestamp update',async()=>{
 const e=await env(),rec=lesson(),ev=e.add(rec);
 e.baseline([rec]);const term=e.state.semesters['161'];
 term.index={[rec.id]:ev.identifier};
 term.notesFormat=3;
 term.lastSuccess='2026-11-02T01:07:00.000Z';
 e.store.write(e.state);e.setDropSave(true);
 await a.rejects(()=>e.m.polishTermNotes(e.calendar,e.state,e.store,'161',()=>{}),code('CALENDAR_VERIFY'));
 a.equal(e.db[0].notes.includes('同步：2026-11-02 09:07'),false);
 a.equal(e.db.length,1);
});
test('timestamp-only refresh updates multiple course events without changing IDs',async()=>{
 const e=await env(),first=lesson(),second=lesson({id:'lesson-2',start:'2026-09-14T00:00:00.000Z',end:'2026-09-14T01:40:00.000Z',week:2});
 const a1=e.add(first),a2=e.add(second),ids=[a1.identifier,a2.identifier];
 e.baseline([first,second]);
 const term=e.state.semesters['161'];
 term.index={[first.id]:ids[0],[second.id]:ids[1]};
 term.notesFormat=3;term.lastSuccess='2026-11-02T01:07:00.000Z';e.store.write(e.state);
 await e.m.polishTermNotes(e.calendar,e.state,e.store,'161',()=>{});
 a.deepEqual(e.db.map(x=>x.identifier),ids);
 a.ok(e.db.every(x=>x.notes==='同步：2026-11-02 09:07'));
});

test('manual cancellation request only targets the exact previous lock token',async()=>{
 const e=await env(),waiter=new e.m.Store(),lockFile=e.store.path('run-lock.json');
 const before=e.files.get(lockFile);
 a.equal(waiter.requestCancelActive(),true);
 a.equal(e.files.get(lockFile),before);
 a.throws(()=>e.store.check(),code('SYNC_SUPERSEDED'));
 e.store.release();
 a.equal(e.files.has(lockFile),false);
 a.equal(e.files.has(e.store.path('run-cancel.json')),false);
 waiter.acquire();
 a.doesNotThrow(()=>waiter.check());
 waiter.release();
});
test('interrupted transaction journal is retained until next owner can recover',async()=>{
 const e=await env(),newcomer=new e.m.Store(),old=lesson();
 e.state.tx=tx([old],[]);e.store.write(e.state);
 a.equal(newcomer.requestCancelActive(),true);
 a.throws(()=>e.store.write(e.state),code('SYNC_SUPERSEDED'));
 e.store.release();
 const got=await e.m.acquireSyncSlot(newcomer,false,{backgroundWait:5,poll:1});
 a.equal(got,'acquired');
 a.equal(newcomer.read().tx.sid,'161');
 newcomer.release();
});
test('responsive sync heartbeat prevents cancel takeover even when lock was started long ago',async()=>{
 const e=await env(),lock=e.store.path('run-lock.json'),hb=e.store.path('run-heartbeat.json');
 const p=JSON.parse(e.files.get(lock));
 e.files.set(lock,JSON.stringify({...p,at:Date.now()-180000}));
 e.files.set(hb,JSON.stringify({token:p.token,at:Date.now()}));
 const waiter=new e.m.Store();
 a.equal(waiter.requestCancelActive(),true);
 a.equal(waiter.recoverStalledCancellation(1000),false);
 a.equal(JSON.parse(e.files.get(lock)).token,p.token);
 a.throws(()=>waiter.acquire(),code('BUSY'));
 e.store.release();
});
test('cancelled orphan lock may be safely reassigned after inactivity, with transaction preserved',async()=>{
 const e=await env(),lock=e.store.path('run-lock.json'),hb=e.store.path('run-heartbeat.json');
 e.state.tx=tx([lesson()],[]);e.store.write(e.state);
 const prior=JSON.parse(e.files.get(lock));
 e.files.set(lock,JSON.stringify({...prior,at:Date.now()-180000}));
 e.files.set(hb,JSON.stringify({token:prior.token,at:Date.now()-180000}));
 e.state.lastStageAt=new Date(Date.now()-180000).toISOString();
 e.store.write(e.state);
 // The write above refreshes activity, so simulate actual process suspension.
 e.files.set(hb,JSON.stringify({token:prior.token,at:Date.now()-180000}));
 const saved=e.store.read();saved.lastStageAt=new Date(Date.now()-180000).toISOString();
 const stateName=[...e.files.keys()].filter(x=>/state-\d{10}\.json$/.test(x)).sort().at(-1);
 e.files.set(stateName,JSON.stringify(saved));
 const waiter=new e.m.Store();
 a.equal(waiter.requestCancelActive(),true);
 a.equal(waiter.recoverStalledCancellation(120000),true);
 a.equal(e.files.has(lock),false);
 a.throws(()=>e.store.check(),code('LOCK_LOST'));
 waiter.acquire();
 a.equal(waiter.read().tx.sid,'161');
 a.doesNotThrow(()=>waiter.check());
 e.store.release(); // Old owner may not delete the new owner's lock.
 a.equal(e.files.has(lock),true);
 a.doesNotThrow(()=>waiter.check());
 waiter.release();
});
test('cancel request for another token cannot reclaim or delete a valid task',async()=>{
 const e=await env(),other=new e.m.Store(),cancel=e.store.path('run-cancel.json'),lock=e.store.path('run-lock.json');
 const owner=JSON.parse(e.files.get(lock));
 e.files.set(cancel,JSON.stringify({token:'unrelated-owner',at:Date.now()}));
 a.equal(other.recoverStalledCancellation(1),false);
 a.equal(JSON.parse(e.files.get(lock)).token,owner.token);
 e.store.release();
});
test('cancelling a suspended task resumes through ordinary lock acquisition',async()=>{
 const e=await env(),old=e.store.path('run-lock.json'),hb=e.store.path('run-heartbeat.json');
 const lock=JSON.parse(e.files.get(old));
 e.files.set(old,JSON.stringify({...lock,at:Date.now()-180000}));
 e.files.set(hb,JSON.stringify({token:lock.token,at:Date.now()-180000}));
 e.sandbox.__sdk.Dialog.actionSheet=async()=>1;
 const waiter=new e.m.Store();
 const result=await e.m.acquireSyncSlot(waiter,true,{foregroundWait:100,poll:1});
 a.equal(result,'acquired');
 a.notEqual(JSON.parse(e.files.get(old)).token,lock.token);
 a.doesNotThrow(()=>waiter.check());
 waiter.release();
});
test('nonmatching and stale cancellation tokens cannot terminate a new owner',async()=>{
 const e=await env(),lock=e.store.path('run-lock.json'),cancel=e.store.path('run-cancel.json');
 const token=JSON.parse(e.files.get(lock)).token;
 e.files.set(cancel,JSON.stringify({token:'other-task',at:Date.now()}));
 a.doesNotThrow(()=>e.store.check());
 e.store.release();
 e.files.set(cancel,JSON.stringify({token,at:Date.now()}));
 const next=new e.m.Store();next.acquire();
 a.doesNotThrow(()=>next.check());
 a.equal(e.files.has(cancel),false);
 next.release();
});
test('foreground conflict offers a wait-or-cancel choice only on contention',async()=>{
 const e=await env(),seen=[];
 e.sandbox.__sdk.Dialog.actionSheet=async o=>{seen.push(o);return 1;};
 const second=new e.m.Store();
 const result=await e.m.acquireSyncSlot(second,true,{foregroundWait:1,poll:2});
 a.equal(result,'still-running');
 a.equal(seen.length,1);
 a.deepEqual(Array.from(seen[0].actions,x=>x.label),['等待完成','取消前次任务并刷新']);
 a.throws(()=>e.store.check(),code('SYNC_SUPERSEDED'));
 e.store.release();
});
test('waiting task acquires lock only after original run releases it',async()=>{
 const e=await env(),second=new e.m.Store();
 setTimeout(()=>e.store.release(),5);
 const status=await e.m.acquireSyncSlot(second,false,{backgroundWait:150,poll:10});
 a.equal(status,'acquired');
 a.doesNotThrow(()=>second.check());
 second.release();
});

test('no recovery buttons are offered for successful runs or ordinary network failure',async()=>{
 const e=await env();
 a.equal(e.m.availableRecovery(null,e.state,e.store),null);
 a.equal(e.m.availableRecovery('NETWORK',e.state,e.store),null);
 a.equal(e.m.availableRecovery('LOGIN_SCHEMA',e.state,e.store),null);
});
test('a malformed Cookie storage error offers only local session reset',async()=>{
 const e=await env();
 const r=e.m.availableRecovery('COOKIE_STORAGE',e.state,e.store);
 a.equal(r.kind,'cookie');a.equal(r.label,'清除异常 Cookie');
 e.keys.set('NUFE.Local.v1.cookies','local-bad-cookie');
 e.keys.set('NUFE.Schedule.v1.icloud-credentials',JSON.stringify({version:1,username:'sample',password:'fake'}));
 e.state.authPaused=true;e.state.nextAttempt=Date.now()+100000;e.state.lastError='COOKIE_STORAGE';
 e.store.write(e.state);e.sandbox.__sdk.Dialog.alert=async()=>{};
 await e.m.applyRecovery('cookie',e.state,e.store);
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),false);
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),true);
 a.equal(e.state.authPaused,false);
 a.equal(e.state.nextAttempt,0);
 a.equal(e.state.lastError,null);
});
test('status offers self-check with recovery only on a matching failure and never offers detailed logs',async()=>{
 const e=await env(),confirms=[],alerts=[];
 e.sandbox.__sdk.Dialog.confirm=async o=>{confirms.push(o);return true;};
 e.sandbox.__sdk.Dialog.alert=async o=>{alerts.push(o);};
 e.state.lastError='COOKIE_STORAGE';e.state.runStatus='failed';
 a.equal(await e.m.showRunStatus(e.state,e.store),'cookie');
 a.deepEqual(confirms.slice(0,2).map(o=>o.confirmLabel),['环境自检','清除异常 Cookie']);
 a.doesNotMatch(confirms[0].message,/连续失败：|最近步骤|详细运行记录/);
 a.doesNotMatch(confirms[1].message,/详细运行记录/);
 e.state.runStatus='success';
 a.equal(await e.m.showRunStatus(e.state,e.store),null);
 a.equal(confirms.length,3); // Only the overview prompt; no recovery on success.
 a.equal(alerts.length,1);
 a.equal(alerts[0].title,'环境自检');
 a.doesNotMatch(alerts[0].message,/详细运行记录/);
});

test('environment inspection only reads existing local state and never mutates data',async()=>{
 const e=await env();
 const oldKeys=JSON.stringify([...e.keys]),oldFiles=JSON.stringify([...e.files]),oldEvents=e.db.length;
 const results=await e.m.inspectEnvironment(e.state,e.store);
 a.ok(results.length>=7);
 a.equal(results.find(x=>x.name==='本地状态').level,'正常');
 a.equal(results.find(x=>x.name==='目标日历').level,'正常');
 a.equal(results.find(x=>x.name==='学校连接').level,'待确认');
 a.match(e.m.environmentCheckText(results,e.state),/只读检查/);
 a.equal(JSON.stringify([...e.keys]),oldKeys);
 a.equal(JSON.stringify([...e.files]),oldFiles);
 a.equal(e.db.length,oldEvents);
 a.equal(e.requests.length,0);
});
test('live school session probe verifies authentication using existing cookies',async()=>{
 const e=await env(),seen=[];
 e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'SESSION',value:'local-test-cookie',domain:'jwxt.nufe.edu.cn',hostOnly:true,path:'/',expires:0}]));
 e.sandbox.fetchImpl=async(url,options)=>{
   seen.push({url,options});
   return {status:200,headers:new Map(),cookies:[],mimeType:'text/html',
     text:async()=>'<html>var personId=100;var currentSemester={"id":161};</html>'};
 };
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 const auth=checks.find(x=>x.name==='登录会话');
 a.equal(auth.level,'正常');a.match(auth.detail,/刚刚使用本机 Cookie 验证成功/);
 a.equal(seen.length,1);a.ok(seen[0].options.headers.Cookie.includes('SESSION=local-test-cookie'));
 a.equal(seen[0].options.method,'GET');a.equal(seen[0].options.body,undefined);
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),true);
 a.equal(e.state.runStatus,undefined);
});
test('login-required redirect is classified as expired instead of successful',async()=>{
 const e=await env();
 e.sandbox.fetchImpl=async(url,options)=>{
   if(options.handleRedirect)await options.handleRedirect({url:'https://authserver.nufe.edu.cn/authserver/login'});
   throw Error('redirect intercepted');
 };
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(checks.find(x=>x.name==='登录会话').level,'注意');
 a.match(checks.find(x=>x.name==='登录会话').detail,/重新认证/);
});
test('unclassifiable page remains unverified even with HTTP 200',async()=>{
 const e=await env();
 e.sandbox.fetchImpl=async()=>({status:200,headers:new Map(),cookies:[],mimeType:'text/html',text:async()=>'<html>hello</html>'});
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(checks.find(x=>x.name==='登录会话').level,'待确认');
 a.equal(checks.find(x=>x.name==='学校连接').level,'正常');
});
test('authentication probe never submits a stored password or follows untrusted URLs',async()=>{
 const e=await env();
 e.keys.set('NUFE.Schedule.v1.icloud-credentials',JSON.stringify({version:1,username:'student',password:'SECRET'}));
 const seen=[];
 e.sandbox.fetchImpl=async(url,options)=>{
   seen.push({url,options});
   if(options.handleRedirect)await options.handleRedirect({url:'https://external.invalid/login'});
   throw Error('redirect intercepted');
 };
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(checks.find(x=>x.name==='登录会话').level,'待确认');
 a.equal(seen.length,1);
 a.ok(!JSON.stringify(seen[0]).includes('SECRET'));
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),true);
});
test('self-check distinguishes an inaccessible original calendar from a healthy one',async()=>{
 const e=await env();
 e.sandbox.__sdk.Calendar.forEvents=async()=>[e.other];
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(checks.find(x=>x.name==='目标日历').level,'注意');
 a.match(checks.find(x=>x.name==='目标日历').detail,/原日历当前不可见/);
 a.equal(e.state.calendarId,e.calendar.identifier);
});
test('self-check flags pending transactions and does not clear their journal',async()=>{
 const e=await env(),t=tx([],[lesson()]);
 e.state.tx=t;e.store.write(e.state);
 const before=e.files.get(e.store.path('run-lock.json'));
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(checks.find(x=>x.name==='同步任务').level,'待确认'); // valid ownership is never assumed stale
 a.equal(e.state.tx,t);
 a.equal(e.files.get(e.store.path('run-lock.json')),before);
 a.match(e.m.statusText(e.state),/需要恢复上次写入/);
});
test('live school connectivity probe uses stored session Cookie but never saved password',async()=>{
 const e=await env(),seen=[];
 e.keys.set('NUFE.Local.v1.cookies',JSON.stringify([{name:'SESSION',value:'secret',domain:'jwxt.nufe.edu.cn',path:'/',expires:0}]));
 e.sandbox.fetchImpl=async(url,options)=>{seen.push({url,options});return {status:200,headers:new Map(),cookies:[],mimeType:'text/html',text:async()=>'<html>safe</html>'};};
 const checks=await e.m.inspectEnvironment(e.state,e.store);
 a.equal(checks.find(x=>x.name==='学校连接').level,'正常');
 a.equal(seen.length,1);
 a.match(seen[0].url,/^https:\/\/jwxt\.nufe\.edu\.cn\//);
 a.ok(seen[0].options.headers?.Cookie?.includes('SESSION=secret'));
 a.ok(!seen[0].options.body);
 a.ok(!JSON.stringify(seen[0].options).includes('password'));
 a.equal(e.keys.has('NUFE.Local.v1.cookies'),true);
});
test('self-check failure report includes actionable error code without secrets',async()=>{
 const e=await env();e.state.runStatus='failed';e.state.lastError='NETWORK_DNS';
 const report=e.m.environmentCheckText(await e.m.inspectEnvironment(e.state,e.store),e.state);
 a.match(report,/NETWORK_DNS/);
 a.match(report,/检查 DNS/);
 a.doesNotMatch(report,/Cookie=|password=|学号\s*\d+/i);
});
test('invalid lock recovery cannot clear a live valid lock',async()=>{
 const e=await env(),path=e.store.path('run-lock.json'),before=e.files.get(path);
 e.sandbox.__sdk.Dialog.alert=async()=>{};
 e.sandbox.__sdk.Dialog.confirm=async()=>{throw Error('should not ask to clear active lock');};
 await e.m.applyRecovery('lock',e.state,e.store);
 a.equal(e.files.get(path),before);
});
test('recovery backup option appears only when the matching backup exists',async()=>{
 const e=await env();
 e.state.lastSyncBackupName='known.json';
 a.equal(e.m.availableRecovery('CALENDAR_VERIFY',e.state,e.store),null);
 e.files.set(e.store.path('known.json'),'{}');
 a.equal(e.m.availableRecovery('CALENDAR_VERIFY',e.state,e.store).kind,'backup');
 a.equal(e.m.availableRecovery('NETWORK',e.state,e.store),null);
});
