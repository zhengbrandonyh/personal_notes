import type {TaskItem,TaskStage} from '../types';
export const TASK_STAGES:ReadonlyArray<{value:TaskStage;label:string}>=[
 {value:'not_started',label:'未开始'},{value:'preparing',label:'准备中'},
 {value:'developing',label:'开发中'},{value:'testing',label:'测试中'},
 {value:'observing',label:'上线数据观察中'},
];
export const taskStage=(task:Pick<TaskItem,'stage'>):TaskStage=>task.stage||'not_started';
export function taskStageError(task:Pick<TaskItem,'stage'>):string|null {
 return task.stage!==undefined&&!TASK_STAGES.some(s=>s.value===task.stage)?'事项状态格式不正确':null;
}
