<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'project_id','employee_id','created_by','parent_id','task_number','title','description',
        'status','priority','position','estimate_minutes','start_date','due_date','completed_at',
        'recurrence_pattern','recurrence_interval','recurrence_days','next_recurrence_at','recurrence_until','metadata',
    ];

    protected function casts(): array
    {
        return [
            'start_date'=>'date','due_date'=>'datetime','completed_at'=>'datetime','next_recurrence_at'=>'datetime',
            'recurrence_until'=>'datetime','recurrence_days'=>'array','metadata'=>'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Task $task) {
            if (!$task->task_number && $task->project_id) {
                $task->task_number = ((int) static::where('project_id',$task->project_id)->max('task_number')) + 1;
            }
        });
    }

    public function project(){ return $this->belongsTo(Project::class); }
    public function parent(){ return $this->belongsTo(Task::class,'parent_id'); }
    public function subtasks(){ return $this->hasMany(Task::class,'parent_id')->orderBy('position'); }
    public function assignTo(){ return $this->belongsTo(Employee::class,'employee_id'); }
    public function assign_to(){ return $this->assignTo(); }
    public function createdBy(){ return $this->belongsTo(User::class,'created_by'); }
    public function created_by(){ return $this->createdBy(); }
    public function assignees(){ return $this->belongsToMany(User::class,'task_assignees')->withTimestamps(); }
    public function watchers(){ return $this->belongsToMany(User::class,'task_watchers')->withTimestamps(); }
    public function labels(){ return $this->belongsToMany(Label::class); }
    public function checklistItems(){ return $this->hasMany(ChecklistItem::class)->orderBy('position'); }
    public function comments(){ return $this->hasMany(TaskComment::class)->latest(); }
    public function attachments(){ return $this->hasMany(TaskAttachment::class)->latest(); }
    public function timeEntries(){ return $this->hasMany(TimeEntry::class)->latest(); }
    public function dependencies(){ return $this->belongsToMany(Task::class,'task_dependencies','task_id','depends_on_task_id')->withPivot('type')->withTimestamps(); }
    public function blocking(){ return $this->belongsToMany(Task::class,'task_dependencies','depends_on_task_id','task_id')->withPivot('type')->withTimestamps(); }

    public function getDisplayKeyAttribute(): string
    {
        return ($this->project?->key ?: 'TASK').'-'.($this->task_number ?: $this->id);
    }
}
