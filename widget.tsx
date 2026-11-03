// @ts-nocheck
// CourseSync Home Screen widget, modeled on the nufe-kebiao Scriptable widget.
// This entry is independent of index.tsx and renders only the already
// synchronized local timetable snapshot. Parameter: today (default) or week.
import { FileManager, Widget, Text, DateLabel, VStack, HStack, ZStack, Spacer, RoundedRectangle, GeometryReader, Script } from 'scripting';
import { loadBestWidgetState, buildWidgetModel, widgetReloadDate, normalizeFamily, parseMode, buildPlan, weekToShow, weekColumns, weekGrid, headerNote, daySubtitle, weekSubtitle, weekdayName, chipPlan, chipOptions, chipName, fitRoom, textWidth, lessonMs, mixHex, LABEL_H } from './widget-data';

const BG={light:'#f6f7fb',dark:'#16181d'};
const COLORS={
  text:{light:'#1a1d24',dark:'#eef0f5'},
  sub:{light:'#5b6372',dark:'#a3aab8'},
  faint:{light:'#8a91a0',dark:'#6f7685'},
  accent:'#4b63e0',live:'#e03131',warn:'#e8590c'
};
const PADDING={top:14,leading:14,bottom:12,trailing:14};
const DEFAULT_TINT='#4b63e0';

function tintText(hex){return {light:hex,dark:mixHex(hex,'#ffffff',0.4)};}
function tintFill(hex,amount){
  return {light:mixHex(hex,BG.light,1-amount),dark:mixHex(hex,BG.dark,1-amount)};
}
function fixed(width,height,alignment='topLeading'){return {width,height,alignment};}

function Bar({color,height}){
  return <RoundedRectangle cornerRadius={1.5} fill={color} frame={{width:3,height}}/>;
}

// Live: time until the bell, ticking by itself. Next: relative time until class.
function Countdown({lesson,size,color,width}){
  const live=lesson.state==='live';
  return <DateLabel date={new Date(lessonMs(lesson.date,live?lesson.end:lesson.start))}
    style={live?'timer':'relative'} font={size} foregroundStyle={color} lineLimit={1}
    minScaleFactor={0.7} multilineTextAlignment="trailing"
    frame={{width,alignment:'trailing'}}/>;
}

function Header({title,subtitle,note,family}){
  return <HStack alignment="center" spacing={0}>
    <Text font={family==='small'?13:14} fontWeight="bold" foregroundStyle={COLORS.text} lineLimit={1}>{title}</Text>
    {subtitle?<Text font={11} foregroundStyle={COLORS.sub} lineLimit={1} minScaleFactor={0.8}>{'  '+subtitle}</Text>:null}
    <Spacer minLength={0}/>
    {note?<Text font={10} fontWeight="medium" lineLimit={1} minScaleFactor={0.8}
      foregroundStyle={note.tone==='warn'?COLORS.warn:COLORS.faint}>{note.text}</Text>:null}
  </HStack>;
}

function LessonRow({lesson,compact=false,showTeacher=false}){
  const meta=[lesson.start+'–'+lesson.end,lesson.room,showTeacher?lesson.teachers:''].filter(Boolean).join(' · ');
  const active=lesson.state==='live'||lesson.state==='next';
  return <HStack alignment="center" spacing={7}>
    <Bar color={lesson.color||DEFAULT_TINT} height={compact?26:32}/>
    <VStack alignment="leading" spacing={0}>
      <Text font={compact?12:13} fontWeight="semibold" foregroundStyle={COLORS.text}
        lineLimit={1} minScaleFactor={0.8}>{lesson.name}</Text>
      <Text font={compact?10:11} foregroundStyle={COLORS.sub} lineLimit={1} minScaleFactor={0.8}>{meta}</Text>
    </VStack>
    <Spacer minLength={0}/>
    {active?<VStack alignment="trailing" spacing={0} frame={{width:58,alignment:'trailing'}}>
      <Text font={10} fontWeight="semibold" lineLimit={1}
        foregroundStyle={lesson.state==='live'?COLORS.live:COLORS.accent}>
        {lesson.state==='live'?'上课中':'下一节'}
      </Text>
      <Countdown lesson={lesson} size={10} color={COLORS.sub} width={58}/>
    </VStack>:null}
  </HStack>;
}

function Centered({text,size=13}){
  return <VStack frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'center'}}>
    <Text font={size} fontWeight="medium" foregroundStyle={COLORS.sub} lineLimit={2}
      multilineTextAlignment="center">{text}</Text>
  </VStack>;
}

