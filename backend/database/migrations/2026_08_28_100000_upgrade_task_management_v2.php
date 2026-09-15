<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'timezone')) $table->string('timezone', 80)->nullable()->after('role');
            if (!Schema::hasColumn('users', 'avatar')) $table->string('avatar')->nullable()->after('timezone');
        });

        // Projects can come from either the original schema or the newer project
        // migration. Ensure every column used by the advanced app exists before
        // any data backfill runs.
        Schema::table('projects', function (Blueprint $table) {
            if (!Schema::hasColumn('projects', 'owner_id')) $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            if (!Schema::hasColumn('projects', 'created_by')) $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            if (!Schema::hasColumn('projects', 'department_id')) $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            if (!Schema::hasColumn('projects', 'priority')) $table->string('priority', 20)->default('medium');
            if (!Schema::hasColumn('projects', 'key')) $table->string('key', 12)->nullable()->unique();
            if (!Schema::hasColumn('projects', 'color')) $table->string('color', 20)->nullable();
            if (!Schema::hasColumn('projects', 'visibility')) $table->string('visibility', 20)->default('team');
            if (!Schema::hasColumn('projects', 'health')) $table->string('health', 20)->default('on_track');
            if (!Schema::hasColumn('projects', 'deleted_at')) $table->softDeletes();
        });

        // Older projects used created_by but did not have an explicit owner.
        // Preserve that relationship when upgrading instead of leaving ownership blank.
        if (Schema::hasColumn('projects', 'owner_id') && Schema::hasColumn('projects', 'created_by')) {
            DB::table('projects')
                ->whereNull('owner_id')
                ->whereNotNull('created_by')
                ->update(['owner_id' => DB::raw('created_by')]);
        }

        Schema::table('tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('tasks', 'task_number')) $table->unsignedBigInteger('task_number')->nullable()->after('id');
            if (!Schema::hasColumn('tasks', 'parent_id')) $table->foreignId('parent_id')->nullable()->after('project_id')->constrained('tasks')->nullOnDelete();
            if (!Schema::hasColumn('tasks', 'position')) $table->unsignedInteger('position')->default(0)->after('priority');
            if (!Schema::hasColumn('tasks', 'estimate_minutes')) $table->unsignedInteger('estimate_minutes')->nullable()->after('position');
            if (!Schema::hasColumn('tasks', 'recurrence_pattern')) $table->string('recurrence_pattern', 30)->nullable()->after('completed_at');
            if (!Schema::hasColumn('tasks', 'recurrence_interval')) $table->unsignedSmallInteger('recurrence_interval')->default(1)->after('recurrence_pattern');
            if (!Schema::hasColumn('tasks', 'recurrence_days')) $table->json('recurrence_days')->nullable()->after('recurrence_interval');
            if (!Schema::hasColumn('tasks', 'next_recurrence_at')) $table->dateTime('next_recurrence_at')->nullable()->after('recurrence_days');
            if (!Schema::hasColumn('tasks', 'recurrence_until')) $table->dateTime('recurrence_until')->nullable()->after('next_recurrence_at');
            if (!Schema::hasColumn('tasks', 'metadata')) $table->json('metadata')->nullable()->after('recurrence_until');
        });

        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->timestamps();
            $table->unique(['project_id','user_id']);
        });

        Schema::create('task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['task_id','user_id']);
        });

        // Backfill the advanced assignment model so existing data remains visible/editable.
        if (
            Schema::hasTable('employees') &&
            Schema::hasColumn('tasks', 'employee_id') &&
            Schema::hasColumn('employees', 'user_id')
        ) {
            DB::table('tasks')->join('employees','tasks.employee_id','=','employees.id')
                ->whereNotNull('tasks.employee_id')->whereNotNull('employees.user_id')
                ->select('tasks.id as task_id','employees.user_id')->orderBy('tasks.id')
                ->chunk(500, function ($rows) {
                    foreach ($rows as $row) DB::table('task_assignees')->insertOrIgnore(['task_id'=>$row->task_id,'user_id'=>$row->user_id,'created_at'=>now(),'updated_at'=>now()]);
                });
        }

        if (Schema::hasColumn('projects', 'key')) {
            DB::table('projects')->whereNull('key')->orderBy('id')->chunkById(500, function ($rows) {
                foreach ($rows as $row) DB::table('projects')->where('id',$row->id)->update(['key'=>'P'.$row->id]);
            });
        }

        if (Schema::hasColumn('projects', 'owner_id')) {
            DB::table('projects')->whereNotNull('owner_id')->orderBy('id')->chunkById(500, function ($rows) {
                foreach ($rows as $row) DB::table('project_members')->insertOrIgnore(['project_id'=>$row->id,'user_id'=>$row->owner_id,'role'=>'owner','created_at'=>now(),'updated_at'=>now()]);
            });
        }

        Schema::create('task_watchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['task_id','user_id']);
        });

        Schema::create('labels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 50);
            $table->string('color', 20)->default('#64748b');
            $table->timestamps();
            $table->unique(['project_id','name']);
        });

        Schema::create('label_task', function (Blueprint $table) {
            $table->foreignId('label_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->primary(['label_id','task_id']);
        });

        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->string('title', 255);
            $table->boolean('is_completed')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('depends_on_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('type', 30)->default('blocks');
            $table->timestamps();
            $table->unique(['task_id','depends_on_task_id']);
        });

        Schema::create('task_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
        });

        Schema::create('task_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('path');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });

        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('stopped_at')->nullable();
            $table->unsignedInteger('duration_minutes')->default(0);
            $table->string('note')->nullable();
            $table->timestamps();
            $table->index(['user_id','stopped_at']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject_type', 80);
            $table->unsignedBigInteger('subject_id');
            $table->string('action', 50);
            $table->string('description', 500);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['subject_type','subject_id']);
        });

        Schema::create('work_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 50)->default('info');
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('url')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id','read_at']);
        });

        Schema::create('saved_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('scope', 30)->default('tasks');
            $table->json('filters')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['saved_views','work_notifications','activity_logs','time_entries','task_attachments','task_comments','task_dependencies','checklist_items','label_task','labels','task_watchers','task_assignees','project_members'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
