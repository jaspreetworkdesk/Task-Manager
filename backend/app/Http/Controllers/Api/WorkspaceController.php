<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Label;
use App\Models\Project;
use App\Models\User;
use App\Support\Work;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    private function projects(Request $request)
    {
        $user = $request->user();
        $query = Project::query();

        if (!Work::elevated($user)) {
            $taskProjectIds = Work::visibleTasks($user)->select('project_id');
            $query->where(function ($q) use ($user, $taskProjectIds) {
                $q->whereIn('id', $taskProjectIds)
                    ->orWhereHas('members', fn ($members) => $members->where('users.id', $user->id));
            });
        }

        return $query;
    }

    public function bootstrap(Request $request)
    {
        $user = $request->user();

        $projects = $this->projects($request)
            ->with(['members:id,name,role,avatar'])
            ->select('id', 'key', 'name', 'color', 'status')
            ->orderBy('name')
            ->get();

        foreach ($projects as $project) {
            $project->setAttribute('can_create_task', Work::canCreateTaskInProject($user, $project));
        }

        $projectIds = $projects->pluck('id');
        $labels = Label::query()
            ->where(function ($q) use ($projectIds) {
                $q->whereNull('project_id')->orWhereIn('project_id', $projectIds);
            })
            ->select('id', 'project_id', 'name', 'color')
            ->orderBy('name')
            ->get();

        if (Work::elevated($user)) {
            $users = User::query()
                ->select('id', 'name', 'email', 'role', 'avatar')
                ->orderBy('name')
                ->get();
        } else {
            $assignableUserIds = $projects
                ->filter(fn ($project) => (bool)$project->getAttribute('can_create_task'))
                ->flatMap(fn ($project) => $project->members->pluck('id'))
                ->push($user->id)
                ->unique()
                ->values();

            $users = User::query()
                ->whereIn('id', $assignableUserIds)
                ->select('id', 'name', 'role', 'avatar')
                ->orderBy('name')
                ->get();
        }

        return response()->json([
            'users' => $users,
            'projects' => $projects,
            'labels' => $labels,
            'permissions' => [
                'manage_work' => Work::elevated($user),
                'can_create_tasks' => Work::elevated($user) || $projects->contains(fn ($project) => (bool)$project->getAttribute('can_create_task')),
                'admin' => $user->role === 'admin',
            ],
        ]);
    }

    public function search(Request $request)
    {
        $term = trim((string)$request->input('q'));
        if (mb_strlen($term) < 2) {
            return response()->json(['tasks' => [], 'projects' => []]);
        }

        $tasks = Work::visibleTasks($request->user())
            ->where(fn ($q) => $q->where('title', 'like', "%{$term}%")->orWhere('description', 'like', "%{$term}%"))
            ->with('project:id,key,name')
            ->limit(8)
            ->get(['id', 'project_id', 'task_number', 'title', 'status', 'priority', 'due_date']);

        $projects = $this->projects($request)
            ->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('key', 'like', "%{$term}%"))
            ->limit(5)
            ->get(['id', 'key', 'name', 'status']);

        return response()->json(compact('tasks', 'projects'));
    }
}
