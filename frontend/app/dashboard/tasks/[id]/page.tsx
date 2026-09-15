"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import {Avatar} from "@/components/work/TaskCard";
import TaskComposer from "@/components/work/TaskComposer";
import {addChecklist,addComment,addDependency,downloadAttachment,getTask,searchWorkspace,startTimer,stopTimer,unwatchTask,updateChecklist,updateTask,uploadAttachment,watchTask} from "@/services/workService";
import type {Task} from "@/lib/workTypes";
import useAuthUser from "@/hooks/useAuthUser";

const statusOptions=[['todo','To do'],['in_progress','In progress'],['review','Review'],['completed','Completed'],['cancelled','Cancelled']];
const fmt=(mins:number)=>mins<60?`${mins}m`:`${Math.floor(mins/60)}h ${mins%60?`${mins%60}m`:''}`;

export default function TaskDetailPage(){
 const {id}=useParams<{id:string}>();const {user,canManageWork}=useAuthUser();const [task,setTask]=useState<Task|null>(null);const [loading,setLoading]=useState(true);const [comment,setComment]=useState("");const [check,setCheck]=useState("");const [busy,setBusy]=useState(false);const [subtaskOpen,setSubtaskOpen]=useState(false);const [depQuery,setDepQuery]=useState("");const [depResults,setDepResults]=useState<any[]>([]);const fileRef=useRef<HTMLInputElement>(null);
 const load=useCallback(async()=>{setLoading(true);try{const r=await getTask(id);setTask(r.data)}finally{setLoading(false)}},[id]);useEffect(()=>{load()},[load]);
 const watching=useMemo(()=>!!task?.watchers?.some(w=>w.id===user?.id),[task,user]);
 const activeTimer=task?.time_entries?.find(e=>e.user.id===user?.id&&!e.stopped_at);
 const changeStatus=async(status:string)=>{if(!task)return;setTask({...task,status:status as Task['status']});try{await updateTask(task.id,{status})}catch{load()}};
 const submitComment=async(e:React.FormEvent)=>{e.preventDefault();if(!task||!comment.trim())return;setBusy(true);try{await addComment(task.id,comment.trim());setComment('');await load()}finally{setBusy(false)}};
 const submitCheck=async(e:React.FormEvent)=>{e.preventDefault();if(!task||!check.trim())return;await addChecklist(task.id,check.trim());setCheck('');await load()};
 const toggleCheck=async(item:any)=>{if(!task)return;await updateChecklist(task.id,item.id,{is_completed:!item.is_completed});await load()};
 const toggleWatch=async()=>{if(!task)return;watching?await unwatchTask(task.id):await watchTask(task.id);await load()};
 const timer=async()=>{if(!task)return;activeTimer?await stopTimer(task.id):await startTimer(task.id);await load()};
 const upload=async(file?:File)=>{if(!task||!file)return;setBusy(true);try{await uploadAttachment(task.id,file);await load()}finally{setBusy(false)}};
 const download=async(a:any)=>{if(!task)return;const r=await downloadAttachment(task.id,a.id);const url=URL.createObjectURL(r.data);const el=document.createElement('a');el.href=url;el.download=a.name;document.body.appendChild(el);el.click();el.remove();URL.revokeObjectURL(url)};
 useEffect(()=>{if(depQuery.trim().length<2){setDepResults([]);return}const t=setTimeout(()=>searchWorkspace(depQuery).then(r=>setDepResults((r.data.tasks||[]).filter((x:any)=>String(x.id)!==String(id)))),180);return()=>clearTimeout(t)},[depQuery,id]);
 if(loading)return <div className="work-loading"><span className="loader-dot"/>Loading task…</div>;if(!task)return <div className="empty-state"><h3>Task not found</h3></div>;
 const totalChecks=task.checklist_items?.length||0,doneChecks=task.checklist_items?.filter(i=>i.is_completed).length||0;
 const canCreateSubtask=canManageWork||!!task.project?.members?.some(member=>member.id===user?.id);
 return <div className="task-detail-page">
   <div className="task-breadcrumb"><Link href="/dashboard/tasks">Tasks</Link><AppIcon name="chevron"/><span>{task.project?.key}-{task.task_number||task.id}</span></div>
   <div className="task-detail-grid">
    <main className="task-detail-main">
      <div className="task-title-row"><div><div className="task-overline"><span className={`priority-dot ${task.priority}`}/>{task.project?.name} · {task.project?.key}-{task.task_number||task.id}</div><h1>{task.title}</h1></div><button className={watching?"watch-btn active":"watch-btn"} onClick={toggleWatch}>{watching?"Watching":"Watch"}</button></div>
      <div className="task-description">{task.description||<span className="muted-placeholder">No description yet.</span>}</div>

      {!!totalChecks&&<section className="detail-section"><div className="section-title-row"><h2>Checklist</h2><span>{doneChecks}/{totalChecks}</span></div><div className="check-progress"><i style={{width:`${totalChecks?doneChecks/totalChecks*100:0}%`}}/></div><div className="check-list">{task.checklist_items?.map(i=><button key={i.id} className={i.is_completed?"check-item done":"check-item"} onClick={()=>toggleCheck(i)}><span className="check-box">{i.is_completed&&<AppIcon name="check"/>}</span><span>{i.title}</span></button>)}</div></section>}
      <form className="inline-add" onSubmit={submitCheck}><AppIcon name="plus"/><input value={check} onChange={e=>setCheck(e.target.value)} placeholder="Add checklist item…"/><button disabled={!check.trim()}>Add</button></form>

      <section className="detail-section"><div className="section-title-row"><h2>Subtasks</h2>{canCreateSubtask?<button className="text-button" onClick={()=>setSubtaskOpen(true)}><AppIcon name="plus"/>Add subtask</button>:<span>{task.subtasks?.length||0}</span>}</div>{!!task.subtasks?.length?<div className="subtask-list">{task.subtasks.map(s=><Link href={`/dashboard/tasks/${s.id}`} key={s.id}><span className={`status-dot ${s.status}`}/><span>{s.title}</span><AppIcon name="chevron"/></Link>)}</div>:<div className="section-empty">Break complex work into smaller, independently trackable tasks.</div>}</section>

      <section className="detail-section"><div className="section-title-row"><h2>Attachments</h2><button className="text-button" onClick={()=>fileRef.current?.click()}><AppIcon name="paperclip"/>Upload file</button></div><input ref={fileRef} type="file" hidden onChange={e=>upload(e.target.files?.[0])}/><div className="attachment-grid">{task.attachments?.map(a=><button type="button" className="attachment-card" key={a.id} onClick={()=>download(a)}><div className="file-icon"><AppIcon name="paperclip"/></div><div><strong>{a.name}</strong><span>{Math.max(1,Math.round(a.size/1024))} KB · {a.user.name}</span></div></button>)}{!task.attachments?.length&&<div className="section-empty">Drop supporting files into the task so context stays with the work.</div>}</div></section>

      <section className="detail-section comments-section"><div className="section-title-row"><h2>Conversation</h2><span>{task.comments?.length||0}</span></div><form className="comment-box" onSubmit={submitComment}><div className="mini-avatar self">{user?.name?.charAt(0)||'U'}</div><div><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add an update, question or decision…"/><div className="comment-actions"><span>Keep decisions and context attached to the task.</span><button disabled={busy||!comment.trim()}>Comment</button></div></div></form><div className="comment-feed">{task.comments?.map(c=><article key={c.id}><Avatar name={c.user.name}/><div><header><strong>{c.user.name}</strong><time>{new Date(c.created_at).toLocaleString()}</time></header><p>{c.body}</p></div></article>)}</div></section>
    </main>

    <aside className="task-detail-side">
      <div className="side-panel"><label>Status</label><select className={`status-select ${task.status}`} value={task.status} onChange={e=>changeStatus(e.target.value)}>{statusOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <div className="side-panel"><label>Assignees</label><div className="people-list">{task.assignees?.map(a=><div key={a.id}><Avatar name={a.name}/><span>{a.name}</span></div>)}{!task.assignees?.length&&<span className="muted-placeholder">Unassigned</span>}</div></div>
      <div className="side-panel side-meta"><div><span>Priority</span><b className={`priority-pill ${task.priority}`}>{task.priority}</b></div><div><span>Due date</span><b>{task.due_date?new Date(task.due_date).toLocaleString():"Not set"}</b></div><div><span>Estimate</span><b>{task.estimate_minutes?fmt(task.estimate_minutes):"Not set"}</b></div><div><span>Time logged</span><b>{fmt(task.time_entries_sum_duration_minutes||0)}</b></div></div>
      <button className={activeTimer?"timer-button running":"timer-button"} onClick={timer}><AppIcon name="timer"/><span>{activeTimer?"Stop timer":"Start timer"}</span>{activeTimer&&<i>Tracking now</i>}</button>
      {!!task.labels?.length&&<div className="side-panel"><label>Labels</label><div className="label-row">{task.labels.map(l=><span className="tiny-label" key={l.id}><i style={{background:l.color}}/>{l.name}</span>)}</div></div>}
      <div className="side-panel"><label>Dependencies</label>{task.dependencies?.map(d=><Link href={`/dashboard/tasks/${d.id}`} className="dependency-link" key={d.id}><AppIcon name="link"/><span>Blocked by {d.project?.key}-{d.task_number||d.id} · {d.title}</span></Link>)}<div className="dependency-search"><AppIcon name="search"/><input value={depQuery} onChange={e=>setDepQuery(e.target.value)} placeholder="Link a blocking task…"/></div>{!!depResults.length&&<div className="dependency-results">{depResults.slice(0,5).map((d:any)=><button key={d.id} onClick={async()=>{await addDependency(task.id,d.id);setDepQuery('');setDepResults([]);load()}}><span>{d.project?.key}-{d.task_number||d.id}</span>{d.title}</button>)}</div>}</div>
    </aside>
   </div>
   <TaskComposer open={subtaskOpen} initialProjectId={task.project_id} parentId={task.id} onClose={()=>setSubtaskOpen(false)} onCreated={load}/>
 </div>;
}
