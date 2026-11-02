// @ts-nocheck
// NUFE-Schedule Home Screen widget. This entry is independent of index.tsx:
// renders only the already synchronized local timetable snapshot.
import { FileManager, Widget, Text, VStack, HStack, Spacer, GeometryReader, Script } from 'scripting';
import { loadBestWidgetState, buildWidgetModel, selectVisibleCourses, selectTodayPair, widgetReloadDate } from './widget-data';

const COLORS={
  // Opaque white canvas in all appearance modes; only course statuses tint.
  dark:'#203451', blue:'#2C69D1', muted:'#9BA3AF',
  faint:'#727E91', finished:'#929AA7',
  doneBg:'#E5E7EB', nextBg:'#EFF4FA',
  activeBg:'#D9E9FF'
};

function CourseCard({course,compact=false}){
  const done=course.status==='done',current=course.status==='current';
  const fg=done?COLORS.finished:current?COLORS.blue:COLORS.dark;
  const bg=done?COLORS.doneBg:current?COLORS.activeBg:COLORS.nextBg;
  return <VStack key={course.id} alignment="leading" spacing={compact?2:3}
      padding={compact?3:6}
      background={{style:bg,shape:{type:'rect',cornerRadius:9}}}
      frame={{maxWidth:'infinity',alignment:'topLeading'}}>
    <Text font={compact?10:11} fontWeight={current?'bold':'semibold'}
      lineLimit={compact?4:5} foregroundStyle={fg}>{course.title}</Text>
    <Text font={compact?8:9} foregroundStyle={done?COLORS.muted:COLORS.faint}
      lineLimit={2}>{course.startLabel}–{course.endLabel}</Text>
    {course.location?<Text font={compact?8:9}
      foregroundStyle={done?COLORS.muted:COLORS.faint}
      lineLimit={2}>{course.location}</Text>:null}
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
    <VStack spacing={1} frame={{width}} padding={{top:1,bottom:2}}>
      <Text font={compact?14:17} fontWeight="bold" foregroundStyle={dayColor}>
        {day.label}
      </Text>
      <Text font={compact?9:10} foregroundStyle={day.today?COLORS.blue:COLORS.faint}
        lineLimit={1}>{day.weekday} {day.dateLabel}</Text>
    </VStack>
    {window.courses.length?window.courses.map(c=>
      <CourseCard key={c.id} course={c} compact={compact}/>):
      <Text font={10} foregroundStyle={COLORS.muted}>无课</Text>}
    {window.hiddenAfter>0?
      <Text font={compact?9:10} foregroundStyle={COLORS.faint}>
        +{window.hiddenAfter}节课
      </Text>:null}
  </VStack>;
}

// Two actual course columns inside an expanded today area, not an
// animated/scrolling list. The second card owns the remaining-course count.
function TodayPairColumn({day,width,compact=false,gap=5}){
  const focus=selectTodayPair(day);
  const cardWidth=Math.max(25,Math.floor((width-gap)/2));
  return <VStack alignment="center" spacing={compact?4:5}
      frame={{width,alignment:'top'}}>
    <VStack spacing={1} frame={{width}} padding={{top:1,bottom:2}}>
      <Text font={compact?14:17} fontWeight="bold" foregroundStyle={COLORS.blue}>
        {day.label}
      </Text>
      <Text font={compact?9:10} foregroundStyle={COLORS.blue}
        lineLimit={1}>{day.weekday} {day.dateLabel}</Text>
      <Text font={8} foregroundStyle={COLORS.faint}>测试</Text>
    </VStack>
    <HStack alignment="top" spacing={gap} frame={{width,alignment:'topLeading'}}>
      <VStack frame={{width:cardWidth,alignment:'topLeading'}}>
        <CourseCard course={focus.courses[0]} compact={compact}/>
      </VStack>
      <VStack alignment="center" spacing={4} frame={{width:cardWidth,alignment:'top'}}>
        {focus.courses[1]?<CourseCard course={focus.courses[1]} compact={compact}/>:null}
        {focus.hiddenAfter>0?<Text font={compact?9:10}
          foregroundStyle={COLORS.faint}>+{focus.hiddenAfter}节课</Text>:null}
      </VStack>
    </HStack>
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
      // Keep both header edges and all four columns clear of rounded corners.
      const safeInset=medium?4:8,gap=medium?3:5;
      const today=model.days.find(d=>d.today);
      const expanded=(today?.courses?.length||0)>1;
      // Five equally-sized course slots when today has multiple classes:
      // yesterday / today-current / today-next / tomorrow / day-after.
      // Otherwise keep the original four balanced day columns.
      const slots=expanded?5:4;
      const extraGap=expanded?gap:0;
      const colWidth=Math.max(32,Math.floor(
        (width-2*safeInset-gap*3-extraGap)/slots));
      const todayWidth=expanded?colWidth*2+extraGap:colWidth;
      const maxRows=medium?1:height>=370?3:height>=290?2:1;
      return <VStack alignment="leading" spacing={0}
        padding={safeInset}
        widgetBackground={{light:'#FFFFFF',dark:'#FFFFFF'}}
        frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
        <HStack alignment="top" spacing={gap}
          frame={{maxWidth:'infinity',alignment:'leading'}}>
          {model.days.map(day=>expanded&&day.today
            ?<TodayPairColumn key="today-pair" day={day}
              width={todayWidth} compact={medium} gap={gap}/>
            :<DayColumn key={String(day.index)} day={day}
              width={colWidth} compact={medium} maxRows={maxRows}/> )}
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
  return <VStack alignment="leading" spacing={8} padding={20}
    widgetBackground={{light:'#FFFFFF',dark:'#FFFFFF'}}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
    <Text font={18} fontWeight="bold" foregroundStyle={COLORS.dark}>
      今天
    </Text>
    <Spacer minLength={0}/>
    {chosen?<VStack alignment="leading" spacing={5}
      background={{style:chosen.status==='done'?COLORS.doneBg:
        chosen.status==='current'?COLORS.activeBg:COLORS.nextBg,
        shape:{type:'rect',cornerRadius:10}}}
      padding={9}>
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
  const guidance=code==='TEST_TERM_NOT_FOUND'?
    '请打开 NUFE-Schedule 一次；若仍无课程，请确认已同步 2024-2025-2 学期':
    code==='OPEN_MAIN_ONCE'?'请打开一次 NUFE-Schedule，自动建立组件缓存':
    failure?'请反馈下方代码以便定位；课表和登录信息未被修改':
    '打开 NUFE-Schedule 完成首次课表同步';
  return <VStack alignment="leading" spacing={9} padding={22}
    widgetBackground={{light:'#FFFFFF',dark:'#FFFFFF'}}
    frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'center'}}>
    <Text font={16} fontWeight="bold" foregroundStyle={COLORS.dark}>NUFE-Schedule</Text>
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
  const model=buildWidgetModel(snapshot.state,Date.now());
  if(!model){
    Widget.present(<EmptyPanel kind="empty" code="TEST_TERM_NOT_FOUND"/>,
      {policy:'after',date:new Date(Date.now()+2*60*60*1000)});
  }else{
    const family=Widget.family;
    Widget.present(family==='systemSmall'||String(family).startsWith('accessory')
      ?<SmallPanel model={model}/>
      :<RollingPanel model={model} family={family}/>,
      {policy:'after',date:widgetReloadDate(model)});
  }
}

// Required by the Scripting widget lifecycle after presenting the view.
Script.exit();
