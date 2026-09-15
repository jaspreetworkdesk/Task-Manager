<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Support\Work;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateRecurringTasks extends Command
{
    protected $signature = 'tasks:generate-recurring';
    protected $description = 'Generate due recurring task occurrences';

    public function handle(): int
    {
        $generated = 0;

        Task::query()
            ->whereNotNull('recurrence_pattern')
            ->whereNotNull('next_recurrence_at')
            ->where('next_recurrence_at', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($templates) use (&$generated) {
                foreach ($templates as $template) {
                    if ($template->recurrence_until && $template->next_recurrence_at->gt($template->recurrence_until)) {
                        $template->update(['next_recurrence_at' => null]);
                        continue;
                    }

                    DB::transaction(function () use ($template, &$generated) {
                        $due = $template->next_recurrence_at->copy();
                        $start = null;
                        if ($template->start_date && $template->due_date) {
                            $days = $template->start_date->diffInDays($template->due_date, false);
                            $start = $due->copy()->subDays(max(0, $days))->startOfDay();
                        }

                        $occurrence = Task::create([
                            'project_id' => $template->project_id,
                            'parent_id' => $template->parent_id,
                            'employee_id' => $template->employee_id,
                            'created_by' => $template->created_by,
                            'title' => $template->title,
                            'description' => $template->description,
                            'status' => 'todo',
                            'priority' => $template->priority,
                            'position' => $template->position,
                            'estimate_minutes' => $template->estimate_minutes,
                            'start_date' => $start,
                            'due_date' => $due,
                            'metadata' => ['recurring_source_task_id' => $template->id],
                        ]);

                        $occurrence->assignees()->sync($template->assignees()->pluck('users.id'));
                        $occurrence->watchers()->sync($template->watchers()->pluck('users.id'));
                        $occurrence->labels()->sync($template->labels()->pluck('labels.id'));
                        foreach ($template->checklistItems()->orderBy('position')->get() as $item) {
                            $occurrence->checklistItems()->create(['title' => $item->title, 'position' => $item->position]);
                        }

                        $n = max(1, (int) $template->recurrence_interval);
                        $next = match ($template->recurrence_pattern) {
                            'daily' => $due->copy()->addDays($n),
                            'weekly' => $due->copy()->addWeeks($n),
                            'monthly' => $due->copy()->addMonths($n),
                            default => null,
                        };
                        if ($template->recurrence_until && $next?->gt($template->recurrence_until)) $next = null;
                        $template->update(['next_recurrence_at' => $next]);

                        Work::activity(null, 'task', $occurrence->id, 'recurring_created', "Generated recurring task {$occurrence->title}", ['source_task_id' => $template->id]);
                        Work::notifyUsers($occurrence->assignees()->pluck('users.id'), 'assignment', 'Recurring task created', $occurrence->title, "/dashboard/tasks/{$occurrence->id}");
                        $generated++;
                    });
                }
            });

        $this->info("Generated {$generated} recurring task(s).");
        return self::SUCCESS;
    }
}
