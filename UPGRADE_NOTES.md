# FlowTask Upgrade Notes

This package is an upgraded version of the supplied task-management project. The goal of the work was to improve the product experience and also fix backend behavior that could make a polished UI unreliable.

## What changed

### 1. Modern responsive application shell
- Replaced the fixed black desktop-only navigation with a modern workspace sidebar.
- Added active navigation states, role-aware menus, user identity, a proper sign-out action, and a mobile slide-out menu.
- Added a sticky top bar and cleaner spacing for large desktop, laptop, tablet, and mobile screens.
- Added a consistent design system for colors, surfaces, typography, form controls, tables, pagination, cards, states, and buttons.

**Benefit:** the application is easier to scan and use at different screen sizes without having to redesign every page separately.

### 2. New authentication experience
- Rebuilt the login page with responsive desktop/mobile layouts.
- Added password visibility controls, meaningful error states, autocomplete attributes, and accessible labels.
- API URL is now configurable with `NEXT_PUBLIC_API_URL` instead of being hard-coded in application logic.
- Axios now has a common authentication interceptor.

**Benefit:** less duplicated auth code, easier deployment, and a more professional first-use experience.

### 3. Complete Forgot Password flow
Backend endpoints:
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Frontend routes:
- `/forgot-password`
- `/reset-password?token=...&email=...`

Security behavior:
- Forgot-password requests return a generic message and do not reveal whether an account exists.
- Password reset requests are rate-limited.
- Passwords require at least 8 characters and confirmation.
- Successful password resets invalidate existing Sanctum API tokens.
- Laravel's password broker/token storage is used instead of a custom insecure token implementation.
- Reset email URLs point to the Next.js frontend through `FRONTEND_URL`.

**Benefit:** users can recover access themselves without an admin manually changing passwords, while retaining standard Laravel security controls.

### 4. Useful task-management dashboard
Removed old leave-management dashboard assumptions and replaced them with real task/project information:
- Project count
- Active project count
- Open tasks
- In-progress tasks
- Review tasks
- Completed tasks
- Tasks due in the next 7 days
- Overdue tasks
- Employee and department totals for admins
- Visual task-progress breakdown

Employee dashboard numbers are scoped to the signed-in employee.

**Benefit:** the first screen now answers “what needs attention?” instead of showing unrelated HR/leave data.

### 5. Safer role-based data access
- Admins can see organization-wide projects/tasks.
- Employees only receive tasks assigned to their employee record.
- Employees only receive projects that contain tasks assigned to them.
- Project/task detail endpoints enforce the same visibility rules.
- Employees can update the status of their own tasks, but cannot reassign tasks or change admin-controlled task fields.
- Task/project creation and deletion remain admin-only.
- Public self-registration was removed from the API route list; employee accounts continue to be provisioned through the admin employee workflow.

**Benefit:** frontend hiding is no longer the only protection. Authorization is enforced by the API itself.

### 6. Better task and project workflows
Admin task screen now includes:
- Search
- Status filtering
- Priority filtering
- Assignee/project context
- Deadline and overdue visibility
- Edit/delete actions

Admin project screen now includes:
- Search
- Status filtering
- Priority filtering
- Department context
- Task counts
- Project timeline
- Edit/delete actions

Employee task screen now focuses on the action employees actually need: updating progress/status without exposing assignment controls.

**Benefit:** fewer clicks and less visual noise for everyday work.

### 7. Cleaner employee profile
The previous profile page tried to validate employee code, department and designation while the backend profile endpoint only updated account details. It has been replaced with a focused profile screen for:
- Name
- Email
- Optional password change

**Benefit:** the page now matches what the API actually updates and no longer blocks profile saving because of unrelated fields.

### 8. Backend correctness fixes
- Removed stale Leave/LeaveBalance references from the active task-management models/routes/dashboard.
- Removed a route referencing a missing `LeaveController`.
- Corrected employee update fields from `department` / `designation` to `department_id` / `designation_id`.
- Corrected employee password updates so the password belongs to `users`, not `employees`.
- Replaced PostgreSQL-only `ilike` use in employee searching with portable `like` behavior.
- Added request validation for task/project statuses, priorities, relationships and dates.
- Added pagination limit protection.
- Added useful task/project Eloquent relationships and date casts.

**Benefit:** fewer runtime errors and more predictable database/API behavior.

### 9. Migration resilience
The supplied project had two `create_projects_table` migrations and a migration order where `employees` could reference `users` before a users migration existed in a clean install.

Changes:
- Added an early `0001_01_01_000000_create_users_table.php` migration.
- Made the later users migration safely upgrade an existing users table by adding `role` if needed.
- Made the second projects migration upgrade an existing projects table rather than blindly trying to create it again.

**Benefit:** both older project databases and clean installations have a much safer migration path.

## Running the project

### Backend

```bash
cd backend
composer install
php artisan migrate
php artisan serve
```

Set at minimum in `backend/.env`:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## Forgot-password email setup

The supplied backend currently uses:

```env
MAIL_MAILER=log
```

That is good for development. Laravel will write the reset email/link to the backend log instead of sending a real email.

To send real emails in production, configure your SMTP/email provider. Example shape:

```env
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@yourdomain.com
MAIL_FROM_NAME="FlowTask"
FRONTEND_URL=https://tasks.yourdomain.com
```

Then clear cached configuration after changing production environment values:

```bash
php artisan optimize:clear
```

## Validation completed in this workspace
- All PHP files in `app`, `routes`, and `database/migrations` passed `php -l` syntax validation.
- All 52 TypeScript/TSX source files were parsed with the TypeScript compiler parser with no syntax errors.
- All local `@/…` TypeScript import paths were checked and resolve to project files.

### Environment limitation
A complete `npm ci` / Next.js production build could not be run in this sandbox because dependency installation repeatedly timed out. Composer is not installed in this sandbox, so Laravel's full test runner/artisan migration execution could not be run here. The source-level checks above were completed successfully; run the normal install/build commands on your development machine before deployment.

## v5 collaboration and filtering update

- Team members can now create tasks inside projects they belong to.
- Team members can assign a new task to themselves or to any other member of that same project.
- Admins and managers retain organization-wide task assignment capability.
- Task creation is now protected server-side with project membership and assignee validation; this is not only a frontend UI restriction.
- The task composer now shows only projects where the current team member can create work and only valid assignees for the selected project, with a quick **Assign to me** action.
- Project members can create tasks directly from their project workspace and eligible members can create subtasks.
- Salary has been removed from Add Employee, Edit Employee, frontend employee request types, and backend create/update handling. Existing database salary values are hidden from API serialization rather than destructively deleting historical data.
- Task filters/search now refresh only the task result area. Workspace/project/member metadata loads separately and is not reloaded on every filter change.
- Project and Employee searches keep the page shell and existing results visible while updated results load. Designation search follows the same non-blocking pattern.
- Search input is debounced to avoid unnecessary API traffic and stale request results are ignored on the main task/employee/project result screens.
