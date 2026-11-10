import type {TaskItem} from '../types';
import {dateOnly} from './date';
import {taskSubtasks} from './subtaskNodes';
import {periodOf,sessionsOf} from './timePlan';
import {isFinished} from './taskWorkflow';

/** Match current local dates, including daily schedule overrides and legacy nodes. */
export function isAutomaticTodayAction(task:TaskItem,day:string):boolean {
 if(task.deletedAt||isFinished(task))return false;
 return periodOf(task)?.start===day
  ||(!task.timePlan&&dateOnly(task.scheduledStart)===day)
  ||sessionsOf(task,day,day).some(session=>dateOnly(session.start)===day)
  ||taskSubtasks(task).some(subtask=>!subtask.done&&dateOnly(subtask.at)===day)
  ||dateOnly(task.dueAt)===day;
}

export function isTodayAction(task:TaskItem,day:string):boolean {
 return !task.deletedAt&&!isFinished(task)&&(task.plannedFor===day||isAutomaticTodayAction(task,day));
}
