"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import {getWorkTasks} from "@/services/workService";
import type {Task} from "@/lib/workTypes";

export default function CalendarPage(){
 const [tasks,setTasks]=useState<Task[]>([]),[loading,setLoading]=useState(true);const [cursor,setCursor]=useState(new Date());
 useEffect(()=>{getWorkTasks({per_page:200,sort:'due'}).then(r=>setTasks(r.data.data||[])).finally(()=>setLoading(false))},[]);
 const year=cursor.getFullYear(),month=cursor.getMonth();const first=new Date(year,month,1),last=new Date(year,month+1,0);const start=(first.getDay()+6)%7;const cells=Array.from({length:Math.ceil((start+last.getDate())/7)*7},(_,i)=>{const day=i-start+1;return day>=1&&day<=last.getDate()?new Date(year,month,day):null});
 const byDay=useMemo(()=>{const map:Record<string,Task[]>={};tasks.forEach(t=>{if(!t.due_date)return;const d=new Date(t.due_date);if(d.getMonth()!==month||d.getFullYear()!==year)return;const k=String(d.getDate());(map[k]||=[]).push(t)});return map},[tasks,month,year]);
 const nav=(n:number)=>setCursor(new Date(year,month+n,1));
 return <div className="work-page"><div className="work-page-head"><div><span className="eyebrow">Schedule</span><h1>Calendar</h1><p>See deadlines in context and spot overloaded days before they become problems.</p></div><div className="calendar-nav"><button onClick={()=>nav(-1)}>‹</button><strong>{cursor.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong><button onClick={()=>nav(1)}>›</button><button onClick={()=>setCursor(new Date())}>Today</button></div></div>
 {loading?<div className="work-loading">Loading dates…</div>:<div className="calendar-shell"><div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{cells.map((d,i)=><div key={i} className={`calendar-cell ${!d?'blank':''} ${d&&d.toDateString()===new Date().toDateString()?'today':''}`}><span className="day-number">{d?.getDate()}</span>{d&&<div className="day-tasks">{(byDay[String(d.getDate())]||[]).slice(0,4).map(t=><Link key={t.id} href={`/dashboard/tasks/${t.id}`} className={`calendar-task ${t.priority}`}><i/>{t.title}</Link>)}{(byDay[String(d.getDate())]||[]).length>4&&<small>+{byDay[String(d.getDate())].length-4} more</small>}</div>}</div>)}</div></div>}</div>;
}
