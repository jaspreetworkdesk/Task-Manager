<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ChecklistItem extends Model { protected $fillable=['task_id','title','is_completed','position','completed_by','completed_at']; protected function casts():array{return ['is_completed'=>'boolean','completed_at'=>'datetime'];} }
