<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\Work;
use Illuminate\Http\Request;
class ActivityController extends Controller
{
 public function index(Request $request){$q=ActivityLog::with('actor:id,name,avatar')->latest(); if(!Work::elevated($request->user())){$taskIds=Work::visibleTasks($request->user())->pluck('id');$q->where(fn($x)=>$x->where('subject_type','task')->whereIn('subject_id',$taskIds));} if($request->filled('action'))$q->where('action',$request->action); return response()->json($q->paginate(min((int)$request->input('per_page',40),100)));}
}
