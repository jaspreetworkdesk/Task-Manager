<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\WorkNotification;
use Illuminate\Http\Request;
class NotificationController extends Controller
{
    public function index(Request $request){$q=$request->user()->workNotifications()->latest(); if($request->boolean('unread'))$q->whereNull('read_at'); return response()->json(['unread_count'=>$request->user()->workNotifications()->whereNull('read_at')->count(),'notifications'=>$q->paginate(min((int)$request->input('per_page',30),100))]);}
    public function read(Request $request,int $id){$n=$request->user()->workNotifications()->findOrFail($id);$n->update(['read_at'=>now()]);return response()->json($n);}
    public function readAll(Request $request){$request->user()->workNotifications()->whereNull('read_at')->update(['read_at'=>now()]);return response()->json(['message'=>'All notifications marked as read']);}
}
