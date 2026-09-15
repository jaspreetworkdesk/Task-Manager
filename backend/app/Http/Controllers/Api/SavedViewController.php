<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\SavedView;
use Illuminate\Http\Request;
class SavedViewController extends Controller
{
 public function index(Request $r){return response()->json($r->user()->id?SavedView::where('user_id',$r->user()->id)->orderByDesc('is_default')->orderBy('name')->get():[]);}
 public function store(Request $r){$v=$r->validate(['name'=>['required','string','max:80'],'scope'=>['required','in:tasks,projects'],'filters'=>['nullable','array'],'is_default'=>['nullable','boolean']]);if(!empty($v['is_default']))SavedView::where('user_id',$r->user()->id)->where('scope',$v['scope'])->update(['is_default'=>false]);return response()->json(SavedView::create([...$v,'user_id'=>$r->user()->id]),201);}
 public function update(Request $r,int $id){$v=SavedView::where('user_id',$r->user()->id)->findOrFail($id);$data=$r->validate(['name'=>['sometimes','string','max:80'],'filters'=>['sometimes','array'],'is_default'=>['sometimes','boolean']]);if(!empty($data['is_default']))SavedView::where('user_id',$r->user()->id)->where('scope',$v->scope)->update(['is_default'=>false]);$v->update($data);return response()->json($v);}
 public function destroy(Request $r,int $id){SavedView::where('user_id',$r->user()->id)->findOrFail($id)->delete();return response()->json(['message'=>'View deleted']);}
}
