<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('projects')) {
            Schema::create('projects', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->longText('description')->nullable();
                $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->date('start_date')->nullable();
                $table->date('due_date')->nullable();
                $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])->default('planning');
                $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
                $table->timestamps();
                $table->softDeletes();
            });
            return;
        }

        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'department_id')) {
                $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('projects', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('projects', 'priority')) {
                $table->string('priority', 20)->default('medium');
            }
        });
    }

    public function down(): void
    {
        // Do not drop projects because an earlier migration may own the table.
    }
};
