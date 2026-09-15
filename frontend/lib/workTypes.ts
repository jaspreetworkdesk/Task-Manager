export type UserLite = { id:number; name:string; email?:string; role?:string; avatar?:string|null };
export type ProjectLite = { id:number; key:string; name:string; color?:string|null; status?:string; health?:string; can_create_task?:boolean; members?:UserLite[] };
export type Label = { id:number; project_id?:number|null; name:string; color:string };
export type Task = {
  id:number; project_id:number; task_number?:number|null; display_key?:string; title:string; description?:string|null;
  status:"todo"|"in_progress"|"review"|"completed"|"cancelled"; priority:"low"|"medium"|"high"|"urgent";
  start_date?:string|null; due_date?:string|null; completed_at?:string|null; estimate_minutes?:number|null; position?:number;
  project?:ProjectLite; assignees?:UserLite[]; watchers?:UserLite[]; labels?:Label[]; parent?:Task|null; subtasks?:Task[];
  subtasks_count?:number; comments_count?:number; attachments_count?:number; checklist_items_count?:number; time_entries_sum_duration_minutes?:number|null;
  checklist_items?: {id:number;title:string;is_completed:boolean;position:number}[];
  comments?: {id:number;body:string;edited_at?:string|null;created_at:string;user:UserLite}[];
  attachments?: {id:number;name:string;mime_type?:string|null;size:number;created_at:string;user:UserLite}[];
  time_entries?: {id:number;duration_minutes:number;started_at?:string|null;stopped_at?:string|null;note?:string|null;user:UserLite}[];
  dependencies?: Task[]; blocking?: Task[];
};
export type Workspace = { users:UserLite[]; projects:ProjectLite[]; labels:Label[]; permissions:{manage_work:boolean;can_create_tasks:boolean;admin:boolean} };
