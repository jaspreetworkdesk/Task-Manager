"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import TaskCard from "@/components/work/TaskCard";
import TaskComposer from "@/components/work/TaskComposer";
import {getOverview} from "@/services/workService";
import useAuthUser from "@/hooks/useAuthUser";
import type {Task} from "@/lib/workTypes";

export default function DashboardPage(){
 const {user,canManageWork}=useAuthUser();const [d,setD]=useState<any>(null);const [loading,setLoading]=useState(true);const [composer,setComposer]=useState(false);
 const load=useCallback(()=>{setLoading(true);return getOverview().then(r=>setD(r.data)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{void load()},[load]);
 if(loading||!d)return <div className="work-loading"><span className="loader-dot"/>Building your overview…</div>;
 const first=user?.name?.split(' ')[0]||'there';const completion=d.total_tasks?Math.round(d.completed_tasks/d.total_tasks*100):0;
 return <div className="home-page">
   <section className="home-hero"><div><span className="eyebrow">Friday overview</span><h1>Good afternoon, {first}.</h1><p>{d.overdue_tasks?`You have ${d.overdue_tasks} overdue item${d.overdue_tasks===1?'':'s'} worth clearing first.`:'Your workload is in good shape. Keep the momentum going.'}</p></div><div className="home-hero-actions"><Link className="secondary-action" href="/dashboard/tasks?mine=1"><AppIcon name="check"/>My work</Link>{user&&<button className="primary-action" onClick={()=>setComposer(true)}><AppIcon name="plus"/>New task</button>}</div></section>

   <section className="metric-strip">
    <div className="metric-card"><span>Open work</span><strong>{Math.max(0,d.total_tasks-d.completed_tasks)}</strong><small>{d.in_progress_tasks} in progress</small></div>
    <div className="metric-card"><span>Due today</span><strong>{d.due_today}</strong><small>{d.due_this_week} due this week</small></div>
    <div className={`metric-card ${d.overdue_tasks?'danger':''}`}><span>Overdue</span><strong>{d.overdue_tasks}</strong><small>{d.overdue_tasks?'Needs attention':'All caught up'}</small></div>
    <div className="metric-card"><span>Completion</span><strong>{completion}%</strong><small>{d.completed_tasks} tasks completed</small></div>
    <div className="metric-card"><span>Time this week</span><strong>{Math.round((d.logged_minutes_this_week||0)/60*10)/10}h</strong><small>Tracked across work</small></div>
   </section>

   <div className="home-grid">
    <section className="home-panel focus-panel"><div className="panel-heading"><div><span className="eyebrow">Next up</span><h2>Upcoming work</h2></div><Link href="/dashboard/tasks?mine=1">See all <AppIcon name="arrow"/></Link></div><div className="upcoming-stack">{(d.upcoming as Task[]).map(t=><TaskCard key={t.id} task={t} compact/>)}{!d.upcoming?.length&&<div className="section-empty">Nothing scheduled next. You have room to plan ahead.</div>}</div></section>
    <section className="home-panel"><div className="panel-heading"><div><span className="eyebrow">Flow</span><h2>Work stages</h2></div></div><div className="stage-chart">
      {[['To do',d.todo_tasks,'todo'],['In progress',d.in_progress_tasks,'in_progress'],['Review',d.review_tasks,'review'],['Done',d.completed_tasks,'completed']].map(([label,value,key]:any)=><div className="stage-row" key={key}><div><span className={`status-dot ${key}`}/>{label}</div><div className="stage-track"><i className={key} style={{width:`${Math.max(3,Number(value)/Math.max(d.total_tasks,1)*100)}%`}}/></div><b>{value}</b></div>)}
    </div><div className="stage-insight"><AppIcon name="sparkles"/><div><strong>{completion>=70?'Strong completion rate':d.review_tasks>5?'Review queue is building':'Keep work moving'}</strong><span>{completion>=70?'Most tracked work is already complete.':d.review_tasks>5?'Consider clearing reviews before starting more work.':'Focus on finishing active work before opening more tasks.'}</span></div></div></section>
   </div>

   {canManageWork&&<div className="home-grid lower"><section className="home-panel"><div className="panel-heading"><div><span className="eyebrow">Capacity</span><h2>Team workload</h2></div><Link href="/dashboard/employees">People</Link></div><div className="workload-list">{d.workload?.map((w:any)=>{const level=Math.min(100,w.open_tasks*10);return <div key={w.id} className="workload-row"><div className="mini-avatar">{w.name?.charAt(0)}</div><div className="workload-person"><strong>{w.name}</strong><span>{w.open_tasks} open tasks</span></div><div className="workload-track"><i style={{width:`${level}%`}}/></div><b className={w.open_tasks>10?'hot':''}>{w.open_tasks>10?'Heavy':w.open_tasks>6?'Busy':'Available'}</b></div>})}</div></section><section className="home-panel"><div className="panel-heading"><div><span className="eyebrow">Signals</span><h2>Project health</h2></div><Link href="/dashboard/projects">Projects</Link></div><div className="health-cards"><div><span className="health-icon good"><AppIcon name="projects"/></span><strong>{d.active_projects||0}</strong><small>Active projects</small></div><div><span className={`health-icon ${d.at_risk_projects?'risk':'good'}`}><AppIcon name="alert"/></span><strong>{d.at_risk_projects||0}</strong><small>At risk / off track</small></div><div><span className="health-icon neutral"><AppIcon name="users"/></span><strong>{d.total_employees||0}</strong><small>Team members</small></div></div></section></div>}

   <section className="home-panel"><div className="panel-heading"><div><span className="eyebrow">Traceability</span><h2>Recent activity</h2></div><Link href="/dashboard/activity">Full activity</Link></div><div className="activity-mini-feed">{d.recent_activity?.map((a:any)=><div key={a.id}><span className="activity-dot"/><div><strong>{a.actor?.name||'System'}</strong> {a.description}<small>{new Date(a.created_at).toLocaleString()}</small></div></div>)}</div></section>
   <TaskComposer open={composer} onClose={()=>setComposer(false)} onCreated={load}/>
 </div>;
}
