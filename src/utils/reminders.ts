import {reminderMoments,shiftDate} from './timePlan';
import {localDate} from './date';
import type {TaskItem} from '../types';
import {isFinished} from './taskWorkflow';
export const REMINDER_LOG_KEY='dn-reminder-deliveries-v1';
export interface ReminderDelivery {key:string;title:string;at:string;channel:'system'|'in-app'|'test';}
export const reminderKey=(t:TaskItem)=>t.id+'@'+t.remindAt;
export function dueReminders(tasks:TaskItem[],log:ReminderDelivery[],now:number){const delivered=new Set(log.map(r=>r.key)),day=localDate(new Date(now));return tasks.flatMap(t=>{if(t.deletedAt||isFinished(t))return [];if(!t.timePlan)return t.remindAt&&Date.parse(t.remindAt)<=now&&!delivered.has(reminderKey(t))?[t]:[];return t.timePlan.reminders.flatMap(r=>reminderMoments(t,r,day,shiftDate(day,366)).flatMap(m=>{if(Date.parse(m.at)>now||r.target==='daily'&&(Date.parse(m.at)<Date.parse(r.createdAt)||localDate(new Date(m.at))<day))return [];const copy={...t,id:r.id==='legacy-reminder'?t.id:t.id+'::reminder:'+r.id+':'+m.occurrence,remindAt:m.at};return delivered.has(reminderKey(copy))?[]:[copy];}));});}
export function readDeliveries(raw:string|null):ReminderDelivery[]{if(!raw)return [];const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.some(x=>!x||typeof x.key!=='string'||typeof x.title!=='string'||isNaN(Date.parse(x.at))||!['system','in-app','test'].includes(x.channel)))throw new Error('提醒记录无法读取，已暂停自动提醒');return parsed;}
