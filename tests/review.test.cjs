// Modified 2026-11-02: classroom, front-end entry, semester-selection and note-migration regression tests.
const {test}=require('node:test');const a=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../index.tsx','utf8').replace('import * as Scripting from "scripting";', 'const Scripting=globalThis.__sdk;');
async function env({mode="sync",hostEnv="intent"}={}){
 const files=new Map(),keys=new Map(),db=[],notices=[],requests=[];let serial=0,failSave=false,dropSave=false,failRemove=false,noRemove=false,seriesMode=false;
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
 const sdk={Script:nativeScript,Intent:{text:x=>x},FileManager:{appGroupDocumentsDirectory:'/local',existsSync:fm.fileExists,createDirectorySync:fm.createDirectory,readDirectorySync:fm.listContents,readAsStringSync:fm.readString,writeAsStringSync:fm.writeString,removeSync:fm.remove,renameSync:fm.move},Keychain:{contains:k=>keys.has(k),get:k=>keys.get(k)??null,set:(k,v)=>{keys.set(k,v);return true;},remove:k=>{keys.delete(k);return true;}},UUID:sandbox.UUID,CalendarEvent:Event,Calendar:{forEvents:async()=>[calendar,other],presentChooser:async()=>[calendar]},Notification:{schedule:async o=>{notices.push(o);return 'notice-'+notices.length;},getAllPendingsOfCurrentScript:async()=>[],removePendings:async()=>{}},Dialog:{actionSheet:async opts=>{const alert=new sandbox.Alert();alert.title=opts.title;alert.message=opts.message;for(const x of opts.actions)alert.addAction(x.label);if(opts.cancelButton)alert.addCancelAction('取消');return alert.presentSheet();},alert:async opts=>{const alert=new sandbox.Alert();alert.title=opts.title;alert.message=opts.message;alert.addAction('好');return alert.presentAlert();},confirm:async()=>{throw Error('UNEXPECTED CONFIRM');},prompt:async()=>{throw Error('UNEXPECTED PROMPT');}},fetch:async(...args)=>{if(sandbox.fetchImpl)return sandbox.fetchImpl(...args);throw Error('NETWORK NOT MOCKED');}};
 sandbox.__sdk=sdk;sandbox.__NUFE_TEST__=true;sandbox.setTimeout=setTimeout;sandbox.clearTimeout=clearTimeout;sandbox.setInterval=setInterval;sandbox.clearInterval=clearInterval;sandbox.crypto=crypto.webcrypto;
 await vm.runInNewContext('(async()=>{'+source+'\nawait globalThis.__NUFE_LAUNCH__;})()',sandbox);
 sandbox.config=sandbox.module.exports.ScriptingAdapter.config;sandbox.args=sandbox.module.exports.ScriptingAdapter.args;
 const m=sandbox.module.exports,store=new m.Store();store.acquire();
 const state={version:1,owner:'installation-owner',calendarId:calendar.identifier,anchors:{'161':'2026-09-07'},semesters:{},minutes:0,failures:0};
 function add(rec,{owner=state.owner,cal=calendar,id,notes,offset=0,allDay=false}={}){const e=new Event();e.identifier=id||'event-'+(++serial);e.calendar=cal;e.title=rec.title;e.location=rec.location;e.notes=notes===undefined?m.notes(rec,owner,'2026-11-01T00:00:00Z'):notes;e.startDate=new Date(Date.parse(rec.start)+offset);e.endDate=new Date(Date.parse(rec.end)+offset);e.isAllDay=allDay;db.push(e);return e;}
 function baseline(events){state.semesters['161']={events,index:{},anchor:'2026-09-07',name:'2026-2027-1',lastSuccess:'2026-11-01T00:00:00Z'};return state;}
 return {m,sandbox,store,state,db,files,keys,notices,requests,calendar,other,add,baseline,Event,setSaveFailure:v=>failSave=v,setDropSave:v=>dropSave=v,setRemoveFailure:v=>failRemove=v,setNoRemove:v=>noRemove=v,setSeries:v=>seriesMode=v};
}
const lesson=(extra={})=>({id:'lesson-1',sid:'161',title:'高等数学',week:1,su:1,eu:2,start:'2026-09-07T00:00:00.000Z',end:'2026-09-07T01:40:00.000Z',location:'仙林 教A101',teachers:['张老师'],...extra});
const raw=(activities)=>({studentTableVms:[{code:'sample-local',activities}]});
const activity=(x={})=>({courseName:'高等数学',weekday:1,startUnit:1,endUnit:2,weekIndexes:[1,2],startTime:'08:00',endTime:'09:40',campus:'仙林',room:'教A101',teachers:[{name:'张老师(001)'}],...x});
const tx=(before,target)=>({id:crypto.randomUUID(),sid:'161',anchor:'2026-09-07',name:'学期',before,target,stamp:new Date().toISOString(),changes:{added:0,removed:0,changed:0,examples:[]},skipped:[]});
const code=c=>e=>e&&e.code===c;

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
test('saved credentials delete without deleting cookies',async()=>{const e=await env();e.keys.set('NUFE.Local.v1.cookies','[]');e.m.saveCredentials('sample','local');e.m.removeSavedCredentials();a.equal(e.m.hasSavedCredentials(),false);a.ok(e.keys.has('NUFE.Local.v1.cookies'));});
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
test('daily sync background authentication-required exits with one failure result and no dialog',async()=>{const e=await env();e.state.authPaused=true;e.state.lastError='AUTH_INTERACTIVE_REQUIRED';e.store.write(e.state);e.store.release();await e.m.run();a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);a.match(e.sandbox.output,/刷新失败/);});
function loggedIn(e,sourceRaw){
 e.m.HTTP.prototype.get=async function(url){return {url:'https://jwxt.nufe.edu.cn/student/for-std/course-table',text:'var personId=100;var currentSemester={"id":161};<select id="allSemesters"><option value="161">2026-2027-1</option></select>'}};
 e.m.HTTP.prototype.json=async function(url){return typeof sourceRaw==='function'?sourceRaw(url):sourceRaw;};
}
async function executeDaily(e){e.store.write(e.state);e.store.release();await e.m.run();}
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
test('end-to-end school person change blocks all calendar writes',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.keys.set('NUFE.Local.v1.person','another-person');loggedIn(e,raw([activity()]));await executeDaily(e);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'ACCOUNT_CHANGED');a.equal(e.store.read().authPaused,true);a.match(e.notices[0].title,/失败/);});
test('end-to-end changed student identity in data blocks replacement',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.keys.set('NUFE.Local.v1.student','another-student');loggedIn(e,raw([activity()]));await executeDaily(e);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'ACCOUNT_CHANGED');});
test('end-to-end missing bound calendar never falls back to personal calendar',async()=>{const e=await env();e.state.calendarId='missing-calendar';e.add(lesson(),{cal:e.other,notes:'personal'});loggedIn(e,raw([activity()]));await executeDaily(e);a.equal(e.requests.length,0);a.equal(e.store.read().lastError,'CALENDAR_MISSING');a.equal(e.notices.length,1);});
test('busy background invocation still sends one final failure',async()=>{const e=await env();e.store.write(e.state);await e.m.run();a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);a.match(e.sandbox.output,/刷新失败/);});
test('automatic login without credentials stops before submitting password',async()=>{const e=await env();let count=0;const http={get:async()=>{count++;return {url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"><input name="execution" value="e1"></form>'}}};await a.rejects(()=>e.m.coursePage(http,false),code('AUTH_REQUIRED'));a.equal(count,2);});
test('automatic login encountering MFA never opens UI or attempts codes',async()=>{const e=await env();const http={get:async()=>({url:'https://authserver.nufe.edu.cn/authserver/login',text:'isMultifactor=true'})};await a.rejects(()=>e.m.coursePage(http,false),code('AUTH_INTERACTIVE_REQUIRED'));});
test('automatic captcha requirement never encrypts or submits password',async()=>{const e=await env();let posts=0;const http={jar:new e.m.CookieJar(),get:async(url,opt)=>{if(opt&&opt.body)posts++;return {text:''}},authJSON:async()=>({isNeed:true})};const page={url:'https://authserver.nufe.edu.cn/authserver/login',text:'<form id="pwdFromId"><input name="execution" value="e1s1"><input id="pwdEncryptSalt" value="1234567890123456"></form>'};await a.rejects(()=>e.m.passwordLogin(http,page,'sample','local-password',false),code('AUTH_INTERACTIVE_REQUIRED'));a.equal(posts,0);});
test('cookie RFC default path also applies to directory endpoint itself',async()=>{const {m}=await env();const jar=new m.CookieJar();jar.ingest('https://jwxt.nufe.edu.cn/student/login',{'set-cookie':'x=v'});a.equal(jar.header('https://jwxt.nufe.edu.cn/student'),'x=v');a.equal(jar.header('https://jwxt.nufe.edu.cn/student/course'),'x=v');a.equal(jar.header('https://jwxt.nufe.edu.cn/students'),'');});
test('an invitation anywhere stops dedicated deletion before first remove',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.add(lesson(),{notes:'old'});const invitation=e.add(lesson(),{notes:'invitation'});invitation.attendees=[{name:'guest'}];await a.rejects(()=>e.m.replaceDedicatedLegacy(e.calendar,e.state,e.store),code('LEGACY_INVITATION'));a.equal(e.requests.filter(x=>x[0]==='remove').length,0);});

test('owned series is replaced with a standalone new target after backup',async()=>{const e=await env();e.add(lesson(),{id:'owned-series'});e.add(lesson(),{id:'owned-series',offset:7*86400000});e.setSeries(true);e.state.tx=tx([lesson()],[lesson()]);await e.m.finishTx(e.state,e.store,new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),()=>{});a.equal(e.db.length,1);a.notEqual(e.db[0].identifier,'owned-series');a.equal(e.m.eventRecord(e.db[0],e.state.owner).id,'lesson-1');});
test('orphan owned marker is removed only in successfully fetched term',async()=>{const e=await env();e.add(lesson());e.add(lesson({id:'orphan'}));e.add(lesson({id:'other-term',sid:'999'}));await e.m.applyTransaction(tx([lesson()],[lesson()]),new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store));a.equal(e.db.length,2);a.ok(e.db.some(x=>e.m.eventRecord(x,e.state.owner).sid==='999'));});
test('pending transaction does not resume before a fresh complete school fetch',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.state.tx=tx([lesson()],[]);loggedIn(e,{});await executeDaily(e);a.equal(e.db.length,1);a.equal(e.requests.length,0);a.ok(e.store.read().tx);a.equal(e.store.read().lastError,'SCHEMA');});
test('pending stale cancellation is rebased when fresh school data still includes class',async()=>{const e=await env();e.baseline([lesson()]);e.add(lesson());e.state.tx=tx([lesson()],[]);loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.equal(e.db.length,1);a.equal(e.requests.filter(x=>x[0]==='remove').length,0);a.equal(e.store.read().tx,null);a.match(e.notices[0].title,/成功/);});
test('primary menu contains only refresh, settings and status',async()=>{const e=await env({mode:'menu',hostEnv:'index'}),menus=[];e.sandbox.config.runsInApp=true;e.sandbox.args.shortcutParameter=null;e.sandbox.Alert=class{constructor(){this.actions=[];}addAction(t){this.actions.push(t);}addCancelAction(){}async presentSheet(){menus.push(this.actions);return 2;}async presentAlert(){return 0;}};e.store.write(e.state);e.store.release();await e.m.run();a.deepEqual(menus[0],['立即刷新','账号与日历设置','运行状态']);a.equal(e.requests.length,0);});
test('shortcut sync suppresses menus even while Scriptable is foregrounded',async()=>{const e=await env();e.sandbox.config.runsInApp=true;e.baseline([lesson()]);e.add(lesson());loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.equal(e.notices.length,1);a.match(e.notices[0].title,/成功/);});
test('upgrade disables old course reminders and retains result-only preference',async()=>{const e=await env();e.state.minutes=10;e.baseline([lesson()]);e.add(lesson());loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.equal(e.store.read().minutes,0);a.equal(e.store.read().notificationMode,'result-only-v1.9');a.equal(e.notices.length,1);});
test('Scripting foreground defaults to management menu',async()=>{const e=await env({hostEnv:'index'});a.equal(e.m.ScriptingAdapter.__mode,'menu');});
test('Scripting first provisioning goes directly to binding and sync, not a main menu',async()=>{const e=await env({hostEnv:'index'});e.state.calendarId=null;const alerts=[];e.sandbox.__sdk.Dialog.confirm=async()=>true;e.sandbox.__sdk.Dialog.alert=async o=>alerts.push(o);loggedIn(e,raw([activity({weekIndexes:[1]})]));await executeDaily(e);a.ok(e.store.read().calendarId);a.equal(e.store.read().runStatus,'success');a.equal(alerts.length,1);a.match(alerts[0].title,/成功/);});
test('Scripting native secure random encrypts password with no WebView dependency',async()=>{const e=await env();const ciphertext=await e.m.encryptPassword('local-test-secret','1234567890123456');const cipher=crypto.createDecipheriv('aes-128-cbc',Buffer.from('1234567890123456'),Buffer.alloc(16));const plain=Buffer.concat([cipher.update(Buffer.from(ciphertext,'base64')),cipher.final()]);a.ok(plain.toString('utf8').endsWith('local-test-secret'));});
test('Scripting Keychain boolean failure prevents false saved-credential success',async()=>{const e=await env();e.sandbox.__sdk.Keychain.set=()=>false;a.throws(()=>e.m.saveCredentials('sample','local'),code('CREDENTIALS_UNAVAILABLE'));a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);});
test('Scripting native fetch cancels redirect and exposes parsed cookie metadata',async()=>{const e=await env();let stopped=false;e.sandbox.fetchImpl=async(url,opt)=>{a.equal(opt.allowInsecureRequest,false);a.equal(await opt.handleRedirect({url:'https://jwxt.nufe.edu.cn/student/login'}),null);stopped=true;return {status:302,headers:{forEach:fn=>{fn('/student/login','location');},get:()=>null},cookies:[{name:'school',value:'local-token',domain:'jwxt.nufe.edu.cn',path:'/',expiresDate:null}],mimeType:'text/html',text:async()=>''};};const req=new e.m.ScriptingAdapter.Request('https://jwxt.nufe.edu.cn/student/sso/login');let redirected='';req.onRedirect=r=>{redirected=r.url;return null;};await req.loadString();a.ok(stopped);a.equal(redirected,'https://jwxt.nufe.edu.cn/student/login');a.equal(req.response.cookies[0].name,'school');});
test('Scripting WebView expressions use explicit return function body',async()=>{const e=await env();e.sandbox.__sdk.WebViewController=class{async loadHTML(){return true;}async evaluateJavaScript(js){return js;}dispose(){}};const w=new e.m.ScriptingAdapter.WebView();w.shouldAllowRequest=r=>r.url==='about:blank';a.equal(await w.inner.shouldAllowRequest({url:'https://evil.test'}),false);a.equal(await w.evaluateJavaScript('window.result'),'return (window.result);');});
test('Scripting recurrence flag detects even a single visible series instance',async()=>{const e=await env();const old=e.add(lesson());old.hasRecurrenceRules=true;old.recurrenceRules=[{frequency:'weekly',interval:1}];e.state.tx=tx([lesson()],[lesson()]);await e.m.finishTx(e.state,e.store,new e.m.CalendarAdapter(e.calendar,e.state.owner,e.store),()=>{});a.equal(e.db.length,1);a.notEqual(e.db[0].identifier,old.identifier);});
test('Scripting process/module compatibility globals do not turn production startup into export-only mode',async()=>{const e=await env();e.store.write(e.state);e.store.release();e.sandbox.__NUFE_TEST__=false;await vm.runInNewContext('(async()=>{'+source+'\nawait globalThis.__NUFE_LAUNCH__;})()',e.sandbox);a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);});

