<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Support\Work;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function overview(Request $request)
    {
        $user=$request->user();$tasks=Work::visibleTasks($user);$now=now();
        $counts=(clone $tasks)->selectRaw('status, COUNT(*) total')->groupBy('status')->pluck('total','status');
        $base=[
            'total_tasks'=>(clone $tasks)->count(),'todo_tasks'=>(int)($counts['todo']??0),'in_progress_tasks'=>(int)($counts['in_progress']??0),'review_tasks'=>(int)($counts['review']??0),'completed_tasks'=>(int)($counts['completed']??0),
            'overdue_tasks'=>(clone $tasks)->whereNotIn('status',['completed','cancelled'])->where('due_date','<',$now)->count(),
            'due_today'=>(clone $tasks)->whereNotIn('status',['completed','cancelled'])->whereDate('due_date',$now->toDateString())->count(),
            'due_this_week'=>(clone $tasks)->whereNotIn('status',['completed','cancelled'])->whereBetween('due_date',[$now,$now->copy()->addDays(7)])->count(),
            'total_projects'=>Work::elevated($user)?Project::count():(clone $tasks)->distinct()->count('project_id'),
            'estimated_minutes'=>(int)(clone $tasks)->whereNotIn('status',['completed','cancelled'])->sum('estimate_minutes'),
            'logged_minutes_this_week'=>(int)TimeEntry::when(!Work::elevated($user),fn($q)=>$q->where('user_id',$user->id))->where('created_at','>=',now()->startOfWeek())->sum('duration_minutes'),
        ];
        $base['upcoming']=(clone $tasks)->whereNotIn('status',['completed','cancelled'])->whereNotNull('due_date')->with(['project:id,key,name,color','assignees:id,name,avatar'])->orderBy('due_date')->limit(7)->get(['id','project_id','task_number','title','status','priority','due_date']);
        $activity=ActivityLog::with('actor:id,name,avatar')->latest();
        if(!Work::elevated($user)){$visibleTaskIds=Work::visibleTasks($user)->select('id');$activity->where('subject_type','task')->whereIn('subject_id',$visibleTaskIds);}
        $base['recent_activity']=$activity->limit(8)->get();
        if(Work::elevated($user)){
            $base['total_employees']=Employee::count();$base['total_departments']=Department::count();$base['active_projects']=Project::where('status','active')->count();
            $base['at_risk_projects']=Project::whereIn('health',['at_risk','off_track'])->count();
            $base['workload']=Employee::with('user:id,name,avatar')->withCount(['tasks as open_tasks'=>fn($q)=>$q->whereNotIn('status',['completed','cancelled'])])->orderByDesc('open_tasks')->limit(8)->get()->map(fn($e)=>['id'=>$e->user_id,'name'=>$e->user?->name,'avatar'=>$e->user?->avatar,'open_tasks'=>$e->open_tasks]);
        }
        return response()->json($base);
    }
    public function adminStats(Request $r){return $this->overview($r);} public function employeeStats(Request $r){return $this->overview($r);}
}
