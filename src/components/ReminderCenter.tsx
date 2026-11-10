import {useEffect,useState} from 'react';
import type {TaskItem} from '../types';
import {dueReminders,readDeliveries,reminderKey,REMINDER_LOG_KEY,ReminderDelivery} from '../utils/reminders';
export function ReminderCenter({tasks}:{tasks:TaskItem[]}){
 const [log,setLog]=useState<ReminderDelivery[]>([]),[alerts,setAlerts]=useState<string[]>([]),[error,setError]=useState('');
 useEffect(()=>{let disposed=false,failed=false;const tick=async()=>{if(failed)return;
  const run=()=>{try{const history=readDeliveries(localStorage.getItem(REMINDER_LOG_KEY));for(const task of dueReminders(tasks,history,Date.now())){
   let channel:ReminderDelivery['channel']='in-app';if('Notification'in window&&Notification.permission==='granted')try{new Notification('江明川冲冲冲',{body:task.title,tag:reminderKey(task)});channel='system';}catch{}
   if(!disposed)setAlerts(v=>[...v.filter(x=>x!==task.title),task.title]);history.push({key:reminderKey(task),title:task.title,at:new Date().toISOString(),channel});
  }localStorage.setItem(REMINDER_LOG_KEY,JSON.stringify(history));if(!disposed)setLog(history);
  }catch(e){failed=true;if(!disposed)setError((e as Error).message||'提醒记录无法保存');}};
  if(navigator.locks)await navigator.locks.request('dn-reminders',run);else run();
 };void tick();const timer=setInterval(()=>void tick(),15000);return()=>{disposed=true;clearInterval(timer);};},[tasks]);
 const test=async()=>{try{if(!('Notification'in window))throw new Error('此浏览器不支持系统通知，仍可使用网页内提醒');let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('系统通知未授权，提醒将显示在网页内');new Notification('测试提醒',{body:'江明川冲冲冲 · 通知已发出，请检查系统通知中心'});const next=[...readDeliveries(localStorage.getItem(REMINDER_LOG_KEY)),{key:'test-'+Date.now(),title:'系统通知测试（已发出）',at:new Date().toISOString(),channel:'test' as const}];localStorage.setItem(REMINDER_LOG_KEY,JSON.stringify(next));setLog(next);setError('');}catch(e){setError((e as Error).message);}};
 return <><details className="reminder-center"><summary>提醒{alerts.length?' · '+alerts.length:''}</summary><div><p>网页打开时提醒，关闭后暂不推送。</p><button className="btn-secondary px-3 py-2" onClick={test}>授权并测试系统通知</button>{error&&<p role="alert">{error}</p>}<ol>{log.slice().reverse().slice(0,20).map(r=><li key={r.key}>{r.title}<small>{new Date(r.at).toLocaleString('zh-CN')} · {r.channel==='system'?'已向系统发出':r.channel==='test'?'测试已发出':'网页内已展示'}</small></li>)}</ol>{!log.length&&<p>暂无送达记录</p>}</div></details>{!!alerts.length&&<div className="reminder-alert" role="alert"><strong>事项提醒</strong>{alerts.map(title=><p key={title}>{title}</p>)}<button className="quiet-button" onClick={()=>setAlerts([])}>知道了</button></div>}</>;
}
