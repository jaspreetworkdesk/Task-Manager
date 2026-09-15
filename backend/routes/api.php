<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\Admin\DepartmentController;
use App\Http\Controllers\Api\Admin\DesignationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\SavedViewController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskCollaborationController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/forgot-password',[AuthController::class,'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password',[AuthController::class,'resetPassword'])->middleware('throttle:6,1');
});
Route::post('/login',[AuthController::class,'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',[AuthController::class,'logout']);
    Route::get('/me',fn(Request $r)=>response()->json(['status'=>true,'user'=>$r->user()]));
    Route::get('/user-detail',[AuthController::class,'userDetail']);
    Route::patch('/update-user-detail',[AuthController::class,'updateUserDetail']);

    Route::get('/workspace/bootstrap',[WorkspaceController::class,'bootstrap']);
    Route::get('/search',[WorkspaceController::class,'search'])->middleware('throttle:60,1');
    Route::get('/dashboard/overview',[DashboardController::class,'overview']);
    Route::get('/dashboard/stats',[DashboardController::class,'employeeStats']);

    Route::get('/projects',[ProjectController::class,'index']);
    Route::get('/projects/{id}',[ProjectController::class,'show']);
    Route::get('/project-tasks/{id}',[TaskController::class,'projectTasks']);

    Route::get('/tasks',[TaskController::class,'index']);
    Route::post('/tasks',[TaskController::class,'store']);
    Route::get('/tasks/{id}',[TaskController::class,'show']);
    Route::patch('/tasks/{id}',[TaskController::class,'update']);
    Route::post('/tasks/reorder',[TaskController::class,'reorder']);

    Route::post('/tasks/{id}/comments',[TaskCollaborationController::class,'addComment']);
    Route::patch('/tasks/{id}/comments/{commentId}',[TaskCollaborationController::class,'updateComment']);
    Route::delete('/tasks/{id}/comments/{commentId}',[TaskCollaborationController::class,'deleteComment']);
    Route::post('/tasks/{id}/checklist',[TaskCollaborationController::class,'addChecklist']);
    Route::patch('/tasks/{id}/checklist/{itemId}',[TaskCollaborationController::class,'updateChecklist']);
    Route::delete('/tasks/{id}/checklist/{itemId}',[TaskCollaborationController::class,'deleteChecklist']);
    Route::post('/tasks/{id}/watch',[TaskCollaborationController::class,'watch']);
    Route::delete('/tasks/{id}/watch',[TaskCollaborationController::class,'unwatch']);
    Route::post('/tasks/{id}/dependencies',[TaskCollaborationController::class,'addDependency']);
    Route::delete('/tasks/{id}/dependencies/{dependencyId}',[TaskCollaborationController::class,'removeDependency']);
    Route::post('/tasks/{id}/attachments',[TaskCollaborationController::class,'upload']);
    Route::get('/tasks/{id}/attachments/{attachmentId}',[TaskCollaborationController::class,'download']);
    Route::delete('/tasks/{id}/attachments/{attachmentId}',[TaskCollaborationController::class,'deleteAttachment']);
    Route::post('/tasks/{id}/timer/start',[TaskCollaborationController::class,'startTimer']);
    Route::post('/tasks/{id}/timer/stop',[TaskCollaborationController::class,'stopTimer']);
    Route::post('/tasks/{id}/time',[TaskCollaborationController::class,'addTime']);

    Route::get('/notifications',[NotificationController::class,'index']);
    Route::patch('/notifications/{id}/read',[NotificationController::class,'read']);
    Route::post('/notifications/read-all',[NotificationController::class,'readAll']);
    Route::get('/activity',[ActivityController::class,'index']);

    Route::get('/saved-views',[SavedViewController::class,'index']);
    Route::post('/saved-views',[SavedViewController::class,'store']);
    Route::patch('/saved-views/{id}',[SavedViewController::class,'update']);
    Route::delete('/saved-views/{id}',[SavedViewController::class,'destroy']);

    Route::get('/departments',[DepartmentController::class,'index']);
    Route::get('/designations',[DesignationController::class,'index']);

    Route::middleware('manage-work')->group(function () {
        Route::post('/projects',[ProjectController::class,'store']);
        Route::patch('/projects/{id}',[ProjectController::class,'update']);
        Route::delete('/projects/{id}',[ProjectController::class,'destroy']);
        Route::delete('/tasks/{id}',[TaskController::class,'destroy']);
        Route::post('/labels',[LabelController::class,'store']);
        Route::patch('/labels/{id}',[LabelController::class,'update']);
        Route::delete('/labels/{id}',[LabelController::class,'destroy']);
    });

    Route::middleware('admin')->group(function () {
        Route::get('/admin/dashboard/stats',[DashboardController::class,'adminStats']);
        Route::get('/admin/employees',[EmployeeController::class,'index']);
        Route::post('/admin/employees',[EmployeeController::class,'store']);
        Route::get('/admin/employees/{id}',[EmployeeController::class,'show']);
        Route::patch('/admin/employees/{id}',[EmployeeController::class,'update']);
        Route::delete('/admin/employees/{id}',[EmployeeController::class,'destroy']);
        Route::post('/departments',[DepartmentController::class,'store']);
        Route::get('/departments/{id}',[DepartmentController::class,'show']);
        Route::patch('/departments/{id}',[DepartmentController::class,'update']);
        Route::delete('/departments/{id}',[DepartmentController::class,'destroy']);
        Route::post('/designations',[DesignationController::class,'store']);
        Route::get('/designations/{id}',[DesignationController::class,'show']);
        Route::patch('/designations/{id}',[DesignationController::class,'update']);
        Route::delete('/designations/{id}',[DesignationController::class,'destroy']);
    });
});
