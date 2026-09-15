<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Project extends Model
{
    use SoftDeletes;
    protected $fillable=['key','owner_id','name','description','color','status','visibility','health','priority','created_by','department_id','start_date','due_date'];
    protected function casts():array{return ['start_date'=>'date','due_date'=>'date'];}

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            if (!$project->key) {
                $base = strtoupper(preg_replace('/[^A-Z0-9]/','',Str::substr($project->name,0,4))) ?: 'PRJ';
                $key = $base; $i = 2;
                while (static::withTrashed()->where('key',$key)->exists()) $key = Str::substr($base,0,8).$i++;
                $project->key = $key;
            }
        });
    }

    public function department(){return $this->belongsTo(Department::class);}
    public function owner(){return $this->belongsTo(User::class,'owner_id');}
    public function tasks(){return $this->hasMany(Task::class);}
    public function members(){return $this->belongsToMany(User::class,'project_members')->withPivot('role')->withTimestamps();}
    public function labels(){return $this->hasMany(Label::class);}
}
