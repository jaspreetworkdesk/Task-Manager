<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Support\Work;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    private function visible(Request $request)
    {
        $q=Project::query();
        if(!Work::elevated($request->user())){
            $uid=$request->user()->id;
            $projectIds=Work::visibleTasks($request->user())->select('project_id');
            $q->where(function($x)use($uid,$projectIds){
                $x->whereHas('members',fn($m)=>$m->where('users.id',$uid))->orWhereIn('id',$projectIds);
            });
        }
        return $q;
    }

    public function index(Request $request)
    {
        $q=$this->visible($request)
            ->when($request->filled('search'),function($q)use($request){$s=trim((string)$request->search);$q->where(fn($x)=>$x->where('name','like',"%{$s}%")->orWhere('description','like',"%{$s}%")->orWhere('key','like',"%{$s}%"));})
            ->when($request->filled('status'),fn($q)=>$q->whereIn('status',(array)$request->status))
            ->when($request->filled('priority'),fn($q)=>$q->whereIn('priority',(array)$request->priority))
            ->when($request->filled('health'),fn($q)=>$q->where('health',$request->health))
            ->with(['department:id,name','owner:id,name,avatar','members:id,name,avatar'])
            ->withCount(['tasks','tasks as completed_tasks_count'=>fn($q)=>$q->where('status','completed'),'tasks as overdue_tasks_count'=>fn($q)=>$q->whereNotIn('status',['completed','cancelled'])->where('due_date','<',now())])
            ->latest();
        return response()->json($q->paginate(min(max((int)$request->input('per_page',20),1),100)));
    }

    public function store(Request $request)
    {
        $v=$this->validateProject($request);
        $project=DB::transaction(function()use($request,$v){
            $payload=collect($v)->except('member_ids')->all();
            $p=Project::create([...$payload,'created_by'=>$request->user()->id,'owner_id'=>$v['owner_id']??$request->user()->id]);
            $members=collect($v['member_ids']??[])->push($p->owner_id)->unique()->all();
            $sync=[];foreach($members as $uid)$sync[$uid]=['role'=>$uid==$p->owner_id?'owner':'member'];$p->members()->sync($sync);
            Work::activity($request->user(),'project',$p->id,'created',"Created project {$p->name}");return $p;
        });
        return response()->json(['message'=>'Project created','project'=>$this->detail($project)],201);
    }

    public function show(Request $request,string $id){return response()->json($this->detail($this->visible($request)->findOrFail($id)));}

    public function update(Request $request,string $id)
    {
        abort_unless(Work::elevated($request->user()),403);$p=$this->visible($request)->findOrFail($id);$v=$this->validateProject($request,$p);
        DB::transaction(function()use($request,$p,$v){$p->update(collect($v)->except('member_ids')->all());if(array_key_exists('member_ids',$v)){$members=collect($v['member_ids']??[])->push($p->owner_id)->filter()->unique()->all();$sync=[];foreach($members as $uid)$sync[$uid]=['role'=>$uid==$p->owner_id?'owner':'member'];$p->members()->sync($sync);}Work::activity($request->user(),'project',$p->id,'updated',"Updated project {$p->name}");});
        return response()->json(['message'=>'Project updated','project'=>$this->detail($p->fresh())]);
    }

    public function destroy(Request $request,string $id){abort_unless(Work::elevated($request->user()),403);$p=$this->visible($request)->findOrFail($id);Work::activity($request->user(),'project',$p->id,'deleted',"Archived project {$p->name}");$p->delete();return response()->json(['message'=>'Project archived']);}

    private function validateProject(Request $request,?Project $p=null):array
    {
        return $request->validate([
            'name'=>['required','string','max:120'], 'key'=>['nullable','string','max:12','regex:/^[A-Za-z0-9_-]+$/',Rule::unique('projects','key')->ignore($p?->id)],
            'description'=>['nullable','string','max:12000'],'color'=>['nullable','string','max:20'],'department_id'=>['nullable','integer','exists:departments,id'],
            'owner_id'=>['nullable','integer','exists:users,id'],'member_ids'=>['nullable','array','max:100'],'member_ids.*'=>['integer','exists:users,id'],
            'start_date'=>['nullable','date'],'due_date'=>['nullable','date','after_or_equal:start_date'],
            'status'=>['required',Rule::in(['planning','active','on_hold','completed','cancelled'])],'priority'=>['required',Rule::in(['low','medium','high','urgent'])],
            'visibility'=>['nullable',Rule::in(['private','team'])],'health'=>['nullable',Rule::in(['on_track','at_risk','off_track'])],
        ]);
    }

    private function detail(Project $p):Project
    {
        return $p->load(['department:id,name','owner:id,name,email,avatar','members:id,name,email,avatar,role','labels:id,project_id,name,color'])
            ->loadCount(['tasks','tasks as completed_tasks_count'=>fn($q)=>$q->where('status','completed'),'tasks as overdue_tasks_count'=>fn($q)=>$q->whereNotIn('status',['completed','cancelled'])->where('due_date','<',now())]);
    }
}