function TodayList({plan,family}){
  const large=family==='large'||family==='extraLarge';
  const max=large?7:3,compact=family==='medium';
  if(plan.lessons.length){
    const rest=plan.lessons.length-max;
    return <VStack alignment="leading" spacing={0} padding={{top:8}} frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
      <VStack alignment="leading" spacing={compact?5:8}>
        {plan.lessons.slice(0,max).map(lesson=>
          <LessonRow key={lesson.id||lesson.start} lesson={lesson} compact={compact} showTeacher={!compact}/>)}
      </VStack>
      <Spacer minLength={0}/>
      {rest>0?<Text font={10} foregroundStyle={COLORS.faint}>还有 {rest} 节</Text>:null}
    </VStack>;
  }
  if(plan.ahead)return <VStack alignment="leading" spacing={0} padding={{top:6}} frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
    <Text font={12} fontWeight="medium" foregroundStyle={COLORS.sub}>{plan.empty}</Text>
    <Text font={11} fontWeight="semibold" foregroundStyle={COLORS.faint} padding={{top:6,bottom:4}}>{plan.ahead.title}</Text>
    <VStack alignment="leading" spacing={5}>
      {plan.ahead.lessons.slice(0,max-1).map(lesson=>
        <LessonRow key={lesson.id||lesson.start} lesson={lesson} compact/>)}
    </VStack>
    <Spacer minLength={0}/>
  </VStack>;
  return <Centered text={plan.empty}/>;
}

function TodaySmall({plan}){
  const focus=plan.lessons.find(l=>l.state==='live'||l.state==='next')||plan.lessons[0];
  if(!focus){
    if(!plan.ahead)return <Centered text={plan.empty} size={12}/>;
    const first=plan.ahead.lessons[0];
    return <VStack alignment="leading" spacing={0} padding={{top:6}} frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
      <Text font={11} foregroundStyle={COLORS.sub} lineLimit={2}>{plan.empty}</Text>
      <Spacer minLength={0}/>
      <Text font={11} fontWeight="semibold" foregroundStyle={COLORS.faint} lineLimit={1} minScaleFactor={0.6}>
        {plan.ahead.title.replace(' · ',' ')+' '+first.start}
      </Text>
      <Text font={14} fontWeight="bold" foregroundStyle={COLORS.text} lineLimit={2}>{first.name}</Text>
    </VStack>;
  }
  const others=plan.lessons.length-1;
  const live=focus.state==='live',next=focus.state==='next';
  return <VStack alignment="leading" spacing={0} frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
    <Spacer minLength={0}/>
    {live||next?<Text font={11} fontWeight="semibold" foregroundStyle={live?COLORS.live:COLORS.accent}>
      {live?'上课中':'下一节'}
    </Text>:null}
    <Text font={18} fontWeight="bold" foregroundStyle={COLORS.text} lineLimit={1} minScaleFactor={0.6}>
      {focus.start+'–'+focus.end}
    </Text>
    <Text font={14} fontWeight="semibold" foregroundStyle={tintText(focus.color||DEFAULT_TINT)} lineLimit={2}>{focus.name}</Text>
    {focus.room?<Text font={11} foregroundStyle={COLORS.sub} lineLimit={1} minScaleFactor={0.8}>{focus.room}</Text>:null}
    {live||next?<HStack spacing={0}>
      {live?<Text font={11} foregroundStyle={COLORS.sub}>还剩 </Text>:null}
      <DateLabel date={new Date(lessonMs(focus.date,live?focus.end:focus.start))} style={live?'timer':'relative'}
        font={11} foregroundStyle={COLORS.sub} lineLimit={1} minScaleFactor={0.7}
        frame={{width:live?52:96,alignment:'leading'}}/>
    </HStack>:null}
    <Spacer minLength={0}/>
    {others>0?<Text font={10} foregroundStyle={COLORS.faint}>之后还有 {others} 节</Text>:null}
  </VStack>;
}

