<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistItem;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\TimeEntry;
use App\Support\Work;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaskCollaborationController extends Controller
{
    private function task(Request $request, int $id): Task
    {
        return Work::visibleTasks($request->user())->findOrFail($id);
    }

    public function addComment(Request $request, int $id)
    {
        $task=$this->task($request,$id);
        $v=$request->validate(['body'=>['required','string','max:10000']]);
        $comment=$task->comments()->create(['user_id'=>$request->user()->id,'body'=>$v['body']]);
        $watchers=$task->watchers()->pluck('users.id')->merge($task->assignees()->pluck('users.id'))->reject(fn($x)=>(int)$x===$request->user()->id);
        Work::notifyUsers($watchers,'comment',"Comment on {$task->title}",mb_strimwidth($v['body'],0,180,'…'),"/dashboard/tasks/{$task->id}");
        Work::activity($request->user(),'task',$task->id,'commented',"Commented on {$task->title}");
        return response()->json($comment->load('user:id,name,avatar'),201);
    }

    public function updateComment(Request $request, int $id, int $commentId)
    {
        $task=$this->task($request,$id); $comment=TaskComment::where('task_id',$task->id)->findOrFail($commentId);
        abort_unless($comment->user_id===$request->user()->id || Work::elevated($request->user()),403);
        $v=$request->validate(['body'=>['required','string','max:10000']]);
        $comment->update(['body'=>$v['body'],'edited_at'=>now()]);
        return response()->json($comment->load('user:id,name,avatar'));
    }

    public function deleteComment(Request $request, int $id, int $commentId)
    {
        $task=$this->task($request,$id); $comment=TaskComment::where('task_id',$task->id)->findOrFail($commentId);
        abort_unless($comment->user_id===$request->user()->id || Work::elevated($request->user()),403); $comment->delete();
        return response()->json(['message'=>'Comment deleted']);
    }

    public function addChecklist(Request $request, int $id)
    {
        $task=$this->task($request,$id); abort_unless(Work::canEditTask($request->user(),$task),403);
        $v=$request->validate(['title'=>['required','string','max:255']]);
        $item=$task->checklistItems()->create(['title'=>$v['title'],'position'=>((int)$task->checklistItems()->max('position'))+1]);
        Work::activity($request->user(),'task',$task->id,'checklist_added',"Added checklist item to {$task->title}");
        return response()->json($item,201);
    }

    public function updateChecklist(Request $request, int $id, int $itemId)
    {
        $task=$this->task($request,$id); abort_unless(Work::canEditTask($request->user(),$task),403);
        $item=ChecklistItem::where('task_id',$task->id)->findOrFail($itemId);
        $v=$request->validate(['title'=>['sometimes','string','max:255'],'is_completed'=>['sometimes','boolean'],'position'=>['sometimes','integer','min:0']]);
        if (array_key_exists('is_completed',$v)) { $v['completed_at']=$v['is_completed']?now():null; $v['completed_by']=$v['is_completed']?$request->user()->id:null; }
        $item->update($v); return response()->json($item);
    }

    public function deleteChecklist(Request $request, int $id, int $itemId)
    {
        $task=$this->task($request,$id); abort_unless(Work::canEditTask($request->user(),$task),403);
        ChecklistItem::where('task_id',$task->id)->findOrFail($itemId)->delete(); return response()->json(['message'=>'Checklist item deleted']);
    }

    public function watch(Request $request, int $id)
    {
        $task=$this->task($request,$id); $task->watchers()->syncWithoutDetaching([$request->user()->id]); return response()->json(['watching'=>true]);
    }
    public function unwatch(Request $request, int $id)
    {
        $task=$this->task($request,$id); $task->watchers()->detach($request->user()->id); return response()->json(['watching'=>false]);
    }

    public function addDependency(Request $request, int $id)
    {
        $task=$this->task($request,$id); abort_unless(Work::canEditTask($request->user(),$task),403);
        $v=$request->validate(['depends_on_task_id'=>['required','integer','exists:tasks,id','not_in:'.$task->id],'type'=>['nullable','in:blocks,relates_to']]);
        $dependsOn=(int)$v['depends_on_task_id'];
        abort_unless(Work::visibleTasks($request->user())->whereKey($dependsOn)->exists(),403);
        abort_if($this->dependencyPathExists($dependsOn,$task->id),422,'This dependency would create a cycle.');
        $task->dependencies()->syncWithoutDetaching([$dependsOn=>['type'=>$v['type']??'blocks']]);
        Work::activity($request->user(),'task',$task->id,'dependency_added',"Added a dependency to {$task->title}");
        return response()->json(['message'=>'Dependency added']);
    }

    private function dependencyPathExists(int $fromTaskId, int $targetTaskId): bool
    {
        $frontier=[$fromTaskId]; $visited=[];
        while($frontier){
            $current=array_pop($frontier);
            if($current===$targetTaskId)return true;
            if(isset($visited[$current]))continue;
            $visited[$current]=true;
            $next=\Illuminate\Support\Facades\DB::table('task_dependencies')->where('task_id',$current)->pluck('depends_on_task_id')->map(fn($id)=>(int)$id)->all();
            foreach($next as $id)if(!isset($visited[$id]))$frontier[]=$id;
        }
        return false;
    }
    public function removeDependency(Request $request, int $id, int $dependencyId)
    {
        $task=$this->task($request,$id); abort_unless(Work::canEditTask($request->user(),$task),403); $task->dependencies()->detach($dependencyId); return response()->json(['message'=>'Dependency removed']);
    }

    public function upload(Request $request, int $id)
    {
        $task=$this->task($request,$id); $request->validate(['file'=>['required','file','max:20480']]); $file=$request->file('file');
        $path=$file->store("task-attachments/{$task->id}",'local');
        $attachment=$task->attachments()->create(['user_id'=>$request->user()->id,'name'=>$file->getClientOriginalName(),'path'=>$path,'mime_type'=>$file->getMimeType(),'size'=>$file->getSize()]);
        Work::activity($request->user(),'task',$task->id,'attachment_added',"Attached {$attachment->name} to {$task->title}");
        return response()->json($attachment->load('user:id,name'),201);
    }
    public function download(Request $request, int $id, int $attachmentId)
    {
        $task=$this->task($request,$id); $attachment=TaskAttachment::where('task_id',$task->id)->findOrFail($attachmentId);
        abort_unless(Storage::disk('local')->exists($attachment->path),404); return Storage::disk('local')->download($attachment->path,$attachment->name);
    }
    public function deleteAttachment(Request $request, int $id, int $attachmentId)
    {
        $task=$this->task($request,$id); $attachment=TaskAttachment::where('task_id',$task->id)->findOrFail($attachmentId);
        abort_unless($attachment->user_id===$request->user()->id || Work::elevated($request->user()),403); Storage::disk('local')->delete($attachment->path); $attachment->delete(); return response()->json(['message'=>'Attachment deleted']);
    }

    public function startTimer(Request $request, int $id)
    {
        $task=$this->task($request,$id);
        abort_if(TimeEntry::where('user_id',$request->user()->id)->whereNull('stopped_at')->exists(),422,'Stop your active timer before starting another.');
        $entry=$task->timeEntries()->create(['user_id'=>$request->user()->id,'started_at'=>now(),'duration_minutes'=>0]); return response()->json($entry,201);
    }
    public function stopTimer(Request $request, int $id)
    {
        $task=$this->task($request,$id); $entry=TimeEntry::where('task_id',$task->id)->where('user_id',$request->user()->id)->whereNull('stopped_at')->latest()->firstOrFail();
        $stopped=now(); $entry->update(['stopped_at'=>$stopped,'duration_minutes'=>max(1,$entry->started_at->diffInMinutes($stopped))]);
        Work::activity($request->user(),'task',$task->id,'time_logged',"Logged {$entry->duration_minutes} minutes on {$task->title}"); return response()->json($entry);
    }
    public function addTime(Request $request, int $id)
    {
        $task=$this->task($request,$id); $v=$request->validate(['duration_minutes'=>['required','integer','min:1','max:14400'],'note'=>['nullable','string','max:255'],'started_at'=>['nullable','date']]);
        $entry=$task->timeEntries()->create(['user_id'=>$request->user()->id,'duration_minutes'=>$v['duration_minutes'],'note'=>$v['note']??null,'started_at'=>$v['started_at']??now(),'stopped_at'=>now()]);
        Work::activity($request->user(),'task',$task->id,'time_logged',"Logged {$entry->duration_minutes} minutes on {$task->title}"); return response()->json($entry->load('user:id,name'),201);
    }
}
