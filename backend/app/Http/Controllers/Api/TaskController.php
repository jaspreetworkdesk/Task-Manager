<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use App\Support\Work;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Work::visibleTasks($request->user())
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string)$request->search);
                $q->where(function ($x) use ($search) {
                    $x->where('title','like',"%{$search}%")
                      ->orWhere('description','like',"%{$search}%")
                      ->orWhereHas('project', fn($p)=>$p->where('name','like',"%{$search}%")->orWhere('key','like',"%{$search}%"));
                });
            })
            ->when($request->filled('status'), fn($q)=>$q->whereIn('status',(array)$request->input('status')))
            ->when($request->filled('priority'), fn($q)=>$q->whereIn('priority',(array)$request->input('priority')))
            ->when($request->filled('project_id'), fn($q)=>$q->where('project_id',$request->project_id))
            ->when($request->filled('assignee_id'), fn($q)=>$q->whereHas('assignees',fn($a)=>$a->where('users.id',$request->assignee_id)))
            ->when($request->boolean('overdue'), fn($q)=>$q->whereNotIn('status',['completed','cancelled'])->where('due_date','<',now()))
            ->when($request->input('due')==='today', fn($q)=>$q->whereDate('due_date',today()))
            ->when($request->input('due')==='week', fn($q)=>$q->whereBetween('due_date',[now()->startOfDay(),now()->addDays(7)->endOfDay()]))
            ->when($request->input('due')==='overdue', fn($q)=>$q->whereNotIn('status',['completed','cancelled'])->where('due_date','<',now()))
            ->when($request->input('due')==='none', fn($q)=>$q->whereNull('due_date'))
            ->with(['project:id,key,name,color','assignees:id,name,email,avatar','labels:id,name,color','parent:id,title,task_number'])
            ->withCount(['subtasks','comments','checklistItems','attachments'])
            ->withSum('timeEntries','duration_minutes');

        $sort = $request->input('sort','smart');
        if ($sort === 'due') $query->orderByRaw('due_date IS NULL, due_date asc');
        elseif ($sort === 'created') $query->latest();
        elseif ($sort === 'priority') $query->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END");
        else $query->orderByRaw("CASE WHEN status IN ('completed','cancelled') THEN 2 WHEN due_date IS NOT NULL AND due_date < CURRENT_TIMESTAMP THEN 0 ELSE 1 END")->orderByRaw('due_date IS NULL, due_date asc')->orderBy('position');

        $perPage = min(max((int)$request->input('per_page',25),1),200);
        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $this->validateTask($request);
        $project = Project::findOrFail($validated['project_id']);

        abort_unless(
            Work::canCreateTaskInProject($request->user(), $project),
            403,
            'You can only create tasks inside projects you belong to.'
        );

        $this->validateTaskRelations($request, $validated, $project);

        $task = DB::transaction(function () use ($request,$validated) {
            $task = Task::create($this->taskPayload($request,$validated));
            $this->syncRelations($task,$validated);
            $task->watchers()->syncWithoutDetaching([$request->user()->id]);
            Work::activity($request->user(),'task',$task->id,'created',"Created {$task->title}");
            $notify = collect($validated['assignee_ids'] ?? [])->reject(fn($id)=>(int)$id===$request->user()->id);
            Work::notifyUsers($notify,'assignment','New task assigned',$task->title,"/dashboard/tasks/{$task->id}",['task_id'=>$task->id]);
            return $task;
        });
        return response()->json(['message'=>'Task created successfully','task'=>$this->detail($task)],201);
    }

    public function show(Request $request, string $id)
    {
        $task = Work::visibleTasks($request->user())->findOrFail($id);
        return response()->json($this->detail($task));
    }

    public function update(Request $request, string $id)
    {
        $task = Work::visibleTasks($request->user())->findOrFail($id);
        abort_unless(Work::canEditTask($request->user(),$task),403,'You cannot edit this task.');

        // Focused board/detail updates do not require resubmitting the full task form.
        if (!$request->hasAny(['title','description','project_id','assignee_ids','priority','due_date','start_date','parent_id','estimate_minutes','recurrence_pattern','label_ids'])) {
            $validated = $request->validate([
                'status'=>['sometimes',Rule::in(['todo','in_progress','review','completed','cancelled'])],
                'position'=>['sometimes','integer','min:0'],
            ]);
            $before = $task->only(array_keys($validated));
            $task->update([...$validated,'completed_at'=>($validated['status']??null)==='completed'?($task->completed_at??now()):(($validated['status']??null)?null:$task->completed_at)]);
            Work::activity($request->user(),'task',$task->id,'updated',"Updated {$task->title}",['before'=>$before,'after'=>$validated]);
            return response()->json(['message'=>'Task updated','task'=>$this->detail($task->fresh())]);
        }

        abort_unless(Work::elevated($request->user()),403,'Manager access required for task details.');
        $validated = $this->validateTask($request,$task);
        DB::transaction(function () use ($request,$task,$validated) {
            $before = $task->only(['title','status','priority','due_date','project_id']);
            $task->update($this->taskPayload($request,$validated,$task));
            $this->syncRelations($task,$validated);
            Work::activity($request->user(),'task',$task->id,'updated',"Updated {$task->title}",['before'=>$before,'after'=>$task->fresh()->only(array_keys($before))]);
        });
        return response()->json(['message'=>'Task updated successfully','task'=>$this->detail($task->fresh())]);
    }

    public function destroy(Request $request, string $id)
    {
        $task = Work::visibleTasks($request->user())->findOrFail($id);
        abort_unless(Work::elevated($request->user()),403);
        Work::activity($request->user(),'task',$task->id,'deleted',"Deleted {$task->title}");
        $task->delete();
        return response()->json(['message'=>'Task deleted successfully']);
    }

    public function projectTasks(Request $request, string $id)
    {
        $request->merge(['project_id'=>$id]);
        return $this->index($request);
    }

    public function reorder(Request $request)
    {
        $data = $request->validate(['items'=>['required','array','max:200'],'items.*.id'=>['required','integer','exists:tasks,id'],'items.*.status'=>['nullable',Rule::in(['todo','in_progress','review','completed','cancelled'])],'items.*.position'=>['required','integer','min:0']]);
        DB::transaction(function () use ($request,$data) {
            foreach ($data['items'] as $item) {
                $task=Work::visibleTasks($request->user())->findOrFail($item['id']);
                abort_unless(Work::canEditTask($request->user(),$task),403);
                $payload=['position'=>$item['position']];
                if (!empty($item['status'])) { $payload['status']=$item['status']; $payload['completed_at']=$item['status']==='completed'?($task->completed_at??now()):null; }
                $task->update($payload);
            }
        });
        return response()->json(['message'=>'Board updated']);
    }

    private function validateTask(Request $request, ?Task $task=null): array
    {
        return $request->validate([
            'title'=>['required','string','max:180'],'description'=>['nullable','string','max:12000'],
            'project_id'=>['required','integer','exists:projects,id'],'parent_id'=>['nullable','integer','exists:tasks,id',Rule::notIn([$task?->id])],
            'status'=>['required',Rule::in(['todo','in_progress','review','completed','cancelled'])],
            'priority'=>['required',Rule::in(['low','medium','high','urgent'])],
            'start_date'=>['nullable','date'],'due_date'=>['nullable','date','after_or_equal:start_date'],
            'estimate_minutes'=>['nullable','integer','min:0','max:525600'],'position'=>['nullable','integer','min:0'],
            'assignee_ids'=>['nullable','array','max:25'],'assignee_ids.*'=>['integer','exists:users,id'],
            'employee_id'=>['nullable','integer','exists:employees,id'],
            'label_ids'=>['nullable','array','max:20'],'label_ids.*'=>['integer','exists:labels,id'],
            'recurrence_pattern'=>['nullable',Rule::in(['daily','weekly','monthly'])],'recurrence_interval'=>['nullable','integer','min:1','max:365'],
            'recurrence_days'=>['nullable','array'],'recurrence_days.*'=>['integer','between:0,6'],'recurrence_until'=>['nullable','date','after:due_date'],
        ]);
    }

    private function validateTaskRelations(Request $request, array $validated, Project $project): void
    {
        if (!empty($validated['parent_id'])) {
            $parent = Task::query()->find($validated['parent_id']);
            if (!$parent || (int)$parent->project_id !== (int)$project->id) {
                throw ValidationException::withMessages([
                    'parent_id' => ['A subtask must belong to the same project as its parent task.'],
                ]);
            }
        }

        $assigneeIds = collect($validated['assignee_ids'] ?? [])->map(fn ($id) => (int)$id);
        if (!$assigneeIds->count() && !empty($validated['employee_id'])) {
            $legacyUserId = Employee::where('id', $validated['employee_id'])->value('user_id');
            if ($legacyUserId) $assigneeIds->push((int)$legacyUserId);
        }

        if (!Work::elevated($request->user()) && $assigneeIds->isNotEmpty()) {
            $allowed = Work::assignableUserIds($request->user(), $project)->map(fn ($id) => (int)$id);
            $invalid = $assigneeIds->diff($allowed);
            if ($invalid->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'assignee_ids' => ['Team members can only assign tasks to people who belong to the same project.'],
                ]);
            }
        }

        if (!empty($validated['label_ids'])) {
            $validLabelCount = Label::query()
                ->whereIn('id', $validated['label_ids'])
                ->where(function ($q) use ($project) {
                    $q->whereNull('project_id')->orWhere('project_id', $project->id);
                })
                ->count();

            if ($validLabelCount !== count(array_unique($validated['label_ids']))) {
                throw ValidationException::withMessages([
                    'label_ids' => ['One or more labels do not belong to this project.'],
                ]);
            }
        }
    }

    private function taskPayload(Request $request, array $v, ?Task $task=null): array
    {
        $firstUserId = $v['assignee_ids'][0] ?? (!empty($v['employee_id']) ? Employee::where('id',$v['employee_id'])->value('user_id') : null);
        $employeeId = $firstUserId ? Employee::where('user_id',$firstUserId)->value('id') : ($v['employee_id'] ?? null);
        $next = null;
        if (!empty($v['recurrence_pattern'])) {
            $base = !empty($v['due_date']) ? \Carbon\Carbon::parse($v['due_date']) : now();
            $n = (int)($v['recurrence_interval'] ?? 1);
            $next = match($v['recurrence_pattern']) {'daily'=>$base->copy()->addDays($n),'weekly'=>$base->copy()->addWeeks($n),'monthly'=>$base->copy()->addMonths($n),default=>null};
        }
        return [
            'project_id'=>$v['project_id'],'employee_id'=>$employeeId,'created_by'=>$task?->created_by ?: $request->user()->id,
            'parent_id'=>$v['parent_id']??null,'title'=>$v['title'],'description'=>$v['description']??null,'status'=>$v['status'],'priority'=>$v['priority'],
            'start_date'=>$v['start_date']??null,'due_date'=>$v['due_date']??null,'estimate_minutes'=>$v['estimate_minutes']??null,'position'=>$v['position']??($task?->position??0),
            'completed_at'=>$v['status']==='completed'?($task?->completed_at??now()):null,
            'recurrence_pattern'=>$v['recurrence_pattern']??null,'recurrence_interval'=>$v['recurrence_interval']??1,'recurrence_days'=>$v['recurrence_days']??null,
            'next_recurrence_at'=>$next,'recurrence_until'=>$v['recurrence_until']??null,
        ];
    }

    private function syncRelations(Task $task,array $v): void
    {
        $assignees = $v['assignee_ids'] ?? [];
        if (!$assignees && !empty($v['employee_id'])) {
            $legacyUserId = Employee::where('id',$v['employee_id'])->value('user_id');
            if ($legacyUserId) $assignees = [$legacyUserId];
        }
        $task->assignees()->sync($assignees);
        $task->labels()->sync($v['label_ids']??[]);
    }

    private function detail(Task $task): Task
    {
        return $task->load([
            'project:id,key,name,color,status,health','project.members:id,name,role,avatar','parent:id,title,task_number,project_id','subtasks.project:id,key,name',
            'assignees:id,name,email,avatar','watchers:id,name,email,avatar','labels:id,name,color',
            'checklistItems','comments.user:id,name,avatar','attachments.user:id,name','timeEntries.user:id,name','dependencies.project:id,key,name','blocking.project:id,key,name',
        ])->loadCount(['subtasks','comments','attachments','checklistItems'])->loadSum('timeEntries','duration_minutes');
    }
}
