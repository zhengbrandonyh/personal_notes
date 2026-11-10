import type { NoteChart, JournalNote } from '../types';
export function parseChartRows(raw: string): NoteChart['points'] {
 const lines=raw.trim().split('\n').filter(x=>x.trim());
 if(lines.length<2 || lines.length>30) throw new Error('请输入 2～30 行图表数据');
 return lines.map(line=>{const parts=line.split(/[,，\t]/);const label=parts[0]?.trim(), value=Number(parts[1]?.trim());if(parts.length!==2||!label||!parts[1]?.trim()||!Number.isFinite(value))throw new Error('每行填写「名称,数值」，例如：周一,12');return {label,value};});
}
export function validateNoteExtras(note: JournalNote) {
 if(note.richText!==undefined&&typeof note.richText!=='string')throw new Error('笔记富文本格式不正确');
 if(note.charts===undefined)return;
 if(!Array.isArray(note.charts))throw new Error('笔记图表格式不正确');
 const ids=new Set();
 for(const c of note.charts){if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.title!=='string'||!c.title.trim()||!['bar','line'].includes(c.type)||!Array.isArray(c.points)||c.points.length<2||c.points.length>30||c.points.some(p=>!p||typeof p.label!=='string'||!p.label.trim()||typeof p.value!=='number'||!Number.isFinite(p.value)))throw new Error('笔记图表数据不正确');ids.add(c.id);}
}
export function textToHtml(text:string){return text.split('\n').map(line=>'<p>'+line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>').join('');}
export function isNoteColor(value:string):boolean {return /^(#[0-9a-f]{3,8}|transparent|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(value);}
/** Retain editor formatting and safe colors; drop active content and external resources. */
export function cleanNoteHtml(html:string):string {
 const doc=new DOMParser().parseFromString(html,'text/html');
 const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','STRIKE','H1','H2','H3','H4','H5','H6','SPAN','FONT','UL','OL','LI','BLOCKQUOTE','TABLE','THEAD','TBODY','TR','TD','TH']);
 function clean(parent:Element){for(const node of [...parent.childNodes]){if(node.nodeType===3)continue;if(!(node instanceof Element)){node.remove();continue;}if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH'].includes(node.tagName)){node.remove();continue;}clean(node);if(!allowed.has(node.tagName)){node.replaceWith(...node.childNodes);continue;}const color=node.getAttribute('color')||((node as HTMLElement).style?.color||'');const background=(node as HTMLElement).style?.backgroundColor||'';for(const attr of [...node.attributes])node.removeAttribute(attr.name);if(isNoteColor(color))(node as HTMLElement).style.color=color;if(isNoteColor(background))(node as HTMLElement).style.backgroundColor=background;}}
 clean(doc.body);return doc.body.innerHTML;
}
export function noteMarkdown(note:JournalNote){return `# ${note.title||'未命名笔记'}\n\n${note.text}`+(note.charts||[]).map(c=>`\n\n## ${c.title}\n\n| 名称 | 数值 |\n| --- | ---: |\n`+c.points.map(p=>`| ${p.label.replace(/\|/g,'\\|')} | ${p.value} |`).join('\n')).join('');}
