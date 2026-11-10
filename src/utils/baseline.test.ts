import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASELINE_KEY,RECOVERY_KEY,saveBaseline,parseBaseline,restoreBaseline} from './baseline';
import {DATA_KEY,SEED_TASKS,SEED_NOTES} from './storage';
import {CHAT_HISTORY_KEY} from './chatHistory';
class MemoryStorage implements Storage {
 items=new Map<string,string>();failKey='';
 get length(){return this.items.size;}clear(){this.items.clear();}key(index:number){return [...this.items.keys()][index]||null;}
 getItem(key:string){return this.items.get(key)??null;}removeItem(key:string){this.items.delete(key);}
 setItem(key:string,value:string){if(this.failKey===key){this.failKey='';throw new Error('storage full');}this.items.set(key,value);}
}
const data=()=>structuredClone({tasks:SEED_TASKS,notes:SEED_NOTES});
const write=(store:Storage,value:ReturnType<typeof data>)=>store.setItem(DATA_KEY,JSON.stringify({...value,schemaVersion:2}));
test('saving a baseline never replaces the first snapshot',()=>{
 const store=new MemoryStorage(),original=data();write(store,original);saveBaseline(store,original);const raw=store.getItem(BASELINE_KEY);
 const changed=data();changed.tasks[0].title='new content';write(store,changed);saveBaseline(store,changed);
 assert.equal(store.getItem(BASELINE_KEY),raw);assert.equal(parseBaseline(raw!).data.tasks[0].title,original.tasks[0].title);
});
test('rollback restores tasks, notes and raw chat history while retaining the current recovery snapshot',()=>{
 const store=new MemoryStorage(),original=data();write(store,original);store.setItem(CHAT_HISTORY_KEY,'baseline-chat');store.setItem('unrelated','keep');saveBaseline(store,original);
 const changed=data();changed.tasks[0].title='new content';write(store,changed);store.setItem(CHAT_HISTORY_KEY,'new-chat');restoreBaseline(store,changed);
 assert.equal(JSON.parse(store.getItem(DATA_KEY)!).tasks[0].title,original.tasks[0].title);
 assert.equal(store.getItem(CHAT_HISTORY_KEY),'baseline-chat');assert.equal(store.getItem('unrelated'),'keep');
 assert.equal(parseBaseline(store.getItem(RECOVERY_KEY)!).data.tasks[0].title,'new content');
 assert.equal(parseBaseline(store.getItem(RECOVERY_KEY)!).browserStorage[CHAT_HISTORY_KEY],'new-chat');
});
test('a recovery backup failure stops rollback before replacing any data',()=>{
 const store=new MemoryStorage(),original=data();write(store,original);saveBaseline(store,original);
 const changed=data();changed.tasks[0].title='new content';write(store,changed);const before=store.getItem(DATA_KEY);store.failKey=RECOVERY_KEY;
 assert.throws(()=>restoreBaseline(store,changed),/storage full/);assert.equal(store.getItem(DATA_KEY),before);
});
test('partial restore failures roll back to the current data',()=>{
 const store=new MemoryStorage(),original=data();write(store,original);store.setItem(CHAT_HISTORY_KEY,'baseline-chat');saveBaseline(store,original);
 const changed=data();changed.tasks[0].title='new content';write(store,changed);store.setItem(CHAT_HISTORY_KEY,'new-chat');const before=store.getItem(DATA_KEY);store.failKey=CHAT_HISTORY_KEY;
 assert.throws(()=>restoreBaseline(store,changed));assert.equal(store.getItem(DATA_KEY),before);assert.equal(store.getItem(CHAT_HISTORY_KEY),'new-chat');
});