test('Scripting 3.2.1 entry parses as an ordinary script without a module async wrapper',()=>{a.doesNotThrow(()=>new vm.Script(source));});
test('production ordinary-script entry runs even with process and module compatibility globals',async()=>{const e=await env();e.store.write(e.state);e.store.release();e.sandbox.__NUFE_TEST__=false;await vm.runInNewContext(source,e.sandbox);a.equal(e.notices.length,1);a.match(e.notices[0].title,/失败/);});
test('storage-constructor failures now reach startup error UI',async()=>{const e=await env(),alerts=[];e.store.release();e.sandbox.__sdk.FileManager.existsSync=()=>{throw new TypeError('private native detail must never be logged');};e.sandbox.__sdk.Dialog.alert=async o=>alerts.push(o);e.sandbox.__NUFE_TEST__=false;await vm.runInNewContext(source,e.sandbox);a.equal(alerts.length,1);a.match(alerts[0].title,/启动失败/);a.match(alerts[0].message,/STARTUP_TYPE/);a.doesNotMatch(alerts[0].message,/private native detail/);});
test('Notification schedules with specified identifier and trigger',async()=>{const e=await env();let scheduled=null;e.sandbox.__sdk.Notification.schedule=async o=>{scheduled=o;return 'notice-1';};const n=new e.m.ScriptingAdapter.Notification();n.identifier='nufe-test-123';n.title='Test';n.body='Body';n.setTriggerDate(new Date(Date.now()+60000));await n.schedule();a.equal(scheduled.identifier,'nufe-test-123');a.ok(scheduled.triggerDate||scheduled.trigger);});
test('VERIFIED_TERM_ANCHORS supports multiple academic years',async()=>{const {m}=await env();a.ok(m.VERIFIED_TERM_ANCHORS['2024-2025-1']);a.ok(m.VERIFIED_TERM_ANCHORS['2025-2026-1']);a.ok(m.VERIFIED_TERM_ANCHORS['2026-2027-1']);});
test('widget degrades gracefully when ListWidget is not defined',async()=>{const e=await env();e.sandbox.config.runsInWidget=true;await a.doesNotReject(async()=>{await e.m.run();});});

