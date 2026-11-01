// Pure logic tests, independent from the Scripting host adapter.
const {test}=require('node:test');
const a=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../index.tsx'),'utf8');
function section(start,end){const i=src.indexOf(start),j=src.indexOf(end,i);a.ok(i>=0&&j>i);return src.slice(i,j);}
const split=vm.runInNewContext(section('function splitSetCookie(value) {','function cookieDomain(raw)')+';splitSetCookie',{Date});
const diff=vm.runInNewContext('const DAY=86400000;'+section('function same(a,b) {','// AES key expansion')+';({same,plan})',{Date,Set,Map,JSON,Math});
const list=x=>Array.from(split(x));
test('date comma inside Expires stays intact',()=>{
 a.deepEqual(list('A=1; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/, B=2'),['A=1; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/','B=2']);
});
test('Expires may end without a semicolon',()=>{
 a.equal(list('A=1; Expires=Wed, 21 Oct 2037 07:28:00 GMT, B=2').length,2);
});
test('quoted commas cannot start a new cookie',()=>{
 a.deepEqual(list('A="value, pretend=1"; Path=/, B=2'),['A="value, pretend=1"; Path=/','B=2']);
});
test('header arrays and separate lines preserve order',()=>{
 a.deepEqual(list('Set-Cookie: A=1\r\nSet-Cookie: B=2'),['A=1','B=2']);
 a.deepEqual(list(['A=1','B=2']),['A=1','B=2']);
});
test('incomplete Expires does not manufacture an inner cookie',()=>{
 a.deepEqual(list('A=1; Expires=Wed, some=value; Path=/, B=2'),['A=1; Expires=Wed, some=value; Path=/','B=2']);
});
const old={id:'id1',sid:'161',title:'高等数学',week:2,su:1,eu:2,start:'2026-09-14T00:00:00.000Z',end:'2026-09-14T01:40:00.000Z',location:'教A101',teachers:['张老师']};
test('Diff retains logical ID after teacher changes',()=>{
 const p=diff.plan([old],[{...old,id:undefined,teachers:['李老师']}],()=> 'new');
 a.equal(p.events[0].id,'id1');a.equal(p.added.length,0);a.equal(p.changed.length,1);
});
test('Diff handles cancellation without a new item',()=>{
 const p=diff.plan([old],[],()=> 'unused');
 a.equal(p.added.length,0);a.equal(p.removed.length,1);
});
