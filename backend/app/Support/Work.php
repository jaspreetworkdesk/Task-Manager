<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkNotification;
use Illuminate\Database\Eloquent\Builder;

class Work
{
    public static function elevated(User $user): bool
    {
        return in_array($user->role, ['admin','manager'], true);
    }

    public static function visibleTasks(User $user): Builder
    {
        $query = Task::query();
        if (self::elevated($user)) return $query;

        $employeeId = Employee::where('user_id',$user->id)->value('id');
        return $query->where(function ($q) use ($user,$employeeId) {
            $q->whereHas('assignees', fn ($a) => $a->where('users.id',$user->id))
              ->orWhereHas('watchers', fn ($w) => $w->where('users.id',$user->id))
              ->orWhereHas('project.members', fn ($m) => $m->where('users.id',$user->id));
            if ($employeeId) $q->orWhere('employee_id',$employeeId);
        });
    }


    public static function canCreateTaskInProject(User $user, Project $project): bool
    {
        if (self::elevated($user)) return true;

        return $project->members()->where('users.id', $user->id)->exists();
    }

    public static function assignableUserIds(User $user, Project $project)
    {
        if (self::elevated($user)) {
            return User::query()->pluck('id');
        }

        return $project->members()->pluck('users.id');
    }

    public static function canEditTask(User $user, Task $task): bool
    {
        if (self::elevated($user)) return true;
        $employeeId = Employee::where('user_id',$user->id)->value('id');
        return (int)$task->created_by === (int)$user->id
            || ($employeeId && (int)$task->employee_id === (int)$employeeId)
            || $task->assignees()->where('users.id',$user->id)->exists()
            || $task->project?->members()->where('users.id',$user->id)->whereIn('project_members.role',['owner','editor'])->exists();
    }

    public static function activity(?User $actor, string $subjectType, int $subjectId, string $action, string $description, array $metadata=[]): void
    {
        ActivityLog::create([
            'actor_user_id'=>$actor?->id,'subject_type'=>$subjectType,'subject_id'=>$subjectId,
            'action'=>$action,'description'=>$description,'metadata'=>$metadata ?: null,
        ]);
    }

    public static function notifyUsers(iterable $userIds, string $type, string $title, ?string $body=null, ?string $url=null, array $data=[]): void
    {
        $ids = collect($userIds)->filter()->unique();
        foreach ($ids as $userId) {
            WorkNotification::create(['user_id'=>$userId,'type'=>$type,'title'=>$title,'body'=>$body,'url'=>$url,'data'=>$data ?: null]);
        }
    }
}