test('course location omits campus while preserving room or building',async()=>{const {m}=await env();a.equal(m.expand(raw([activity()]),161,'2026-09-07').events[0].location,'教A101');a.equal(m.expand(raw([activity({room:'',building:'德业楼'})]),161,'2026-09-07').events[0].location,'德业楼');});
test('manual refresh covers all school-listed semesters',async()=>{const {m}=await env();a.deepEqual(Array.from(m.selectTermIds({current:161,semesters:[{id:159},{id:160},{id:161},{id:158}]},{cursor:0},true)),[161,159,160,158]);});
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

test('renaming a bound calendar retains its identifier and existing state',async()=>{
 const e=await env({hostEnv:'index'});
 e.calendar.title='\u5357\u8d22\u8bfe\u8868';e.calendar.save=async()=>{};
 e.state.calendarId=e.calendar.identifier;e.store.write(e.state);
 const selected=await e.m.pickCalendar(e.state,e.store,false);
 a.equal(selected.identifier,'calendar-dedicated');
 a.equal(selected.title,'课表');
 a.equal(e.store.read().calendarId,'calendar-dedicated');
});
test('renamed calendar is selected using the stored identifier',async()=>{
 const e=await env();e.state.calendarId=e.calendar.identifier;e.calendar.title='课表';e.store.write(e.state);
 const picked=await e.m.pickCalendar(e.state,e.store,false);
 a.equal(picked.identifier,e.state.calendarId);
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

test('foreground management exposes locked-state recovery without waiting for acquire',async()=>{
 const e=await env({hostEnv:'index'});
 e.store.write(e.state);
 const lockPath=e.store.path('run-lock.json');
 const lockBefore=e.files.get(lockPath);
 const actions=[];
 let presented=0,confirmations=0;
 e.sandbox.Alert=class{
  constructor(){this.actions=[];}
  addAction(label){this.actions.push(label);}
  addCancelAction(){}
  async presentSheet(){actions.push(this.actions.slice());return [1,2,2][presented++]??-1;}
  async presentAlert(){return 0;}
 };
 e.sandbox.__sdk.Dialog.confirm=async()=>{confirmations++;return false;};
 await e.m.run();
 a.ok(actions[1].includes('更多操作'));
 a.ok(actions[2].includes('检查同步锁'));
 a.equal(confirmations,1);
 a.equal(e.files.get(lockPath),lockBefore);
 a.equal(e.requests.length,0);
});
test('verified cancellation leaves the original lock untouched',async()=>{
 const e=await env();
 const path=e.store.path('run-lock.json'),before=e.files.get(path);
 e.sandbox.__sdk.Dialog.confirm=async()=>false;
 await e.m.repairSyncLock(e.store);
 a.equal(e.files.get(path),before);
});
test('explicit user approval removes only unchanged lock, never the timetable',async()=>{
 const e=await env();const path=e.store.path('run-lock.json');
 e.store.write(e.state);
 e.sandbox.__sdk.Dialog.confirm=async()=>true;
 await e.m.repairSyncLock(e.store);
 a.equal(e.files.has(path),false);
 a.ok([...e.files.keys()].some(x=>x.endsWith('.json')));
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

test('password login contains no QR entry points',()=>{
 a.equal(source.includes('qrLogin('),false);
 a.equal(source.includes('qrCode/getToken'),false);
 a.equal(source.includes('QR_EXPIRED'),false);
 a.equal(source.includes('选择学校登录方式'),false);
});
test('credential form captures both fields before WebView dismissal',async()=>{
 const e=await env();let html='',presented=false,disposed=false,dismissed=false,handler=null,requestGuard=null;
 let afterDismissEvaluated=false;
 e.sandbox.__sdk.WebViewController=class{
  constructor(){this.shouldAllowRequest=null;}
  async addScriptMessageHandler(name,callback){a.equal(name,'nufeCredentials');handler=callback;}
  async loadHTML(page){html=page;requestGuard=this.shouldAllowRequest;return true;}
  async present(){presented=true;await handler({username:'  test-student  ',password:'test-password',remember:true});}
  async evaluateJavaScript(){afterDismissEvaluated=true;throw Error('must never evaluate after dismiss');}
  dismiss(){dismissed=true;}
  dispose(){disposed=true;}
 };
 const result=await e.m.credentialForm({title:'NUFE 登录',showRemember:true});
 a.equal(result.username,'test-student');a.equal(result.password,'test-password');a.equal(result.remember,true);
 a.equal(presented,true);a.equal(dismissed,true);a.equal(disposed,true);a.equal(afterDismissEvaluated,false);
 a.ok(html.includes('type="password"'));a.ok(html.includes('id="account"'));
 a.ok(html.includes('id="remember"'));a.ok(html.includes('nufeCredentials.postMessage'));
 a.equal(await requestGuard({url:'https://example.org'}),false);
 a.equal(await requestGuard({url:'about:blank'}),true);
});
test('closing the credential form without submitting cancels without saving',async()=>{
 const e=await env();
 e.sandbox.__sdk.WebViewController=class{
  async addScriptMessageHandler(){}
  async loadHTML(){return true;}
  async present(){}
  dispose(){}
 };
 await a.rejects(()=>e.m.credentialForm({showRemember:true}),code('CANCELLED'));
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
});
test('credential form without opt-in does not save to iCloud',async()=>{
 const e=await env();let handler;
 e.sandbox.__sdk.WebViewController=class{
  async addScriptMessageHandler(_name,callback){handler=callback;}
  async loadHTML(){return true;}
  async present(){await handler({username:'student',password:'pass',remember:false});}
  dismiss(){}
  dispose(){}
 };
 const result=await e.m.credentialForm({showRemember:true});
 a.equal(result.remember,false);
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
});

test('WebView initialization timeout safely falls back to native secure inputs',async()=>{
 const e=await env(),prompts=[];let disposed=false;
 e.sandbox.__sdk.WebViewController=class{
  async addScriptMessageHandler(){const x=new Error('WEBVIEW_TIMEOUT');x.code='WEBVIEW_TIMEOUT';throw x;}
  dispose(){disposed=true;}
 };
 e.sandbox.__sdk.Dialog.prompt=async o=>{prompts.push(o);return prompts.length===1?'student-id':'safe-password';};
 e.sandbox.__sdk.Dialog.confirm=async()=>false;
 const r=await e.m.credentialForm({showRemember:true});
 a.equal(r.username,'student-id');a.equal(r.password,'safe-password');a.equal(r.remember,false);
 a.equal(prompts.length,2);a.equal(prompts[1].obscureText,true);a.equal(disposed,true);
});

test('missing WebView message bridge uses native secure fields without crashing',async()=>{
 const e=await env();const prompts=[];
 e.sandbox.__sdk.WebViewController=class{dispose(){}};
 e.sandbox.__sdk.Dialog.prompt=async options=>{prompts.push(options);return prompts.length===1?'id':'pw';};
 const result=await e.m.credentialForm();
 a.equal(result.username,'id');a.equal(result.password,'pw');
 a.equal(prompts.length,2);
 a.equal(prompts[1].obscureText,true);
});
test('invalid message-bridge payload never dismisses or reveals credentials',async()=>{
 const e=await env();let handler,dismissed=false;
 e.sandbox.__sdk.WebViewController=class{
  async addScriptMessageHandler(_n,fn){handler=fn;}
  async loadHTML(){return true;}
  async present(){const result=await handler({username:'',password:'bad'});a.equal(result,false);}
  dismiss(){dismissed=true;}
  dispose(){}
 };
 await a.rejects(()=>e.m.credentialForm(),code('CANCELLED'));
 a.equal(dismissed,false);
 a.equal(e.keys.has('NUFE.Schedule.v1.icloud-credentials'),false);
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
 a.match(e.m.credentialStorageStatus(),/本机已读回 iCloud 可同步凭据/);
 a.match(e.m.credentialStorageStatus(),/其他设备尚未核验/);
 a.doesNotMatch(e.m.credentialStorageStatus(),/fake-password|school-id/);
});
test('credential status cannot claim success for invalid stored JSON',async()=>{
 const e=await env();
 e.keys.set('NUFE.Schedule.v1.icloud-credentials','{broken');
 a.match(e.m.credentialStorageStatus(),/数据异常/);
 a.doesNotMatch(e.m.credentialStorageStatus(),/本机已读回 iCloud 可同步凭据/);
});
test('credential status surfaces dual-key migration instead of hiding it',async()=>{
 const e=await env(),r=JSON.stringify({version:1,username:'test',password:'placeholder'});
 e.keys.set('NUFE.Local.v1.saved-login',r);
 e.keys.set('NUFE.Schedule.v1.icloud-credentials',r);
 a.match(e.m.credentialStorageStatus(),/同时存在旧本机凭据/);
});
