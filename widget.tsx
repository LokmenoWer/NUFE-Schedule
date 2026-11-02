// @ts-nocheck
// NUFE-Schedule Home Screen widget. This entry is independent of index.tsx:
// renders only the already synchronized local timetable snapshot.
import { FileManager, Widget, Text, VStack, HStack, Spacer, GeometryReader, Script } from 'scripting';
import { loadBestWidgetState, buildRollingDays, selectVisibleCourses, widgetReloadDate } from './widget-data';

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

function CourseCard({course,compact=false}){
  const done=course.status==='done',current=course.status==='current';
  const fg=done?COLORS.finished:current?COLORS.blue:COLORS.dark;
  const bg=done?COLORS.doneBg:current?COLORS.activeBg:COLORS.nextBg;
  return <VStack key={course.id} alignment="leading" spacing={compact?2:3}
      padding={compact?5:7}
      background={{style:bg,shape:{type:'rect',cornerRadius:9}}}
      frame={{maxWidth:'infinity',alignment:'topLeading'}}>
    {current?<Text font={9} fontWeight="bold" foregroundStyle={COLORS.blue}>● 上课中</Text>:null}
    <Text font={compact?10:11} fontWeight={current?'bold':'semibold'}
      lineLimit={compact?3:4} foregroundStyle={fg}>{course.title}</Text>
    <Text font={compact?8:9} foregroundStyle={done?COLORS.muted:COLORS.faint}
      lineLimit={1}>{course.startLabel}–{course.endLabel}</Text>
    {course.location?<Text font={compact?8:9}
      foregroundStyle={done?COLORS.muted:COLORS.faint}
      lineLimit={compact?1:2}>{course.location}</Text>:null}
    {course.teacher?<Text font={compact?8:9}
      foregroundStyle={done?COLORS.muted:COLORS.faint}
      lineLimit={1}>{course.teacher}</Text>:null}
  </VStack>;
}

function DayColumn({day,width,compact=false,maxRows=1}){
  const window=selectVisibleCourses(day,maxRows);
  const dayColor=day.today?COLORS.blue:COLORS.dark;
  return <VStack key={String(day.index)} alignment="center" spacing={compact?4:5}
    frame={{width,alignment:'top'}}>
    <VStack spacing={1} frame={{width}} padding={{top:4,bottom:5}}
      background={day.today?{style:COLORS.headBg,shape:{type:'rect',cornerRadius:8}}:undefined}>
      <Text font={compact?11:13} fontWeight="bold" foregroundStyle={dayColor}>
        {day.label}
      </Text>
      <Text font={compact?8:9} foregroundStyle={day.today?COLORS.blue:COLORS.faint}
        lineLimit={1}>{day.weekday} {day.dateLabel}</Text>
    </VStack>
    {window.courses.length?window.courses.map(c=>
      <CourseCard key={c.id} course={c} compact={compact}/>):
      <Text font={10} foregroundStyle={COLORS.muted}>无课</Text>}
    {window.total>window.courses.length?
      <Text font={compact?8:9} foregroundStyle={COLORS.faint}>
        {window.position}/{window.total} · 自动定位
      </Text>:null}
  </VStack>;
}

// GeometryReader measures the actual widget CONTENT rect, rather than the
// screen's width. A conservative inset prevents clipping at rounded corners.
// No footer or stretchy Spacer can push the title outside the visible area.
function RollingPanel({model,family}){
  const medium=family==='systemMedium';
  return <GeometryReader>
    {proxy=>{
      const width=proxy.size.width,height=proxy.size.height;
      const pad=medium?8:10,gap=medium?5:7;
      const colWidth=Math.max(40,Math.floor((width-2*pad-24-gap*3)/4));
      const maxRows=!medium&&height>=320?2:1;
      return <VStack alignment="leading" spacing={medium?6:9}
        padding={pad}
        widgetBackground={{light:'#F7F9FD',dark:'#141E2C'}}
        frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
        <HStack alignment="center" spacing={5}
          frame={{maxWidth:'infinity',alignment:'leading'}}>
          <Text font={medium?13:15} fontWeight="bold" foregroundStyle={COLORS.dark}>
            近日课表
          </Text>
          <Spacer/>
          <Text font={10} foregroundStyle={COLORS.faint}>自动更新</Text>
        </HStack>
        <HStack alignment="top" spacing={gap}
          frame={{maxWidth:'infinity',alignment:'leading'}}>
          {model.days.map(day=><DayColumn key={String(day.index)} day={day}
            width={colWidth} compact={medium} maxRows={maxRows}/>)}
        </HStack>
      </VStack>;
    }}
  </GeometryReader>;
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
      {chosen.teacher?<Text font={10} foregroundStyle={COLORS.faint} lineLimit={1}>{chosen.teacher}</Text>:null}
    </VStack>:
    <Text font={14} foregroundStyle={COLORS.faint}>今天没有课程</Text>}
    <Spacer minLength={0}/>
  </VStack>;
}

function EmptyPanel({kind='empty',code=''}) {
  const failure=kind==='invalid';
  const label=failure?'缓存读取失败':'尚无课表缓存';
  const guidance=code==='OPEN_MAIN_ONCE'?'请打开一次 NUFE-Schedule，自动建立组件缓存':
    failure?'请反馈下方代码以便定位；课表和登录信息未被修改':
    '打开 NUFE-Schedule 完成首次课表同步';
  return <VStack alignment="leading" spacing={9} padding={16}
    widgetBackground={{light:'#F7F9FD',dark:'#141E2C'}}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'center'}}>
    <Text font={16} fontWeight="bold" foregroundStyle={COLORS.dark}>NUFE · 近日课表</Text>
    <Text font={12} fontWeight="medium" foregroundStyle={COLORS.faint}>{label}</Text>
    <Text font={11} foregroundStyle={COLORS.faint} lineLimit={3}>{guidance}</Text>
    {failure?<Text font={10} foregroundStyle={COLORS.muted}>诊断：{code||'UNKNOWN'}</Text>:null}
  </VStack>;
}

const snapshot=loadBestWidgetState(FileManager,typeof Storage!=='undefined'?Storage:null);
if(snapshot.kind!=='ready'){
  Widget.present(<EmptyPanel kind={snapshot.kind} code={snapshot.code}/>,
    {policy:'after',date:new Date(Date.now()+2*60*60*1000)});
}else{
  const model=buildRollingDays(snapshot.state,Date.now());
  const family=Widget.family;
  Widget.present(family==='systemSmall'||String(family).startsWith('accessory')
    ?<SmallPanel model={model}/>
    :<RollingPanel model={model} family={family}/>,
    {policy:'after',date:widgetReloadDate(model)});
}

// Required by the Scripting widget lifecycle after presenting the view.
Script.exit();
