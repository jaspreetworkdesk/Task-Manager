"use client";
import {useRouter} from "next/navigation";
import ProjectForm,{type ProjectValues} from "@/components/work/ProjectForm";
import {createProject} from "@/services/projectService";
export default function CreateProject(){const router=useRouter();const save=async(v:ProjectValues)=>{const r=await createProject({...v,department_id:v.department_id?Number(v.department_id):null,owner_id:v.owner_id?Number(v.owner_id):undefined,start_date:v.start_date||null,due_date:v.due_date||null} as any);router.push(`/dashboard/projects/${r.data.project?.id||r.data.id}`)};return <div className="work-page"><div className="work-page-head"><div><span className="eyebrow">Portfolio</span><h1>Create project</h1><p>Set ownership, delivery signals and the team before work starts.</p></div></div><ProjectForm onSubmit={save} submitLabel="Create project"/></div>}
