<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Label;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
class LabelController extends Controller
{
 public function store(Request $r){$v=$r->validate(['project_id'=>['nullable','integer','exists:projects,id'],'name'=>['required','string','max:50'],'color'=>['required','string','max:20']]);$exists=Label::where('project_id',$v['project_id']??null)->where('name',$v['name'])->exists();abort_if($exists,422,'A label with this name already exists here.');return response()->json(Label::create($v),201);}
 public function update(Request $r,int $id){$l=Label::findOrFail($id);$v=$r->validate(['name'=>['sometimes','string','max:50'],'color'=>['sometimes','string','max:20']]);$l->update($v);return response()->json($l);}
 public function destroy(int $id){Label::findOrFail($id)->delete();return response()->json(['message'=>'Label deleted']);}
}
