import { JournalNote } from '../types';

export function noteAncestors(notes: JournalNote[], id: string) {
  const result: string[] = [];
  const seen = new Set([id]);
  let parent = notes.find(n => n.id === id)?.parentId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const item = notes.find(n => n.id === parent && !n.deletedAt);
    if (!item) break;
    result.push(parent);
    parent = item.parentId;
  }
  return result;
}

export function isNoteDescendant(notes: JournalNote[], id: string, parent: string) {
  return noteAncestors(notes, id).includes(parent);
}

export function validateNoteParents(notes: JournalNote[]) {
  const map = new Map(notes.map(n => [n.id, n]));
  for (const note of notes) {
    if (note.parentId !== undefined && note.parentId !== null && typeof note.parentId !== 'string') throw new Error('笔记父级格式不正确');
    const seen = new Set([note.id]);
    let parent = note.parentId;
    while (parent) {
      if (seen.has(parent)) throw new Error('笔记层级不能循环');
      seen.add(parent);
      parent = map.get(parent)?.parentId;
    }
  }
}

export function visibleNoteTree(notes: JournalNote[], matches: JournalNote[], expanded: Set<string>, expandAll = false) {
  const ids = new Set(matches.flatMap(n => [n.id, ...noteAncestors(notes, n.id)]));
  const shown = notes.filter(n => !n.deletedAt && ids.has(n.id));
  const rows: {note: JournalNote; depth: number; hasChildren: boolean; contextOnly: boolean}[] = [];
  const visited = new Set<string>();
  const walk = (note: JournalNote, depth: number) => {
    if (visited.has(note.id)) return;
    visited.add(note.id);
    const children = shown.filter(n => n.parentId === note.id);
    rows.push({note, depth, hasChildren: !!children.length, contextOnly: !matches.some(n => n.id === note.id)});
    if (expanded.has(note.id) || expandAll) children.forEach(n => walk(n, depth + 1));
  };
  shown.filter(n => !n.parentId || !ids.has(n.parentId)).forEach(n => walk(n, 0));
  return rows;
}
