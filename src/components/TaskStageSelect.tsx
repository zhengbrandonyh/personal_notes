import React,{useState} from 'react';
import type {TaskItem,TaskStage} from '../types';
import {TASK_STAGES,taskStage} from '../utils/taskStage';
import {isFinished} from '../utils/taskWorkflow';
export function TaskStageSelect({task,onChange}:{task:TaskItem;onChange:(stage:TaskStage)=>unknown|Promise<unknown>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <span className="task-stage-control" onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} draggable={false} onDragStart={e=>{e.preventDefault();e.stopPropagation();}}>
  <select aria-label={'事项状态 '+task.title} className="task-stage-tag" data-stage={taskStage(task)} value={taskStage(task)} disabled={busy||isFinished(task)} onChange={async e=>{const stage=e.target.value as TaskStage;setBusy(true);setError('');try{if(await onChange(stage)===false)setError('状态未保存，请重试');}catch{setError('状态未保存，请重试');}finally{setBusy(false);}}}>
   {TASK_STAGES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
  </select>{error&&<span role="alert" className="task-stage-error">{error}</span>}
 </span>;
}
