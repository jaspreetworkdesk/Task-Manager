<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TaskComment extends Model { protected $fillable=['task_id','user_id','body','edited_at']; protected function casts():array{return ['edited_at'=>'datetime'];} public function user(){return $this->belongsTo(User::class);} }
