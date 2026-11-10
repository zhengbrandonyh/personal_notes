/** Calendar dates use the visitor's local timezone. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}
export function dateOnly(value?: string|null):string {
 if(!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const d=new Date(value);return isNaN(d.getTime())?'':localDate(d);
}
export function dayInterval(start?:string|null,end?:string|null,day=localDate()):[number,number]{
 if(!start||!end)return [0,0];
 const zero=new Date(day+'T00:00:00').getTime(),next=new Date(day+'T00:00:00');next.setDate(next.getDate()+1);
 const a=Math.max(zero,new Date(start).getTime()),b=Math.min(next.getTime(),new Date(end).getTime());
 return b>a?[(a-zero)/60000,(b-zero)/60000]:[0,0];
}
