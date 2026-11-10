import {TaskItem,DomainType,AIPreviewAction} from '../types';
import {localDate} from './date';
export function planToday(tasks:TaskItem[],domain:DomainType,now=new Date()):AIPreviewAction[]{
 const day=localDate(now),endDay=new Date(day+'T22:00').getTime();let cursor=Math.max(new Date(day+'T09:00').getTime(),Math.ceil(now.getTime()/1800000)*1800000);
 const occupied=tasks.filter(t=>!t.deletedAt&&!['done','completed'].includes(t.status)&&t.scheduledStart&&t.scheduledEnd).map(t=>[new Date(t.scheduledStart!).getTime(),new Date(t.scheduledEnd!).getTime()]);
 const todo=tasks.filter(t=>!t.deletedAt&&!['done','completed'].includes(t.status)&&!t.scheduledStart&&(domain==='all'||t.domain===domain)&&(!t.dueAt||t.dueAt.slice(0,10)>=day)).sort((a,b)=>Number(b.importance)-Number(a.importance)||Number(b.urgency)-Number(a.urgency)||(a.dueAt||'9999').localeCompare(b.dueAt||'9999'));
 const result:AIPreviewAction[]=[];
 const local=(n:number)=>{const d=new Date(n);return `${localDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
 for(const t of todo){const duration=3600000;while(cursor+duration<=endDay&&occupied.some(([s,e])=>s<cursor+duration&&e>cursor))cursor+=1800000;if(cursor+duration>endDay)break;result.push({id:t.id,actionType:'update',targetItemId:t.id,title:`${t.title} · 预计 1 小时`,selected:true,itemData:{scheduledStart:local(cursor),scheduledEnd:local(cursor+duration)}});occupied.push([cursor,cursor+duration]);cursor+=duration;if(result.length>=5)break;}
 return result;
}
