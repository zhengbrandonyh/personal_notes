import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseChartRows,validateNoteExtras,noteMarkdown,textToHtml,isNoteColor} from './noteRichText';
import {SEED_NOTES,SEED_TASKS,validateData} from './storage';
test('chart parser accepts signed numeric data and rejects malformed rows',()=>{
 assert.deepEqual(parseChartRows('周一,12\n周二，-3.5'),[{label:'周一',value:12},{label:'周二',value:-3.5}]);
 for(const raw of ['a,2','a,\nb,3','a,NaN\nb,2','a,2,3\nb,4'])assert.throws(()=>parseChartRows(raw));
});
test('rich text and charts survive backup validation, and export retains chart data',()=>{
 const note={...SEED_NOTES[0],richText:'<p><b>进展</b></p>',charts:[{id:'c1',title:'进展',type:'bar' as const,points:parseChartRows('周一,12\n周二,18')}]};
 const data=validateData(JSON.parse(JSON.stringify({tasks:SEED_TASKS,notes:[note]})));
 assert.deepEqual(data.notes[0],note);assert.match(noteMarkdown(note),/周二 \| 18/);
 assert.throws(()=>validateNoteExtras({...note,charts:[{...note.charts[0],points:[{label:'a',value:Infinity},{label:'b',value:2}]}]}));
 assert.throws(()=>validateNoteExtras({...note,charts:[note.charts[0],note.charts[0]]}));
 assert.equal(textToHtml('<script>\n&'),'<p>&lt;script&gt;</p><p>&amp;</p>');
});

test('color styles accept fixed colors while rejecting resource URLs and extra declarations',()=>{for(const c of ['#78a7ff','rgb(120, 167, 255)','transparent'])assert.equal(isNoteColor(c),true);for(const c of ['url(https://example.com)','red;position:fixed','expression(alert(1))','var(--unknown)'])assert.equal(isNoteColor(c),false);});
