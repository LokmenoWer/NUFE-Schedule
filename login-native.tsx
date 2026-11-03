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

export async function presentNativeCredentialForm(title = 'NUFE 登录') {
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


// Advanced, native-only editing of the five school interface paths.
// This view neither sends requests nor reads accounts or cookies.
export type NativeSchoolEndpoints = {
  auth: string;
  sso: string;
  table: string;
  semester: string;
  courses: string;
};
type EndpointFormOutcome =
  | {kind:'save',values:NativeSchoolEndpoints}
  | {kind:'reset'};

function SchoolEndpointView({initial}:{initial:NativeSchoolEndpoints}) {
  const dismiss=Navigation.useDismiss();
  const [auth,setAuth]=useState(initial.auth);
  const [sso,setSso]=useState(initial.sso);
  const [table,setTable]=useState(initial.table);
  const [semester,setSemester]=useState(initial.semester);
  const [courses,setCourses]=useState(initial.courses);
  const fields=[auth,sso,table,semester,courses];
  const valid=fields.every(v=>v.trim().length>0&&v.trim().length<=220);

  return <NavigationStack>
    <List navigationTitle="教务接口" navigationBarTitleDisplayMode="inline"
      toolbar={{cancellationAction:
        <Button title="取消" action={()=>dismiss(null)}/>}}>
      <Section header={<Text>南京财经大学 · 连接地址</Text>}
        footer={<Text>仅允许修改已验证学校域名内的 HTTPS 接口路径。修改后在下一次刷新时生效；此页面不会发起网络请求。</Text>}>
        <TextField title="统一认证根地址" value={auth} onChanged={setAuth}
          prompt="https://authserver.nufe.edu.cn/authserver"
          textInputAutocapitalization="never" autocorrectionDisabled={true}/>
        <TextField title="SSO 登录入口" value={sso} onChanged={setSso}
          prompt="https://jwxt.nufe.edu.cn/student/sso/login"
          textInputAutocapitalization="never" autocorrectionDisabled={true}/>
        <TextField title="课表页面" value={table} onChanged={setTable}
          prompt="https://jwxt.nufe.edu.cn/student/for-std/course-table"
          textInputAutocapitalization="never" autocorrectionDisabled={true}/>
      </Section>
      <Section header={<Text>课程数据接口</Text>}
        footer={<Text>接口模板中的 {'{sid}'} 代表学期 ID，必须保留，不需要填写具体数字。</Text>}>
        <TextField title="学期详情" value={semester} onChanged={setSemester}
          textInputAutocapitalization="never" autocorrectionDisabled={true}/>
        <TextField title="课表数据" value={courses} onChanged={setCourses}
          textInputAutocapitalization="never" autocorrectionDisabled={true}/>
      </Section>
      <Section>
        <Button title="保存接口" disabled={!valid}
          action={()=>{if(valid)dismiss({kind:'save',values:{
            auth:auth.trim(),sso:sso.trim(),table:table.trim(),
            semester:semester.trim(),courses:courses.trim()
          }});}}/>
        <Button title="恢复默认接口" action={()=>dismiss({kind:'reset'})}/>
      </Section>
    </List>
  </NavigationStack>;
}

export async function presentNativeEndpointForm(initial:NativeSchoolEndpoints):
  Promise<EndpointFormOutcome|null> {
  const result=await Navigation.present({
    element:<SchoolEndpointView initial={initial}/>,
    modalPresentationStyle:'pageSheet'
  });
  if(result?.kind==='reset')return {kind:'reset'};
  if(result?.kind!=='save'||!result.values)return null;
  const values=result.values;
  if(!['auth','sso','table','semester','courses'].every(
      key=>typeof values[key]==='string'&&values[key].length<=220))return null;
  return {kind:'save',values};
}