// A live class gets a 1.5pt ring: the outer solid card shows around the inner tint.
function LessonChip({lesson,width,height,large,more,needTime}){
  const tint=lesson.color||DEFAULT_TINT,name=chipName(lesson,more);
  const plan=chipPlan(lesson,name,{...chipOptions(large,width),height,needTime});
  const {sz}=plan,live=lesson.state==='live',ring=live?1.5:0;
  const fill=tintFill(tint,lesson.state==='past'?0.08:0.2);
  const body=<VStack alignment="leading" spacing={0}
    padding={{top:2-Math.min(ring,1),leading:4-ring,bottom:1,trailing:2}}
    frame={fixed(width-2*ring,height-2*ring)}
    background={{style:fill,shape:{type:'rect',cornerRadius:6-ring}}}
    clipShape={{type:'rect',cornerRadius:6-ring}}>
    {plan.time?<Text font={plan.timeSize} fontWeight="semibold" foregroundStyle={tintText(tint)}
      lineLimit={plan.timeLines} minScaleFactor={0.9}>{plan.time}</Text>:null}
    <Text font={sz.name} fontWeight="semibold" foregroundStyle={COLORS.text} lineLimit={plan.nameLines}
      minScaleFactor={plan.nameFull?0.9:0.7} multilineTextAlignment="leading">{name}</Text>
    {plan.room?<Text font={sz.room} foregroundStyle={COLORS.sub} lineLimit={plan.roomLines} minScaleFactor={0.9}>{plan.room}</Text>:null}
    {plan.teacher?<Text font={sz.room} foregroundStyle={COLORS.faint} lineLimit={1} minScaleFactor={0.9}>{lesson.teachers}</Text>:null}
  </VStack>;
  if(!live)return body;
  return <VStack frame={fixed(width,height,'center')}
    background={{style:tint,shape:{type:'rect',cornerRadius:6}}}>{body}</VStack>;
}

function WeekGrid({columns,family,size,stale}){
  const {large,gap,axisSize,axisWidth,colWidth,gridHeight,layout}=weekGrid(columns,size,family);
  const axisInner=axisWidth-gap;
  return <VStack alignment="leading" spacing={0} padding={{top:6}}>
    <HStack alignment="top" spacing={gap}>
      <Spacer frame={{width:axisInner,height:1}}/>
      {columns.map(col=><Text key={col.date} font={11} fontWeight={col.isToday?'bold':'medium'}
        foregroundStyle={col.isToday?COLORS.accent:COLORS.sub} lineLimit={1}
        frame={{width:colWidth,alignment:'center'}}>{weekdayName(col)}</Text>)}
    </HStack>
    {layout.labels.length?<HStack alignment="top" spacing={gap} padding={{top:4}}>
      <ZStack alignment="topLeading" frame={fixed(axisInner,gridHeight)}>
        {layout.labels.map((label,i)=>{
          const next=i+1<layout.labels.length?layout.labels[i+1].top:gridHeight;
          const unit=label.unit?'第'+label.unit+'节':'';
          const showUnit=unit&&next-label.top-LABEL_H>=LABEL_H&&textWidth(unit,8)<=axisInner;
          return <VStack key={label.idx} alignment="leading" spacing={0} padding={{top:label.top}}>
            <Text font={axisSize} fontWeight="semibold" foregroundStyle={COLORS.sub} lineLimit={1}
              minScaleFactor={0.9} frame={{width:axisInner,height:LABEL_H,alignment:'leading'}}>{label.text}</Text>
            {showUnit?<Text font={8} foregroundStyle={COLORS.faint} lineLimit={1}
              frame={{width:axisInner,height:LABEL_H,alignment:'leading'}}>{unit}</Text>:null}
          </VStack>;
        })}
      </ZStack>
      {columns.map((col,i)=><ZStack key={col.date} alignment="topLeading" frame={fixed(colWidth,gridHeight)}>
        {layout.cols[i].map(it=><VStack key={it.item.id||it.item.start} padding={{top:it.top}}>
          <LessonChip lesson={it.item} width={colWidth} height={Math.max(10,it.height-1.5)}
            large={large} more={it.more} needTime={!it.labeled}/>
        </VStack>)}
      </ZStack>)}
    </HStack>:<Centered text={stale?'数据过旧，点开刷新':'这一周没有课'} size={12}/>}
  </VStack>;
}

