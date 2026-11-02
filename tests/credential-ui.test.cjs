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
