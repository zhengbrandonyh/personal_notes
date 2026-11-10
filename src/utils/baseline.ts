import {NOTE_DRAFT_PREFIX} from './noteDrafts';
import {REMINDER_LOG_KEY} from './reminders';
import { validateData, DataStore, StorageService, DATA_KEY, BACKUP_KEY } from './storage';
import { CHAT_HISTORY_KEY } from './chatHistory';
export const BASELINE_KEY = 'dn-baseline-v9';
export const RECOVERY_KEY = 'dn-before-baseline-restore';
const keys = [DATA_KEY, BACKUP_KEY, CHAT_HISTORY_KEY, 'daynight_tasks_v1', 'daynight_notes_v1', 'daynight_op_logs_v1', 'dn-theme', 'dn-welcome', 'dn-note-expanded', 'dn-last-backup'];
export interface BaselineSnapshot {
  kind:'daynight-baseline';formatVersion:1;baselineVersion:9;createdAt:string;data:DataStore;browserStorage:Record<string,string|null>;
}
export function parseBaseline(raw:string):BaselineSnapshot {
  const snapshot=JSON.parse(raw);
  if(snapshot?.kind!=='daynight-baseline'||snapshot.formatVersion!==1||snapshot.baselineVersion!==9||typeof snapshot.createdAt!=='string'||!snapshot.browserStorage||Array.isArray(snapshot.browserStorage))throw new Error('不是有效的 V9 基准备份');
  validateData(snapshot.data);
  for(const key of keys)if(snapshot.browserStorage[key]!==null&&typeof snapshot.browserStorage[key]!=='string')throw new Error('基准备份不完整');
  const rawData=snapshot.browserStorage[DATA_KEY];
  if(rawData&&JSON.stringify(validateData(JSON.parse(rawData)))!==JSON.stringify(snapshot.data))throw new Error('基准备份中的数据不一致');
  return snapshot;
}
function capture(storage:Storage,data:DataStore):BaselineSnapshot {
  const extras=[REMINDER_LOG_KEY];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(NOTE_DRAFT_PREFIX))extras.push(k);}
  return {kind:'daynight-baseline',formatVersion:1,baselineVersion:9,createdAt:new Date().toISOString(),data:structuredClone(validateData(data)),browserStorage:Object.fromEntries([...keys,...extras].map(key=>[key,storage.getItem(key)]))};
}
export function saveBaseline(storage:Storage,data:DataStore):BaselineSnapshot {
  const existing=storage.getItem(BASELINE_KEY);
  if(existing)return parseBaseline(existing);
  const snapshot=capture(storage,data),raw=JSON.stringify(snapshot);
  parseBaseline(raw);
  storage.setItem(BASELINE_KEY,raw);
  if(storage.getItem(BASELINE_KEY)!==raw)throw new Error('基准快照未能完整保存');
  return snapshot;
}
export function restoreBaseline(storage:Storage,current:DataStore):void {
  const raw=storage.getItem(BASELINE_KEY);
  if(!raw)throw new Error('尚未保存数据基准');
  const baseline=parseBaseline(raw),recovery=capture(storage,current),recoveryRaw=JSON.stringify(recovery);
  storage.setItem(RECOVERY_KEY,recoveryRaw);
  if(storage.getItem(RECOVERY_KEY)!==recoveryRaw)throw new Error('当前数据备份失败，已停止回退');
  const put=(key:string,value:string|null)=>value===null?storage.removeItem(key):storage.setItem(key,value);
  try {
    for(const key of keys)put(key,baseline.browserStorage[key]);
    // A browser with only demo/legacy records still restores the exact captured records.
    storage.setItem(DATA_KEY,JSON.stringify({...baseline.data,schemaVersion:2}));
  } catch(error) {
    try {for(const key of keys)put(key,recovery.browserStorage[key]);}
    catch {throw new Error('恢复未完成，回退前数据仍保存在恢复快照中，请勿清除网站数据');}
    throw error;
  }
}
export async function createBrowserBaseline(){return navigator.locks.request('daynight-write',()=>saveBaseline(localStorage,StorageService.loadAllData()));}
export async function restoreBrowserBaseline(){return navigator.locks.request('daynight-write',()=>restoreBaseline(localStorage,StorageService.loadAllData()));}
export function exportBrowserBaseline(){
 const raw=localStorage.getItem(BASELINE_KEY);if(!raw)throw new Error('请先保存数据基准');
 const snapshot=parseBaseline(raw);const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='江明川冲冲冲-V9-数据基准.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
