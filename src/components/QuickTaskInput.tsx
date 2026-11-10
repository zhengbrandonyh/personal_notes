import {useState} from 'react';
export function QuickTaskInput({onCreate}:{onCreate:(title:string)=>Promise<boolean>}){
 const [title,setTitle]=useState(''),[busy,setBusy]=useState(false);
 return <form className="quick-task-input" onSubmit={async e=>{e.preventDefault();if(busy||!title.trim())return;setBusy(true);try{if(await onCreate(title.trim()))setTitle('');}finally{setBusy(false);}}}><input aria-label="快速新增事项" placeholder="输入标题，回车保存" value={title} disabled={busy} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.keyCode===229))e.preventDefault();}}/><button className="quiet-button" disabled={busy||!title.trim()}>{busy?'保存中…':'新增'}</button></form>;
}
