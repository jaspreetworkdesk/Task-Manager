"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import AppIcon from "@/components/AppIcon";
import {searchWorkspace} from "@/services/workService";

export default function GlobalSearch(){
 const router=useRouter();const [open,setOpen]=useState(false);const [q,setQ]=useState("");const [results,setResults]=useState<any>({tasks:[],projects:[]});
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(v=>!v)}if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 useEffect(()=>{if(q.trim().length<2){setResults({tasks:[],projects:[]});return}const t=setTimeout(()=>searchWorkspace(q).then(r=>setResults(r.data)),180);return()=>clearTimeout(t)},[q]);
 const go=(url:string)=>{setOpen(false);setQ("");router.push(url)};
 return <>{<button className="top-search-trigger" onClick={()=>setOpen(true)}><AppIcon name="search"/><span>Search anything…</span><kbd>⌘ K</kbd></button>}{open&&<div className="search-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="command-palette"><div className="command-input"><AppIcon name="search"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tasks and projects…"/><button onClick={()=>setOpen(false)}>ESC</button></div><div className="command-results">
 {q.trim().length<2?<div className="command-empty"><AppIcon name="sparkles"/><strong>Jump to anything</strong><span>Search by task title, project name or project key.</span></div>:<>{!!results.tasks?.length&&<div className="command-group"><label>Tasks</label>{results.tasks.map((t:any)=><button key={t.id} onClick={()=>go(`/dashboard/tasks/${t.id}`)}><span className={`status-dot ${t.status}`}/><div><strong>{t.title}</strong><small>{t.project?.key}-{t.task_number||t.id} · {t.project?.name}</small></div><AppIcon name="chevron"/></button>)}</div>}{!!results.projects?.length&&<div className="command-group"><label>Projects</label>{results.projects.map((p:any)=><button key={p.id} onClick={()=>go(`/dashboard/projects/${p.id}`)}><span className="project-glyph">{p.key.slice(0,2)}</span><div><strong>{p.name}</strong><small>{p.key} · {p.status}</small></div><AppIcon name="chevron"/></button>)}</div>}{!results.tasks?.length&&!results.projects?.length&&<div className="command-empty">No matches found</div>}</>}
 </div></div></div>}</>;
}
