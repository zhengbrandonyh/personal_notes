import React from 'react';
import {ViewMode} from '../types';
import {LayoutGrid,Grid2X2,Calendar,FileText,PieChart,Settings} from 'lucide-react';
export function FloatingDock({currentView,onViewChange,onOpenSettings}:{currentView:ViewMode;onViewChange:(v:ViewMode)=>void;onOpenSettings:()=>void}){
 const links=[['today','今天',LayoutGrid],['quadrant','事项',Grid2X2],['calendar','日历',Calendar],['journal','笔记',FileText],['review','统计',PieChart]] as const;
 return <aside className="app-nav"><div className="brand"><span>川</span><strong>江明川冲冲冲 <small className="draft-badge">草稿</small></strong></div><nav>{links.map(([id,label,Icon])=><button key={id} aria-current={currentView===id?'page':undefined} className={currentView===id?'active':''} onClick={()=>onViewChange(id)}><Icon size={18}/><span>{label}</span></button>)}<button className="mobile-settings" onClick={onOpenSettings}><Settings size={18}/><span>设置</span></button></nav><button className="nav-settings" onClick={onOpenSettings}><Settings size={18}/>设置</button></aside>;
}
