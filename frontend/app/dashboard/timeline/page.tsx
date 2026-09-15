"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import {getWorkTasks} from "@/services/workService";
import type {Task} from "@/lib/workTypes";

const DAY=86400000;
const startOfDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const monday=(d:Date)=>{const x=startOfDay(d);const shift=(x.getDay()+6)%7;x.setDate(x.getDate()-shift);return x};
const addDays=(d:Date,n:number)=>new Date(d.getTime()+n*DAY);
const diff=(a:Date,b:Date)=>Math.floor((startOfDay(a).getTime()-startOfDay(b).getTime())/DAY);

export default function TimelinePage(){
 const [tasks,setTasks]=useState<Task[]>([]),[loading,setLoading]=useState(true),[offset,setOffset]=useState(0),[project,setProject]=useState("");
 useEffect(()=>{setLoading(true);getWorkTasks({per_page:200,sort:"due"}).then(r=>setTasks(r.data.data||[])).finally(()=>setLoading(false))},[]);
 const base=useMemo(()=>addDays(monday(new Date()),offset*21),[offset]);const days=35;const end=addDays(base,days-1);
 const scheduled=useMemo(()=>tasks.filter(t=>t.start_date||t.due_date).filter(t=>!project||String(t.project_id)===project),[tasks,project]);
 const projects=useMemo(()=>Array.from(new Map(tasks.filter(t=>t.project).map(t=>[t.project_id,t.project!])).values()),[tasks]);
 const weeks=Array.from({length:5},(_,i)=>addDays(base,i*7));
 const today=diff(new Date(),base);
 return <div className="work-page timeline-page">
  <div className="work-page-head"><div><span className="eyebrow">Planning</span><h1>Timeline</h1><p>See overlapping work, project schedules and deadline pressure across the next five weeks.</p></div></div>
  <div className="timeline-toolbar"><div className="timeline-nav"><button onClick={()=>setOffset(v=>v-1)}><AppIcon name="chevron"/></button><button onClick={()=>setOffset(0)}>Today</button><button className="next" onClick={()=>setOffset(v=>v+1)}><AppIcon name="chevron"/></button></div><strong>{base.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – {end.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</strong><select className="toolbar-select" value={project} onChange={e=>setProject(e.target.value)}><option value="">All projects</option>{projects.map(p=><option value={p.id} key={p.id}>{p.key} · {p.name}</option>)}</select></div>
  <div className="timeline-shell">
   <div className="timeline-grid-head"><div className="timeline-task-col">Task</div><div className="timeline-days">{weeks.map(w=><div key={w.toISOString()}><b>{w.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</b><span>{w.toLocaleDateString(undefined,{weekday:"short"})}</span></div>)}</div></div>
   {loading?<div className="work-loading">Loading schedule…</div>:scheduled.map(t=>{const rawStart=t.start_date?new Date(t.start_date):addDays(new Date(t.due_date!),-1);const rawEnd=t.due_date?new Date(t.due_date):rawStart;if(rawEnd<base||rawStart>end)return null;const s=Math.max(0,diff(rawStart,base)),e=Math.min(days-1,diff(rawEnd,base));const left=s/days*100,width=Math.max(2.8,(e-s+1)/days*100);return <div className="timeline-row" key={t.id}><Link href={`/dashboard/tasks/${t.id}`} className="timeline-task-col"><span className="task-key">{t.project?.key}-{t.task_number||t.id}</span><strong>{t.title}</strong><small>{t.project?.name||"No project"}</small></Link><div className="timeline-track">{today>=0&&today<days&&<i className="timeline-today" style={{left:`${today/days*100}%`}}/>}<Link href={`/dashboard/tasks/${t.id}`} className={`timeline-bar ${t.status}`} style={{left:`${left}%`,width:`${width}%`}} title={`${t.title} · ${rawStart.toLocaleDateString()} – ${rawEnd.toLocaleDateString()}`}><span>{t.title}</span></Link></div></div>})}
   {!loading&&!scheduled.length&&<div className="empty-state"><AppIcon name="timeline"/><h3>No scheduled work</h3><p>Add start dates or due dates to tasks to place them on the timeline.</p></div>}
  </div>
 </div>
}
