import {useRef,useState,useEffect} from 'react';
import type {TaskItem} from '../types';
import {localDate,dateOnly} from '../utils/date';
import {toDatetimeLocalString} from '../utils/dateTime';
import {calendarEntries} from '../utils/timePlan';
import {layoutTodaySchedule} from '../utils/todaySchedule';
interface Props{days:Date[];tasks:TaskItem[];onSelect:(t:TaskItem)=>void;onChange?:(task:TaskItem,start:string,end:string)=>void;}
export function WeekTimeGrid({days,tasks,onSelect,onChange}:Props){
 const area=useRef<HTMLDivElement>(null),gesture=useRef<{task:TaskItem;kind:'move'|'resize';x:number;y:number;start:string;end:string;moved:boolean}|null>(null),skipClick=useRef(false);
 useEffect(()=>{const scroll=area.current?.closest('.week-time-scroll');if(scroll)scroll.scrollTop=480;},[]);
 const [preview,setPreview]=useState<{id:string;start:string;end:string}|null>(null);
 const finish=(cancel=false)=>{const g=gesture.current;if(g?.moved){skipClick.current=true;if(!cancel&&g.start&&g.end)onChange?.(g.task,g.start,g.end);}gesture.current=null;setPreview(null);};
 return <div className="week-time-scroll"><div className="week-time-layout"><div className="week-time-labels">{Array.from({length:25},(_,h)=><span key={h} style={{top:h*60}}>{String(h).padStart(2,'0')}:00</span>)}</div><div className="week-time-area" ref={area}
 onPointerMove={e=>{const g=gesture.current;if(!g||!area.current)return;const dy=e.clientY-g.y;if(Math.abs(dy)<5&&Math.abs(e.clientX-g.x)<5&&!g.moved)return;g.moved=true;const rect=area.current.getBoundingClientRect(),col=Math.min(6,Math.max(0,Math.floor((e.clientX-rect.left)/(rect.width/7))));const delta=Math.round(dy/15)*15;const oldStart=new Date(g.task.scheduledStart!),oldEnd=new Date(g.task.scheduledEnd!);let start=new Date(oldStart),end=new Date(oldEnd);
 if(g.kind==='move'){const offset=Math.round((new Date(localDate(days[col])+'T12:00').getTime()-new Date(dateOnly(g.task.scheduledStart)+'T12:00').getTime())/86400000);start.setDate(start.getDate()+offset);start.setMinutes(start.getMinutes()+delta);end=new Date(start.getTime()+oldEnd.getTime()-oldStart.getTime());}
 else end=new Date(Math.max(oldStart.getTime()+15*60000,oldEnd.getTime()+delta*60000));
 g.start=toDatetimeLocalString(start.toISOString());g.end=toDatetimeLocalString(end.toISOString());setPreview({id:g.task.id,start:g.start,end:g.end});}}
 onPointerUp={()=>finish()} onPointerCancel={()=>finish(true)}>
 {Array.from({length:24},(_,h)=><i key={h} className="week-hour-line" style={{top:h*60}}/>)}
 {days.map((day,col)=>{const date=localDate(day);const items=calendarEntries(tasks,date,date).filter(t=>t.calendarEntry?.kind==='session');const positions=layoutTodaySchedule(items,date,{startMinute:0,pixelsPerMinute:1,minHeight:28,includeDone:true});return <div className="week-time-day" key={date} style={{left:col/7*100+'%',width:100/7+'%'}} aria-label={date+' 时间安排'}>{positions.map(p=>{const t=p.task;const s=new Date(t.scheduledStart!),end=new Date(t.scheduledEnd!);const top=p.top,height=p.height;const begin=(e:React.PointerEvent,kind:'move'|'resize')=>{if(!onChange||e.button!==0)return;e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);gesture.current={task:t,kind,x:e.clientX,y:e.clientY,start:t.scheduledStart!,end:t.scheduledEnd!,moved:false};skipClick.current=false;};return <div key={t.id} className={'week-time-event'+(height<44?' is-short':'')+(preview?.id===t.id?' is-moving':'')} style={{top,height,left:p.lane/p.columns*100+'%',width:100/p.columns+'%'}}><button aria-label={t.title+' '+toDatetimeLocalString(t.scheduledStart).slice(11)+' 至 '+toDatetimeLocalString(t.scheduledEnd).slice(11)} onPointerDown={e=>begin(e,'move')} onClick={()=>{if(skipClick.current){skipClick.current=false;return;}onSelect(t);}}><strong>{t.title}</strong><small>{preview?.id===t.id?preview.start.slice(5).replace('T',' ')+'–'+preview.end.slice(11):toDatetimeLocalString(t.scheduledStart).slice(11)+'–'+toDatetimeLocalString(t.scheduledEnd).slice(11)}</small></button>{onChange&&<div className="week-time-resize" role="button" tabIndex={0} aria-label={'拉伸调整时长 '+t.title} title="上下拉伸，每格 15 分钟" onPointerDown={e=>begin(e,'resize')} onKeyDown={e=>{if(e.key==='Enter')onSelect(t);}}/>}</div>;})}</div>;})}
 </div></div></div>;
}
