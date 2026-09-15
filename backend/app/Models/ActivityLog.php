<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ActivityLog extends Model { protected $fillable=['actor_user_id','subject_type','subject_id','action','description','metadata']; protected function casts():array{return ['metadata'=>'array'];} public function actor(){return $this->belongsTo(User::class,'actor_user_id');} }
