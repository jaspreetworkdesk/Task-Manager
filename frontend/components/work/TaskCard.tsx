"use client";
import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import type {Task} from "@/lib/workTypes";

const prio:Record<string,string>={urgent:"Urgent",high:"High",medium:"Medium",low:"Low"};
export const Avatar=({name}:{name:string})=><span className="mini-avatar" title={name}>{name.trim().charAt(0).toUpperCase()}</span>;
export default function TaskCard({task,compact=false}:{task:Task;compact?:boolean}){
 const overdue=task.due_date && !["completed","cancelled"].includes(task.status) && new Date(task.due_date)<new Date();
 const due=task.due_date?new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(task.due_date)):null;
 const checklistTotal=task.checklist_items_count||task.checklist_items?.length||0;
 const checklistDone=task.checklist_items?.filter(x=>x.is_completed).length||0;
 return <Link href={`/dashboard/tasks/${task.id}`} className={`work-task-card ${compact?"compact":""}`}>
   <div className="task-card-top"><span className="task-key">{task.project?.key||"TASK"}-{task.task_number||task.id}</span><span className={`priority-dot ${task.priority}`} title={prio[task.priority]} /></div>
   <div className="task-card-title">{task.title}</div>
   {!!task.labels?.length&&<div className="label-row">{task.labels.slice(0,3).map(l=><span className="tiny-label" key={l.id}><i style={{background:l.color}} />{l.name}</span>)}</div>}
   <div className="task-card-meta"><div className="avatar-stack">{task.assignees?.slice(0,3).map(u=><Avatar key={u.id} name={u.name}/>)}</div><div className="meta-icons">
      {due&&<span className={overdue?"meta-danger":""}><AppIcon name="calendar"/>{due}</span>}
      {!!task.comments_count&&<span><AppIcon name="comment"/>{task.comments_count}</span>}
      {!!task.attachments_count&&<span><AppIcon name="paperclip"/>{task.attachments_count}</span>}
      {!!checklistTotal&&<span><AppIcon name="check"/>{checklistDone}/{checklistTotal}</span>}
   </div></div>
 </Link>;
}
