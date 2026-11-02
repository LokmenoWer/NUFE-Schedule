// Regression guard for the single-screen, offline credential form.
// These tests do not load, save, or print any real login information.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../index.tsx','utf8');
const begin=source.indexOf('async function credentialForm(');
const end=source.indexOf('async function humanSlider(',begin);
if(begin<0||end<begin)throw Error('Credential form source unavailable');
const form=source.slice(begin,end);

test('credential form has username and password together in one offline WebView',()=>{
 assert.match(form,/new WebView\(\)/);
 assert.match(form,/addScriptMessageHandler\('nufeCredentials'/);
 assert.match(form,/<input id="account" name="username" type="text"/);
 assert.match(form,/<input id="secret" name="password" type="password"/);
 assert.match(form,/connect-src \\'none\\'/);
 assert.match(form,/form-action \\'none\\'/);
 assert.doesNotMatch(form,/shouldAllowRequest/);
});

test('unified login failures need explicit consent before using two system prompts',()=>{
 assert.match(form,/HostDialog\.confirm\(\{/);
 assert.match(form,/if\(!consent\)fail\('CANCELLED'\)/);
 assert.match(form,/return await fallbackCredentialForm\(\{title\}\)/);
 assert.match(form,/CREDENTIALS_INVALID|WEBVIEW_UNAVAILABLE/);
});

test('iOS password manager fields use semantic names and an actual local form',()=>{
 assert.match(form,/<form id="login-form" autocomplete="on" novalidate>/);
 assert.match(form,/<input id="account" name="username" type="text"[^\n]*autocomplete="username"/);
 assert.match(form,/<input id="secret" name="password" type="password"[^\n]*autocomplete="current-password"/);
 assert.doesNotMatch(form,/autocomplete="off"/);
 assert.match(form,/<button type="submit" id="submit">确认<\/button><\/form>/);
 assert.match(form,/form\.addEventListener\("submit",async event=>\{event\.preventDefault\(\)/);
 assert.match(form,/form-action \\'none\\'/);
 assert.match(form,/connect-src \\'none\\'/);
});

test('native iOS credential sheet uses semantic text content types and no WebView',()=>{
 const native=fs.readFileSync(__dirname+'/../login-native.tsx','utf8');
 assert.match(native,/<TextField[\s\S]*?textContentType="username"/);
 assert.match(native,/<SecureField[\s\S]*?textContentType="password"/);
 assert.match(native,/onChanged=\{setUsername\}/);
 assert.match(native,/onChanged=\{setPassword\}/);
 assert.match(native,/Navigation\.present\(\{/);
 assert.match(native,/dismiss\(\{ username: account, password \}\)/);
 assert.match(native,/action=\{\(\) => dismiss\(null\)\}/);
 assert.doesNotMatch(native,/WebView|loadURL|fetch\(|Clipboard|console\.log/);
});

test('credential form prefers native controls only in the foreground',()=>{
 assert.match(form,/config\.runsInApp&&typeof hostAPI\('Navigation'\)\?\.present==='function'/);
 assert.match(form,/await presentNativeCredentialForm\(title\)/);
 assert.match(form,/if\(!native\)fail\('CANCELLED'\)/);
 assert.match(form,/原生登录窗口不可用/);
});

test('native verification inputs support oneTimeCode SMS, authenticator and picture CAPTCHA',()=>{
 const native=fs.readFileSync(__dirname+'/../login-native.tsx','utf8');
 assert.match(native,/export async function presentNativeTextForm/);
 assert.match(native,/kind==='sms'\|\|kind==='totp'/);
 assert.match(native,/textContentType=\{otp\?'oneTimeCode':undefined\}/);
 assert.match(native,/keyboardType=\{otp\?'numberPad':'default'\}/);
 assert.match(native,/<Image image=\{image\} resizable=\{true\} scaleToFit=\{true\}/);
 assert.match(native,/onChanged=\{setValue\}/);
 assert.match(native,/if\(typeof result!=='string'\)return null/);
 assert.doesNotMatch(native,/SMS\.read|Message\.read|Clipboard|console\.log/);
});
test('interactive CAPTCHA, MFA and plain text route to native sheets',()=>{
 const whole=fs.readFileSync(__dirname+'/../index.tsx','utf8');
 assert.match(whole,/presentNativeTextForm\(\{/);
 assert.match(whole,/kind:type==='3'\?'sms':'totp'/);
 assert.match(whole,/\{kind:'captcha',image:rendered\}/);
 assert.match(whole,/rendered=UI\.fromData\(image\.text\)/);
 assert.match(whole,/return await legacyInput\(title,label,secure\)/);
});
test('progress overlay keeps one stable label until auth completes and prevents repeat presentation',()=>{
 const whole=fs.readFileSync(__dirname+'/../index.tsx','utf8');
 assert.match(whole,/dismissedByUser=true/);
 assert.match(whole,/if\(awaitingVerification\)/);
 assert.match(whole,/latest='正在刷新课表'/);
 assert.match(whole,/if\(label===lastPainted\)break/);
 assert.doesNotMatch(whole,/latest=safeProgressLabel\(message\)/);
});
