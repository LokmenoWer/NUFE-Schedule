// Native iOS credential entry for Scripting. No HTML, embedded URLs, requests,
// clipboard reads, telemetry or password persistence in this view.
// Passwords remain in memory only until caller authenticates or discards them.
import {
  Navigation, NavigationStack, List, Section, Text,
  TextField, SecureField, Button, Image, useState,
} from 'scripting';

function LoginView({ title }: { title: string }) {
  const dismiss = Navigation.useDismiss();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const account = username.trim();
  const valid = account.length > 0 && account.length <= 100 &&
    password.length > 0 && password.length <= 512;

  return <NavigationStack>
    <List
      navigationTitle={title}
      navigationBarTitleDisplayMode="inline"
      toolbar={{
        cancellationAction: <Button title="取消" action={() => dismiss(null)} />
      }}
    >
      <Section header={<Text>南京财经大学 · 统一身份认证</Text>}>
        <TextField
          title="学号"
          prompt="请输入学号"
          value={username}
          onChanged={setUsername}
          textContentType="username"
          textInputAutocapitalization="never"
        />
        <SecureField
          title="密码"
          prompt="请输入密码"
          value={password}
          onChanged={setPassword}
          textContentType="password"
        />
      </Section>
      <Section footer={<Text>可尝试使用 iOS「密码」中的已保存网站凭据。此页面不会访问外部网站，也不会自动保存密码。</Text>}>
        <Button
          title="确认"
          disabled={!valid}
          action={() => {
            if (!valid) return;
            dismiss({ username: account, password });
          }}
        />
      </Section>
    </List>
  </NavigationStack>;
}

export async function presentNativeCredentialForm(title = 'CourseSync 登录') {
  const result = await Navigation.present({
    element: <LoginView title={title} />,
    modalPresentationStyle: 'pageSheet',
  });
  if (!result || typeof result !== 'object') return null;
  const username = typeof result.username === 'string' ? result.username.trim() : '';
  const password = typeof result.password === 'string' ? result.password : '';
  if (!username || username.length > 100 || !password || password.length > 512) return null;
  return { username, password };
}


// All short interactive challenges use an iOS-native text entry sheet.
// OTPs use oneTimeCode so iOS can offer the system SMS/Password code suggestion.
// Image-based CAPTCHA is rendered inside this sheet; no image ever leaves device.
type NativeInputKind = 'sms' | 'totp' | 'captcha' | 'text' | 'secure';
type NativeInputOptions = {
  title: string;
  label: string;
  kind?: NativeInputKind;
  image?: any;
};
function NativeInputView({title,label,kind='text',image}:NativeInputOptions) {
  const dismiss=Navigation.useDismiss();
  const [value,setValue]=useState('');
  const secret=kind==='secure';
  const otp=kind==='sms'||kind==='totp';
  const response=value.trim();
  const maxLength=kind==='captcha'?32:otp?48:120;
  const valid=response.length>0&&response.length<=maxLength;

  return <NavigationStack>
    <List navigationTitle={title} navigationBarTitleDisplayMode="inline"
      toolbar={{
        cancellationAction:<Button title="取消" action={()=>dismiss(null)}/>
      }}>
      <Section header={<Text>{label}</Text>}>
        {image?<Image image={image} resizable={true} scaleToFit={true}
          frame={{width:280,height:155}} />:null}
        {secret?
          <SecureField title={label} prompt="请输入" value={value}
            onChanged={setValue} />:
          <TextField title={label}
            prompt={otp?'请输入或填充验证码':'请输入'}
            value={value} onChanged={setValue}
            autofocus={!image}
            textContentType={otp?'oneTimeCode':undefined}
            keyboardType={otp?'numberPad':'default'}
            textInputAutocapitalization="never"
            autocorrectionDisabled={true}/>}
      </Section>
      <Section>
        <Button title="确认" disabled={!valid}
          action={()=>{if(valid)dismiss(response);}}/>
      </Section>
    </List>
  </NavigationStack>;
}

export async function presentNativeTextForm(options:NativeInputOptions) {
  const result=await Navigation.present({
    element:<NativeInputView {...options}/>,
    modalPresentationStyle:'pageSheet'
  });
  if(typeof result!=='string')return null;
  const code=result.trim();
  const max=options.kind==='captcha'?32:
    options.kind==='sms'||options.kind==='totp'?48:120;
  return code&&code.length<=max?code:null;
}


// The manual refresh wizard uses one native sheet: endpoints first, then
// account/password (or reuse of an existing trusted session). No web requests
// or credential storage are performed by this UI.
export type NativeSchoolEndpoints={
  auth:string;
  sso:string;
  table:string;
  semester:string;
  courses:string;
};
type RefreshFormOutcome=
  | {kind:'credentials';values:NativeSchoolEndpoints;username:string;password:string}
  | {kind:'reuse';values:NativeSchoolEndpoints};

function validSchoolOverride(raw:string,key:keyof NativeSchoolEndpoints):boolean{
  const value=raw.trim();
  if(!value)return true;
  if(value.length>220||raw!==value)return false;
  const template=key==='semester'||key==='courses';
  if(value.split('{sid}').length!==(template?2:1))return false;
  const checked=template?value.replace('{sid}','123'):value;
  if(!/^https:\/\/(?:authserver\.nufe\.edu\.cn|jwxt\.nufe\.edu\.cn)\/[A-Za-z0-9_./-]+$/.test(checked)||
      checked.slice(8).includes('//')||
      checked.split('/').some(p=>p==='.'||p==='..'))return false;
  if(key==='auth')return /^https:\/\/authserver\.nufe\.edu\.cn\/authserver(?:\/|$)/.test(checked);
  return checked.startsWith('https://jwxt.nufe.edu.cn/student/');
}

