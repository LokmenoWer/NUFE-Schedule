// @ts-nocheck
// Modified 2026-11-02: fix post-dismiss WebView timeout with pre-dismiss message bridge and native credential fallback.
import * as Scripting from "scripting";
// Scripting 3.2.1-compatible entry: no top-level await; keep this file as index.tsx.
let __NUFE_BOOT_PHASE='初始化运行接口';
async function __NUFE_REPORT_STARTUP(error){
  const api=name=>Scripting[name]??globalThis[name];
  const known=error&&typeof error.code==='string'&&/^[A-Z][A-Z0-9_]{0,60}$/.test(error.code)?error.code:
    error&&error.name==='TypeError'?'STARTUP_TYPE':error&&error.name==='ReferenceError'?'STARTUP_REFERENCE':'STARTUP_FAILED';
  const message='阶段：'+__NUFE_BOOT_PHASE+'\n错误代码：'+known+'\n脚本尚未完成启动。请保留这段错误信息；不要分享密码或 Cookie。';
  console.error('[NUFE-Schedule] '+known+' · '+__NUFE_BOOT_PHASE);
  try{await api('Dialog').alert({title:'课表启动失败',message});}
  catch(_){try{await api('Notification').schedule({title:'NUFE 课表 · 启动失败',body:message,silent:true});}catch(__){}}
  try{api('Script').exit('刷新失败：'+known);}catch(_){}
}
async function __NUFE_START(){
  try{
    console.log('[NUFE-Schedule] 正在启动');
// @ts-nocheck

// NUFE-Schedule: foreground management and background shortcut synchronization.
// Only one runtime source file. No npm packages or third-party network services.
const hostAPI=name=>Scripting[name]??globalThis[name];
const HostScript=hostAPI('Script')||{},HostFiles=hostAPI('FileManager')||{},HostKeys=hostAPI('Keychain')||{};
const HostCalendar=hostAPI('Calendar')||{},HostEvent=hostAPI('CalendarEvent'),HostDialog=hostAPI('Dialog')||{};
const HostNotification=hostAPI('Notification')||{},hostFetch=hostAPI('fetch');
const __query=HostScript.queryParameters||{};
const __intent=hostAPI('Intent');
let __intentText='';try{const p=__intent?.shortcutParameter;if(p?.type==='text')__intentText=String(p.value||'');}catch(_){}
const __mode=String(__query.mode||__intentText||(HostScript.env==='index'?'menu':'sync')).trim().toLowerCase()==='menu'?'menu':'sync';
let __shortcutOutput=null;
const __webviews=new Set();
const config={runsInApp:HostScript.env==='index',runsInWidget:false,runsWithSiri:true};
const args={shortcutParameter:__mode==='menu'?'':'sync',widgetParameter:''};
const Script={name:()=>HostScript.name,setShortcutOutput:value=>{__shortcutOutput=String(value);},complete:()=>{
  for(const w of __webviews)try{w.dispose();}catch(_){}
  HostScript.exit(__intent?.text?__intent.text(__shortcutOutput||'处理完成'):__shortcutOutput);
}};
const FileManager={local:()=>({
  libraryDirectory:()=>HostFiles.appGroupDocumentsDirectory+'/NUFE-Local-Scripting',
  joinPath:(a,b)=>a.replace(/\/$/,'')+'/'+b,
  fileExists:p=>HostFiles.existsSync(p),createDirectory:(p,r)=>HostFiles.createDirectorySync(p,r),
  listContents:p=>HostFiles.readDirectorySync(p,false).map(n=>String(n).split('/').pop()),readString:p=>HostFiles.readAsStringSync(p),
  writeString:(p,text)=>HostFiles.writeAsStringSync(p,text),remove:p=>HostFiles.removeSync(p),
  move:(from,to)=>{if(HostFiles.existsSync(to)){const e=new Error('BUSY');e.code='BUSY';throw e;}HostFiles.renameSync(from,to);}
})};
const __keyOptions={synchronizable:false,accessibility:'first_unlock_this_device'};
const Keychain={
 contains:key=>HostKeys.contains(key,{synchronizable:false}),get:key=>HostKeys.get(key,{synchronizable:false}),
 set:(key,value)=>{if(HostKeys.set(key,value,__keyOptions)!==true||HostKeys.get(key,{synchronizable:false})!==value){const e=new Error('CREDENTIALS_UNAVAILABLE');e.code='CREDENTIALS_UNAVAILABLE';throw e;}},
 remove:key=>{if(HostKeys.remove(key,{synchronizable:false})!==true){const e=new Error('CREDENTIALS_UNAVAILABLE');e.code='CREDENTIALS_UNAVAILABLE';throw e;}}
};
// Only account/password credentials use iCloud Keychain. Session cookies,
// person IDs, fingerprints and the original local keys remain device-only.
const __cloudOptions={synchronizable:true,accessibility:'first_unlock'};
const CloudKeychain={
  contains:key=>HostKeys.contains(key,{synchronizable:true}),
  get:key=>HostKeys.get(key,{synchronizable:true}),
  set:(key,value)=>{
    if(HostKeys.set(key,value,__cloudOptions)!==true||
       HostKeys.get(key,{synchronizable:true})!==value){
      const e=new Error('CREDENTIALS_UNAVAILABLE');e.code='CREDENTIALS_UNAVAILABLE';throw e;
    }
  },
  remove:key=>{
    if(HostKeys.remove(key,{synchronizable:true})!==true){
      const e=new Error('CREDENTIALS_UNAVAILABLE');e.code='CREDENTIALS_UNAVAILABLE';throw e;
    }
  }
};
const UUID=hostAPI('UUID');
const Timer={schedule:(ms,repeats,callback)=>{const id=repeats?setInterval(callback,ms):setTimeout(callback,ms);return {invalidate:()=>repeats?clearInterval(id):clearTimeout(id)};}};
const Calendar={forEvents:()=>HostCalendar.forEvents(),presentPicker:multiple=>HostCalendar.presentChooser(multiple)};
function CalendarEvent(){return new HostEvent();}
CalendarEvent.between=(from,to,calendars)=>HostEvent.getAll(from,to,calendars);
class Alert{
 constructor(){this.title='';this.message='';this.actions=[];this.fields=[];this.values=[];this.cancel=false;this.cancelLabel='取消';}
 addAction(label){this.actions.push({label});}addDestructiveAction(label){this.actions.push({label,destructive:true});}
 addCancelAction(label){this.cancel=true;this.cancelLabel=label;}
 addTextField(placeholder,value=''){this.fields.push({placeholder,value,secure:false});}
 addSecureTextField(placeholder,value=''){this.fields.push({placeholder,value,secure:true});}
 textFieldValue(i){return this.values[i]??'';}
 async presentSheet(){const n=await HostDialog.actionSheet({title:this.title,message:this.message,actions:this.actions,cancelButton:this.cancel});return n==null?-1:n;}
 async presentAlert(){
   if(this.fields.length){const f=this.fields[0];const value=await HostDialog.prompt({title:this.title,message:this.message,placeholder:f.placeholder,defaultValue:f.value,obscureText:f.secure,cancelLabel:this.cancelLabel,confirmLabel:this.actions[0]?.label||'继续'});if(value===null)return -1;this.values=[value];return 0;}
   if(this.cancel&&this.actions.length===1)return await HostDialog.confirm({title:this.title,message:this.message,cancelLabel:this.cancelLabel,confirmLabel:this.actions[0].label})?0:-1;
   if(this.actions.length>1)return this.presentSheet();
   await HostDialog.alert({title:this.title,message:this.message,buttonLabel:this.actions[0]?.label||'好'});return 0;
 }
}
class Request{
 constructor(url){this.url=url;this.method='GET';this.headers={};this.timeoutInterval=15;this.body=null;this.onRedirect=null;}
 async execute(binary){
   const r=await hostFetch(this.url,{method:this.method,headers:this.headers,...(this.body?{body:this.body}:{}),timeout:this.timeoutInterval,allowInsecureRequest:false,
     debugLabel:'NUFE 官方服务请求',handleRedirect:async next=>{if(this.onRedirect)this.onRedirect(next);return null;}});
   const headers={};r.headers.forEach((value,name)=>{headers[name]=value;});
   this.response={statusCode:r.status,headers,cookies:r.cookies||[],mimeType:r.mimeType||r.headers.get('content-type')||''};
   return binary?await r.data():await r.text();
 }
 async loadString(){return this.execute(false);}async load(){return this.execute(true);}
}
class WebView{
 constructor(){this.inner=new (hostAPI('WebViewController'))({ephemeral:true});__webviews.add(this.inner);}
 set shouldAllowRequest(fn){this.inner.shouldAllowRequest=async req=>!!fn(req);}
 async loadHTML(html){if(!await this.inner.loadHTML(html))fail('WEBVIEW_LOAD_FAILED');}
 async evaluateJavaScript(js){return this.inner.evaluateJavaScript('return ('+js+');');}
 async present(title='NUFE 验证'){await this.inner.present({navigationTitle:title});}
}
class Notification{
 constructor(){this.identifier='';this.title='';this.body='';this.sound=null;this.openURL=null;this.triggerDate=null;}
 setTriggerDate(date){this.triggerDate=date;}
 async schedule(){
   const options={title:this.title,body:this.body,silent:this.sound===null,threadIdentifier:'NUFE-Local-refresh',tapAction:{type:'openURL',url:this.openURL||HostScript.createRunURLScheme(HostScript.name,{mode:'menu'})}};
   if(this.identifier)options.identifier=this.identifier;
   if(this.triggerDate){
     const diff=Math.max(1,Math.round((this.triggerDate.getTime()-Date.now())/1000));
     const Trigger=hostAPI('TimeIntervalNotificationTrigger');
     if(Trigger)options.trigger=new Trigger({timeInterval:diff,repeats:false});
     else options.triggerDate=this.triggerDate;
   }
   return HostNotification.schedule(options);
 }
 static async allPending(){const rows=await HostNotification.getAllPendingsOfCurrentScript();return rows.map(r=>({identifier:r.identifier,body:r.content?.body||'',nextTriggerDate:r.trigger?.date||null}));}
 static async removePending(ids){if(ids.length)await HostNotification.removePendings(ids);}
}
const Data=hostAPI('Data'),Image={fromData:data=>hostAPI('UIImage').fromData(data)};
const QuickLook={present:image=>hostAPI('QuickLook').previewImage(image)};
const ShareSheet={present:paths=>hostAPI('DocumentPicker').exportFiles({files:paths.map(path=>({name:path.split('/').pop(),data:Data.fromFile(path)}))})};
// END SCRIPTING ADAPTER

// SPDX-License-Identifier: GPL-3.0-only
// NUFE-Schedule (native Scripting adapter and calendar core). Derived protocol/slider logic: LokmenoWer/nufe-kebiao
// upstream 92d6d1ba7acd86f138654e984c77bd816e5da318. See embedded GPL license at file end.
// No remote dependencies. Opt-in credentials are stored in Scripting Keychain only, never files or logs.
/* NUFE-Schedule：index.tsx 提供前台管理，intent.tsx 提供快捷指令后台同步。
 * 使用 Scripting「运行意图脚本」触发同步，无需通过 URL 唤起 App。
 * 专用日历模式：用户授权清理绑定日历内旧导入内容；请勿绑定含个人活动的混合日历。
 * 新课表写入核验后自动备份并清理扫描范围内的无本安装标记事件（含旧循环课）。
 * 系列删除可能影响范围外的同系列课程，但不会跨日历；RRULE/提醒无法完整备份。
 * 本地模拟测试不等于 iPhone 实测。iCloud 来源需用户在 Apple 日历确认。
 * 源码 GPL-3.0-only；来源说明及许可证信息见原有版权声明与仓库 LICENSE；上游仓库 https://github.com/LokmenoWer/nufe-kebiao
 */
'use strict';
// This deployment is explicitly authorized for a disposable, dedicated timetable calendar.
const REPLACE_DEDICATED_LEGACY = true;
const AUTH = 'https://authserver.nufe.edu.cn/authserver';
const JW = 'https://jwxt.nufe.edu.cn';
const TABLE = JW + '/student/for-std/course-table';
const SSO = JW + '/student/sso/login';
const KEY = 'NUFE.Local.v1.cookies';
// Scripting Keychain is device/app-level credential storage; never store this key in JSON state.
const CRED_KEY = 'NUFE.Local.v1.saved-login'; // Legacy device-only credential key.
const CLOUD_CRED_KEY = 'NUFE.Schedule.v1.icloud-credentials';
function credentialRecord(raw){
  let saved;try{saved=JSON.parse(raw);}catch(_){fail('CREDENTIALS_INVALID');}
  if(!saved||saved.version!==1||typeof saved.username!=='string'||typeof saved.password!=='string'||
     !/^.{1,100}$/.test(saved.username)||!saved.password||saved.password.length>512)fail('CREDENTIALS_INVALID');
  return saved;
}
function localCredentialRaw(){return Keychain.contains(CRED_KEY)?Keychain.get(CRED_KEY):null;}
function cloudCredentialRaw(){return CloudKeychain.contains(CLOUD_CRED_KEY)?CloudKeychain.get(CLOUD_CRED_KEY):null;}
function hasSavedCredentials(){
  try{
    if(Keychain.contains(CRED_KEY))return true; // Retain login during migration/offline sync.
    return CloudKeychain.contains(CLOUD_CRED_KEY);
  }catch(_){fail('CREDENTIALS_UNAVAILABLE');}
}
function readSavedCredentials(){
  // A pre-migration device keeps using its own account if a different Apple ID
  // credential appears in iCloud. Never silently switch an existing account.
  let raw;
  try{raw=localCredentialRaw()||cloudCredentialRaw();}catch(_){fail('CREDENTIALS_UNAVAILABLE');}
  return raw===null?null:credentialRecord(raw);
}
function migrateSavedCredentials(){
  // Safe lazy migration: never remove the old local value before a verified
  // synchronized read-back. A mismatch with an existing cloud account is
  // reported rather than overwritten by an automatic background run.
  const local=localCredentialRaw();
  if(!local)return 'cloud-or-empty';
  credentialRecord(local);
  let remote=cloudCredentialRaw();
  if(remote&&remote!==local)return 'conflict';
  if(!remote){CloudKeychain.set(CLOUD_CRED_KEY,local);remote=cloudCredentialRaw();}
  if(remote!==local)fail('CREDENTIALS_UNAVAILABLE');
  Keychain.remove(CRED_KEY);
  return 'migrated';
}
function saveCredentials(username,password){
  username=String(username||'').trim();
  if(!username||username.length>100||typeof password!=='string'||!password||password.length>512)fail('CREDENTIALS_INVALID');
  const value=JSON.stringify({version:1,username,password});
  // Store ONLY the selected credentials in iCloud, never the session cookies.
  try{
    CloudKeychain.set(CLOUD_CRED_KEY,value);
    if(Keychain.contains(CRED_KEY)){
      // Avoid a stale local value shadowing the newly saved cloud password.
      Keychain.set(CRED_KEY,value);
      Keychain.remove(CRED_KEY);
    }
  }catch(_){fail('CREDENTIALS_UNAVAILABLE');}
}
function removeSavedCredentials(){
  try{
    // Deleting a synchronized item also deletes the other devices' copies.
    if(CloudKeychain.contains(CLOUD_CRED_KEY))CloudKeychain.remove(CLOUD_CRED_KEY);
    if(Keychain.contains(CRED_KEY))Keychain.remove(CRED_KEY);
  }catch(_){fail('CREDENTIALS_UNAVAILABLE');}
}
function maskedAccount(username){const s=String(username||'');if(s.length<5)return '已设置（隐藏）';return s.slice(0,2)+'***'+s.slice(-2);}

const DAY = 86400000;
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function assert(ok, code = 'SCHEMA') { if (!ok) fail(code); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function uuid() { return UUID.string().toLowerCase(); }
function enc(x) { return encodeURIComponent(String(x)); }
function form(o) { return Object.entries(o).map(([k,v]) => enc(k)+'='+enc(v)).join('&'); }
// Scripting's Request timeout covers idle network time, not every WebView or total request wait.
// This timeout also bounds local WebView work, so a stuck WebKit process shows an error.
async function bounded(p, milliseconds, code) {
  let timer=null;
  const alarm=new Promise((_,reject)=>{timer=Timer.schedule(milliseconds,false,()=>{const e=new Error(code);e.code=code;reject(e);});});
  try{return await Promise.race([p,alarm]);}
  finally{if(timer&&typeof timer.invalidate==='function')timer.invalidate();}
}
function safeURL(s) {
  // Deliberately strict: credentials, alternate ports, encoded hosts, HTTP rejected.
  const m = /^https:\/\/(authserver\.nufe\.edu\.cn|jwxt\.nufe\.edu\.cn)(\/[^\s\\#]*)?$/.exec(s);
  assert(m, 'DOMAIN_BLOCKED');
  return {host:m[1], path:(m[2] || '/').split('?')[0]};
}
function resolveURL(base, loc) {
  if (/^https:\/\//.test(loc)) { safeURL(loc); return loc; }
  assert(!/^[a-z]+:|^\/\/|[\\\r\n]/i.test(loc),'DOMAIN_BLOCKED');
  const host = safeURL(base).host;
  let path = loc.startsWith('/') ? loc : loc.startsWith('?') ? safeURL(base).path+loc : safeURL(base).path.replace(/[^/]*$/, '')+loc;
  const parts=[];
  for(const p of path.split('/')) { if(p==='..') parts.pop(); else if(p!=='.') parts.push(p); }
  const out='https://'+host+parts.join('/'); safeURL(out); return out;
}
function topId(html, name) {
  const m = new RegExp('\\b'+name+'\\s*=\\s*\\{').exec(html); if(!m) return null;
  let depth=0, quote=null;
  for(let i=m.index+m[0].length-1; i<html.length; i++) {
    const c=html[i];
    if(quote) { if(c==='\\') i++; else if(c===quote) quote=null; }
    else if(c==='"'||c==="'") { quote=c; if(depth===1) { const k=/^(['"])id\1\s*:\s*(\d+)/.exec(html.slice(i)); if(k)return +k[2]; } }
    else if(c==='{')depth++; else if(c==='}'&&--depth===0)break;
  } return null;
}
function pageInfo(html) {
  const p=/\bpersonId\s*=\s*(\d+)/.exec(html), sid=topId(html,'currentSemester');
  assert(p&&sid,'AUTH_REQUIRED');
  const select=/<select\b[^>]*id=["']allSemesters["'][^>]*>([\s\S]*?)<\/select>/i.exec(html);
  const semesters=[]; if(select)for(const m of select[1].matchAll(/<option\b[^>]*value=["'](\d+)["'][^>]*>([^<]*)<\/option>/g))semesters.push({id:+m[1],name:m[2].trim()});
  if(!semesters.some(s=>s.id===sid))semesters.unshift({id:sid,name:String(sid)});
  return {person:p[1],current:sid,semesters};
}
function hm(s) { const m=/^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(s)); assert(m&&+m[1]<24&&+m[2]<60,'TIME_MISSING'); return m[1].padStart(2,'0')+':'+m[2]; }
function monday(s) { assert(/^\d{4}-\d{2}-\d{2}$/.test(s),'ANCHOR'); const d=new Date(s+'T00:00:00Z'); assert(Number.isFinite(+d)&&d.toISOString().slice(0,10)===s&&d.getUTCDay()===1,'ANCHOR'); return s; }
function detailMonday(detail) {
  for(const k of ['startDate','beginDate','startOn','start']) {
    const v=detail&&detail[k]; if(typeof v!=='string')continue;
    const s=v.slice(0,10), d=new Date(s+'T00:00:00Z');
    if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)continue;
    d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); return d.toISOString().slice(0,10);
  } return null;
}
function expand(raw, sid, anchor) {
  monday(anchor);
  assert(raw&&Array.isArray(raw.studentTableVms)&&raw.studentTableVms.length===1,'SCHEMA');
  const vm=raw.studentTableVms[0]; assert(vm&&Array.isArray(vm.activities),'SCHEMA');
  const acts=vm.activities, starts={}, ends={};
  for(const a of acts) { assert(a&&typeof a==='object','SCHEMA'); if(a.startTime) {const t=hm(a.startTime); if(starts[a.startUnit]&&starts[a.startUnit]!==t)starts[a.startUnit]='conflict'; else starts[a.startUnit]=t;} if(a.endTime){const t=hm(a.endTime);if(ends[a.endUnit]&&ends[a.endUnit]!==t)ends[a.endUnit]='conflict';else ends[a.endUnit]=t;} }
  const events=[], skipped=[];
  for(const a of acts) {
    if(!a.weekday&&!a.startUnit) {skipped.push(String(a.courseName||'未排课'));continue;}
    const wd=Number(a.weekday),su=Number(a.startUnit),eu=Number(a.endUnit||a.startUnit);
    assert(Number.isInteger(wd)&&wd>=1&&wd<=7&&Number.isInteger(su)&&su>=1&&Number.isInteger(eu)&&eu>=su,'SCHEMA');
    assert(typeof a.courseName==='string'&&a.courseName.trim()&&Array.isArray(a.weekIndexes)&&a.weekIndexes.length,'SCHEMA');
    const st=hm(a.startTime||starts[su]), et=hm(a.endTime||ends[eu]);assert(et>st,'TIME_MISSING');
    const weeks=[...new Set(a.weekIndexes.map(Number))].sort((a,b)=>a-b);
    assert(weeks.every(w=>Number.isInteger(w)&&w>=1&&w<=60),'SCHEMA');
    assert(a.teachers==null||Array.isArray(a.teachers),'SCHEMA');
    const teachers=(a.teachers||[]).map(t=>String(typeof t==='object'&&t ? t.name||t.teacherName||'':t||'').replace(/\s*[(（].*$/,'').trim()).filter(Boolean).sort();
    for(const week of weeks) {
      const date=new Date(Date.parse(anchor+'T00:00:00Z')+((week-1)*7+wd-1)*DAY).toISOString().slice(0,10);
      events.push({sid:String(sid),title:a.courseName.trim(),week,su,eu,start:new Date(date+'T'+st+':00+08:00').toISOString(),end:new Date(date+'T'+et+':00+08:00').toISOString(),location:[a.room||a.building].filter(Boolean).join(' '),teachers});
    }
  }
  events.sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title)||a.location.localeCompare(b.location));
  // Duplicate records cannot be distinguished safely without an authoritative instance ID.
  const signatures=events.map(e=>JSON.stringify(e));assert(new Set(signatures).size===events.length,'DUPLICATE_SOURCE');
  return {events,skipped,studentCode:String(vm.code||'')};
}
function same(a,b) { return ['sid','title','start','end','location','week','su','eu'].every(k=>a[k]===b[k])&&JSON.stringify(a.teachers)===JSON.stringify(b.teachers); }
function plan(old, incoming, newId) {
  const out=incoming.map(x=>({...x})), used=new Set(), paired=new Set(), inferred=[], ambiguous=[];
  function pair(oi,ni,guess=false) {out[ni].id=old[oi].id;used.add(oi);paired.add(ni);if(guess)inferred.push(out[ni].id);}
  // Match exact name+time first, irrespective of room / teacher changes.
  for(let n=0;n<out.length;n++) {
    const matches=old.map((o,i)=>({o,i})).filter(({o,i})=>!used.has(i)&&o.sid===out[n].sid&&o.title===out[n].title&&o.start===out[n].start&&o.end===out[n].end);
    if(matches.length===1)pair(matches[0].i,n);
  }
  const names=new Set(out.map(e=>e.sid+'\0'+e.title));
  for(const key of names) {
    let ns=out.map((e,i)=>i).filter(i=>!paired.has(i)&&out[i].sid+'\0'+out[i].title===key);
    let os=old.map((e,i)=>i).filter(i=>!used.has(i)&&old[i].sid+'\0'+old[i].title===key);
    // One unmatched instance in the same teaching week is an explainable inference.
    for(const week of new Set(ns.map(i=>out[i].week))) {
      const nn=ns.filter(i=>out[i].week===week),oo=os.filter(i=>old[i].week===week);
      if(nn.length===1&&oo.length===1)pair(oo[0],nn[0],true);
    }
    ns=ns.filter(i=>!paired.has(i));os=os.filter(i=>!used.has(i));
    if(ns.length===1&&os.length===1&&Math.abs(Date.parse(out[ns[0]].start)-Date.parse(old[os[0]].start))<=14*DAY)pair(os[0],ns[0],true);
    else if(ns.length&&os.length)ambiguous.push(key.split('\0')[1]);
  }
  out.forEach(e=>{if(!e.id)e.id=newId();});
  return {events:out,added:out.filter(e=>!old.some(o=>o.id===e.id)),removed:old.filter((e,i)=>!used.has(i)),changed:out.filter(e=>{const o=old.find(o=>o.id===e.id);return o&&!same(o,e);}),inferred,ambiguous};
}
// AES key expansion + AES-CBC/PKCS#7, tested against Node's crypto for 128/192/256 bits.
function utf8(s) { return Array.from(unescape(encodeURIComponent(s)),c=>c.charCodeAt(0)); }
function b64(bytes) { const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=chars[n>>>18]+chars[(n>>>12)&63]+(i+1<bytes.length?chars[(n>>>6)&63]:'=')+(i+2<bytes.length?chars[n&63]:'=');}return out; }
function aesCBC(message,keyString,ivString) {
  const key=utf8(keyString),iv=utf8(ivString);assert([16,24,32].includes(key.length)&&iv.length===16,'CRYPTO');
  const mul=(a,b)=>{let r=0;for(let i=0;i<8;i++){if(b&1)r^=a;a=((a<<1)^((a&128)?0x11b:0))&255;b>>=1;}return r;};
  const sb=Array.from({length:256},(_,a)=>{let v=0;if(a){v=1;for(let i=0;i<254;i++)v=mul(v,a);}let s=v;for(let i=1;i<5;i++)s^=((v<<i)|(v>>>(8-i)))&255;return s^0x63;});
  const nr=key.length/4+6,w=key.slice();let rc=1;
  while(w.length<16*(nr+1)){let t=w.slice(-4),i=w.length;if(i%key.length===0){t=[sb[t[1]]^rc,sb[t[2]],sb[t[3]],sb[t[0]]];rc=mul(rc,2);}else if(key.length===32&&i%32===16)t=t.map(x=>sb[x]);for(let j=0;j<4;j++)w.push(w[i-key.length+j]^t[j]);}
  const data=utf8(message),pad=16-data.length%16;data.push(...Array(pad).fill(pad));let prev=iv,out=[];
  for(let offset=0;offset<data.length;offset+=16){let s=data.slice(offset,offset+16).map((x,i)=>x^prev[i]^w[i]);for(let r=1;r<=nr;r++){s=s.map(x=>sb[x]);const before=s.slice();for(let col=0;col<4;col++)for(let row=0;row<4;row++)s[4*col+row]=before[4*((col+row)%4)+row];if(r!==nr)for(let c=0;c<16;c+=4){const [a,b,d,e]=s.slice(c,c+4);s.splice(c,4,mul(a,2)^mul(b,3)^d^e,a^mul(b,2)^mul(d,3)^e,a^b^mul(d,2)^mul(e,3),mul(a,3)^b^d^mul(e,2));}s=s.map((x,i)=>x^w[16*r+i]);}out.push(...s);prev=s;}return b64(out);
}
async function encryptPassword(password,salt){
  assert(globalThis.crypto&&typeof globalThis.crypto.getRandomValues==='function','CRYPTO');
  const bytes=new Uint8Array(80);globalThis.crypto.getRandomValues(bytes);
  const chars='ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  const random=Array.from(bytes,x=>chars[x%chars.length]).join('');
  return aesCBC(random.slice(0,64)+password,salt.trim(),random.slice(64));
}
// A server may emit several Set-Cookie headers, including attributes with commas
// in their Expires dates. Do not treat the entire header as a single cookie.
function splitSetCookie(value) {
  if(Array.isArray(value))return value.flatMap(splitSetCookie);
  if(typeof value!=='string')return [];
  return value.split(/\r?\n(?=\s*(?:set-cookie:\s*)?[^=;,\s]+=)/i)
    .flatMap(line=>line.replace(/^\s*set-cookie:\s*/i,'').split(/,(?=\s*[^;,=\s]+=)/))
    .map(s=>s.trim()).filter(Boolean);
}
function cookieDomain(raw) {
  if(typeof raw!=='string')return '';
  return raw.trim().replace(/^"|"$/g,'').replace(/^\./,'').toLowerCase();
}
function allowedCookieDomain(issuer,domain) {
  // Domain=scoped cookies may cover the NUFE parent domain or one of the
  // two explicitly trusted servers, and must domain-match their issuer.
  return ['nufe.edu.cn','authserver.nufe.edu.cn','jwxt.nufe.edu.cn'].includes(domain)&&
    (issuer===domain||issuer.endsWith('.'+domain));
}
class CookieJar {
  constructor(cookies=[]) {this.cookies=cookies;this.rejected=0;this.lastRejected=0;}
  ingest(url,headers,native=[]) {
    const u=safeURL(url),key=Object.keys(headers).find(k=>k.toLowerCase()==='set-cookie');
    const raw=key?splitSetCookie(headers[key]):[];
    let accepted=0,rejected=0;
    const accept=c=>{
      const domain=cookieDomain(c.domain);
      if(!allowedCookieDomain(u.host,domain)||!c.name||typeof c.name!=='string'||
         typeof c.value!=='string'||!/^[^\x00-\x20\x7f()<>@,;:\\"/\[\]?={}]+$/.test(c.name)||
         /[\x00-\x1f\x7f;\r\n]/.test(c.value)||!c.path||!c.path.startsWith('/')){
        rejected++;return;
      }
      this.set({...c,domain});accepted++;
    };
    if(raw.length) {
      for(const line of raw) {
        const parts=line.split(';'),match=/^\s*([^=\s]+)=(.*)$/.exec(parts.shift());
        if(!match){rejected++;continue;}
        const c={name:match[1],value:match[2],domain:u.host,hostOnly:true,
          path:u.path.slice(0,u.path.lastIndexOf('/'))||'/',expires:0};
        let age=null;
        for(const part of parts) {
          const p=part.trim(),i=p.indexOf('='),k=(i<0?p:p.slice(0,i)).trim().toLowerCase(),v=i<0?'':p.slice(i+1).trim();
          if(k==='domain'){c.domain=v;c.hostOnly=false;}
          if(k==='path'&&v.startsWith('/'))c.path=v;
          if(k==='max-age'&&/^-?\d+$/.test(v))age=Number(v);
          if(k==='expires'&&Number.isFinite(Date.parse(v)))c.expires=Date.parse(v);
        }
        if(age!==null)c.expires=Date.now()+age*1000;
        accept(c);
      }
    }else if(Array.isArray(native)) {
      // When Scripting hides Set-Cookie, use its parsed cookies instead.
      // In particular, preserve parent-domain cookies so CAS can hand the
      // authenticated session back to the course system.
      for(const c of native) {
        if(!c||typeof c!=='object'){rejected++;continue;}
        const domain=cookieDomain(c.domain||u.host);
        const validDate=c.expiresDate?Date.parse(c.expiresDate):NaN;
        accept({name:c.name,value:c.value,domain,
          hostOnly:domain!==u.host?false:true,path:c.path||'/',
          expires:Number.isFinite(validDate)?validDate:0});
      }
    }
    this.rejected+=rejected;this.lastRejected=rejected;
    return {accepted,rejected};
  }
  set(c) {assert(typeof c.name==='string'&&typeof c.value==='string'&&!/[\r\n;]/.test(c.name+c.value),'COOKIE_FORMAT');this.cookies=this.cookies.filter(x=>!(x.name===c.name&&x.domain===c.domain&&x.path===c.path));if(!c.expires||c.expires>Date.now())this.cookies.push(c);}
  header(url) {const u=safeURL(url);return this.cookies.filter(c=>(!c.expires||c.expires>Date.now())&&(c.hostOnly?u.host===c.domain:u.host===c.domain||u.host.endsWith('.'+c.domain))&&(u.path===c.path||u.path.startsWith(c.path.endsWith('/')?c.path:c.path+'/'))).sort((a,b)=>b.path.length-a.path.length).map(c=>c.name+'='+c.value).join('; ');}
}
// Request progress must not contain query strings, account IDs, tokens or cookies.
function requestLabel(url) {
  const u=safeURL(url),p=u.path;
  const host=u.host==='authserver.nufe.edu.cn'?'认证服务器':'教务系统';
  const steps=[['/checkNeedCaptcha.htl','检查验证码'],['/bfp/info','注册设备'],['/student/sso/login','单点登录'],['/student/for-std/course-table','课表入口'],['/login','提交认证'],['/getCaptcha.htl','图形验证码'],['/print-data','读取课表数据'],['/semester/get/','读取学期信息']];
  return host+' · '+((steps.find(([part])=>p.includes(part))||[])[1]||'安全请求');
}
function networkErrorCode(error) {
  // Only check fixed OS error classes. Never store raw native error strings.
  const message=String(error&&error.message||'');
  if(/-1009\b|offline|internet connection appears to be offline/i.test(message))return 'NETWORK_OFFLINE';
  if(/-1003\b|could not find the server|dns|host not found/i.test(message))return 'NETWORK_DNS';
  if(/-1200\b|certificate|ssl|tls/i.test(message))return 'NETWORK_TLS';
  if(/-1005\b|connection was lost|connection reset/i.test(message))return 'NETWORK_LOST';
  if(/-1001\b|timed out|timeout/i.test(message))return 'NETWORK_TIMEOUT';
  return 'NETWORK';
}
class HTTP {
  constructor(jar,persist=()=>{},before=()=>{},trace=()=>{}) {this.jar=jar;this.persist=persist;this.before=before;this.trace=trace;this.last=0;}
  async get(url,opt={}) {
    let method=opt.body?'POST':'GET',body=opt.body||null;
    const started=Date.now(),chainLimit=75000;
    for(let hop=0;hop<12;hop++) {
      if(Date.now()-started>=chainLimit)fail('NETWORK_CHAIN_TIMEOUT');
      safeURL(url);this.before();this.trace('发送 '+method+' '+requestLabel(url));
      const wait=1050-(Date.now()-this.last);
      if(wait>0)await bounded(new Promise(r=>Timer.schedule(wait,false,r)),Math.min(3000,chainLimit-(Date.now()-started)),'NETWORK_CHAIN_TIMEOUT');
      this.last=Date.now();
      const req=new Request(url);req.method=method;req.timeoutInterval=15;req.allowInsecureRequest=false;
      req.headers={Accept:opt.binary?'image/*':'application/json, text/html;q=0.9, */*;q=0.8',Cookie:this.jar.header(url)};
      if(opt.ajax)req.headers['X-Requested-With']='XMLHttpRequest';
      if(body){req.body=body;req.headers['Content-Type']='application/x-www-form-urlencoded';}
      let redirect=null;req.onRedirect=r=>{redirect=r.url;return null;};
      const remaining=chainLimit-(Date.now()-started);
      if(remaining<=0)fail('NETWORK_CHAIN_TIMEOUT');
      let value;try{value=await bounded(opt.binary?req.load():req.loadString(),Math.min(25000,remaining),'NETWORK_TIMEOUT');}
      catch(e){if(e.code==='NETWORK_TIMEOUT')fail(remaining<=25000?'NETWORK_CHAIN_TIMEOUT':'NETWORK_TIMEOUT');fail(networkErrorCode(e));}
      const res=req.response;assert(res,'NETWORK');this.trace('收到 HTTP '+res.statusCode+' '+requestLabel(url));const cookieStatus=this.jar.ingest(url,res.headers||{},res.cookies||[]);if(cookieStatus.rejected)this.trace('已安全忽略 '+cookieStatus.rejected+' 条不符合域名或格式规则的 Cookie（内容未记录）');this.persist(this.jar.cookies);
      if(res.statusCode>=300&&res.statusCode<400){const k=Object.keys(res.headers||{}).find(k=>k.toLowerCase()==='location');const target=redirect||(k&&res.headers[k]);assert(target,'REDIRECT');const next=resolveURL(url,target);if([307,308].includes(res.statusCode)&&body&&safeURL(next).host!==safeURL(url).host)fail('DOMAIN_BLOCKED');if(res.statusCode===303||([301,302].includes(res.statusCode)&&method==='POST')){method='GET';body=null;}url=next;continue;}
      if(res.statusCode===401||res.statusCode===403)fail('AUTH_REQUIRED');assert(res.statusCode>=200&&res.statusCode<300,'HTTP_'+res.statusCode);
      if(typeof value==='string')assert(value.length<=2*1024*1024,'TOO_LARGE');
      return {url,text:value,response:res};
    }fail('REDIRECT');
  }
  async json(url,opt={}) {const r=await this.get(url,{ajax:true,...opt});if(safeURL(r.url).host==='authserver.nufe.edu.cn'||safeURL(r.url).path==='/student/login')fail('AUTH_REQUIRED');try{return JSON.parse(r.text);}catch(_){fail('SCHEMA');}}
  async authJSON(url,opt={}) {const r=await this.get(url,{ajax:true,...opt});try{return JSON.parse(r.text);}catch(_){fail('SCHEMA');}}
}
async function input(title,label,secure=false) {const a=new Alert();a.title=title;if(secure)a.addSecureTextField(label);else a.addTextField(label);a.addAction('继续');a.addCancelAction('取消');if(await a.presentAlert()<0)fail('CANCELLED');return a.textFieldValue(0);}
async function confirm(title,message) {const a=new Alert();a.title=title;a.message=message;a.addAction('确认');a.addCancelAction('取消');return await a.presentAlert()===0;}
async function notice(title,message) {const a=new Alert();a.title=title;a.message=message;a.addAction('好');await a.presentAlert();}
// Read known login-form inputs as inert text; no WebView, no embedded page scripts.
// Values are decoded only after selection. Never log or persist form fields.
function htmlAttributeValue(value) {
  return String(value||'').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt|nbsp);/gi,(_,entity)=>{
    const e=entity.toLowerCase();
    if(e[0]==='#'){const n=e[1]==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return Number.isInteger(n)&&n>=0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'\uFFFD';}
    return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[e];
  });
}
function attributes(tag) {
  const attrs={};
  for(const m of tag.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const key=m[1].toLowerCase();if(!Object.prototype.hasOwnProperty.call(attrs,key))attrs[key]=htmlAttributeValue(m[2]??m[3]??m[4]??'');
  }
  return attrs;
}
function inputs(html){return [...html.matchAll(/<input\b[^>]*>/gi)].map(m=>attributes(m[0]));}
async function fieldsFrom(html,id) {
  // Limit the HTML parser to a document-sized page, never execute or load its resources.
  assert(typeof html==='string'&&html.length<=2*1024*1024,'LOGIN_SCHEMA');
  const forms=[...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi)];
  const match=forms.find(m=>attributes(m[0].match(/^<form\b[^>]*>/i)[0]).id===id);
  if(!match)return null;
  const body=match?match[0]:html;
  const selected=inputs(body),all=body===html?selected:inputs(html),out={};
  for(const v of selected)if(v.name)out[v.name]=v.value||'';
  const lookup=(attr,v)=>selected.find(x=>x[attr]===v)||all.find(x=>x[attr]===v);
  const salt=lookup('id','pwdEncryptSalt');if(salt)out.salt=salt.value||'';
  for(const name of ['execution','lt'])if(!out[name]){const x=lookup('name',name);if(x)out[name]=x.value||'';}
  return out;
}
// Compact, local-only credential entry. No school webpage or third-party URL
// is loaded. Password stays hidden and the ephemeral view is disposed promptly.
// The form sends the result WHILE the WebView is still presented; accessing
// the DOM after closing the sheet can hang because WebKit suspends detached views.
// A legacy native prompt fallback keeps login usable if the WebView cannot load.
async function fallbackCredentialForm({title='NUFE 登录',showRemember=false}={}){
  const username=(await input(title,'NUFE 学号')).trim();
  const password=await input(title,'NUFE 密码（安全输入）',true);
  if(!username||username.length>100||!password||password.length>512)fail('CREDENTIALS_INVALID');
  const remember=showRemember&&await confirm('保存自动登录凭据？',
    '将学号和密码保存到 iCloud 钥匙串，供 Cookie 失效时自动登录。');
  return {username,password,remember};
}
async function credentialForm({title='NUFE 登录',showRemember=false}={}){
  let w=null;
  try{
    w=new WebView();
    w.shouldAllowRequest=req=>String(req.url||'')==='about:blank';
    let submitted=null;
    // The bridge is the only path from this local HTML page to the host.
    // Never persist or log the values returned by the bridge.
    if(typeof w.inner.addScriptMessageHandler!=='function')fail('WEBVIEW_UNAVAILABLE');
    await bounded(w.inner.addScriptMessageHandler('nufeCredentials',async value=>{
      if(submitted)return false;
      if(!value||typeof value.username!=='string'||typeof value.password!=='string')return false;
      const username=value.username.trim(),password=value.password;
      if(!username||username.length>100||!password||password.length>512)return false;
      submitted={username,password,remember:showRemember&&value.remember===true};
      // Close only AFTER data crossed to native code. Do not evaluate JS
      // in a view already dismissed / suspended by WebKit.
      try{w.inner.dismiss();}catch(_){}
      return true;
    }),12000,'WEBVIEW_TIMEOUT');
    const html=[
      '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">',
      '<style>html{color-scheme:light dark}body{font:16px -apple-system,sans-serif;padding:18px 16px;color:CanvasText;background:transparent}',
      'h2{font-size:20px;font-weight:600;margin:10px 0 22px}.label{display:block;font-size:14px;font-weight:600;margin:16px 0 7px}',
      'input[type=text],input[type=password]{display:block;width:100%;box-sizing:border-box;font:17px -apple-system;padding:12px;border:1px solid #8888;border-radius:10px;background:Canvas;color:CanvasText}',
      '.choice{display:flex;align-items:center;gap:10px;margin-top:20px;font-size:14px;line-height:1.4}.choice input{width:20px;height:20px;flex:none}',
      'button{display:block;width:100%;background:#1769dd;color:white;font:600 17px -apple-system;padding:13px;border:0;border-radius:12px;margin-top:22px}',
      'button:disabled{opacity:.55}.hint{font-size:13px;color:GrayText;line-height:1.5;margin-top:14px}</style></head><body>',
      '<h2>NUFE 统一身份认证</h2>',
      '<label class="label" for="account">学号</label><input id="account" type="text" maxlength="100" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username">',
      '<label class="label" for="secret">密码</label><input id="secret" type="password" maxlength="512" autocomplete="off">',
      showRemember?'<label class="choice"><input id="remember" type="checkbox">保存到 iCloud 钥匙串（自动登录）</label>':'',
      '<button type="button" id="submit">确认</button>',
      '<p class="hint" id="hint">点按「确认」提交；关闭页面则取消。</p>',
      '<script>(function(){const button=document.getElementById("submit"),hint=document.getElementById("hint");',
      'button.addEventListener("click",async()=>{const username=document.getElementById("account").value.trim(),password=document.getElementById("secret").value;',
      'if(!username||!password){hint.textContent="请输入学号和密码。";return;}button.disabled=true;',
      'try{const ok=await window.webkit.messageHandlers.nufeCredentials.postMessage({username,password,remember:!!document.getElementById("remember")?.checked});',
      'if(!ok){hint.textContent="请检查输入内容。";button.disabled=false;}}',
      'catch(_){hint.textContent="未能提交登录信息，请重试。";button.disabled=false;}});})();</script></body></html>'
    ].join('');
    await bounded(w.loadHTML(html),12000,'WEBVIEW_TIMEOUT');
    await w.present(title);
    if(!submitted)fail('CANCELLED');
    return submitted;
  }catch(e){
    // A broken WebKit instance should not block all password logins.
    // Only technical WebView errors use the two native secure prompts;
    // a user cancellation never triggers fallback.
    if(e&&['WEBVIEW_TIMEOUT','WEBVIEW_LOAD_FAILED','WEBVIEW_UNAVAILABLE'].includes(e.code)){
      return await fallbackCredentialForm({title,showRemember});
    }
    throw e;
  }finally{
    if(w){try{w.inner.dispose();}catch(_){}__webviews.delete(w.inner);}
  }
}
async function humanSlider(http) {
  await http.get(AUTH+'/common/toSliderCaptcha.htl',{ajax:true});
  const j=await http.authJSON(AUTH+'/common/openSliderCaptcha.htl?_='+Date.now());
  assert(typeof j.bigImage==='string'&&typeof j.smallImage==='string'&&j.bigImage.length<700000&&j.smallImage.length<700000,'CAPTCHA');
  const small=Array.from(Data.fromBase64String(j.smallImage).getBytes());const key=String.fromCharCode(...small.slice(-16));assert(/^[A-Za-z0-9]{16}$/.test(key),'CAPTCHA');
  const imageType=s=>s.startsWith('iVBOR')?'image/png':s.startsWith('/9j/')?'image/jpeg':fail('CAPTCHA');
  const w=new WebView();w.shouldAllowRequest=r=>/^(?:about:blank|data:image\/(?:png|jpeg);base64,)/.test(String(r.url||''));
  const html=`<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>body{font:17px -apple-system;padding:20px}#stage{position:relative;width:280px;height:155px}img{position:absolute;height:155px}#bg{width:280px}#piece{left:0}#track{position:relative;width:280px;height:44px;background:#ddd;margin-top:20px;touch-action:none}#knob{position:absolute;width:40px;height:44px;background:#2084ee;touch-action:none}</style><p>亲自拖动滑块，松开后点击右上角完成。</p><div id="stage"><img id="bg"><img id="piece"></div><div id="track"><div id="knob"></div></div><p id="status"></p><script>
  const bg=document.getElementById('bg'),piece=document.getElementById('piece'),knob=document.getElementById('knob');
  bg.onload=piece.onload=()=>{piece.style.width=Math.max(0,piece.naturalWidth*280/bg.naturalWidth-2)+'px';};
  bg.src=${JSON.stringify('data:'+imageType(j.bigImage)+';base64,'+j.bigImage)};piece.src=${JSON.stringify('data:'+imageType(j.smallImage)+';base64,'+j.smallImage)};
  let active=false,x=0,y=0,lastAt=0,last=null,tracks=[];window.result=null;
  knob.onpointerdown=e=>{e.preventDefault();knob.setPointerCapture(e.pointerId);active=true;x=e.clientX;y=e.clientY;lastAt=Date.now();last=null;tracks=[{a:0,b:0,c:0}];window.result=null;};
  knob.onpointermove=e=>{if(!active)return;const dx=e.clientX-x,dy=e.clientY-y;if(dx<0||dx+40>280)return;knob.style.left=Math.max(0,dx-1)+'px';piece.style.left=dx+'px';const now=Date.now(),dt=now-lastAt;if(dt<20)return;const p={a:dx,b:dy,c:dt};if(last&&Math.hypot(p.a-last.a,p.b-last.b)<2)return;tracks.push(p);last=p;lastAt=now;};
  knob.onpointerup=e=>{if(!active)return;active=false;const dx=e.clientX-x;if(dx<=0)return;tracks.push({a:dx,b:e.clientY-y,c:Date.now()-lastAt});window.result={canvasLength:280,moveLength:dx,tracks};document.getElementById('status').textContent='已记录，请点击完成提交。';};knob.onpointercancel=()=>{active=false;window.result=null;};</script>`;
  await bounded(w.loadHTML(html),12000,'WEBVIEW_TIMEOUT');await w.present();const result=await bounded(w.evaluateJavaScript('window.result'),12000,'WEBVIEW_TIMEOUT');assert(result&&result.tracks,'CANCELLED');
  const sign=await encryptPassword(JSON.stringify(result),key);const answer=await http.authJSON(AUTH+'/common/verifySliderCaptcha.htl',{body:form({sign})});assert(answer.errorCode===1,'CAPTCHA');
}
function reauthValue(html,key) {const m=new RegExp('"'+key+'"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(html);return m?JSON.parse('"'+m[1]+'"'):'';}
async function mfa(http,r) {
  const type=reauthValue(r.text,'reAuthType');assert(type==='3'||type==='10','MFA_UNSUPPORTED');
  const service=reauthValue(r.text,'service')||SSO;assert(service===SSO,'DOMAIN_BLOCKED');
  function endpoint(suffix, fallback){const m=new RegExp('["\']([^"\']*'+suffix.replace('.','\\.')+')["\']').exec(r.text);let u=m?m[1]:fallback;if(u.startsWith('/')&&!u.startsWith('/authserver/'))u=AUTH+u;else u=resolveURL(r.url,u);assert(safeURL(u).host==='authserver.nufe.edu.cn','DOMAIN_BLOCKED');return u;}
  if(type==='3') {
    if(!await confirm('短信验证','学校要求短信验证，点击确认向绑定手机发送一次验证码。'))fail('CANCELLED');
    const j=await http.authJSON(endpoint('getDynamicCodeByReauth.do',AUTH+'/dynamicCode/getDynamicCodeByReauth.do'),{body:form({userName:reauthValue(r.text,'reAuthUserId'),authCodeTypeName:'reAuthDynamicCodeType'})});assert(['success','other_success'].includes(j.res),'MFA_SEND');
  }
  const code=await input('学校二次认证',type==='3'?'短信验证码':'身份验证器动态口令');
  const data={service,reAuthType:type,isMultifactor:reauthValue(r.text,'isMultifactor')||'true',password:'',dynamicCode:type==='3'?code:'',uuid:'',answer1:'',answer2:'',otpCode:type==='10'?code:''};
  if(reauthValue(r.text,'isSleepAccount')==='0')data.skipTmpReAuth=(await confirm('信任这台设备','是否在学校认证系统中信任这台 iPhone？'))?'true':'false';
  const j=await http.authJSON(endpoint('reAuthSubmit.do',AUTH+'/reAuthCheck/reAuthSubmit.do'),{body:form(data)});assert(!['reAuth_failed','reAuth_unauthorized'].includes(j.code),'MFA_FAILED');
  await http.get(AUTH+'/login?'+form({service}));
}
// Password authentication is shared by manual login and the ONE automatic retry.
// Captcha, slider, OTP and MFA remain interactive-only.
async function passwordLogin(http,r,username,password,interactive,onStage=()=>{}) {
  try {
    onStage('解析学校登录表单');
    const fields=await fieldsFrom(r.text,'pwdFromId');assert(fields,'LOGIN_SCHEMA');assert(fields.salt,'LOGIN_SALT_MISSING');assert(fields.execution,'LOGIN_EXECUTION_MISSING');
    const deviceKey='NUFE.Local.v1.device';let device=Keychain.contains(deviceKey)?Keychain.get(deviceKey):uuid().replace(/-/g,'').toUpperCase();Keychain.set(deviceKey,device);
    onStage('注册设备指纹');
    await http.get(AUTH+'/bfp/info?'+form({bfp:device,_:Date.now()}),{ajax:true});
    if(!http.jar.cookies.some(c=>c.name==='MULTIFACTOR_BROWSER_FINGERPRINT'))http.jar.set({name:'MULTIFACTOR_BROWSER_FINGERPRINT',value:device,domain:'authserver.nufe.edu.cn',hostOnly:true,path:'/',expires:0});
    onStage('查询是否需要验证码');
    const need=await http.authJSON(AUTH+'/checkNeedCaptcha.htl?'+form({username,_:Date.now()}));assert(typeof need.isNeed==='boolean','CAPTCHA');
    let captcha='';if(need.isNeed||/\b_badCredentialsCount\s*=\s*["']?0\b/.test(r.text)) {
      if(!interactive)fail('AUTH_INTERACTIVE_REQUIRED');
      if(/\bcaptchaSwitch\s*=\s*["']?2\b/.test(r.text))await humanSlider(http);
      else {const image=await http.get(AUTH+'/getCaptcha.htl?'+Date.now(),{binary:true});assert(/^image\/(png|jpeg|gif)/.test(image.response.mimeType||''),'CAPTCHA');await QuickLook.present(Image.fromData(image.text));captcha=await input('图形验证码','输入刚才图片中的字符');}
    }
    onStage(interactive?'本机加密登录密码（原生安全随机数）':'使用 Keychain 凭据进行本机密码加密');
    const encrypted=await encryptPassword(password,fields.salt);password='';
    onStage('提交学校认证请求');
    r=await http.get(r.url,{body:form({username,password:encrypted,captcha,rememberMe:'true',_eventId:'submit',cllt:'userNameLogin',dllt:'generalLogin',lt:fields.lt||'',execution:fields.execution})});
    if(/reAuthSubmit|isMultifactor=true/.test(r.text+' '+r.url)){
      if(!interactive)fail('AUTH_INTERACTIVE_REQUIRED');
      await mfa(http,r);
    }else if(safeURL(r.url).host==='authserver.nufe.edu.cn'&&/\/login(?:\?|$)/.test(r.url)){
      fail(interactive?'LOGIN_FAILED':'AUTO_LOGIN_REJECTED');
    }
    onStage('认证完成后读取课表页面');
    r=await http.get(TABLE);
    try{pageInfo(r.text);}catch(_){fail(interactive?'LOGIN_FAILED':'AUTO_LOGIN_REJECTED');}
    return r.text;
  }finally{password='';}
}
async function coursePage(http,interactive,onStage=()=>{}) {
  onStage('尝试读取教务课表入口');
  let r;try{r=await http.get(TABLE);try{pageInfo(r.text);return r.text;}catch(_){}}catch(e){if(e.code!=='AUTH_REQUIRED')throw e;}
  // Explicit SSO is needed: student/login does not redirect itself to CAS.
  onStage('学校单点登录跳转');
  r=await http.get(SSO);try{pageInfo(r.text);return r.text;}catch(_){}
  if(safeURL(r.url).host!=='authserver.nufe.edu.cn') {r=await http.get(TABLE);pageInfo(r.text);return r.text;}
  if(/reAuthSubmit|isMultifactor=true/.test(r.text+' '+r.url)){
    if(!interactive)fail('AUTH_INTERACTIVE_REQUIRED');
    await mfa(http,r);r=await http.get(TABLE);pageInfo(r.text);return r.text;
  }
  if(!interactive){
    const saved=readSavedCredentials();
    if(!saved)fail('AUTH_REQUIRED');
    onStage('Cookie 已失效，尝试使用 Keychain 凭据自动登录');
    return await passwordLogin(http,r,saved.username,saved.password,false,onStage);
  }
  onStage('等待输入学校登录信息');
  const account=await credentialForm({title:'NUFE 登录',showRemember:true});
  const page=await passwordLogin(http,r,account.username,account.password,true,onStage);
  // Save only after school confirms authentication succeeded.
  if(account.remember)saveCredentials(account.username,account.password);
  return page;
}
// Immutable generation files: a new file is written and read back before old versions
// are pruned. Corrupt latest generation fails closed; it never becomes an empty state.
class Store {
  constructor() {this.fm=FileManager.local();this.dir=this.fm.joinPath(this.fm.libraryDirectory(),'NUFE-Local-Scripting-v2');if(!this.fm.fileExists(this.dir))this.fm.createDirectory(this.dir,true);this.token=null;this.generation=0;}
  path(n){return this.fm.joinPath(this.dir,n);}
  read() {const names=this.fm.listContents(this.dir).filter(n=>/^state-\d{10}\.json$/.test(n)).sort();if(!names.length)return {version:1,owner:null,calendarId:null,anchors:{},semesters:{},minutes:10,failures:0};const name=names[names.length-1];this.generation=+name.slice(6,16);try{const s=JSON.parse(this.fm.readString(this.path(name)));validateState(s);return s;}catch(_){fail('STATE_CORRUPT');}}
  write(s) {this.check();const name='state-'+String(++this.generation).padStart(10,'0')+'.json',text=JSON.stringify(s);this.fm.writeString(this.path(name),text);assert(this.fm.readString(this.path(name))===text,'STATE_WRITE');const names=this.fm.listContents(this.dir).filter(n=>/^state-\d{10}\.json$/.test(n)).sort();for(const old of names.slice(0,-4))this.fm.remove(this.path(old));}
  acquire() {const p=this.path('run-lock.json');if(this.fm.fileExists(p)){try{const l=JSON.parse(this.fm.readString(p));if(Date.now()-l.at<20*60000)fail('BUSY');}catch(e){if(e.code==='BUSY')throw e;fail('LOCK_CORRUPT');}}
    if(this.fm.fileExists(p))this.fm.remove(p);
    const token=uuid(),candidate=this.path('lock-'+token+'.tmp');this.fm.writeString(candidate,JSON.stringify({token,at:Date.now()}));
    try{this.fm.move(candidate,p);}catch(_){if(this.fm.fileExists(candidate))this.fm.remove(candidate);fail('BUSY');}this.token=token;this.check();}
  check(){if(!this.token)fail('LOCK_LOST');const p=this.path('run-lock.json');let l;try{l=JSON.parse(this.fm.readString(p));}catch(_){fail('LOCK_LOST');}assert(l.token===this.token&&Date.now()-l.at<20*60000,'LOCK_LOST');}
  release(){if(!this.token)return;try{this.check();this.fm.remove(this.path('run-lock.json'));}catch(_){}this.token=null;}
}
function validateRecords(events,code='STATE_CORRUPT') {
  assert(Array.isArray(events),code);const ids=new Set();
  for(const e of events){
    assert(e&&typeof e.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(e.id)&&!ids.has(e.id),code);ids.add(e.id);
    assert(typeof e.sid==='string'&&/^\d+$/.test(e.sid)&&typeof e.title==='string'&&e.title.trim()&&typeof e.location==='string',code);
    assert(typeof e.start==='string'&&typeof e.end==='string'&&Number.isFinite(Date.parse(e.start))&&Date.parse(e.end)>Date.parse(e.start),code);
    assert([e.week,e.su,e.eu].every(Number.isInteger)&&e.week>=1&&e.week<=60&&e.su>=1&&e.eu>=e.su&&Array.isArray(e.teachers)&&e.teachers.every(t=>typeof t==='string'),code);
  }
}
function validateState(s){
  assert(s&&s.version===1&&s.semesters&&typeof s.semesters==='object'&&!Array.isArray(s.semesters)&&s.anchors&&typeof s.anchors==='object'&&!Array.isArray(s.anchors),'STATE_CORRUPT');
  const allIds=new Set();
  assert(s.owner===null||typeof s.owner==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(s.owner),'STATE_CORRUPT');
  for(const [sid,t] of Object.entries(s.semesters)){
    assert(/^\d+$/.test(sid)&&t&&typeof t==='object','STATE_CORRUPT');validateRecords(t.events);
    for(const e of t.events){assert(s.owner&&s.calendarId&&e.sid===sid&&!allIds.has(e.id),'STATE_CORRUPT');allIds.add(e.id);}
  }
  if(s.tx){const t=s.tx;assert(typeof t.sid==='string'&&typeof t.anchor==='string'&&typeof t.stamp==='string'&&Number.isFinite(Date.parse(t.stamp)),'STATE_CORRUPT');monday(t.anchor);validateRecords(t.before);validateRecords(t.target);assert([...t.before,...t.target].every(e=>e.sid===t.sid)&&t.changes&&Array.isArray(t.changes.examples),'STATE_CORRUPT');}
}
function readCookieJar(){
  try{
    const data=Keychain.contains(KEY)?JSON.parse(Keychain.get(KEY)):[];
    assert(Array.isArray(data)&&data.length<=500,'COOKIE_STORAGE');
    for(const c of data)assert(c&&['nufe.edu.cn','authserver.nufe.edu.cn','jwxt.nufe.edu.cn'].includes(c.domain)&&typeof c.name==='string'&&/^[^\x00-\x20\x7f()<>@,;:\\"/\[\]?={}]+$/.test(c.name)&&typeof c.value==='string'&&!/[\x00-\x1f\x7f;]/.test(c.value)&&typeof c.path==='string'&&c.path.startsWith('/')&&typeof c.expires==='number'&&Number.isFinite(c.expires),'COOKIE_STORAGE');
    return new CookieJar(data);
  }catch(_){fail('COOKIE_STORAGE');}
}
function occurrenceKey(ev){return String(ev.identifier)+'\0'+(+ev.startDate)+'\0'+(+ev.endDate);}
async function calendarRows(start,end,calendar){
  const rows=await bounded(CalendarEvent.between(new Date(start),new Date(end),[calendar]),20000,'CALENDAR_TIMEOUT');
  assert(Array.isArray(rows),'CALENDAR_PERMISSION');
  // Defend even if a bridge returns events outside its requested calendar.
  return rows.filter(e=>e&&e.calendar&&e.calendar.identifier===calendar.identifier);
}
function assertNonRecurring(rows){
  const ids=new Map(),logical=new Map();
  for(const {ev,rec} of rows){
    const occ=occurrenceKey(ev),known=ids.get(ev.identifier);
    assert(!known||known===occ,'MANAGED_SERIES');ids.set(ev.identifier,occ);
    const key=rec.sid+'\0'+rec.id,dates=logical.get(key)||new Set();dates.add(rec.start+'\0'+rec.end);logical.set(key,dates);
    assert(dates.size===1,'MANAGED_SERIES');
    assert(!Array.isArray(ev.attendees)||!ev.attendees.length,'MANAGED_INVITATION');
    assert(!ev.isAllDay&&!ev.hasRecurrenceRules&&!ev.recurrenceRules?.length,'MANAGED_SERIES');
  }
}
function writeVerified(store,name,text){
  store.check();store.fm.writeString(store.path(name),text);
  assert(store.fm.fileExists(store.path(name))&&store.fm.readString(store.path(name))===text,'BACKUP_FAILED');return name;
}

function marker(e,owner) {return '[NUFE_LOCAL_V1 '+owner+' '+e.id+']';}
function notes(e,owner,stamp) {return marker(e,owner)+'\n'+JSON.stringify({sid:e.sid,id:e.id,week:e.week,su:e.su,eu:e.eu,teachers:e.teachers})+'\n教师：'+e.teachers.join('、')+'\n第 '+e.week+' 周，第 '+e.su+'–'+e.eu+' 节\n同步：'+stamp;}
// The local state retains course metadata once event notes are made readable.
// Legacy marked events remain recognized during migration and recovery.
function storedEventIndex(state){
  const map=new Map();
  for(const term of Object.values(state?.semesters||{})){
    const records=new Map((term.events||[]).map(e=>[e.id,e]));
    for(const [id,native] of Object.entries(term.index||{})){
      const record=records.get(id);
      if(!record||typeof native!=='string'||!native)continue;
      if(map.has(native)&&map.get(native).id!==id)fail('STATE_CORRUPT');
      map.set(native,record);
    }
  }
  return map;
}
function eventRecord(ev,owner,byNative=null) {
  const m=/^\[NUFE_LOCAL_V1 ([^ \]]+) ([^ \]]+)\]\n([^\n]+)/.exec(ev.notes||'');
  let meta=null;
  if(m){
    if(m[1]!==owner)return null;
    try{meta=JSON.parse(m[3]);}catch(_){fail('MARKER_CORRUPT');}
    assert(meta.id===m[2],'MARKER_CORRUPT');
  }else if(byNative instanceof Map)meta=byNative.get(ev.identifier)||null;
  if(!meta)return null;
  const rec={...meta,title:ev.title||'',location:ev.location||'',start:ev.startDate.toISOString(),end:ev.endDate.toISOString()};
  validateRecords([rec],'MARKER_CORRUPT');return rec;
}
function readableNotes(e,stamp){
  return '教师：'+(e.teachers?.length?e.teachers.join('、'):'未提供')+'\n同步：'+localDateTime(stamp);
}
class CalendarAdapter {
  constructor(calendar,owner,store,budget=()=>store.check(),state=null){this.calendar=calendar;this.owner=owner;this.store=store;this.budget=budget;this.byNative=storedEventIndex(state);this.hasMarkerWrites=false;}
  async scan(anchor,events=[]) {
    // Chunked bounded queries avoid EventKit's multi-year predicate limit.
    let lo=Date.parse(anchor+'T00:00:00+08:00')-30*DAY,hi=lo+500*DAY;
    for(const e of events){lo=Math.min(lo,Date.parse(e.start)-DAY);hi=Math.max(hi,Date.parse(e.end)+DAY);}
    assert(Number.isFinite(lo)&&Number.isFinite(hi)&&hi-lo<4*366*DAY,'SCAN_RANGE');const found=new Map();
    for(let start=lo;start<hi;start+=90*DAY){this.budget();this.store.check();const list=await calendarRows(start,Math.min(hi,start+90*DAY),this.calendar);this.store.check();for(const ev of list){const rec=eventRecord(ev,this.owner,this.byNative);if(rec)found.set(occurrenceKey(ev),{ev,rec});}}
    return [...found.values()];
  }
  async save(e,existing,stamp){this.store.check();if(existing)assert(existing.calendar&&existing.calendar.identifier===this.calendar.identifier&&eventRecord(existing,this.owner,this.byNative),'FOREIGN_EVENT');const ev=existing||new CalendarEvent();ev.calendar=this.calendar;ev.title=e.title;ev.location=e.location;ev.notes=notes(e,this.owner,stamp);ev.isAllDay=false;ev.timeZone='Asia/Shanghai';ev.startDate=new Date(e.start);ev.endDate=new Date(e.end);await ev.save();this.byNative.set(ev.identifier,e);this.hasMarkerWrites=true;return ev.identifier;}
  async remove(ev){this.store.check();assert(ev.calendar&&ev.calendar.identifier===this.calendar.identifier&&eventRecord(ev,this.owner,this.byNative),'FOREIGN_EVENT');await ev.remove();this.store.check();}
}
async function applyTransaction(tx,adapter,budget=()=>{}) {
  validateRecords(tx.before);validateRecords(tx.target);
  assert(tx.sid&&[...tx.before,...tx.target].every(e=>e.sid===tx.sid),'STATE_CORRUPT');
  const live=await adapter.scan(tx.anchor,[...tx.before,...tx.target]),byId=new Map();
  for(const x of live){if(x.rec.sid!==tx.sid)continue;const list=byId.get(x.rec.id)||[];list.push(x);byId.set(x.rec.id,list);}
  // In this user's disposable dedicated calendar, old marked series can be
  // replaced too. Create a standalone target first, then remove old occurrences.
  // Do not edit a recurring occurrence in place: its save span is not exposed.
  for(const list of byId.values())assert(list.every(x=>!Array.isArray(x.ev.attendees)||!x.ev.attendees.length),'MANAGED_INVITATION');
  const replacements=new Set();
  for(const [id,list] of byId){
    const dates=new Set(list.map(x=>x.rec.start+'\0'+x.rec.end));
    if(dates.size>1||list.some(x=>x.ev.isAllDay||x.ev.hasRecurrenceRules||x.ev.recurrenceRules?.length)||!list.every(x=>same(x.rec,list[0].rec)))replacements.add(id);
  }
  for(const e of tx.target){budget();const primary=(byId.get(e.id)||[])[0];if(replacements.has(e.id)||!primary||!same(primary.rec,e))await adapter.save(e,replacements.has(e.id)?null:primary&&primary.ev,tx.stamp);}
  const targetIds=new Set(tx.target.map(e=>e.id));
  const removed=new Set([...tx.before.filter(e=>!targetIds.has(e.id)).map(e=>e.id),...[...byId.keys()].filter(id=>!targetIds.has(id))]);
  for(const [id,list] of byId){
    const drops=removed.has(id)||replacements.has(id)?list:targetIds.has(id)?list.slice(1):[];
    for(const item of drops){
      budget();const fresh=await calendarRows(+item.ev.startDate-1000,+item.ev.endDate+1000,adapter.calendar);
      const current=fresh.find(e=>e.identifier===item.ev.identifier&&+e.startDate===+item.ev.startDate&&+e.endDate===+item.ev.endDate);
      if(current)await adapter.remove(current); // A previous removal may already remove a series.
    }
  }
  budget();const after=await adapter.scan(tx.anchor,[...tx.before,...tx.target]),index={};
  for(const e of tx.target){const rows=after.filter(x=>x.rec.sid===tx.sid&&x.rec.id===e.id);assert(rows.length===1&&same(rows[0].rec,e),'CALENDAR_VERIFY');index[e.id]=rows[0].ev.identifier;}
  assert(!after.some(x=>x.rec.sid===tx.sid&&removed.has(x.rec.id)),'CALENDAR_VERIFY');
  return index;
}

function fingerprint(events){return JSON.stringify(events.map(({id,...e})=>e));}
function deletionReady(previous,events,now){return previous&&previous.signature===fingerprint(events)&&now-previous.at>=5*60000;}
async function notify(id,body) {const n=new Notification();n.identifier='nufe-local-'+id;n.title='NUFE 课表';n.body=body;n.sound='default';n.openURL=HostScript.createRunURLScheme(HostScript.name,{mode:'menu'});await n.schedule();}

// Session invalidation is known only after a school's request redirects to auth.
// Deduplicate the alert for this expired session: each scheduled run must not nag.
async function notifyAuthExpiredOnce(state,store) {
  if(state.authExpiryNotifiedAt)return false;
  const n=new Notification();n.identifier='nufe-local-auth-expired-'+state.owner;
  n.title='NUFE 课表 · 登录已失效';
  const code=state.lastError;
  n.body=code==='AUTH_INTERACTIVE_REQUIRED'?'Cookie 已失效，学校要求验证码或二次认证。课表已保留，请打开 Scripting 手动验证。':
    code==='AUTO_LOGIN_REJECTED'?'Cookie 已失效，保存的账号密码未能通过学校认证。课表已保留，请在 Scripting 中更新凭据。':
    code==='CREDENTIALS_INVALID'||code==='CREDENTIALS_UNAVAILABLE'?'自动读取本地登录凭据失败。课表已保留，请在 Scripting 中检查凭据设置。':
    code==='ACCOUNT_CHANGED'?'自动登录使用的账号与原课表绑定账号不一致。程序已停止写入；请在 Scripting 中核对学号。':
    code==='WEBVIEW_TIMEOUT'?'Cookie 失效后本地密码加密组件未能及时响应。课表已保留，请打开 Scripting 前台手动同步。':
    '学校会话已失效；未能自动登录。课表已保留，请在 Scripting 中检查凭据或手动登录。';
  n.sound='default';n.openURL=HostScript.createRunURLScheme(HostScript.name,{mode:'menu'});
  await n.schedule();
  state.authExpiryNotifiedAt=new Date().toISOString();state.authNoticeError=null;
  store.write(state);return true;
}
async function testAuthNotification() {
  const n=new Notification();n.identifier='nufe-local-auth-test';
  n.title='NUFE 课表 · 通知测试';
  n.body='这是一条测试通知。学校会话失效后，定时同步会提醒你手动重新登录。';
  n.sound='default';n.openURL=HostScript.createRunURLScheme(HostScript.name,{mode:'menu'});
  await n.schedule();
}
// Reconcile OLD unmarked ICS imports with the course events that this installation
// ACTUALLY created, in the SAME selected writable calendar. Never infer from a
// school lesson alone that an unrelated calendar event should be destroyed.
function legacyEventKey(e){
  if(!e||e.isAllDay||!e.title||!e.startDate||!e.endDate)return null;
  const a=Date.parse(e.startDate),b=Date.parse(e.endDate);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return null;
  return String(e.title).normalize('NFC').replace(/\s+/g,' ').trim()+'\u0000'+a+'\u0000'+b;
}
function legacyLocationCompatible(a,b){
  const clean=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
  return !clean(a)||!clean(b)||clean(a)===clean(b);
}
function selectLegacyDuplicates(rows,owner){
  const managed=new Map(),duplicates=[], uncertain=[];
  for(const ev of rows){
    if(typeof ev.notes!=='string'||!ev.notes.startsWith('[NUFE_LOCAL_V1 '+owner+' '))continue;
    const rec=eventRecord(ev,owner),key=legacyEventKey(ev);
    if(!rec||!key)continue;
    const array=managed.get(key)||[];array.push(ev);managed.set(key,array);
  }
  for(const ev of rows){
    const key=legacyEventKey(ev);if(!key||!managed.has(key))continue;
    if(typeof ev.notes==='string'&&ev.notes.startsWith('[NUFE_LOCAL_V1 '))continue;
    if(Array.isArray(ev.attendees)&&ev.attendees.length)continue;
    const counterpart=managed.get(key).find(own=>legacyLocationCompatible(own.location,ev.location));
    if(counterpart)duplicates.push({ev,managed:counterpart,key});
    else uncertain.push(ev);
  }
  return {duplicates,uncertain,managedCount:[...managed.values()].reduce((n,v)=>n+v.length,0)};
}
async function scanLegacyDuplicates(calendar,state,progress=()=>{}){
  const terms=Object.values(state.semesters||{}).flatMap(t=>t.events||[]);
  if(!terms.length)fail('CLEANUP_NO_BASELINE');
  let low=Infinity,high=-Infinity;
  for(const e of terms){const a=Date.parse(e.start),b=Date.parse(e.end);if(Number.isFinite(a)&&Number.isFinite(b)){low=Math.min(low,a);high=Math.max(high,b);}}
  if(!Number.isFinite(low)||!Number.isFinite(high)||high-low>3*366*DAY)fail('SCAN_RANGE');
  const rows=new Map();
  // A recurring series may use one identifier for MANY different occurrences.
  // Dedupe by identifier AND occurrence time, never by identifier alone.
  // Otherwise every week except one silently disappears from the cleanup scan.
  for(let t=low-DAY;t<high+DAY;t+=45*DAY){
    progress('检查旧课程：'+localDateTime(new Date(t).toISOString()).slice(0,10));
    const data=await calendarRows(t,Math.min(high+DAY,t+45*DAY),calendar);
    for(const e of data){
      if(!e||!e.identifier||!e.startDate||!e.endDate)continue;
      const start=+e.startDate,end=+e.endDate;
      if(!Number.isFinite(start)||!Number.isFinite(end))continue;
      rows.set(e.identifier+'\u0000'+start+'\u0000'+end,e);
    }
  }
  const allRows=[...rows.values()];return {...selectLegacyDuplicates(allRows,state.owner),rows:allRows,low:low-DAY,high:high+DAY};
}
function backupLegacyICS(events){
  const safe=events.map((e,i)=>({
    id:'legacy-backup-'+i+'-'+String(e.identifier||'unknown').replace(/[^\w-]/g,'').slice(0,50),
    title:e.title||'',start:e.startDate.toISOString(),end:e.endDate.toISOString(),
    location:e.location||'',teachers:[],description:e.notes||''
  }));
  return ics(safe);
}
function dedicatedWindows(state){
  const windows=[];
  for(const term of Object.values(state.semesters||{})){
    if(!term.anchor)continue;
    const start=Date.parse(monday(term.anchor)+'T00:00:00+08:00')-30*DAY;
    windows.push([start,start+500*DAY]);
    for(const e of term.events||[])windows.push([Date.parse(e.start)-DAY,Date.parse(e.end)+DAY]);
  }
  windows.sort((a,b)=>a[0]-b[0]);const out=[];
  for(const w of windows){const last=out[out.length-1];if(last&&w[0]<=last[1])last[1]=Math.max(last[1],w[1]);else out.push(w.slice());}
  assert(out.every(w=>Number.isFinite(w[0])&&Number.isFinite(w[1])),'SCAN_RANGE');return out;
}
async function dedicatedRows(calendar,state,progress=()=>{}){
  const found=new Map();
  for(const [low,high] of dedicatedWindows(state))for(let t=low;t<high;t+=90*DAY){
    progress('扫描专用日历：'+localDateTime(new Date(t).toISOString()).slice(0,10));
    for(const e of await calendarRows(t,Math.min(t+90*DAY,high),calendar))found.set(occurrenceKey(e),e);
  }
  return [...found.values()];
}
function recurrenceSnapshot(e){
  return (e.recurrenceRules||[]).map(r=>({identifier:r.identifier,frequency:r.frequency,interval:r.interval,firstDayOfTheWeek:r.firstDayOfTheWeek,daysOfTheWeek:r.daysOfTheWeek,daysOfTheMonth:r.daysOfTheMonth,daysOfTheYear:r.daysOfTheYear,weeksOfTheYear:r.weeksOfTheYear,monthsOfTheYear:r.monthsOfTheYear,setPositions:r.setPositions}));
}
function snapshotFields(e){return {recurrenceRules:recurrenceSnapshot(e),hasRecurrenceRules:!!e.hasRecurrenceRules,occurrenceDate:e.occurrenceDate?new Date(e.occurrenceDate).toISOString():null,isDetached:!!e.isDetached,identifier:e.identifier,title:e.title||'',notes:e.notes||'',location:e.location||'',start:e.startDate.toISOString(),end:e.endDate.toISOString(),allDay:!!e.isAllDay};}
function snapshotSignature(e){return JSON.stringify(snapshotFields(e));}
async function verifyBaseline(rows,state){
  const byNative=storedEventIndex(state);const records=rows.map(ev=>({ev,rec:eventRecord(ev,state.owner,byNative)})).filter(x=>x.rec);
  assertNonRecurring(records);
  for(const term of Object.values(state.semesters))for(const e of term.events||[]){
    const matches=records.filter(x=>x.rec.sid===e.sid&&x.rec.id===e.id);
    assert(matches.length===1&&same(matches[0].rec,e),'CALENDAR_VERIFY');
  }
}
async function replaceDedicatedLegacy(calendar,state,store,progress=()=>{}){
  assert(REPLACE_DEDICATED_LEGACY&&calendar&&calendar.identifier===state.calendarId&&liveCalendar(calendar),'CALENDAR_READONLY');
  assert(!state.tx,'CLEANUP_TX_PENDING');
  assert(Object.values(state.semesters||{}).some(t=>t.lastSuccess&&(t.events||[]).length),'EMPTY_SOURCE');
  const rows=await dedicatedRows(calendar,state,progress);
  await verifyBaseline(rows,state); // All retained new lessons must exist before deleting anything.
  const byNative=storedEventIndex(state);const legacy=rows.filter(e=>!eventRecord(e,state.owner,byNative));
  if(!legacy.length){state.lastLegacyCleanupRemaining=0;store.write(state);return 0;}
  const stamp=new Date().toISOString(),base='专用日历清理前-'+stamp.replace(/[:.]/g,'-');
  writeVerified(store,base+'.ics',backupLegacyICS(rows));
  writeVerified(store,base+'.json',JSON.stringify({version:1,calendarId:calendar.identifier,windows:dedicatedWindows(state),limitation:'Observable instances only; series deletion may affect dates outside these windows. Recurrence rules, alarms and invitations cannot be restored from this snapshot.',events:rows.map(snapshotFields)},null,2));
  state.lastLegacyBackupName=base+'.ics';state.lastLegacyReportName=base+'.json';
  state.legacyReplacement={at:stamp,candidates:legacy.length,requests:0,status:'running'};store.write(state);
  assert(legacy.every(e=>!Array.isArray(e.attendees)||!e.attendees.length),'LEGACY_INVITATION');
  let requests=0;
  // The entire bound calendar is explicitly disposable. No title-based ownership
  // claim is needed: only this calendar may lose legacy series, including their
  // out-of-window occurrences. Never call Calendar.remove() or touch another calendar.
  for(const original of legacy){
    store.check();progress('清理专用日历旧实例：'+(requests+1)+' / '+legacy.length);
    const fresh=await calendarRows(+original.startDate-1000,+original.endDate+1000,calendar);
    const ev=fresh.find(e=>e.identifier===original.identifier&&+e.startDate===+original.startDate&&+e.endDate===+original.endDate);
    if(!ev)continue; // Earlier remove may already have deleted the entire series.
    assert(!eventRecord(ev,state.owner,byNative)&&snapshotSignature(ev)===snapshotSignature(original),'LEGACY_CHANGED');
    assert(!Array.isArray(ev.attendees)||!ev.attendees.length,'LEGACY_INVITATION');
    store.check();await ev.remove();store.check();requests++;
    state.legacyReplacement.requests=requests;store.write(state);
  }
  progress('清理后重新核验新课表和旧内容');
  const after=await dedicatedRows(calendar,state,progress);await verifyBaseline(after,state);
  const remaining=after.filter(e=>!eventRecord(e,state.owner,byNative)).length;
  state.lastLegacyCleanupAt=new Date().toISOString();state.lastLegacyCleanupCount=requests;
  state.lastLegacyCleanupRemaining=remaining;state.legacyReplacement.status=remaining?'unverified':'verified';store.write(state);
  assert(!remaining,'LEGACY_VERIFY');return requests;
}
async function cleanupLegacyDuplicates(calendar,state,store,progress=()=>{}){
  // Manual menu uses the same no-dialog backup -> verify -> cleanup pipeline.
  return await replaceDedicatedLegacy(calendar,state,store,progress);
}
async function refreshReminders(state,store){
  try{await reminders(state);state.reminderError=null;}catch(_){state.reminderError='NOTIFICATION_FAILED';}store.write(state);
}
async function reminders(state) {
  const prefix='nufe-local-class-'+state.owner+'-',now=Date.now(),all=Object.values(state.semesters).flatMap(s=>s.events||[]).sort((a,b)=>a.start.localeCompare(b.start));
  const desired=state.minutes>0?all.filter(e=>Date.parse(e.start)-state.minutes*60000>now+60000&&Date.parse(e.start)<now+7*DAY).slice(0,40):[];
  const want=new Set(desired.map(e=>prefix+e.id));
  const pending=await Notification.allPending();const stale=pending.filter(n=>n.identifier.startsWith(prefix)&&!want.has(n.identifier));if(stale.length)await Notification.removePending(stale.map(n=>n.identifier));
  for(const e of desired){const id=prefix+e.id,when=Date.parse(e.start)-state.minutes*60000,body=e.title+' · '+localDateTime(e.start)+' · '+e.location;const old=pending.find(n=>n.identifier===id);if(old&&old.body===body&&old.nextTriggerDate&&Math.abs(+old.nextTriggerDate-when)<1000)continue;const n=new Notification();n.identifier=id;n.title='课程即将开始';n.body=body;n.sound='default';n.setTriggerDate(new Date(when));await n.schedule();}
}
function localDateTime(iso){return new Date(Date.parse(iso)+8*3600000).toISOString().slice(0,16).replace('T',' ');}
function ics(events,stamp=new Date().toISOString()) {
  const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const date=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NUFE Local//CN','CALSCALE:GREGORIAN'];
  for(const e of events)lines.push('BEGIN:VEVENT','UID:'+e.id+'@nufe-local','DTSTAMP:'+date(stamp),'DTSTART:'+date(e.start),'DTEND:'+date(e.end),'SUMMARY:'+esc(e.title),'LOCATION:'+esc(e.location),'DESCRIPTION:'+esc(typeof e.description==='string'?e.description:'教师：'+e.teachers.join('、')),'END:VEVENT');
  lines.push('END:VCALENDAR');return lines.map(line=>{let result='',part='',n=0;for(const c of line){const bytes=utf8(c).length;if(n+bytes>75){result+=part+'\r\n';part=' ';n=1;}part+=c;n+=bytes;}return result+part;}).join('\r\n')+'\r\n';
}
const ERRORS={CLEANUP_NO_BASELINE:'尚未完成首次同步，不能识别哪些课程由本脚本管理。',CLEANUP_TX_PENDING:'上次课表写入事务仍未完成，请先恢复同步。',CLEANUP_BACKUP_FAILED:'清理前的备份文件写入失败，已停止删除。',AUTH_REQUIRED:'登录态已失效或需要验证，请解锁并在 Scripting 内重新登录。旧课表已保留。',LOGIN_FAILED:'登录未完成：请检查账号密码，或重新运行完成学校验证。不会自动重试密码。',LOGIN_SCHEMA:'学校登录页面结构已变化，已停止提交。',MFA_UNSUPPORTED:'学校要求了当前不支持的二次认证方式。请使用学校官方渠道完成认证，或联系维护者适配。',MFA_FAILED:'二次认证未通过，请重新运行。',MFA_SEND:'学校未发送验证码，请稍后重新运行。',CAPTCHA:'验证码未通过或数据结构变化，请重新运行并亲自验证。',SCHEMA:'学校数据不完整或结构变化，未用它覆盖旧课表。',TIME_MISSING:'课程缺少可靠起止时间，已保留旧课表。',ANCHOR:'缺少经确认的第一教学周周一日期，请前台运行设置校历。',STATE_CORRUPT:'最新本地状态损坏。已停止同步；请保留文件并联系维护者，不要删除缓存。',NETWORK:'网络连接失败，旧课表已保留。',NETWORK_TIMEOUT:'学校请求等待超过 25 秒。可查看状态中的最后请求阶段；旧课表已保留。',WEBVIEW_TIMEOUT:'本机输入界面未及时响应，已终止等待。',BUSY:'检测到另一个同步锁。如果已确认无运行中的脚本，可等待 20 分钟自动过期后再试，避免与其他任务同时运行。',LOCK_CORRUPT:'同步锁文件已损坏。请保留本地状态文件以便排查。',DOMAIN_BLOCKED:'请求指向未经允许的地址，已阻止。',ACCOUNT_CHANGED:'检测到其他账号，已停止同步。请使用原账号；本版不自动切换账号。',REVIEW:'存在需人工核对的课程变动，请在 Scripting 内运行。',CALENDAR_MISSING:'保存的日历绑定无法匹配。请在本脚本菜单在「账号与日历设置」选择「重新绑定课表日历」；不会自动创建或覆盖日历。',CALENDAR_NOT_VISIBLE:'Scripting 看不到可写入的「课表」日历。请在 iPhone 设置中给 Scripting「日历完全访问」权限，再重试。',CALENDAR_PERMISSION:'读取 iPhone 日历列表失败。请在设置中允许 Scripting 完全访问日历。',CALENDAR_REBIND_UNSAFE:'无法安全重新绑定：旧日历可能有未完成事务或已导入课程在新日历中不可见。为避免重复课程，未改变绑定。',BUDGET:'本次执行预算已用尽。下次运行将从已保存的事务继续。',DUPLICATE_SOURCE:'学校返回无法区分的重复课程，已保留旧课表。',CANCELLED:'已取消。',MARKER_CORRUPT:'日历课程身份信息校验失败，请保留本地状态及备份，不要删除或重建课表日历。'};
// For every error show a safe, concrete explanation and the next action.
// Unknown runtime errors are called unknown instead of guessing that the password is wrong.
const ERROR_GUIDE={
  TX_TERM_UNAVAILABLE:['待恢复事务的学期已不在学校可访问学期列表中，未恢复旧目标或删除课程。','需要检查学校学期列表；保留本地备份和事务。'],
  EMPTY_SOURCE:['教务课表意外变空或没有可验证的新课程，未清理旧内容。','等学校数据恢复后重试；若确实全部停课，需人工核对。'],
  LEGACY_CHANGED:['备份后旧事件发生了变化，本次停止清理。','稍后刷新重新备份核对；新课程已保留。'],
  LEGACY_INVITATION:['专用日历中存在带邀请信息的旧事件，删除可能通知其他人，已停止。','先在 Apple 日历核对这条事件，勿将会议邀请混入专用课表日历。'],
  LEGACY_VERIFY:['部分旧内容仍然可见，或 iCloud 尚未反映删除，不能报告刷新成功。','稍后再运行；将重新抓取、备份、扫描，不重复创建已有课程。'],

  RETRY_LATER:['上次刷新失败，当前处于退避等待期，未重复请求学校。','稍后重试；可前台运行查看上次失败原因。'],
  PARTIAL_SYNC:['部分学期读取或同步失败，不能报告整次刷新成功。','查看状态中的学期错误。'],
  NOTIFICATION_FAILED:['课表写入已核验，但课程提醒提交失败。','检查 Scripting 通知权限。'],

  COOKIE_STORAGE:['本机 Cookie 存储损坏或格式异常，未尝试发送。','从菜单清除学校会话后重新登录；不用删除课表。'],
  BACKUP_FAILED:['同步或核对前的本地备份无法写入或校验，已停止写入。','检查存储空间，保留现有状态。'],
  CALENDAR_TIMEOUT:['读取 Apple 日历超过 20 秒，未继续写入。','解锁设备，在前台检查日历权限和 iCloud 同步后重试。'],
  CALENDAR_VERIFY:['写后重新扫描尚未确认目标结果，事务已保留，不能报告成功。','等待 iCloud 更新后再运行；会按相同标记恢复，勿手动重复导入 ICS。'],
  MANAGED_SERIES:['本工具标记对应多个日期或已变成全天事件，可能是循环系列，已停止自动写入。','在 Apple 日历核对该系列，先做完整日历备份；本脚本不推断系列删除范围。'],
  MANAGED_INVITATION:['本工具标记事件已有邀请者，自动修改可能影响他人，已停止。','在 Apple 日历核对邀请信息和事件归属。'],

  COOKIE_DOMAIN:['学校响应包含与当前认证域名不匹配的 Cookie，安全校验拒绝接收；它可能是学校配置问题，也可能是旧脚本解析兼容问题。','更新脚本以安全跳过无效 Cookie，同时保留域名验证。不要关闭域名校验或分享 Cookie 内容。'],
  COOKIE_FORMAT:['学校响应包含格式异常的 Cookie，无法安全解析。','保留最近阶段记录供适配；不要上传含 Cookie 值的网络请求日志。'],
  LOGIN_SCHEMA:['学校返回的登录页面没有符合预期的密码认证表单；可能是页面升级、额外验证页或接口返回异常。','先运行「登录页面自检（无需密码）」；若仍失败，请保留诊断信息，不要反复提交密码。'],
  LOGIN_SALT_MISSING:['登录表单缺少 pwdEncryptSalt（密码加密盐）；不能安全生成学校要求的加密密码。','运行「登录页面自检（无需密码）」并检查是否进入学校官方登录页。'],
  LOGIN_EXECUTION_MISSING:['学校登录表单缺少 execution 认证流水字段，无法可靠提交登录请求。','运行「登录页面自检（无需密码）」；若持续发生，需要适配学校页面。'],
  LOGIN_FAILED:['学校没有确认登录成功；可能是密码不正确、验证码失败或登录页面变化，无法单凭此代码确定。','先在 Safari 验证学校账号是否能登录，再使用本程序。'],
  AUTH_REQUIRED:['学校登录 Cookie 已失效，而且尚未配置自动登录凭据。','从「账号与日历设置」选择「自动登录凭据」保存到 iCloud 钥匙串，或手动登录。'],
  AUTH_INTERACTIVE_REQUIRED:['Cookie 过期后自动登录时，学校要求图形验证码、滑块或二次认证。脚本不会绕过这些验证。','打开 Scripting 手动完成学校验证；成功后定时同步会继续。'],
  AUTO_LOGIN_REJECTED:['已尝试使用保存的 Keychain 凭据重新登录，但学校没有确认登录成功；可能是密码变更、账号异常或认证页面变化。','先在 Safari 验证账号，再在「账号与日历设置 → 自动登录凭据」中更新密码；不要频繁尝试。'],
  CREDENTIALS_INVALID:['本地保存的账号信息格式不正确，自动登录已停止。','从「账号与日历设置 → 自动登录凭据」删除并重新保存凭据。'],
  CREDENTIALS_UNAVAILABLE:['Scripting 当前无法读取或写入本机 Keychain；可能是系统限制、权限或凭据数据损坏。','解锁 iPhone 并在 Scripting 前台运行；检查保存的自动登录凭据。'],
  WEBVIEW_TIMEOUT:['Scripting 的本机输入界面超时。脚本将优先改用系统安全输入框；不能认定账号密码有误。','如果系统安全输入仍无法完成，请重新打开 Scripting 后再试。'],
  NETWORK_TIMEOUT:['一个学校网络请求等待超过 25 秒，没有得到完整响应。','检查 Wi-Fi、蜂窝网络或 VPN，稍后单次重试。'],
  NETWORK_CHAIN_TIMEOUT:['登录/数据请求涉及多次跳转，整组请求超过 75 秒。','检查当前网络是否能打开学校登录入口，并保留阶段日志。'],
  NETWORK_OFFLINE:['系统报告设备没有可用的网络连接。','检查设备联网后再试。'],
  NETWORK_DNS:['系统无法解析学校服务域名。','检查 DNS 或代理配置，尝试 Safari 打开学校登录地址。'],
  NETWORK_TLS:['学校连接遇到证书或 TLS 校验问题。','检查系统时间和 HTTPS 代理设置；不要关闭证书验证。'],
  NETWORK_LOST:['学校网络连接中途断开。','检查网络稳定性后重试。'],
  NETWORK:['网络请求失败，但系统没有返回可安全区分的具体原因。','尝试 Safari 打开学校登录入口，切换网络后单次重试。'],
  DOMAIN_BLOCKED:['认证跳转到了程序安全名单之外的域名。程序为了保护账号主动阻止了连接。','不要绕过限制；需要人工核实学校新认证域名后才能更新白名单。'],
  REDIRECT:['学校登录跳转缺少目标地址、出现循环或达到上限。','检查学校登录是否正常；保留诊断报告供适配。'],
  CAPTCHA:['验证码结果不符合预期，或学校返回的验证码结构发生变化。','重新运行并亲自完成学校验证码；避免反复提交。'],
  CALENDAR_MISSING:['之前保存的日历 ID 与当前日历不匹配，程序无法安全写入。','在「账号与日历设置」选择「重新绑定课表日历」，不要删除原日历。'],
  CALENDAR_PERMISSION:['iOS 阻止读取日历列表或日历访问接口失败。','在 iPhone 设置中将 Scripting 的「日历」权限改为「完全访问」。'],
  CALENDAR_NOT_VISIBLE:['没有找到可写入的「课表」日历。','检查日历 App 中是否存在该日历及 Scripting 的完全访问权限。'],
  BUSY:['同步锁显示可能有另一项同步正在进行，也可能是上次异常退出留下的锁。','避免同时运行两个任务；异常退出留下的正常锁在 20 分钟后会自动过期。'],
  LOCK_LOST:['运行过程中同步锁失效，程序为防止重复写入主动停止。','检查是否有两个同时运行的任务，停止自动化后检查同步锁。'],
  STATE_CORRUPT:['本地状态文件无法通过校验，不能安全恢复以前的同步进度。','不要清理状态目录或删除日历；先备份文件并检查。'],
  STATE_WRITE:['本地状态写入后校验失败，可能是存储空间或文件权限问题。','检查 iPhone 存储空间，保留旧状态文件，不要反复同步。'],
  BUDGET:['本次执行超过运行时间预算，程序停止以避免无限运行。','在前台再次运行，程序会尝试安全恢复未完成事务。'],
  SCHEMA:['教务系统返回的课程或学期数据结构不符合预期，为避免覆盖已有课表已停止。','请保留诊断信息，等待更新解析规则。'],
  HTTP_404:['学校服务器返回 404，所请求的具体接口可能已修改或暂时不可访问。','验证学校登录和课表页面在 Safari 是否正常，检查对应接口。'],
  HTTP_500:['学校服务器返回 500，服务端暂时出现异常。','稍后重试；如果持续发生，联系学校技术支持。'],
  HTTP_502:['学校服务网关返回 502。','等学校服务恢复再同步。'],
  HTTP_503:['学校服务暂不可用（503）。','稍后再试。'],
  HTTP_504:['学校服务网关等待超时（504）。','稍后再试，检查学校网络状态。'],
  CALENDAR_REBIND_UNSAFE:['旧课表记录与新日历无法安全核对，自动迁移可能制造重复课程。','不要删除旧日历；先检查以前同步的课程所在日历。'],
  CLEANUP_NO_BASELINE:['需要先有一份由 NUFE-Schedule 创建且已成功写入的课程，才能安全辨认旧重复日程。','先完成一次手动同步，再从菜单执行历史课程清理。'],
  CLEANUP_TX_PENDING:['当前存在尚未完成的日历写入事务，不能在此时删除旧课程。','先恢复并完成同步，再执行历史重复课程清理。'],
  CLEANUP_REMOVE_FAILED:['Apple 日历未能删除某条旧课程，覆盖操作中途停止；之前已删除的部分不会自动恢复。','先查看运行状态和备份，稍后重试「覆盖旧课程」；若旧课程是重复日程，可在 Apple 日历中选择删除整个重复系列。'],
  CLEANUP_BACKUP_FAILED:['删除前无法保存旧日程备份，程序已拒绝执行。','检查 Scripting 本地存储空间和文件读写权限。'],
  ACCOUNT_CHANGED:['当前认证账号与原课表账号不一致，程序主动阻止覆盖。','切换回原账号；不要直接覆盖旧日历。'],
  CANCELLED:['用户取消了当前操作，没有继续提交。','需要时重新进入菜单即可。'],
  SCRIPT_TYPE:['脚本遇到无法处理的数据类型；属于程序异常，尚不能确定根因。','保留失败阶段和诊断信息，供修正代码。'],
  SCRIPT_REFERENCE:['脚本引用了不存在的变量或接口；属于程序兼容性问题。','保留诊断信息供修复，不必重复输入密码。'],
  LOCAL_ERROR:['发生未分类的 Scripting/JavaScript 异常，无法可靠判断具体原因。','保留诊断报告，检查最近步骤；不要反复登录。']
};
function diagnosticCode(error){
  if(error&&typeof error.code==='string'&&/^[A-Z][A-Z0-9_]*$/.test(error.code))return error.code;
  if(error&&error.name==='TypeError')return 'SCRIPT_TYPE';
  if(error&&error.name==='ReferenceError')return 'SCRIPT_REFERENCE';
  return 'LOCAL_ERROR';
}
function reasonFor(code){return (ERROR_GUIDE[code]||[ERRORS[code]||('出现未收录错误（'+code+'），尚不能确认根因。'),'保留诊断报告供修复。'])[0];}
function actionFor(code){return (ERROR_GUIDE[code]||[null,'检查失败阶段、网络与登录入口；保留诊断报告供修复。'])[1];}
function briefTime(iso){if(!iso)return '无';try{return localDateTime(iso).replace(' ',' ');}catch(_){return '无';}}
function errorMessage(error,state){
  const code=diagnosticCode(error),stage=state&&state.lastStage||'尚未记录阶段';
  return '阶段：'+stage+'\n错误代码：'+code+'\n原因：'+reasonFor(code)+'\n建议：'+actionFor(code)+'\n时间：'+briefTime(new Date().toISOString())+'（北京时间）';
}
function stampStage(state,store,stage){
  const at=new Date().toISOString();
  state.lastStage=stage;state.lastStageAt=at;
  state.stageHistory=[...(state.stageHistory||[]),{at,stage}].slice(-30);
  store.write(state);
  // Console is safe: stage strings and requestLabel never contain secrets.
  if(typeof console!=='undefined'&&typeof console.log==='function')console.log('[NUFE] '+stage);
}
// One local reminder if a non-interactive step takes unusually long. No repeated notification spam.
function createProgress(state,store,interactive){
  const stage=message=>stampStage(state,store,message);stage.finish=()=>{};return stage;
}
// Recognize a previously bound calendar even if it has not yet been renamed.
// The legacy spelling is encoded solely to preserve migration compatibility.
const LEGACY_CALENDAR_TITLE='\u5357\u8d22\u8bfe\u8868';
function liveCalendar(c){return c&&c.allowsContentModifications&&!c.isSubscribed;}
async function visibleCalendars(){
  let all;try{all=await Calendar.forEvents();}catch(_){fail('CALENDAR_PERMISSION');}
  assert(Array.isArray(all),'CALENDAR_PERMISSION');return all;
}
async function containsManagedEvent(calendar,state){
  const examples=Object.values(state.semesters||{}).flatMap(s=>s.events||[]).slice(0,3);
  if(!examples.length)return true;
  for(const e of examples){
    const lo=new Date(Date.parse(e.start)-DAY),hi=new Date(Date.parse(e.end)+DAY);
    const list=await CalendarEvent.between(lo,hi,[calendar]);
    if(list.some(ev=>!!eventRecord(ev,state.owner,storedEventIndex(state))))return true;
  }
  return false;
}
// Preserve the bound calendar identifier; do not create a replacement calendar.
async function alignBoundCalendarName(calendar,state,store){
  let current=calendar;
  if(config.runsInApp&&String(calendar.title||'').trim()===LEGACY_CALENDAR_TITLE&&typeof calendar.save==='function'){
    try{
      calendar.title='课表';
      await calendar.save();
      current=(await visibleCalendars()).find(c=>c.identifier===calendar.identifier)||calendar;
    }catch(_){
      // If the calendar account does not allow renaming, retain the binding.
      try{current=(await visibleCalendars()).find(c=>c.identifier===calendar.identifier)||calendar;}catch(__){}
    }
  }
  if(state.calendarTitle!==current.title){state.calendarTitle=current.title;store.write(state);}
  return current;
}
async function pickCalendar(state,store,force=false){
  const all=await visibleCalendars();
  const exact=all.find(c=>liveCalendar(c)&&c.identifier===state.calendarId);
  if(exact&&!force)return await alignBoundCalendarName(exact,state,store);
  // A changed calendar ID is NEVER silently adopted in background automation.
  if(!config.runsInApp||String(args.shortcutParameter||'').startsWith('sync'))fail('CALENDAR_MISSING');
  // Allow the old title during migration, but prefer the new name.
  let candidates=all.filter(c=>liveCalendar(c)&&String(c.title||'').trim()==='课表');
  if(!candidates.length)candidates=all.filter(c=>liveCalendar(c)&&String(c.title||'').trim()===LEGACY_CALENDAR_TITLE);
  assert(candidates.length,'CALENDAR_NOT_VISIBLE');
  let picked;
  if(candidates.length===1){
    picked=candidates[0];
    if(!await confirm('绑定目标日历',
       '检测到唯一一个可编辑的「课表」日历（或尚未更名的旧日历）。'+
       (state.calendarId&&state.calendarId!==picked.identifier?'\n原日历 ID 与当前不一致，需要重新绑定。':'')+
       '\n专用课表日历模式：新教务数据写入核验后，会自动备份并删除该日历中的旧导入内容（含循环系列）。此日历必须只放可替换的课表；不会操作其他日历。'))fail('CANCELLED');
  }else{
    await notice('请选择准确的目标日历','检测到多个同名日历。请选择原来用于课表同步的同一个日历。如无法区分，请取消以免写入错误日历。');
    const selected=await Calendar.presentPicker(false);
    picked=Array.isArray(selected)?selected[0]:null;
    assert(picked&&candidates.some(c=>c.identifier===picked.identifier),'CALENDAR_MISSING');
    if(!await confirm('确认日历','已选择「'+picked.title+'」。确认这是原来绑定的课表专用日历？'))fail('CANCELLED');
  }
  if(state.calendarId&&state.calendarId!==picked.identifier){
    // Prevent continuing a partially applied transaction in a different calendar.
    assert(!state.tx,'CALENDAR_REBIND_UNSAFE');
    assert(await containsManagedEvent(picked,state),'CALENDAR_REBIND_UNSAFE');
  }
  state.calendarId=picked.identifier;state.calendarTitle=picked.title;
  state.lastStage='日历已绑定';state.lastStageAt=new Date().toISOString();
  store.write(state);return await alignBoundCalendarName(picked,state,store);
}
async function repairSyncLock(store){
  const p=store.path('run-lock.json');
  if(!store.fm.fileExists(p)){await notice('同步锁检查','没有发现同步锁。可以直接运行主菜单里的同步。');return;}
  let before,parsed=null;
  try{before=store.fm.readString(p);parsed=JSON.parse(before);}catch(_){before=store.fm.readString(p);}
  const at=parsed&&Number(parsed.at),age=Number.isFinite(at)?Math.round((Date.now()-at)/1000):null;
  const desc=age===null?'未知':age<0?'设备时间早于锁时间':Math.floor(age/60)+' 分 '+age%60+' 秒';
  const a=new Alert();a.title='检查同步锁';
  a.message='发现 run-lock.json\n锁创建距今：'+desc+'\n\n仅清除同步状态锁，不会删除课程、日历或账号。请先停止所有正在运行的 Scripting 脚本及快捷指令自动化；只有确认没有其他同步任务后才能清除。';
  a.addDestructiveAction('确定没有其他任务运行，清除锁');a.addCancelAction('保留锁');
  if(await a.presentAlert()!==0)return;
  if(!store.fm.fileExists(p)||store.fm.readString(p)!==before){await notice('未清除','同步锁在操作期间改变，请停止其他任务后重新检查。');return;}
  store.fm.remove(p);await notice('已清除同步锁','现在可以在主菜单里重新绑定日历或手动同步。');
}
function statusText(state){
  const s=Object.values(state.semesters||{}).map(t=>(t.name||'学期')+'：'+(t.events||[]).length+' 节，成功同步 '+(t.lastSuccess?localDateTime(t.lastSuccess):'待确认')+(t.pending?'；待核对删除':'')+'；未排课 '+(t.skipped||[]).length).join('\n');
  const recent=state.lastFailure||null;
  const running=state.runStatus==='running'&&state.runStartedAt;
  const elapsed=running?Math.max(0,Math.floor((Date.now()-Date.parse(state.lastStageAt||state.runStartedAt))/1000)):0;
  return (s?s+'\n':'')+
    '已配置日历：'+(state.calendarId?'是':'否')+
    '\n本次运行：'+(state.runStatus==='running'?(elapsed>120?'超过 2 分钟无阶段更新（可能仍在执行或已被 iOS 终止）':'运行中或上次被中断'):(state.runStatus||'尚未开始'))+
    '\n本次开始：'+briefTime(state.runStartedAt)+
    '\n当前/最后阶段：'+(state.lastStage||'未知')+
    '\n最后进展：'+briefTime(state.lastStageAt)+
    '\n事务：'+(state.tx?'待恢复':'无')+'\n取消变动：自动同步（专用课表日历）'+
    '\n登录会话：'+(state.authPaused?'需要人工处理':'未检测到强制重新登录')+
    '\n自动登录：'+(hasSavedCredentials()?'已启用（Keychain）':'未启用')+
    '\n失效通知：'+(state.authExpiryNotifiedAt?'已提醒 '+briefTime(state.authExpiryNotifiedAt):(state.authNoticeError==='NOTIFICATION_FAILED'?'通知提交失败，请检查权限':'尚未触发'))+
    '\n上次专用日历清理：'+(state.lastLegacyCleanupAt?briefTime(state.lastLegacyCleanupAt)+'，删除 '+(state.lastLegacyCleanupCount||0)+' 次，核验剩余 '+(state.lastLegacyCleanupRemaining||0)+' 条':'尚未执行')+
    '\n课程提醒：'+(state.reminderError?'提交失败，请检查通知权限':'未检测到提交错误')+
    '\n连续失败：'+(state.failures||0)+
    '\n最近一次失败：'+(recent?briefTime(recent.at):'无')+
    '\n最近错误：'+(recent?recent.code:(state.lastError||'无（旧版记录）'))+
    '\n失败所在阶段：'+(recent?recent.stage:'暂无本次失败记录')+
    '\n原因：'+(recent?reasonFor(recent.code):'尚无可确认的最新错误')+
    '\n建议：'+(recent?actionFor(recent.code):'若一直转圈，检查上方阶段及最近步骤')+
    '\n最近步骤（北京时间）：'+(state.stageHistory||[]).slice(-10).map(x=>'\n'+briefTime(x.at)+' '+x.stage).join('')+
    '\n已导入学期：'+Object.keys(state.semesters||{}).length+' / '+(state.availableSemesters||[]).length+
    '\n学期读取失败：'+(state.termErrors||[]).map(x=>x.sid+' '+x.code).join('；');
}
// Verified first teaching-week Mondays from the original project's semesters.json.
// Keep this allow-list local: no additional server, tracking, or third-party endpoint.
// A guessed school reporting/start date must NEVER silently shift all class events.
const VERIFIED_TERM_ANCHORS=Object.freeze({
  '2024-2025-1':'2024-09-02',
  '2024-2025-2':'2025-02-24',
  '2025-2026-1':'2025-09-01',
  '2025-2026-2':'2026-02-23',
  '2026-2027-1':'2026-09-07'
});
function normalizeTermName(name){return String(name||'').replace(/[－—–]/g,'-').replace(/\s+/g,'').trim();}
function explicitTeachingMonday(detail){
  if(!detail||typeof detail!=='object')return null;
  // Only auto-accept fields that explicitly describe teaching week 1.
  const keys=['firstTeachingWeekMonday','firstTeachingWeekStartDate','teachingWeek1Monday','firstWeekMonday','firstWeekStartDate','week1StartDate','teachingStartDate'];
  for(const k of keys){
    if(!Object.prototype.hasOwnProperty.call(detail,k))continue;
    const v=detail[k];if(typeof v!=='string')continue;
    const m=/^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(v);if(!m)continue;
    if(/Monday$/.test(k)){try{return monday(m[1]);}catch(_){continue;}}
    const d=detailMonday({startDate:m[1]});if(d)return monday(d);
  }
  return null;
}
async function chooseAnchor(sid,name,http,state,store,interactive) {
  if(state.anchors[sid])return monday(state.anchors[sid]);
  const termName=normalizeTermName(name);
  let anchor=VERIFIED_TERM_ANCHORS[termName];
  if(anchor){
    // First run on 2026-2027-1: use the same date as upstream, without a dialog.
    anchor=monday(anchor);
    state.anchors[sid]=anchor;
    state.anchorSources={...(state.anchorSources||{}),[sid]:'upstream-semesters.json'};
    store.write(state);
    return anchor;
  }
  // Prefer an explicit first-teaching-week field when available. The official
  // semester start date is also a valid schedule baseline for this timetable
  // system: normalize it to Monday, consistent with the semester API consumer.
  // Never invent a date when the school returns no usable dates.
  let suggestion=null, lookupError=null;
  try{
    const detail=await http.json(JW+'/student/ws/semester/get/'+sid);
    anchor=explicitTeachingMonday(detail);
    if(anchor){
      state.anchors[sid]=anchor;
      state.anchorSources={...(state.anchorSources||{}),[sid]:'school-teaching-week'};
      store.write(state);
      return anchor;
    }
    // Semester detail supplies the start of the school's term even when there
    // is no dedicated "first teaching week" field. Convert to week-1 Monday
    // automatically, so historical semesters do not require repeated dialogs.
    suggestion=detailMonday(detail);
    if(suggestion){
      anchor=monday(suggestion);
      state.anchors[sid]=anchor;
      state.anchorSources={...(state.anchorSources||{}),[sid]:'school-semester-start'};
      store.write(state);
      return anchor;
    }
  }catch(e){lookupError=e&&e.code||'NETWORK';}
  if(!interactive)fail('ANCHOR');
  const a=new Alert();a.title='需核对 '+name+' 校历';
  a.message='学校学期接口未返回可用的起始日期，暂时无法安排该学期课程。'+
    (lookupError?'\n校历接口请求失败：'+lookupError+'。':'')+
    '\n请依据学校校历填写第 1 周的周一；正常取得学期起始日期时无需手动填写。';
  a.addTextField('YYYY-MM-DD',suggestion||'');a.addAction('保存');a.addCancelAction('取消');
  if(await a.presentAlert()<0)fail('CANCELLED');
  const value=monday(a.textFieldValue(0).trim());
  state.anchors[sid]=value;
  state.anchorSources={...(state.anchorSources||{}),[sid]:'manual-verified'};
  store.write(state);return value;
}

// Migrate notes only AFTER event ID indexes are durably committed.
// All new calendar writes still begin with a recovery marker for crash safety.
async function polishTermNotes(calendar,state,store,sid,budget,progress=()=>{}){
  const term=state.semesters[String(sid)];
  if(!term||term.notesFormat===2)return;
  const adapter=new CalendarAdapter(calendar,state.owner,store,budget,state);
  const rows=(await adapter.scan(term.anchor,term.events)).filter(x=>x.rec.sid===String(sid));
  for(const rec of term.events){
    budget();
    const items=rows.filter(x=>x.rec.id===rec.id);
    assert(items.length===1,'CALENDAR_VERIFY');
    const ev=items[0].ev,visible=readableNotes(rec,term.lastSuccess);
    if(ev.notes===visible)continue;
    assert(!ev.hasRecurrenceRules&&!ev.recurrenceRules?.length,'MANAGED_SERIES');
    const nativeId=ev.identifier;ev.notes=visible;
    progress('整理课程备注：'+rec.title);
    await ev.save();budget();
    if(ev.identifier!==nativeId){term.index[rec.id]=ev.identifier;store.write(state);}
  }
  term.notesFormat=2;store.write(state);
}
function matchesOldCourse(ev,rec){
  if(!ev||ev.isAllDay||!ev.startDate||!ev.endDate)return false;
  if(+ev.startDate!==Date.parse(rec.start)||+ev.endDate!==Date.parse(rec.end))return false;
  const norm=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
  const before=norm(ev.title),after=norm(rec.title);
  if(before===after)return true;
  return (rec.teachers||[]).some(name=>[' - ',' — ','-','－','—'].some(sep=>before===after+sep+norm(name)));
}
// Remove only verified duplicates of lessons already saved and backed up.
// The same bounded calendar is scanned again after removal.
async function removeMatchedOldCourses(calendar,state,store,sid,budget,progress=()=>{}){
  const term=state.semesters[String(sid)];
  if(!term||term.legacyMatchedCleanAt||!term.events?.length)return;
  const low=Math.min(...term.events.map(e=>Date.parse(e.start)))-DAY;
  const high=Math.max(...term.events.map(e=>Date.parse(e.end)))+DAY;
  assert(Number.isFinite(low)&&Number.isFinite(high)&&high-low<=366*DAY,'SCAN_RANGE');
  const rows=new Map();
  for(let at=low;at<high;at+=45*DAY){
    budget();progress('核对旧课程：'+localDateTime(new Date(at).toISOString()).slice(0,10));
    for(const ev of await calendarRows(at,Math.min(at+45*DAY,high),calendar))rows.set(occurrenceKey(ev),ev);
  }
  const keep=new Set(Object.values(term.index||{}));
  const candidates=[...rows.values()].filter(ev=>
    !keep.has(ev.identifier)&&ev.calendar?.identifier===state.calendarId&&!ev.attendees?.length&&
    term.events.some(rec=>matchesOldCourse(ev,rec))
  );
  if(!candidates.length){term.legacyMatchedCleanAt=new Date().toISOString();store.write(state);return;}
  const stamp=new Date().toISOString(),base='重复旧课程清理前-'+stamp.replace(/[:.]/g,'-');
  writeVerified(store,base+'.ics',backupLegacyICS(candidates));
  writeVerified(store,base+'.json',JSON.stringify({calendarId:calendar.identifier,sid:String(sid),at:stamp,
    limitation:'Recurring series deletion may affect occurrences beyond the scanned range.',events:candidates.map(snapshotFields)},null,2));
  state.lastLegacyBackupName=base+'.ics';state.lastLegacyReportName=base+'.json';store.write(state);
  let count=0;
  for(const original of candidates){
    budget();
    const rowsNow=await calendarRows(+original.startDate-1000,+original.endDate+1000,calendar);
    const old=rowsNow.find(x=>occurrenceKey(x)===occurrenceKey(original));
    if(!old)continue;
    assert(snapshotSignature(old)===snapshotSignature(original),'LEGACY_CHANGED');
    const lesson=term.events.find(rec=>matchesOldCourse(old,rec));
    assert(lesson,'LEGACY_CHANGED');
    const keeper=rowsNow.find(x=>x.identifier===term.index[lesson.id]&&+x.startDate===Date.parse(lesson.start));
    assert(keeper&&eventRecord(keeper,state.owner,storedEventIndex(state)),'CALENDAR_VERIFY');
    await old.remove();count++;
    progress('移除重复旧课程：'+count+' / '+candidates.length);
  }
  const leftovers=new Map();
  for(let at=low;at<high;at+=45*DAY){
    budget();for(const ev of await calendarRows(at,Math.min(at+45*DAY,high),calendar))leftovers.set(occurrenceKey(ev),ev);
  }
  assert(![...leftovers.values()].some(ev=>!keep.has(ev.identifier)&&term.events.some(rec=>matchesOldCourse(ev,rec))),'LEGACY_VERIFY');
  term.legacyMatchedCleanAt=new Date().toISOString();
  state.lastLegacyCleanupCount=(state.lastLegacyCleanupCount||0)+count;
  store.write(state);
}
async function finishTx(state,store,adapter,budget) {
  const tx=state.tx;
  const live=await adapter.scan(tx.anchor,[...tx.before,...tx.target]);
  if(!tx.backupName){
    const name='同步前快照-'+tx.id+'.json';
    writeVerified(store,name,JSON.stringify({version:1,calendarId:adapter.calendar.identifier,before:tx.before,target:tx.target,visible:live.map(x=>({record:x.rec,notes:x.ev.notes||''})),stamp:tx.stamp},null,2));
    tx.backupName=name;state.lastSyncBackupName=name;store.write(state);
  }
  assert(store.fm.fileExists(store.path(tx.backupName)),'BACKUP_FAILED');
  let backup;try{backup=JSON.parse(store.fm.readString(store.path(tx.backupName)));}catch(_){fail('BACKUP_FAILED');}
  assert(backup.calendarId===adapter.calendar.identifier&&JSON.stringify(backup.before)===JSON.stringify(tx.before)&&JSON.stringify(backup.target)===JSON.stringify(tx.target),'BACKUP_FAILED');
  // The user authorized unattended replacement/cancellation of installation-owned courses.
  tx.deletionsConfirmed=true;
  const obsolete=tx.before.filter(e=>{const n=tx.target.find(n=>n.id===e.id);return !n||!same(e,n);}).map(e=>'nufe-local-class-'+state.owner+'-'+e.id);
  if(obsolete.length)await Notification.removePending(obsolete);
  const index=await applyTransaction(tx,adapter,budget);
  const oldTerm=state.semesters[tx.sid];
  const sourceChanges=tx.changes.added+tx.changes.removed+tx.changes.changed;
  state.semesters[tx.sid]={events:tx.target,index,anchor:tx.anchor,name:tx.name,lastSuccess:new Date().toISOString(),skipped:tx.skipped,
    notesFormat:(sourceChanges||adapter.hasMarkerWrites)?1:(oldTerm?.notesFormat||1),
    legacyMatchedCleanAt:sourceChanges?null:(oldTerm?.legacyMatchedCleanAt||null)};
  const count=tx.changes.added+tx.changes.removed+tx.changes.changed;
  if(tx.hadBaseline&&count)state.notice={id:tx.id,body:'检测到 '+count+' 项课程变化：新增 '+tx.changes.added+'，取消 '+tx.changes.removed+'，调整 '+tx.changes.changed+'。'+tx.changes.examples.join('；')};
  state.tx=null;store.write(state);
  await polishTermNotes(adapter.calendar,state,store,tx.sid,budget);
  await removeMatchedOldCourses(adapter.calendar,state,store,tx.sid,budget);
  await refreshReminders(state,store);
}
function selectTermIds(info,state,allTerms){
  const available=[...new Set(info.semesters.map(s=>s.id))];
  assert(available.includes(info.current),'SCHEMA');
  const rest=available.filter(sid=>sid!==info.current);
  if(allTerms)return [info.current,...rest];
  if(!rest.length)return [info.current];
  const start=((Number(state.cursor)||0)%rest.length+rest.length)%rest.length;
  const count=Math.min(2,rest.length);
  const selected=Array.from({length:count},(_,i)=>rest[(start+i)%rest.length]);
  state.cursor=(start+count)%rest.length;
  return [info.current,...selected];
}
async function synchronize(state,store,calendar,interactive,allTerms=false,progress=null) {
  // Auto reauthentication needs several requests. iOS may still impose a shorter runtime.
  const begun=Date.now(),limit=interactive?15*60000:(hasSavedCredentials()?90000:20000);
  const budget=()=>{store.check();if(Date.now()-begun>limit)fail('BUDGET');};
  const adapter=new CalendarAdapter(calendar,state.owner,store,budget,state);
  // A pending target is rebased on a fresh school response before any resume write.
  const interrupted=state.tx;
  if(state.notice){state.notice=null;store.write(state);}
  const jar=readCookieJar();
  const stage=progress||((message)=>stampStage(state,store,message));
  const http=new HTTP(jar,c=>Keychain.set(KEY,JSON.stringify(c)),budget,stage);
  const info=pageInfo(await coursePage(http,interactive,stage));
  const accountKey='NUFE.Local.v1.person';
  if(Keychain.contains(accountKey))assert(Keychain.get(accountKey)===info.person,'ACCOUNT_CHANGED');else Keychain.set(accountKey,info.person);
  state.availableSemesters=info.semesters;store.write(state);
  // Foreground covers all school-listed terms; background rotates two older terms.
  let sids=selectTermIds(info,state,allTerms);store.write(state);
  if(interrupted){assert(info.semesters.some(t=>String(t.id)===interrupted.sid),'TX_TERM_UNAVAILABLE');sids=[Number(interrupted.sid),...sids.filter(s=>String(s)!==interrupted.sid)];}
  state.termErrors=[];
  for(const sid of sids) {
    try {
    budget();stage('读取学期 '+sid);const name=(info.semesters.find(s=>s.id===sid)||{}).name||String(sid);
    const anchor=await chooseAnchor(sid,name,http,state,store,interactive);
    stage('请求学期 '+sid+' 课表数据');
    const raw=await http.json(TABLE+'/semester/'+sid+'/print-data?'+form({semesterId:sid,hasExperiment:'true'}));
    const normalized=expand(raw,sid,anchor);
    if(normalized.studentCode){const studentKey='NUFE.Local.v1.student';if(Keychain.contains(studentKey))assert(Keychain.get(studentKey)===normalized.studentCode,'ACCOUNT_CHANGED');else Keychain.set(studentKey,normalized.studentCode);}
    let old=state.semesters[sid];
    if(interrupted&&interrupted.sid===String(sid)){const recovered=new Map([...interrupted.before,...interrupted.target].map(e=>[e.id,e]));old={...(old||{}),events:[...recovered.values()]};}
    // Recover local logical IDs from managed event notes when term index is absent.
    if(!old){const recovered=(await adapter.scan(anchor,normalized.events)).filter(x=>x.rec.sid===String(sid)).map(x=>x.rec);const by=new Map();for(const e of recovered)by.set(e.id,e);old={events:[...by.values()]};}
    assert(normalized.events.length||!old.events.length,'EMPTY_SOURCE');
    const p=plan(old.events,normalized.events,uuid);const approved=true;
    // Ambiguous moved lessons are represented as remove+add; no relationship is invented.
    // Persist the complete target BEFORE touching EventKit. Future resume uses these IDs.
    stage('写入学期 '+sid+' 的日历事件');
    state.tx={id:uuid(),sid:String(sid),anchor,name,hadBaseline:!!state.semesters[sid],deletionsConfirmed:approved,before:old.events,target:p.events,stamp:new Date().toISOString(),skipped:normalized.skipped,changes:{added:p.added.length,removed:p.removed.length,changed:p.changed.length,examples:[...p.changed.map(e=>e.title+' 已调整'),...p.added.map(e=>e.title+' 新增')].slice(0,3)}};
    store.write(state);await finishTx(state,store,adapter,budget);
    if(state.notice){state.notice=null;store.write(state);}
    } catch(e) {
      if(state.tx||(!allTerms&&sid===info.current)||['AUTH_REQUIRED','CANCELLED','BUDGET','LOCK_LOST','ACCOUNT_CHANGED'].includes(e.code))throw e;
      state.termErrors.push({sid:String(sid),code:e.code||'LOCAL_ERROR'});store.write(state);
    }
  }
  if(state.termErrors.length&&allTerms)fail('PARTIAL_SYNC');
  // Never purge unrecognized content before every term has a verified baseline.
  const allTermBaselinesReady=info.semesters.every(x=>state.semesters[String(x.id)]?.lastSuccess);
  if(REPLACE_DEDICATED_LEGACY&&allTermBaselinesReady&&!state.termErrors.length){
    stage('全部学期核验完成后清理专用日历旧内容');
    await replaceDedicatedLegacy(calendar,state,store,message=>{budget();stage(message);});
  }
  state.reviewPending=false;state.failures=0;state.lastError=null;state.lastStage='同步检查完成';state.authPaused=false;state.authExpiryNotifiedAt=null;state.authNoticeError=null;state.nextAttempt=0;state.lastCheck=new Date().toISOString();state.audit=[...(state.audit||[]),{at:state.lastCheck,status:state.termErrors.length||state.reviewPending?'partial':'checked'}].slice(-50);store.write(state);
  await refreshReminders(state,store);
}
// GET-only login-page preflight: does not ask for a password or modify the calendar.
async function loginPreflight(state,store,progress){
  progress('登录自检：访问学校认证入口');
  const jar=readCookieJar();
  const http=new HTTP(jar,c=>Keychain.set(KEY,JSON.stringify(c)),()=>store.check(),progress);
  const r=await http.get(SSO);
  if(safeURL(r.url).host==='jwxt.nufe.edu.cn'){
    progress('登录自检：核对教务页面');
    pageInfo(r.text);
    return '当前会话可直接访问课表，学校登录跳转和课表页面正常。';
  }
  progress('登录自检：检查表单字段');
  const f=await fieldsFrom(r.text,'pwdFromId');
  if(!f)fail('LOGIN_SCHEMA');
  if(!f.salt)fail('LOGIN_SALT_MISSING');
  if(!f.execution)fail('LOGIN_EXECUTION_MISSING');
  return '认证入口可访问，密码加密盐和认证字段均已找到。此检查未提交账号密码，也未写入课程。';
}
async function widget(store) {
  if(typeof ListWidget==='undefined'){
    if(typeof console!=='undefined'&&typeof console.warn==='function')console.warn('[NUFE] 当前环境不支持 Scriptable 样式 ListWidget');
    return;
  }
  const state=store.read(),w=new ListWidget(),now=Date.now(),local=new Date(now+8*3600000),day=local.toISOString().slice(0,10),mode=String(args.widgetParameter||'today');
  const midnight=Date.parse(day+'T00:00:00+08:00');let start=midnight,end=start+DAY;
  if(mode==='tomorrow'){start+=DAY;end+=DAY;}if(mode==='week'){start-=((local.getUTCDay()+6)%7)*DAY;end=start+7*DAY;}
  const events=Object.values(state.semesters).flatMap(s=>s.events||[]).sort((a,b)=>a.start.localeCompare(b.start));
  let selected=events.filter(e=>Date.parse(e.start)>=start&&Date.parse(e.start)<end);
  if(mode==='current')selected=events.filter(e=>Date.parse(e.start)<=now&&Date.parse(e.end)>now);
  if(mode==='next')selected=events.filter(e=>Date.parse(e.start)>now).slice(0,1);
  const family=config.widgetFamily||'medium',small=family.startsWith('accessory');
  w.addText('NUFE · '+(mode==='week'?'本周':mode==='tomorrow'?'明天':mode==='next'?'下一节':mode==='current'?'当前':'今天')).font=Font.boldSystemFont(small?12:15);
  for(const e of selected.slice(0,small?1:family==='large'?9:3)){if(!small)w.addSpacer(5);w.addText((Date.parse(e.start)<=now&&Date.parse(e.end)>now?'● ':'')+localDateTime(e.start).slice(mode==='week'?5:11)+' '+e.title).font=Font.systemFont(small?11:13);if(!small)w.addText(e.location).font=Font.systemFont(11);}
  if(!selected.length)w.addText('此范围暂无课程');
  if(!small){w.addSpacer();const success=Object.values(state.semesters).map(s=>s.lastSuccess).filter(Boolean).sort()[0];w.addText(state.tx?'同步待恢复':!success||now-Date.parse(success)>2*DAY?'课表可能过期，点按刷新':'仅本地缓存').font=Font.systemFont(10);}
  w.url=HostScript.createRunURLScheme(HostScript.name,{mode:'menu'});w.refreshAfterDate=new Date(now+30*60000);Script.setWidget(w);
}
// Credentials are opt-in and iCloud-synchronizable; cookies and device IDs stay device-only.
// install only trusted scripts, and do not export keys/values to diagnostics.
async function manageSavedCredentials(state,store){
  let current=null,damaged=false;try{current=readSavedCredentials();}catch(e){if(['CREDENTIALS_INVALID','CREDENTIALS_UNAVAILABLE'].includes(e.code)){damaged=true;}else throw e;}
  const present=hasSavedCredentials();
  const menu=new Alert();menu.title='iCloud 自动登录凭据';
  menu.message=damaged?'保存的登录凭据格式异常或暂不可读取，请检查后重新保存。':
    current?'已保存账号 '+maskedAccount(current.username)+'（密码不显示）。'+
      (state.credentialCloudStatus==='conflict'?'本机与 iCloud 凭据不一致；当前优先使用本机账号，请手动更换或确认。':
       state.credentialCloudStatus==='unavailable'?'iCloud 迁移尚未完成，暂时保留本机凭据。':'Cookie 失效时可自动重新登录。'):
    '尚未保存账号密码。保存到 iCloud 钥匙串后，可在其他已同步设备上使用。';
  menu.addAction(present?'更换账号或密码':'保存账号与密码');
  if(present)menu.addDestructiveAction('删除保存的账号与密码');
  menu.addCancelAction('关闭');
  const choice=await menu.presentSheet();if(choice<0)return;
  if(choice===0){
    const account=await credentialForm({title:'保存登录凭据'});
    saveCredentials(account.username,account.password);
    state.credentialCloudStatus='synced';
    // After user explicitly updates credentials, allow the next timed check.
    state.authPaused=false;state.authExpiryNotifiedAt=null;state.nextAttempt=0;store.write(state);
    await notice('已启用自动重新登录','登录凭据已保存到 iCloud 钥匙串（同步到其他设备可能需要时间）。Cookie 仍在本机，失效时会尝试用账号密码重新登录；尚未验证学校是否接受当前凭据。');
  }else if(present&&choice===1){
    if(!await confirm('确认删除同步凭据','将从 iCloud 钥匙串删除登录凭据，其他已同步设备也会失去该副本。现有课表与各设备本机 Cookie 不受影响。'))return;
    removeSavedCredentials();state.credentialCloudStatus=null;store.write(state);
    await notice('已关闭自动登录','登录凭据已从 iCloud 钥匙串及本机旧存储中删除。');
  }
}
async function refreshResult(ok,code=null){
  const n=new Notification();n.identifier='nufe-local-refresh-result';n.title=code==='PARTIAL_SYNC'?'NUFE 课表 · 部分完成':'NUFE 课表 · 刷新'+(ok?'成功':'失败');
  n.body=code==='PARTIAL_SYNC'?'已更新可用学期，部分旧学期尚未完成；请在管理界面查看详情。':ok?'课表已更新并重新扫描核验。':('原因：'+reasonFor(code||'LOCAL_ERROR'));
  n.sound=null;n.openURL=HostScript.createRunURLScheme(HostScript.name,{mode:'menu'});await n.schedule();
}
async function run() {
  __NUFE_BOOT_PHASE='初始化本地存储';
  const store=new Store();if(config.runsInWidget){await widget(store);Script.complete();return;}
  let firstSetup=false;
  if(HostScript.env==='index'){try{const initial=store.read();firstSetup=!initial.calendarId||(!Keychain.contains(KEY)&&!hasSavedCredentials());}catch(_){}}
  if(firstSetup)args.shortcutParameter='setup';
  const parameter=String(args.shortcutParameter||'').trim();
  const scheduled=/^sync(?:$|\s)/.test(parameter),interactive=config.runsInApp&&!scheduled;
  let state,locked=false,progress=null,action=0;
  try {
    if(interactive&&!firstSetup){
      state=store.read();
      const menu=new Alert();menu.title='NUFE 课表';
      menu.message=state.lastCheck?'上次刷新：'+localDateTime(state.lastCheck):'首次使用请刷新并绑定专用课表日历。';
      ['立即刷新','账号与日历设置','运行状态'].forEach(x=>menu.addAction(x));menu.addCancelAction('关闭');
      const selected=await menu.presentSheet();if(selected<0)return;
      if(selected===2){await notice('运行状态',statusText(state));return;}
      if(selected===1){
        const settings=new Alert();settings.title='账号与日历设置';
        ['自动登录凭据','课表日历','更多操作'].forEach(x=>settings.addAction(x));settings.addCancelAction('返回');
        const choice=await settings.presentSheet();if(choice<0)return;
        if(choice===2){
          const advanced=new Alert();advanced.title='更多操作';
          ['清除学校会话','导出最近备份','检查同步锁'].forEach(x=>advanced.addAction(x));
          advanced.addCancelAction('返回');
          const selected=await advanced.presentSheet();if(selected<0)return;
          action=[5,16,17][selected];
        }else action=[13,7][choice];
        if(action===17){
          // Lock inspection must work without acquiring an already held lock.
          // Never clear it automatically: another scheduled run may be active.
          await repairSyncLock(store);return;
        }
        if(action===16){
          const names=[state.lastSyncBackupName,state.lastLegacyBackupName,state.lastLegacyReportName].filter(n=>n&&store.fm.fileExists(store.path(n)));
          if(!names.length){await notice('暂无备份','开始写入课表或清理旧内容前会自动生成本地备份。');return;}
          await ShareSheet.present([...new Set(names)].map(n=>store.path(n)));return;
        }
      }
    }
    store.acquire();locked=true;state=store.read();
    if(!state.owner){state.owner=uuid();store.write(state);}
    // Attempt one safe password migration per invocation. Failures never block
    // existing local credentials or trigger repeated school login attempts.
    if(Keychain.contains(CRED_KEY)){
      try{
        const migrated=migrateSavedCredentials();
        state.credentialCloudStatus=migrated==='conflict'?'conflict':'synced';
      }catch(_){state.credentialCloudStatus='unavailable';}
      store.write(state);
    }
    // This deployment requests final refresh results only. Remove legacy class alerts.
    if(state.notificationMode!=='result-only-v1.9'){
      state.notificationMode='result-only-v1.9';state.minutes=0;store.write(state);
      await refreshReminders(state,store);
    }
    if(action===13){await manageSavedCredentials(state,store);return;}
    if(action===5){
      if(Keychain.contains(KEY))Keychain.remove(KEY);state.authPaused=false;state.authExpiryNotifiedAt=null;state.nextAttempt=0;store.write(state);
      await notice('学校会话已清除','课表和自动登录凭据已保留。下次刷新将重新认证；Scripting 底层 Cookie 容器没有公开清空接口，学校仍可能识别已有会话。');return;
    }
    if(action===7){const c=await pickCalendar(state,store,true);await notice('日历已绑定',c.title+'：只用于可替换的课表。旧内容会在新课表写入核验后自动清理。');return;}
    if(!interactive){
      if(state.authPaused){await refreshResult(false,state.lastError||'AUTH_REQUIRED');if(config.runsWithSiri)Script.setShortcutOutput('刷新失败：登录需要处理，旧课表保留。');return;}
      if(state.nextAttempt&&Date.now()<state.nextAttempt){await refreshResult(false,'RETRY_LATER');if(config.runsWithSiri)Script.setShortcutOutput('刷新失败：处于失败退避等待期。');return;}
      if(!state.calendarId)fail('CALENDAR_MISSING');
    }
    state.runStatus='running';state.runStartedAt=new Date().toISOString();state.runCompletedAt=null;store.write(state);
    __NUFE_BOOT_PHASE='同步运行';
    progress=createProgress(state,store,interactive);progress('检查目标日历');
    const calendar=await pickCalendar(state,store);
    await synchronize(state,store,calendar,interactive,interactive,progress);
    progress('完成本次同步');state.runStatus=state.termErrors?.length?'partial':'success';state.runCompletedAt=new Date().toISOString();store.write(state);
    if(interactive)await notice('刷新成功','已完成可用学期的课表更新和核验。');else await refreshResult(!state.termErrors?.length,state.termErrors?.length?'PARTIAL_SYNC':null);
    if(config.runsWithSiri)Script.setShortcutOutput(state.termErrors?.length?'部分完成：部分旧学期未同步，请前台核查。':'刷新成功：NUFE 课表已更新并核验。');
  }catch(e){
    const code=diagnosticCode(e);
    if(state&&locked){
      const at=new Date().toISOString();state.runStatus=code==='CANCELLED'?'cancelled':'failed';state.runCompletedAt=at;
      if(!['BUSY','LOCK_LOST','CANCELLED'].includes(code)){
        state.failures=(state.failures||0)+1;state.nextAttempt=Date.now()+Math.min(DAY,30*60000*2**Math.min(state.failures-1,6));
        if(['AUTH_REQUIRED','AUTH_INTERACTIVE_REQUIRED','AUTO_LOGIN_REJECTED','CREDENTIALS_INVALID','CREDENTIALS_UNAVAILABLE','ACCOUNT_CHANGED','WEBVIEW_TIMEOUT','LOGIN_SCHEMA','LOGIN_SALT_MISSING','LOGIN_EXECUTION_MISSING','MFA_UNSUPPORTED'].includes(code))state.authPaused=true;
      }
      if(code!=='CANCELLED'){
        state.lastError=code;state.lastAttempt=at;state.lastFailure={at,code,stage:state.lastStage||'尚无阶段记录'};
        state.audit=[...(state.audit||[]),{at,status:'failed',code}].slice(-50);
      }
      try{store.write(state);}catch(_){}
    }
    if(!interactive){try{await refreshResult(false,code);}catch(_){if(state&&locked){state.authNoticeError='NOTIFICATION_FAILED';try{store.write(state);}catch(__){}}}}
    if(typeof console!=='undefined'&&typeof console.error==='function')console.error('[NUFE] '+code+' · '+(state&&state.lastStage||'未知阶段'));
    if(interactive)await notice(code==='CANCELLED'?'已取消':'刷新失败',errorMessage(e,state));
    else if(config.runsWithSiri)Script.setShortcutOutput('刷新失败。'+errorMessage(e,state));
  }finally{if(progress)progress.finish();if(locked)store.release();Script.complete();}
}
// Node tests import the identical implementation; Scripting uses the async entry.
if(globalThis.__NUFE_TEST__)module.exports={ScriptingAdapter:{FileManager,Keychain,CloudKeychain,Request,Alert,Calendar,CalendarEvent,Notification,WebView,config,args,Script,__mode},storedEventIndex,readableNotes,matchesOldCourse,polishTermNotes,removeMatchedOldCourses,selectTermIds,dedicatedWindows,dedicatedRows,verifyBaseline,replaceDedicatedLegacy,snapshotSignature,refreshResult,refreshReminders,validateRecords,validateState,readCookieJar,credentialForm,occurrenceKey,calendarRows,assertNonRecurring,writeVerified,finishTx,synchronize,reminders,safeURL,resolveURL,pageInfo,topId,hm,monday,detailMonday,explicitTeachingMonday,chooseAnchor,VERIFIED_TERM_ANCHORS,expand,same,plan,aesCBC,CookieJar,HTTP,fieldsFrom,encryptPassword,bounded,applyTransaction,deletionReady,fingerprint,ics,eventRecord,notes,Store,CalendarAdapter,pickCalendar,repairSyncLock,statusText,errorMessage,diagnosticCode,reasonFor,actionFor,requestLabel,networkErrorCode,loginPreflight,legacyEventKey,legacyLocationCompatible,selectLegacyDuplicates,scanLegacyDuplicates,backupLegacyICS,cleanupLegacyDuplicates,notifyAuthExpiredOnce,testAuthNotification,hasSavedCredentials,readSavedCredentials,saveCredentials,removeSavedCredentials,migrateSavedCredentials,maskedAccount,passwordLogin,coursePage,manageSavedCredentials,run};
else await run();

/*
GNU GPL-3.0-only license included for single-file redistribution.
                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

                            Preamble

  The GNU General Public License is a free, copyleft license for
software and other kinds of works.

  The licenses for most software and other practical works are designed
to take away your freedom to share and change the works.  By contrast,
the GNU General Public License is intended to guarantee your freedom to
share and change all versions of a program--to make sure it remains free
software for all its users.  We, the Free Software Foundation, use the
GNU General Public License for most of our software; it applies also to
any other work released this way by its authors.  You can apply it to
your programs, too.

  When we speak of free software, we are referring to freedom, not
price.  Our General Public Licenses are designed to make sure that you
have the freedom to distribute copies of free software (and charge for
them if you wish), that you receive source code or can get it if you
want it, that you can change the software or use pieces of it in new
free programs, and that you know you can do these things.

  To protect your rights, we need to prevent others from denying you
these rights or asking you to surrender the rights.  Therefore, you have
certain responsibilities if you distribute copies of the software, or if
you modify it: responsibilities to respect the freedom of others.

  For example, if you distribute copies of such a program, whether
gratis or for a fee, you must pass on to the recipients the same
freedoms that you received.  You must make sure that they, too, receive
or can get the source code.  And you must show them these terms so they
know their rights.

  Developers that use the GNU GPL protect your rights with two steps:
(1) assert copyright on the software, and (2) offer you this License
giving you legal permission to copy, distribute and/or modify it.

  For the developers' and authors' protection, the GPL clearly explains
that there is no warranty for this free software.  For both users' and
authors' sake, the GPL requires that modified versions be marked as
changed, so that their problems will not be attributed erroneously to
authors of previous versions.

  Some devices are designed to deny users access to install or run
modified versions of the software inside them, although the manufacturer
can do so.  This is fundamentally incompatible with the aim of
protecting users' freedom to change the software.  The systematic
pattern of such abuse occurs in the area of products for individuals to
use, which is precisely where it is most unacceptable.  Therefore, we
have designed this version of the GPL to prohibit the practice for those
products.  If such problems arise substantially in other domains, we
stand ready to extend this provision to those domains in future versions
of the GPL, as needed to protect the freedom of users.

  Finally, every program is threatened constantly by software patents.
States should not allow patents to restrict development and use of
software on general-purpose computers, but in those that do, we wish to
avoid the special danger that patents applied to a free program could
make it effectively proprietary.  To prevent this, the GPL assures that
patents cannot be used to render the program non-free.

  The precise terms and conditions for copying, distribution and
modification follow.

                       TERMS AND CONDITIONS

  0. Definitions.

  "This License" refers to version 3 of the GNU General Public License.

  "Copyright" also means copyright-like laws that apply to other kinds of
works, such as semiconductor masks.

  "The Program" refers to any copyrightable work licensed under this
License.  Each licensee is addressed as "you".  "Licensees" and
"recipients" may be individuals or organizations.

  To "modify" a work means to copy from or adapt all or part of the work
in a fashion requiring copyright permission, other than the making of an
exact copy.  The resulting work is called a "modified version" of the
earlier work or a work "based on" the earlier work.

  A "covered work" means either the unmodified Program or a work based
on the Program.

  To "propagate" a work means to do anything with it that, without
permission, would make you directly or secondarily liable for
infringement under applicable copyright law, except executing it on a
computer or modifying a private copy.  Propagation includes copying,
distribution (with or without modification), making available to the
public, and in some countries other activities as well.

  To "convey" a work means any kind of propagation that enables other
parties to make or receive copies.  Mere interaction with a user through
a computer network, with no transfer of a copy, is not conveying.

  An interactive user interface displays "Appropriate Legal Notices"
to the extent that it includes a convenient and prominently visible
feature that (1) displays an appropriate copyright notice, and (2)
tells the user that there is no warranty for the work (except to the
extent that warranties are provided), that licensees may convey the
work under this License, and how to view a copy of this License.  If
the interface presents a list of user commands or options, such as a
menu, a prominent item in the list meets this criterion.

  1. Source Code.

  The "source code" for a work means the preferred form of the work
for making modifications to it.  "Object code" means any non-source
form of a work.

  A "Standard Interface" means an interface that either is an official
standard defined by a recognized standards body, or, in the case of
interfaces specified for a particular programming language, one that
is widely used among developers working in that language.

  The "System Libraries" of an executable work include anything, other
than the work as a whole, that (a) is included in the normal form of
packaging a Major Component, but which is not part of that Major
Component, and (b) serves only to enable use of the work with that
Major Component, or to implement a Standard Interface for which an
implementation is available to the public in source code form.  A
"Major Component", in this context, means a major essential component
(kernel, window system, and so on) of the specific operating system
(if any) on which the executable work runs, or a compiler used to
produce the work, or an object code interpreter used to run it.

  The "Corresponding Source" for a work in object code form means all
the source code needed to generate, install, and (for an executable
work) run the object code and to modify the work, including scripts to
control those activities.  However, it does not include the work's
System Libraries, or general-purpose tools or generally available free
programs which are used unmodified in performing those activities but
which are not part of the work.  For example, Corresponding Source
includes interface definition files associated with source files for
the work, and the source code for shared libraries and dynamically
linked subprograms that the work is specifically designed to require,
such as by intimate data communication or control flow between those
subprograms and other parts of the work.

  The Corresponding Source need not include anything that users
can regenerate automatically from other parts of the Corresponding
Source.

  The Corresponding Source for a work in source code form is that
same work.

  2. Basic Permissions.

  All rights granted under this License are granted for the term of
copyright on the Program, and are irrevocable provided the stated
conditions are met.  This License explicitly affirms your unlimited
permission to run the unmodified Program.  The output from running a
covered work is covered by this License only if the output, given its
content, constitutes a covered work.  This License acknowledges your
rights of fair use or other equivalent, as provided by copyright law.

  You may make, run and propagate covered works that you do not
convey, without conditions so long as your license otherwise remains
in force.  You may convey covered works to others for the sole purpose
of having them make modifications exclusively for you, or provide you
with facilities for running those works, provided that you comply with
the terms of this License in conveying all material for which you do
not control copyright.  Those thus making or running the covered works
for you must do so exclusively on your behalf, under your direction
and control, on terms that prohibit them from making any copies of
your copyrighted material outside their relationship with you.

  Conveying under any other circumstances is permitted solely under
the conditions stated below.  Sublicensing is not allowed; section 10
makes it unnecessary.

  3. Protecting Users' Legal Rights From Anti-Circumvention Law.

  No covered work shall be deemed part of an effective technological
measure under any applicable law fulfilling obligations under article
11 of the WIPO copyright treaty adopted on 20 December 1996, or
similar laws prohibiting or restricting circumvention of such
measures.

  When you convey a covered work, you waive any legal power to forbid
circumvention of technological measures to the extent such circumvention
is effected by exercising rights under this License with respect to
the covered work, and you disclaim any intention to limit operation or
modification of the work as a means of enforcing, against the work's
users, your or third parties' legal rights to forbid circumvention of
technological measures.

  4. Conveying Verbatim Copies.

  You may convey verbatim copies of the Program's source code as you
receive it, in any medium, provided that you conspicuously and
appropriately publish on each copy an appropriate copyright notice;
keep intact all notices stating that this License and any
non-permissive terms added in accord with section 7 apply to the code;
keep intact all notices of the absence of any warranty; and give all
recipients a copy of this License along with the Program.

  You may charge any price or no price for each copy that you convey,
and you may offer support or warranty protection for a fee.

  5. Conveying Modified Source Versions.

  You may convey a work based on the Program, or the modifications to
produce it from the Program, in the form of source code under the
terms of section 4, provided that you also meet all of these conditions:

    a) The work must carry prominent notices stating that you modified
    it, and giving a relevant date.

    b) The work must carry prominent notices stating that it is
    released under this License and any conditions added under section
    7.  This requirement modifies the requirement in section 4 to
    "keep intact all notices".

    c) You must license the entire work, as a whole, under this
    License to anyone who comes into possession of a copy.  This
    License will therefore apply, along with any applicable section 7
    additional terms, to the whole of the work, and all its parts,
    regardless of how they are packaged.  This License gives no
    permission to license the work in any other way, but it does not
    invalidate such permission if you have separately received it.

    d) If the work has interactive user interfaces, each must display
    Appropriate Legal Notices; however, if the Program has interactive
    interfaces that do not display Appropriate Legal Notices, your
    work need not make them do so.

  A compilation of a covered work with other separate and independent
works, which are not by their nature extensions of the covered work,
and which are not combined with it such as to form a larger program,
in or on a volume of a storage or distribution medium, is called an
"aggregate" if the compilation and its resulting copyright are not
used to limit the access or legal rights of the compilation's users
beyond what the individual works permit.  Inclusion of a covered work
in an aggregate does not cause this License to apply to the other
parts of the aggregate.

  6. Conveying Non-Source Forms.

  You may convey a covered work in object code form under the terms
of sections 4 and 5, provided that you also convey the
machine-readable Corresponding Source under the terms of this License,
in one of these ways:

    a) Convey the object code in, or embodied in, a physical product
    (including a physical distribution medium), accompanied by the
    Corresponding Source fixed on a durable physical medium
    customarily used for software interchange.

    b) Convey the object code in, or embodied in, a physical product
    (including a physical distribution medium), accompanied by a
    written offer, valid for at least three years and valid for as
    long as you offer spare parts or customer support for that product
    model, to give anyone who possesses the object code either (1) a
    copy of the Corresponding Source for all the software in the
    product that is covered by this License, on a durable physical
    medium customarily used for software interchange, for a price no
    more than your reasonable cost of physically performing this
    conveying of source, or (2) access to copy the
    Corresponding Source from a network server at no charge.

    c) Convey individual copies of the object code with a copy of the
    written offer to provide the Corresponding Source.  This
    alternative is allowed only occasionally and noncommercially, and
    only if you received the object code with such an offer, in accord
    with subsection 6b.

    d) Convey the object code by offering access from a designated
    place (gratis or for a charge), and offer equivalent access to the
    Corresponding Source in the same way through the same place at no
    further charge.  You need not require recipients to copy the
    Corresponding Source along with the object code.  If the place to
    copy the object code is a network server, the Corresponding Source
    may be on a different server (operated by you or a third party)
    that supports equivalent copying facilities, provided you maintain
    clear directions next to the object code saying where to find the
    Corresponding Source.  Regardless of what server hosts the
    Corresponding Source, you remain obligated to ensure that it is
    available for as long as needed to satisfy these requirements.

    e) Convey the object code using peer-to-peer transmission, provided
    you inform other peers where the object code and Corresponding
    Source of the work are being offered to the general public at no
    charge under subsection 6d.

  A separable portion of the object code, whose source code is excluded
from the Corresponding Source as a System Library, need not be
included in conveying the object code work.

  A "User Product" is either (1) a "consumer product", which means any
tangible personal property which is normally used for personal, family,
or household purposes, or (2) anything designed or sold for incorporation
into a dwelling.  In determining whether a product is a consumer product,
doubtful cases shall be resolved in favor of coverage.  For a particular
product received by a particular user, "normally used" refers to a
typical or common use of that class of product, regardless of the status
of the particular user or of the way in which the particular user
actually uses, or expects or is expected to use, the product.  A product
is a consumer product regardless of whether the product has substantial
commercial, industrial or non-consumer uses, unless such uses represent
the only significant mode of use of the product.

  "Installation Information" for a User Product means any methods,
procedures, authorization keys, or other information required to install
and execute modified versions of a covered work in that User Product from
a modified version of its Corresponding Source.  The information must
suffice to ensure that the continued functioning of the modified object
code is in no case prevented or interfered with solely because
modification has been made.

  If you convey an object code work under this section in, or with, or
specifically for use in, a User Product, and the conveying occurs as
part of a transaction in which the right of possession and use of the
User Product is transferred to the recipient in perpetuity or for a
fixed term (regardless of how the transaction is characterized), the
Corresponding Source conveyed under this section must be accompanied
by the Installation Information.  But this requirement does not apply
if neither you nor any third party retains the ability to install
modified object code on the User Product (for example, the work has
been installed in ROM).

  The requirement to provide Installation Information does not include a
requirement to continue to provide support service, warranty, or updates
for a work that has been modified or installed by the recipient, or for
the User Product in which it has been modified or installed.  Access to a
network may be denied when the modification itself materially and
adversely affects the operation of the network or violates the rules and
protocols for communication across the network.

  Corresponding Source conveyed, and Installation Information provided,
in accord with this section must be in a format that is publicly
documented (and with an implementation available to the public in
source code form), and must require no special password or key for
unpacking, reading or copying.

  7. Additional Terms.

  "Additional permissions" are terms that supplement the terms of this
License by making exceptions from one or more of its conditions.
Additional permissions that are applicable to the entire Program shall
be treated as though they were included in this License, to the extent
that they are valid under applicable law.  If additional permissions
apply only to part of the Program, that part may be used separately
under those permissions, but the entire Program remains governed by
this License without regard to the additional permissions.

  When you convey a copy of a covered work, you may at your option
remove any additional permissions from that copy, or from any part of
it.  (Additional permissions may be written to require their own
removal in certain cases when you modify the work.)  You may place
additional permissions on material, added by you to a covered work,
for which you have or can give appropriate copyright permission.

  Notwithstanding any other provision of this License, for material you
add to a covered work, you may (if authorized by the copyright holders of
that material) supplement the terms of this License with terms:

    a) Disclaiming warranty or limiting liability differently from the
    terms of sections 15 and 16 of this License; or

    b) Requiring preservation of specified reasonable legal notices or
    author attributions in that material or in the Appropriate Legal
    Notices displayed by works containing it; or

    c) Prohibiting misrepresentation of the origin of that material, or
    requiring that modified versions of such material be marked in
    reasonable ways as different from the original version; or

    d) Limiting the use for publicity purposes of names of licensors or
    authors of the material; or

    e) Declining to grant rights under trademark law for use of some
    trade names, trademarks, or service marks; or

    f) Requiring indemnification of licensors and authors of that
    material by anyone who conveys the material (or modified versions of
    it) with contractual assumptions of liability to the recipient, for
    any liability that these contractual assumptions directly impose on
    those licensors and authors.

  All other non-permissive additional terms are considered "further
restrictions" within the meaning of section 10.  If the Program as you
received it, or any part of it, contains a notice stating that it is
governed by this License along with a term that is a further
restriction, you may remove that term.  If a license document contains
a further restriction but permits relicensing or conveying under this
License, you may add to a covered work material governed by the terms
of that license document, provided that the further restriction does
not survive such relicensing or conveying.

  If you add terms to a covered work in accord with this section, you
must place, in the relevant source files, a statement of the
additional terms that apply to those files, or a notice indicating
where to find the applicable terms.

  Additional terms, permissive or non-permissive, may be stated in the
form of a separately written license, or stated as exceptions;
the above requirements apply either way.

  8. Termination.

  You may not propagate or modify a covered work except as expressly
provided under this License.  Any attempt otherwise to propagate or
modify it is void, and will automatically terminate your rights under
this License (including any patent licenses granted under the third
paragraph of section 11).

  However, if you cease all violation of this License, then your
license from a particular copyright holder is reinstated (a)
provisionally, unless and until the copyright holder explicitly and
finally terminates your license, and (b) permanently, if the copyright
holder fails to notify you of the violation by some reasonable means
prior to 60 days after the cessation.

  Moreover, your license from a particular copyright holder is
reinstated permanently if the copyright holder notifies you of the
violation by some reasonable means, this is the first time you have
received notice of violation of this License (for any work) from that
copyright holder, and you cure the violation prior to 30 days after
your receipt of the notice.

  Termination of your rights under this section does not terminate the
licenses of parties who have received copies or rights from you under
this License.  If your rights have been terminated and not permanently
reinstated, you do not qualify to receive new licenses for the same
material under section 10.

  9. Acceptance Not Required for Having Copies.

  You are not required to accept this License in order to receive or
run a copy of the Program.  Ancillary propagation of a covered work
occurring solely as a consequence of using peer-to-peer transmission
to receive a copy likewise does not require acceptance.  However,
nothing other than this License grants you permission to propagate or
modify any covered work.  These actions infringe copyright if you do
not accept this License.  Therefore, by modifying or propagating a
covered work, you indicate your acceptance of this License to do so.

  10. Automatic Licensing of Downstream Recipients.

  Each time you convey a covered work, the recipient automatically
receives a license from the original licensors, to run, modify and
propagate that work, subject to this License.  You are not responsible
for enforcing compliance by third parties with this License.

  An "entity transaction" is a transaction transferring control of an
organization, or substantially all assets of one, or subdividing an
organization, or merging organizations.  If propagation of a covered
work results from an entity transaction, each party to that
transaction who receives a copy of the work also receives whatever
licenses to the work the party's predecessor in interest had or could
give under the previous paragraph, plus a right to possession of the
Corresponding Source of the work from the predecessor in interest, if
the predecessor has it or can get it with reasonable efforts.

  You may not impose any further restrictions on the exercise of the
rights granted or affirmed under this License.  For example, you may
not impose a license fee, royalty, or other charge for exercise of
rights granted under this License, and you may not initiate litigation
(including a cross-claim or counterclaim in a lawsuit) alleging that
any patent claim is infringed by making, using, selling, offering for
sale, or importing the Program or any portion of it.

  11. Patents.

  A "contributor" is a copyright holder who authorizes use under this
License of the Program or a work on which the Program is based.  The
work thus licensed is called the contributor's "contributor version".

  A contributor's "essential patent claims" are all patent claims
owned or controlled by the contributor, whether already acquired or
hereafter acquired, that would be infringed by some manner, permitted
by this License, of making, using, or selling its contributor version,
but do not include claims that would be infringed only as a
consequence of further modification of the contributor version.  For
purposes of this definition, "control" includes the right to grant
patent sublicenses in a manner consistent with the requirements of
this License.

  Each contributor grants you a non-exclusive, worldwide, royalty-free
patent license under the contributor's essential patent claims, to
make, use, sell, offer for sale, import and otherwise run, modify and
propagate the contents of its contributor version.

  In the following three paragraphs, a "patent license" is any express
agreement or commitment, however denominated, not to enforce a patent
(such as an express permission to practice a patent or covenant not to
sue for patent infringement).  To "grant" such a patent license to a
party means to make such an agreement or commitment not to enforce a
patent against the party.

  If you convey a covered work, knowingly relying on a patent license,
and the Corresponding Source of the work is not available for anyone
to copy, free of charge and under the terms of this License, through a
publicly available network server or other readily accessible means,
then you must either (1) cause the Corresponding Source to be so
available, or (2) arrange to deprive yourself of the benefit of the
patent license for this particular work, or (3) arrange, in a manner
consistent with the requirements of this License, to extend the patent
license to downstream recipients.  "Knowingly relying" means you have
actual knowledge that, but for the patent license, your conveying the
covered work in a country, or your recipient's use of the covered work
in a country, would infringe one or more identifiable patents in that
country that you have reason to believe are valid.

  If, pursuant to or in connection with a single transaction or
arrangement, you convey, or propagate by procuring conveyance of, a
covered work, and grant a patent license to some of the parties
receiving the covered work authorizing them to use, propagate, modify
or convey a specific copy of the covered work, then the patent license
you grant is automatically extended to all recipients of the covered
work and works based on it.

  A patent license is "discriminatory" if it does not include within
the scope of its coverage, prohibits the exercise of, or is
conditioned on the non-exercise of one or more of the rights that are
specifically granted under this License.  You may not convey a covered
work if you are a party to an arrangement with a third party that is
in the business of distributing software, under which you make payment
to the third party based on the extent of your activity of conveying
the work, and under which the third party grants, to any of the
parties who would receive the covered work from you, a discriminatory
patent license (a) in connection with copies of the covered work
conveyed by you (or copies made from those copies), or (b) primarily
for and in connection with specific products or compilations that
contain the covered work, unless you entered into that arrangement,
or that patent license was granted, prior to 28 March 2007.

  Nothing in this License shall be construed as excluding or limiting
any implied license or other defenses to infringement that may
otherwise be available to you under applicable patent law.

  12. No Surrender of Others' Freedom.

  If conditions are imposed on you (whether by court order, agreement or
otherwise) that contradict the conditions of this License, they do not
excuse you from the conditions of this License.  If you cannot convey a
covered work so as to satisfy simultaneously your obligations under this
License and any other pertinent obligations, then as a consequence you may
not convey it at all.  For example, if you agree to terms that obligate you
to collect a royalty for further conveying from those to whom you convey
the Program, the only way you could satisfy both those terms and this
License would be to refrain entirely from conveying the Program.

  13. Use with the GNU Affero General Public License.

  Notwithstanding any other provision of this License, you have
permission to link or combine any covered work with a work licensed
under version 3 of the GNU Affero General Public License into a single
combined work, and to convey the resulting work.  The terms of this
License will continue to apply to the part which is the covered work,
but the special requirements of the GNU Affero General Public License,
section 13, concerning interaction through a network will apply to the
combination as such.

  14. Revised Versions of this License.

  The Free Software Foundation may publish revised and/or new versions of
the GNU General Public License from time to time.  Such new versions will
be similar in spirit to the present version, but may differ in detail to
address new problems or concerns.

  Each version is given a distinguishing version number.  If the
Program specifies that a certain numbered version of the GNU General
Public License "or any later version" applies to it, you have the
option of following the terms and conditions either of that numbered
version or of any later version published by the Free Software
Foundation.  If the Program does not specify a version number of the
GNU General Public License, you may choose any version ever published
by the Free Software Foundation.

  If the Program specifies that a proxy can decide which future
versions of the GNU General Public License can be used, that proxy's
public statement of acceptance of a version permanently authorizes you
to choose that version for the Program.

  Later license versions may give you additional or different
permissions.  However, no additional obligations are imposed on any
author or copyright holder as a result of your choosing to follow a
later version.

  15. Disclaimer of Warranty.

  THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY
APPLICABLE LAW.  EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT
HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY
OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE.  THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM
IS WITH YOU.  SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF
ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

  16. Limitation of Liability.

  IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING
WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS
THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY
GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE
USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF
DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD
PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS),
EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF
SUCH DAMAGES.

  17. Interpretation of Sections 15 and 16.

  If the disclaimer of warranty and limitation of liability provided
above cannot be given local legal effect according to their terms,
reviewing courts shall apply local law that most closely approximates
an absolute waiver of all civil liability in connection with the
Program, unless a warranty or assumption of liability accompanies a
copy of the Program in return for a fee.

                     END OF TERMS AND CONDITIONS

            How to Apply These Terms to Your New Programs

  If you develop a new program, and you want it to be of the greatest
possible use to the public, the best way to achieve this is to make it
free software which everyone can redistribute and change under these terms.

  To do so, attach the following notices to the program.  It is safest
to attach them to the start of each source file to most effectively
state the exclusion of warranty; and each file should have at least
the "copyright" line and a pointer to where the full notice is found.

    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) <year>  <name of author>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

Also add information on how to contact you by electronic and paper mail.

  If the program does terminal interaction, make it output a short
notice like this when it starts in an interactive mode:

    <program>  Copyright (C) <year>  <name of author>
    This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.
    This is free software, and you are welcome to redistribute it
    under certain conditions; type `show c' for details.

The hypothetical commands `show w' and `show c' should show the appropriate
parts of the General Public License.  Of course, your program's commands
might be different; for a GUI interface, you would use an "about box".

  You should also get your employer (if you work as a programmer) or school,
if any, to sign a "copyright disclaimer" for the program, if necessary.
For more information on this, and how to apply and follow the GNU GPL, see
<https://www.gnu.org/licenses/>.

  The GNU General Public License does not permit incorporating your program
into proprietary programs.  If your program is a subroutine library, you
may consider it more useful to permit linking proprietary applications with
the library.  If this is what you want to do, use the GNU Lesser General
Public License instead of this License.  But first, please read
<https://www.gnu.org/licenses/why-not-lgpl.html>.


*/

  }catch(error){await __NUFE_REPORT_STARTUP(error);}
}
// Calling an async function is supported by Scripting 3.2.1's normal script loader.
// The Promise is exposed solely for local entry-point regression tests, never credentials.
globalThis.__NUFE_LAUNCH__=__NUFE_START();
