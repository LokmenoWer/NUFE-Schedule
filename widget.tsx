// @ts-nocheck
// NUFE-Schedule Home Screen widget. This entry is independent of index.tsx:
// renders only the already synchronized local timetable snapshot.
import { FileManager, Widget, Text, VStack, HStack, Spacer, Script } from 'scripting';
import { loadWidgetState, buildWeek, widgetReloadDate, formatWeekLabel } from './widget-data';

const COLORS={
  dark:{light:'#203451',dark:'#EAF2FF'},
  blue:{light:'#2C69D1',dark:'#96C1FF'},
  muted:{light:'#9BA3AF',dark:'#8E99AA'},
  faint:{light:'#727E91',dark:'#A4B2C5'},
  finished:{light:'#A3A9B2',dark:'#8C96A4'},
  doneBg:{light:'#EEF0F3',dark:'#2B3039'},
  nextBg:{light:'#FFFFFF',dark:'#263348'},
  activeBg:{light:'#DDEBFF',dark:'#28466E'},
  headBg:{light:'#E8F0FF',dark:'#1E3B65'}
};

function CourseCard({course,width,compact=false}){
  const done=course.status==='done',current=course.status==='current';
  const fg=done?COLORS.finished:current?COLORS.blue:COLORS.dark;
  const bg=done?COLORS.doneBg:current?COLORS.activeBg:COLORS.nextBg;
  const font=width<50?9:compact?10:11;
  return <VStack key={course.id} alignment="leading" spacing={3}
      padding={compact?5:7}
      background={{style:bg,shape:{type:'rect',cornerRadius:9}}}
      frame={{maxWidth:'infinity',minHeight:compact?46:64,alignment:'topLeading'}}>
    {current?<Text font={width<50?8:9} fontWeight="bold" foregroundStyle={COLORS.blue}>● 正在上课</Text>:null}
    <Text font={font} fontWeight={current?'bold':'semibold'} lineLimit={compact?2:3}
      foregroundStyle={fg}>{course.title}</Text>
    <Text font={width<50?8:9} foregroundStyle={done?COLORS.muted:COLORS.faint}
      lineLimit={1}>{course.startLabel}-{course.endLabel}</Text>
    {!compact&&width>46&&course.location?
      <Text font={9} foregroundStyle={done?COLORS.muted:COLORS.faint}
        lineLimit={1}>{course.location}</Text>:null}
  </VStack>;
}

function DayColumn({day,width,compact=false,maxRows=4}){
  const shown=day.courses.slice(0,maxRows),overflow=day.courses.length-maxRows;
  const dayColor=day.today?COLORS.blue:COLORS.dark;
  return <VStack key={String(day.index)} alignment="center" spacing={5}
      frame={{width,alignment:'top'}}>
    <VStack spacing={1} frame={{width}}
      padding={{top:5,bottom:5}}
      background={day.today?{style:COLORS.headBg,shape:{type:'rect',cornerRadius:8}}:undefined}>
      <Text font={width<50?10:11} fontWeight="bold" foregroundStyle={dayColor}>{day.label}</Text>
      <Text font={9} foregroundStyle={day.today?COLORS.blue:COLORS.faint}>{day.number}日</Text>
    </VStack>
    {shown.length?shown.map(c=><CourseCard key={c.id} course={c} width={width} compact={compact}/>):
      <VStack frame={{width,minHeight:compact?30:48,alignment:'center'}}>
        <Text font={10} foregroundStyle={COLORS.muted}>无课</Text>
      </VStack>}
    {overflow>0?<Text font={9} foregroundStyle={COLORS.faint}>另有{overflow}节</Text>:null}
  </VStack>;
}

