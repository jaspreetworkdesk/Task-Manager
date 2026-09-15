<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Hidden(['password','remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;
    protected $fillable=['name','email','password','department_id','designation_id','role','timezone','avatar'];
    protected function casts():array{return ['email_verified_at'=>'datetime','password'=>'hashed'];}
    public function employee(){return $this->hasOne(Employee::class);}
    public function assignedTasks(){return $this->belongsToMany(Task::class,'task_assignees')->withTimestamps();}
    public function watchedTasks(){return $this->belongsToMany(Task::class,'task_watchers')->withTimestamps();}
    public function projects(){return $this->belongsToMany(Project::class,'project_members')->withPivot('role')->withTimestamps();}
    public function workNotifications(){return $this->hasMany(WorkNotification::class);}
}
