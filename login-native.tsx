// Native iOS credential entry for Scripting. No HTML, embedded URLs, requests,
// clipboard reads, telemetry or password persistence in this view.
// Passwords remain in memory only until caller authenticates or discards them.
import {
  Navigation, NavigationStack, List, Section, Text,
  TextField, SecureField, Button, Image, Picker, useState,
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
      <Section header={<Text>账号登录</Text>}>
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


// Native two-step flow. School selection is a whitelist, not a URL editor.
export type NativeSchoolChoice = {id:string;name:string};
type RefreshFormOutcome=
  | {kind:'credentials';schoolId:string;username:string;password:string}
  | {kind:'reuse';schoolId:string};

function RefreshSetupView({schools,initialSchoolId,allowReuse}:{
  schools:NativeSchoolChoice[];initialSchoolId:string;allowReuse:boolean;
}){
  const dismiss=Navigation.useDismiss();
  const [step,setStep]=useState<'school'|'account'>('school');
  const [schoolId,setSchoolId]=useState(initialSchoolId);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const validSchool=schools.some(s=>s.id===schoolId);
  const account=username.trim();
  const validAccount=account.length>0&&account.length<=100&&
    password.length>0&&password.length<=512;
  const back=()=>step==='school'?dismiss(null):setStep('school');
  return <NavigationStack>
    {step==='school'?
      <List navigationTitle="选择学校" navigationBarTitleDisplayMode="inline"
        toolbar={{cancellationAction:<Button title="取消" action={back}/>}}>
        <Section header={<Text>请选择你的学校</Text>}
          footer={<Text>当前仅支持白名单内的学校。选定后将自动使用预设的认证和课表接口，无需手动填写链接。</Text>}>
          <Picker title="学校" pickerStyle="menu"
            value={schoolId} onChanged={setSchoolId}>
            {schools.map(s=><Text key={s.id} tag={s.id}>{s.name}</Text>)}
          </Picker>
        </Section>
        <Section>
          <Button title="下一步：账号密码" disabled={!validSchool}
            action={()=>{if(validSchool)setStep('account');}}/>
        </Section>
      </List>:
      <List navigationTitle="账号密码" navigationBarTitleDisplayMode="inline"
        toolbar={{cancellationAction:<Button title="上一步" action={back}/>}}>
        <Section header={<Text>账号登录</Text>}>
          <TextField title="学号" prompt="请输入学号" value={username}
            onChanged={setUsername} textContentType="username"
            textInputAutocapitalization="never"/>
          <SecureField title="密码" prompt="请输入密码" value={password}
            onChanged={setPassword} textContentType="password"/>
        </Section>
        <Section footer={<Text>仅在学校要求重新认证时提交登录信息，验证成功后才会保存；支持 iOS「密码」自动填充。</Text>}>
          <Button title="开始刷新" disabled={!validAccount}
            action={()=>{if(validAccount&&validSchool)dismiss({
              kind:'credentials',schoolId,username:account,password
            });}}/>
          {allowReuse?<Button title="使用现有登录信息继续"
            disabled={!validSchool}
            action={()=>{if(validSchool)dismiss({kind:'reuse',schoolId});}}/>:null}
        </Section>
      </List>}
  </NavigationStack>;
}

export async function presentNativeRefreshForm(schools:NativeSchoolChoice[],
  initialSchoolId:string,allowReuse=false):Promise<RefreshFormOutcome|null>{
  const result=await Navigation.present({
    element:<RefreshSetupView schools={schools} initialSchoolId={initialSchoolId}
      allowReuse={allowReuse}/>,
    modalPresentationStyle:'pageSheet'
  });
  if(!result||!['credentials','reuse'].includes(result.kind))return null;
  if(!schools.some(s=>s.id===result.schoolId))return null;
  if(result.kind==='reuse')return {kind:'reuse',schoolId:result.schoolId};
  const username=typeof result.username==='string'?result.username.trim():'';
  const password=typeof result.password==='string'?result.password:'';
  if(!username||username.length>100||!password||password.length>512)return null;
  return {kind:'credentials',schoolId:result.schoolId,username,password};
}
