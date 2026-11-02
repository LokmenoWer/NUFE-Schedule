// One native, indeterminate progress sheet. No WebKit, fabricated percentage,
// timer polling, sensitive stage details or repeated re-presentation.
import {
  Button, Navigation, NavigationStack, ProgressView, Spacer, Text, VStack,
} from 'scripting';

type ProgressSession={
  closed:boolean;
  hidden:boolean;
  suppressed:boolean;
  shown:boolean;
  revision:number;
  dismiss:(() => void)|null;
};

function ProgressScreen({session}:{session:ProgressSession}) {
  const dismiss=Navigation.useDismiss();
  // The script's synchronization still owns the task. Closing this view
  // hides status only; it never cancels a calendar transaction.
  session.dismiss=()=>dismiss();
  if(session.closed||session.hidden) {
    // Dismiss a sheet even if a login handoff happened before it mounted.
    Promise.resolve().then(()=>{
      if(session.closed||session.hidden)try{dismiss();}catch(_){}
    });
  }
  return <NavigationStack>
    <VStack
      navigationTitle="正在刷新课表"
      navigationBarTitleDisplayMode="inline"
      frame={{maxWidth:'infinity',maxHeight:'infinity'}}
      padding={24}
      spacing={16}
    >
      <Spacer/>
      <ProgressView progressViewStyle="circular"/>
      <Text font="headline">正在刷新课表</Text>
      <Text foregroundStyle="secondaryLabel" font="subheadline">
        完成后会显示结果
      </Text>
      <Spacer/>
      <Button title="收起" action={()=>{
        session.suppressed=true;
        dismiss();
      }}/>
    </VStack>
  </NavigationStack>;
}

export function createNativeProgressView(){
  let presented:Promise<unknown>=Promise.resolve();
  const session:ProgressSession={
    closed:false,hidden:false,suppressed:false,shown:false,
    revision:0,dismiss:null,
  };
  const closeVisible=()=>{
    const dismiss=session.dismiss;
    session.dismiss=null;
    if(dismiss)try{dismiss();}catch(_){}
  };
  return {
    show(){
      if(session.closed||session.hidden||session.suppressed||session.shown)return;
      const revision=++session.revision;
      session.shown=true;
      try {
        presented=Promise.resolve(Navigation.present({
          element:<ProgressScreen session={session}/>,
          modalPresentationStyle:'pageSheet',
        })).then(()=>{
          if(session.revision!==revision)return;
          session.shown=false;
          session.dismiss=null;
          session.suppressed=true; // A dismissed sheet must stay dismissed.
        },()=>{
          if(session.revision!==revision)return;
          session.shown=false;
          session.dismiss=null;
          session.suppressed=true;
        });
      }catch(_){
        if(session.revision===revision){
          session.shown=false;
          session.suppressed=true;
        }
      }
    },
    pause(){
      if(session.closed||session.hidden)return Promise.resolve();
      session.hidden=true;
      session.revision++;
      session.shown=false;
      closeVisible();
      // Native presentation dismissal is asynchronous. Wait briefly for the
      // actual sheet to leave before presenting verification input.
      // Never let a hung host UI block the school login indefinitely.
      return Promise.race([
        presented.then(()=>{},()=>{}),
        new Promise<void>(resolve=>setTimeout(resolve,800)),
      ]);
    },
    resume(){
      if(session.closed||!session.hidden)return;
      session.hidden=false;
      this.show(); // Only once, after manual school verification.
    },
    finish(){
      if(session.closed)return;
      session.closed=true;
      session.revision++;
      session.shown=false;
      closeVisible();
    },
  };
}