function WeeklyPanel({model,family}){
  const medium=family==='systemMedium';
  const portrait=family==='systemExtraLargePortrait';
  const width=Widget.displaySize?.width||320;
  const usable=Math.max(240,width-(medium?20:24));
  const gap=model.days.length===7?2:4;
  const colWidth=Math.max(30,Math.floor((usable-gap*(model.days.length-1))/model.days.length));
  const maxRows=medium?2:portrait?7:4;
  return <VStack alignment="leading" spacing={medium?7:11}
    padding={medium?9:12}
    widgetBackground={{light:'#F7F9FD',dark:'#141E2C'}}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
    <HStack alignment="center" spacing={6}>
      <Text font={medium?13:17} fontWeight="bold" foregroundStyle={COLORS.dark}>本周课表</Text>
      <Spacer/>
      <Text font={medium?9:10} foregroundStyle={COLORS.faint}>
        {formatWeekLabel(model.start)}
      </Text>
    </HStack>
    <HStack alignment="top" spacing={gap} frame={{maxWidth:'infinity'}}>
      {model.days.map(day=><DayColumn key={String(day.index)} day={day}
        width={colWidth} compact={medium} maxRows={maxRows}/>)}
    </HStack>
    <Spacer minLength={0}/>
    <HStack spacing={5} frame={{maxWidth:'infinity'}}>
      <Text font={9} foregroundStyle={COLORS.faint}>已下课变灰 · 进行中高亮</Text>
      <Spacer/>
      {model.outdated?<Text font={9} foregroundStyle={COLORS.blue}>建议刷新课表</Text>:null}
    </HStack>
  </VStack>;
}

function SmallPanel({model}){
  const today=model.days.find(d=>d.today);
  const classes=today?.courses||[];
  const current=classes.find(x=>x.status==='current');
  const next=classes.find(x=>x.status==='upcoming');
  const chosen=current||next||classes[classes.length-1];
  return <VStack alignment="leading" spacing={8} padding={13}
    widgetBackground={{light:'#F7F9FD',dark:'#141E2C'}}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
    <Text font={14} fontWeight="bold" foregroundStyle={COLORS.dark}>今日课程</Text>
    <Text font={11} foregroundStyle={COLORS.faint}>{today?'周'+('一二三四五六日'[today.index]):'周末'} · {classes.length} 节课</Text>
    <Spacer minLength={0}/>
    {chosen?<VStack alignment="leading" spacing={5}
      background={{style:chosen.status==='current'?COLORS.activeBg:COLORS.nextBg,
        shape:{type:'rect',cornerRadius:10}}}
      padding={9}>
      <Text font={10} foregroundStyle={chosen.status==='done'?COLORS.muted:COLORS.blue}>
        {chosen.status==='current'?'正在上课':chosen.status==='done'?'今日已结束':'下一节'}
      </Text>
      <Text font={13} fontWeight="semibold" lineLimit={2}
        foregroundStyle={chosen.status==='done'?COLORS.muted:COLORS.dark}>{chosen.title}</Text>
      <Text font={10} foregroundStyle={COLORS.faint}>{chosen.startLabel}-{chosen.endLabel}</Text>
      <Text font={10} foregroundStyle={COLORS.faint} lineLimit={1}>{chosen.location}</Text>
    </VStack>:
    <Text font={14} foregroundStyle={COLORS.faint}>今天没有课程</Text>}
    <Spacer minLength={0}/>
  </VStack>;
}

function EmptyPanel({kind='empty',code=''}) {
  const failure=kind==='invalid';
  const label=failure?'缓存读取失败':'尚无课表缓存';
  const guidance=failure?'请更新后重新打开组件；如仍失败，请反馈下方代码':
    '打开 NUFE-Schedule 完成首次课表同步';
  return <VStack alignment="leading" spacing={9} padding={16}
    widgetBackground={{light:'#F7F9FD',dark:'#141E2C'}}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'center'}}>
    <Text font={16} fontWeight="bold" foregroundStyle={COLORS.dark}>NUFE · 本周课表</Text>
    <Text font={12} fontWeight="medium" foregroundStyle={COLORS.faint}>{label}</Text>
    <Text font={11} foregroundStyle={COLORS.faint} lineLimit={3}>{guidance}</Text>
    {failure?<Text font={10} foregroundStyle={COLORS.muted}>诊断：{code||'UNKNOWN'}</Text>:null}
  </VStack>;
}

const snapshot=loadWidgetState(FileManager);
if(snapshot.kind!=='ready'){
  Widget.present(<EmptyPanel kind={snapshot.kind} code={snapshot.code}/>,
    {policy:'after',date:new Date(Date.now()+2*60*60*1000)});
}else{
  const model=buildWeek(snapshot.state,Date.now());
  const family=Widget.family;
  Widget.present(family==='systemSmall'||String(family).startsWith('accessory')
    ?<SmallPanel model={model}/>
    :<WeeklyPanel model={model} family={family}/>,
    {policy:'after',date:widgetReloadDate(model)});
}