function RefreshSetupView({defaults,allowReuse}:{
  defaults:NativeSchoolEndpoints;allowReuse:boolean;
}){
  const dismiss=Navigation.useDismiss();
  const [step,setStep]=useState<'endpoints'|'account'>('endpoints');
  const [auth,setAuth]=useState('');
  const [sso,setSso]=useState('');
  const [table,setTable]=useState('');
  const [semester,setSemester]=useState('');
  const [courses,setCourses]=useState('');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const values={auth:auth.trim(),sso:sso.trim(),table:table.trim(),
    semester:semester.trim(),courses:courses.trim()};
  const validEndpoints=(Object.keys(values) as Array<keyof NativeSchoolEndpoints>)
    .every(key=>validSchoolOverride(values[key],key));
  const account=username.trim();
  const validAccount=account.length>0&&account.length<=100&&
    password.length>0&&password.length<=512;
  const back=()=>step==='endpoints'?dismiss(null):setStep('endpoints');

  return <NavigationStack>
    {step==='endpoints'?
      <List navigationTitle="教务接口" navigationBarTitleDisplayMode="inline"
        toolbar={{cancellationAction:<Button title="取消" action={back}/>}}>
        <Section header={<Text>南京财经大学 · 默认接口</Text>}
          footer={<Text>{validEndpoints?'全部留空即使用南京财经大学教务系统的默认地址。':
            '接口地址格式不正确，请检查 HTTPS、学校域名和接口路径。'}</Text>}>
          <TextField title="统一认证根地址"
            prompt={'留空默认使用 '+defaults.auth}
            value={auth} onChanged={setAuth}
            textInputAutocapitalization="never" autocorrectionDisabled={true}/>
          <TextField title="SSO 登录入口"
            prompt={'留空默认使用 '+defaults.sso}
            value={sso} onChanged={setSso}
            textInputAutocapitalization="never" autocorrectionDisabled={true}/>
          <TextField title="课表页面"
            prompt={'留空默认使用 '+defaults.table}
            value={table} onChanged={setTable}
            textInputAutocapitalization="never" autocorrectionDisabled={true}/>
        </Section>
        <Section header={<Text>课程数据接口</Text>}
          footer={<Text>学期 ID 由程序自动填写；自定义接口里的 {'{sid}'} 必须保留。此页不会访问网络。</Text>}>
          <TextField title="学期详情"
            prompt={'留空默认使用 '+defaults.semester}
            value={semester} onChanged={setSemester}
            textInputAutocapitalization="never" autocorrectionDisabled={true}/>
          <TextField title="课表数据"
            prompt={'留空默认使用 '+defaults.courses}
            value={courses} onChanged={setCourses}
            textInputAutocapitalization="never" autocorrectionDisabled={true}/>
        </Section>
        <Section>
          <Button title="下一步：账号密码" disabled={!validEndpoints}
            action={()=>{if(validEndpoints)setStep('account');}}/>
        </Section>
      </List>:
      <List navigationTitle="账号密码" navigationBarTitleDisplayMode="inline"
        toolbar={{cancellationAction:<Button title="上一步" action={back}/>}}>
        <Section header={<Text>南京财经大学 · 统一身份认证</Text>}>
          <TextField title="学号" prompt="请输入学号" value={username}
            onChanged={setUsername} textContentType="username"
            textInputAutocapitalization="never"/>
          <SecureField title="密码" prompt="请输入密码" value={password}
            onChanged={setPassword} textContentType="password"/>
        </Section>
        <Section footer={<Text>账号密码只会在学校要求重新认证时使用，认证成功后才会保存。可使用 iOS「密码」自动填充；切换账号请先退出原账号。</Text>}>
          <Button title="开始刷新" disabled={!validAccount}
            action={()=>{if(validAccount)dismiss({
              kind:'credentials',values,username:account,password
            });}}/>
          {allowReuse?<Button title="使用现有登录信息继续"
            action={()=>dismiss({kind:'reuse',values})}/>:null}
        </Section>
      </List>}
  </NavigationStack>;
}

export async function presentNativeRefreshForm(defaults:NativeSchoolEndpoints,
  allowReuse=false):Promise<RefreshFormOutcome|null>{
  const result=await Navigation.present({
    element:<RefreshSetupView defaults={defaults} allowReuse={allowReuse}/>,
    modalPresentationStyle:'pageSheet'
  });
  if(!result||!['credentials','reuse'].includes(result.kind))return null;
  const values=result.values;
  if(!values||!['auth','sso','table','semester','courses'].every(
    key=>typeof values[key]==='string'&&values[key].length<=220))return null;
  if(result.kind==='reuse')return {kind:'reuse',values};
  const username=typeof result.username==='string'?result.username.trim():'';
  const password=typeof result.password==='string'?result.password:'';
  if(!username||username.length>100||!password||password.length>512)return null;
  return {kind:'credentials',values,username,password};
}
