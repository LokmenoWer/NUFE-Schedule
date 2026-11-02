// @ts-nocheck
// NUFE-Schedule Home Screen widget. This entry is independent of index.tsx:
// renders only the already synchronized local timetable snapshot.
import { FileManager, Widget, Text, VStack, HStack, Spacer, GeometryReader, Script, modifiers } from 'scripting';
import { loadBestWidgetState, buildWidgetModel, selectVisibleCourses, selectTodayPair, widgetReloadDate } from './widget-data';

const COLORS={
  // Opaque white canvas in all appearance modes; only course statuses tint.
  dark:'#203451', blue:'#2C69D1', muted:'#9BA3AF',
  faint:'#727E91', finished:'#929AA7',
  doneBg:'#E5E7EB', nextBg:'#EBF4FF',
  activeBg:'#238BFF'
};

function CourseCard({course,compact=false,width,density='normal'}){
  // Larger single today card; compact side-by-side today cards.
  const smallText=density==='pair',largeText=density==='single';
  // Enlarge readable text without overflowing narrow two-card layouts.
  const titleSize=smallText?(compact?10:11):largeText?(compact?15:17):(compact?13:15);
  const detailSize=smallText?(compact?9:10):largeText?(compact?12:13):(compact?11:12);
  const cardPadding=smallText?5:compact?7:8;
  const done=course.status==='done',current=course.status==='current';
  const fg=done?COLORS.finished:current?'#FFFFFF':COLORS.dark;
  const bg=done?COLORS.doneBg:current?COLORS.activeBg:COLORS.nextBg;
  // Modifier order matters: paint the rounded background AFTER sizing the
  // card. Previously the visible background used its intrinsic text width
  // and sat to the left inside an otherwise centered, fixed-width frame.
  const cardStyle=modifiers()
    .padding(cardPadding)
    .frame(width?{width,alignment:'topLeading'}:{maxWidth:'infinity',alignment:'topLeading'})
    .background({style:bg,shape:{type:'rect',cornerRadius:9}});
  return <VStack key={course.id} alignment="leading" spacing={smallText?2:3}
      modifiers={cardStyle}>
    <Text font={titleSize} fontWeight={current?'bold':'semibold'}
      lineLimit={smallText?4:5} foregroundStyle={fg}>{course.title}</Text>
    <Text font={detailSize} foregroundStyle={current?'#F0F7FF':done?COLORS.muted:COLORS.faint}
      lineLimit={2}>{course.startLabel}–{course.endLabel}</Text>
    {course.location?<Text font={detailSize}
      foregroundStyle={current?'#F0F7FF':done?COLORS.muted:COLORS.faint}
      lineLimit={2}>{course.location}</Text>:null}
    {course.teacher?<Text font={detailSize}
      foregroundStyle={current?'#F0F7FF':done?COLORS.muted:COLORS.faint}
      lineLimit={1}>{course.teacher}</Text>:null}
  </VStack>;
}

function DayColumn({day,width,compact=false,maxRows=1,emphasize=false}){
  const window=selectVisibleCourses(day,maxRows);
  const dayColor=day.today?COLORS.blue:COLORS.dark;
  return <VStack key={String(day.index)} alignment="center" spacing={compact?4:5}
    frame={{width,alignment:'top'}}>
    <VStack spacing={1} frame={{width}} padding={{top:1,bottom:2}}>
      <Text font={compact?16:18} fontWeight="bold" foregroundStyle={dayColor}>
        {day.label}
      </Text>
      <Text font={compact?10:11} foregroundStyle={day.today?COLORS.blue:COLORS.faint}
        lineLimit={1}>{day.weekday} {day.dateLabel}</Text>
    </VStack>
    {window.courses.length?window.courses.map(c=>
      <HStack key={c.id} alignment="top" spacing={0}
        frame={{width,alignment:'center'}}>
        <Spacer minLength={0}/>
        <CourseCard course={c} compact={compact} width={width-8}
          density={emphasize?'single':'normal'}/>
        <Spacer minLength={0}/>
      </HStack>):
      <Text font={12} foregroundStyle={COLORS.muted}>无课</Text>}
    {window.hiddenAfter>0?
      <Text font={compact?10:11} foregroundStyle={COLORS.faint}>
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
      <Text font={compact?16:18} fontWeight="bold" foregroundStyle={COLORS.blue}>
        {day.label}
      </Text>
      <Text font={compact?10:11} foregroundStyle={COLORS.blue}
        lineLimit={1}>{day.weekday} {day.dateLabel}</Text>
    </VStack>
    <HStack alignment="top" spacing={gap} frame={{width,alignment:'topLeading'}}>
      <VStack frame={{width:cardWidth,alignment:'topLeading'}}>
        <CourseCard course={focus.courses[0]} compact={compact} width={cardWidth} density="pair"/>
      </VStack>
      <VStack alignment="center" spacing={4} frame={{width:cardWidth,alignment:'top'}}>
        {focus.courses[1]?<CourseCard course={focus.courses[1]} compact={compact} width={cardWidth} density="pair"/>:null}
        {focus.hiddenAfter>0?<Text font={compact?10:11}
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
      // Exactly three day groups; headings and cards share the same center.
      const safeInset=medium?9:12,gap=medium?4:6;
      const days=model.days.slice(0,3);
      const today=days.find(d=>d.today);
      const todayFocus=selectTodayPair(today);
      const expanded=todayFocus.courses.length>1;
      const usableWidth=Math.max(96,width-2*safeInset-2*gap);
      // Three equal widths for a single today card. A visible pair gets
      // half of the available width; each neighbor gets one quarter.
      const sideWidth=Math.floor(usableWidth/(expanded?4:3));
      const todayWidth=usableWidth-sideWidth*2;
      const maxRows=medium?1:height>=370?3:height>=290?2:1;
      return <VStack alignment="leading" spacing={0}
        padding={safeInset}
        widgetBackground={{light:'#FFFFFF',dark:'#FFFFFF'}}
        frame={{maxWidth:'infinity',maxHeight:'infinity',alignment:'topLeading'}}>
        <HStack alignment="top" spacing={gap}
          frame={{maxWidth:'infinity',alignment:'leading'}}>
          {days.map(day=>day.today&&expanded
            ?<TodayPairColumn key="today-pair" day={day}
              width={todayWidth} compact={medium} gap={gap}/>
            :<DayColumn key={String(day.index)}
              day={day.today?{...day,courses:todayFocus.courses}:day}
              width={day.today?todayWidth:sideWidth}
              compact={medium} maxRows={maxRows}
              emphasize={day.today&&!expanded}/> )}
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
      <Text font={15} fontWeight="semibold" lineLimit={2}
        foregroundStyle={chosen.status==='done'?COLORS.muted:chosen.status==='current'?'#FFFFFF':COLORS.dark}>{chosen.title}</Text>
      <Text font={11} foregroundStyle={COLORS.faint}>{chosen.startLabel}-{chosen.endLabel}</Text>
      <Text font={11} foregroundStyle={COLORS.faint} lineLimit={1}>{chosen.location}</Text>
      {chosen.teacher?<Text font={11} foregroundStyle={COLORS.faint} lineLimit={1}>{chosen.teacher}</Text>:null}
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
    Widget.present(<EmptyPanel kind="empty" code="NO_COURSES"/>,
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