function Accessory({plan,family}){
  const focus=plan.lessons.find(l=>l.state==='live'||l.state==='next');
  const ahead=plan.ahead&&plan.ahead.lessons[0];
  if(family==='accessoryInline')return <Text widgetBackground="clear">
    {focus?focus.start+' '+focus.name+(focus.room?' @'+focus.room:''):plan.empty||'今天没有课'}
  </Text>;
  if(family==='accessoryCircular'){
    const label=focus?(focus.state==='live'?'下课':'上课'):ahead?weekdayName(plan.ahead.day):'';
    const value=focus?(focus.state==='live'?focus.end:focus.start):ahead?ahead.start:'—';
    return <VStack alignment="center" spacing={0} widgetBackground="clear">
      {label?<Text font={10}>{label}</Text>:null}
      <Text font={14} fontWeight="bold" lineLimit={1} minScaleFactor={0.7}>{value}</Text>
    </VStack>;
  }
  if(!focus)return <VStack alignment="leading" spacing={0} widgetBackground="clear"
    frame={{maxWidth:'infinity',alignment:'leading'}}>
    <Text font={13} fontWeight="semibold" lineLimit={1}>{plan.empty||'今天没有课'}</Text>
    {ahead?<Text font={11} lineLimit={1}>{plan.ahead.title}</Text>:null}
    {ahead?<Text font={12} lineLimit={1}>{ahead.start+' '+ahead.name}</Text>:null}
  </VStack>;
  const live=focus.state==='live';
  return <VStack alignment="leading" spacing={0} widgetBackground="clear"
    frame={{maxWidth:'infinity',alignment:'leading'}}>
    <Text font={13} fontWeight="semibold" lineLimit={1}>{(live?'上课中':focus.start)+' '+focus.name}</Text>
    <Text font={12} lineLimit={1}>{[focus.room,focus.start+'–'+focus.end].filter(Boolean).join(' · ')}</Text>
    <HStack spacing={0}>
      {live?<Text font={12}>还剩 </Text>:null}
      <DateLabel date={new Date(lessonMs(focus.date,live?focus.end:focus.start))} style={live?'timer':'relative'}
        font={12} lineLimit={1} frame={{width:96,alignment:'leading'}}/>
    </HStack>
  </VStack>;
}

function Canvas({url,children}){
  return <VStack alignment="leading" spacing={0} padding={PADDING} widgetBackground={BG} widgetURL={url}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>{children}</VStack>;
}

function TodayPanel({model,family,url}){
  const plan=buildPlan(model);
  return <Canvas url={url}>
    <Header title={plan.title} subtitle={daySubtitle(plan.day)} note={headerNote(model,plan.day,family)} family={family}/>
    {family==='small'?<TodaySmall plan={plan}/>:<TodayList plan={plan} family={family}/>}
  </Canvas>;
}

// GeometryReader measures the real widget instead of a per-device size table.
function WeekPanel({model,family,url}){
  const {title,block}=weekToShow(model);
  const columns=weekColumns(block,model.clock);
  return <GeometryReader>
    {proxy=><Canvas url={url}>
      <Header title={title} subtitle={weekSubtitle(block)} note={headerNote(model,block.days[0],family)} family={family}/>
      <WeekGrid columns={columns} family={family} stale={model.stale}
        size={{width:proxy.size.width,height:proxy.size.height}}/>
    </Canvas>}
  </GeometryReader>;
}

function EmptyPanel({kind='empty',code='',url}) {
  const failure=kind==='invalid';
  const label=failure?'缓存读取失败':'尚无课表缓存';
  const guidance=code==='OPEN_MAIN_ONCE'?'请打开一次 CourseSync，自动建立组件缓存':
    failure?'请反馈下方代码以便定位；课表和登录信息未被修改':
    '打开 CourseSync 完成首次课表同步';
  return <Canvas url={url}>
    <Text font={13} fontWeight="bold" foregroundStyle={COLORS.text}>CourseSync</Text>
    <Spacer minLength={0}/>
    <Text font={12} fontWeight="medium" foregroundStyle={COLORS.sub}>{label}</Text>
    <Text font={12} foregroundStyle={COLORS.sub} lineLimit={4}>{guidance}</Text>
    {failure?<Text font={10} foregroundStyle={COLORS.faint}>诊断：{code||'UNKNOWN'}</Text>:null}
    <Spacer minLength={0}/>
  </Canvas>;
}

const family=normalizeFamily(Widget.family);
const mode=parseMode(Widget.parameter,family);
// Tapping anywhere opens the CourseSync main menu, the local counterpart of the reference's website link.
let url;
try{url=Script.createRunURLScheme(Script.name,{mode:'menu'});}catch(_){url=undefined;}
const snapshot=loadBestWidgetState(FileManager,typeof Storage!=='undefined'?Storage:null);
if(snapshot.kind!=='ready'){
  Widget.present(<EmptyPanel kind={snapshot.kind} code={snapshot.code} url={url}/>,
    {policy:'after',date:new Date(Date.now()+2*60*60*1000)});
}else{
  const model=buildWidgetModel(snapshot.state,Date.now());
  Widget.present(family.startsWith('accessory')?<Accessory plan={buildPlan(model)} family={family}/>:
    mode==='week'?<WeekPanel model={model} family={family} url={url}/>:
    <TodayPanel model={model} family={family} url={url}/>,
    {policy:'after',date:widgetReloadDate(model)});
}

// Required by the Scripting widget lifecycle after presenting the view.
Script.exit();
