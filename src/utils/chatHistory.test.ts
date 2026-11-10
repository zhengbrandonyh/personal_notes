import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readChatHistory,newChatSession,updateChatMessages} from './chatHistory';
test('new chats retain earlier conversations and generate titles from the first question',()=>{
 const first=newChatSession();let history={sessions:[first],activeId:first.id};
 history=updateChatMessages(history,[{id:'q1',role:'user',content:'整理我的工作计划'}]);
 const second=newChatSession();history={sessions:[second,...history.sessions],activeId:second.id};
 history=updateChatMessages(history,[{id:'q2',role:'user',content:'明天安排什么'}]);
 assert.equal(history.sessions[1].title,'整理我的工作计划');assert.equal(history.sessions[0].title,'明天安排什么');
 history={...history,activeId:first.id};assert.equal(history.sessions.find(s=>s.id===history.activeId)!.messages[0].content,'整理我的工作计划');
});
test('reload preserves messages and executed plans but does not revive unexecuted plans',()=>{
 const session=newChatSession();session.messages=[{id:'1',role:'assistant',content:'预览',status:'pending'},{id:'2',role:'assistant',content:'完成',status:'executed'}];session.draft='继续整理';
 const restored=readChatHistory(JSON.stringify({version:1,sessions:[session],activeId:session.id}));
 assert.equal(restored.sessions[0].messages[0].status,'cancelled');assert.equal(restored.sessions[0].messages[1].status,'executed');assert.equal(restored.sessions[0].draft,'继续整理');
});
test('malformed storage fails explicitly rather than silently replacing history',()=>{
 assert.throws(()=>readChatHistory('{broken'));
 assert.throws(()=>readChatHistory(JSON.stringify({version:1,sessions:[{id:'bad',messages:[{role:'system'}]}]})));
});
