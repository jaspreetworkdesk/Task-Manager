<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SavedView extends Model { protected $fillable=['user_id','name','scope','filters','is_default']; protected function casts():array{return ['filters'=>'array','is_default'=>'boolean'];} }
