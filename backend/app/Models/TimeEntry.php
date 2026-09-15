<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TimeEntry extends Model { protected $fillable=['task_id','user_id','started_at','stopped_at','duration_minutes','note']; protected function casts():array{return ['started_at'=>'datetime','stopped_at'=>'datetime'];} public function user(){return $this->belongsTo(User::class);} }
