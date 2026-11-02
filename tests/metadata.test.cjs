// Public-facing metadata and documentation invariants; no Scripting host required.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const publicFiles=['script.json','README.md','docs/release-notes.md'];

test('Scripting metadata keeps the intended display identity',()=>{
  const data=JSON.parse(read('script.json'));
  assert.equal(data.name,'NUFE-Schedule');
  assert.equal(data.version,'0.0.0');
  assert.match(data.description,/NUFE/);
  assert.match(data.color,/^#[0-9a-fA-F]{6}$/);
  assert.equal(data.icon,'calendar');
});

test('public-facing descriptions consistently use NUFE',()=>{
  for(const filename of publicFiles){
    const content=read(filename);
    assert.doesNotMatch(content,/南京财经大学|南财/,'unexpected school name in '+filename);
  }
});

test('README screenshots resolve to existing nonempty images',()=>{
  const readme=read('README.md');
  const images=[...readme.matchAll(/<img\s+src="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(images.length>=5);
  for(const relative of images){
    assert.ok(relative.startsWith('docs/images/'),'image path is inside docs/images');
    const full=path.join(root,relative);
    assert.ok(fs.existsSync(full),'missing README image: '+relative);
    assert.ok(fs.statSync(full).size>2000,'empty README image: '+relative);
  }
});

test('release and README describe the same stable installation path',()=>{
  const url='https://github.com/b7f2d/NUFE-Schedule/releases/download/stable/NUFE-Schedule.zip';
  assert.ok(read('README.md').includes(url));
  assert.ok(read('docs/engineering.md').includes(url));
  assert.match(read('docs/release-notes.md'),/NUFE-Schedule\.zip/);
  assert.match(read('scripts/package.sh'),/index\.tsx intent\.tsx widget\.tsx widget-data\.ts login-native\.tsx script\.json/);
});

test('error guidance does not direct users to removed menu actions',()=>{
  const source=read('index.tsx');
  const start=source.indexOf('const ERROR_GUIDE={');
  const end=source.indexOf('function diagnosticCode(',start);
  assert.ok(start>=0&&end>start);
  const guide=source.slice(start,end);
  assert.doesNotMatch(guide,/登录页面自检（无需密码）|重试「覆盖旧课程」|从菜单执行历史课程清理|选择「重新绑定课表日历」/);
  assert.doesNotMatch(guide,/账号与日历设置/);
  assert.match(guide,/主菜单「立即刷新」/);
});

test('only the Release archive is distributed',()=>{
  assert.equal(fs.existsSync(path.join(root,'NUFE-Schedule.zip')),false,
    'stale root ZIP should not be tracked or distributed');
  assert.match(read('.gitignore'),/^\/NUFE-Schedule\.zip$/m);
  const workflow=read('.github/workflows/release.yml');
  assert.match(workflow,/gh release upload "\$release_tag" "\$archive" --clobber/);
  assert.match(workflow,/git\/refs\/tags\/\$release_tag/);
  assert.match(workflow,/-f sha="\$GITHUB_SHA" -F force=true/);
  assert.match(workflow,/test "\$stable_sha" = "\$GITHUB_SHA"/);
  assert.match(workflow,/test "\$GITHUB_REF" = "refs\/heads\/main"/);
});

test('widget distribution includes the native entry and safe cache model',()=>{
  const entry=read('widget.tsx');
  assert.match(entry,/Widget\.present\(/);
  assert.match(entry,/buildWidgetModel\(/);
  assert.doesNotMatch(entry,/Keychain|CalendarEvent|fetch\(/);
  assert.match(read('widget-data.ts'),/appGroupDocumentsDirectory/);
  assert.match(read('scripts/package.sh'),/"6"/);
  assert.match(read('index.tsx'),/import \{ presentNativeCredentialForm \} from '\.\/login-native'/);
});
