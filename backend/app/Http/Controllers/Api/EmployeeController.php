<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Models\Designation;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
public function index(Request $request)
{
    $search = trim($request->input('search', ''));
    $departmentId = $request->input('department_id');
    $designationId = $request->input('designation_id');
    $perPage = $request->input('per_page', 10);

    $employees = Employee::with([
            'user:id,name,email',
            'department:id,name',
            'designation:id,name',
        ])
        ->when($search, function ($query) use ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('designation', function ($designationQuery) use ($search) {
                        $designationQuery->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('department', function ($departmentQuery) use ($search) {
                        $departmentQuery->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        })
        ->when($departmentId, function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })
        ->when($designationId, function ($query) use ($designationId) {
            $query->where('designation_id', $designationId);
        })
        ->latest()
        ->paginate($perPage);

    return response()->json($employees);
}
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:100'],
            'email'                 => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'employee_code'         => ['required', 'string', 'max:50', 'unique:employees,employee_code'],
            'phone'                 => ['nullable', 'string', 'max:20'],
            'designation_id'   => ['required', 'numeric', 'min:0'],
            'department_id'  => ['required', 'numeric', 'min:0'],
            'joining_date'          => ['nullable', 'date'],
            'address'               => ['nullable', 'string', 'max:500'],
            'role'                  => ['nullable', Rule::in(['employee','manager'])],
        ]);

        
        $employee = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name'     => $validated['name'],
                'email'    => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role'     => $validated['role'] ?? 'employee',
            ]);

            return Employee::create([
                'user_id'       => $user->id,
                'employee_code' => $validated['employee_code'],
                'phone'         => $validated['phone'] ?? null,
                'department_id'    => $validated['department_id'],
                'designation_id'   => $validated['designation_id'],
                'joining_date'  => $validated['joining_date'] ?? null,
                'address'       => $validated['address'] ?? null,
            ]);
        });

        return response()->json([
            'message'  => 'Employee created successfully',
            'employee' => $employee->load('user'),
        ], 201);
    }



    public function show($id)
{
    $employee = Employee::with('user')->findOrFail($id);

    return response()->json($employee);
}

public function update(Request $request, $id)
{
    $employee = Employee::with('user')->findOrFail($id);
    
    $formInputs = [
        'name' => ['required', 'string', 'max:100'],
        'email' => [
            'required',
            'email',
            'max:255',
            Rule::unique('users', 'email')->ignore($employee->user_id),
        ],
        'employee_code' => [
            'required',
            'string',
            'max:50',
            Rule::unique('employees', 'employee_code')->ignore($employee->id),
        ],
        'phone'        => ['nullable', 'string', 'max:20'],
        'designation_id'   => ['required', 'numeric', 'min:0'],
        'department_id'  => ['required', 'numeric', 'min:0'],
        'joining_date' => ['nullable', 'date'],
        'address'      => ['nullable', 'string', 'max:500'],
        'role'         => ['nullable', Rule::in(['employee','manager'])],
    ];
    if(!empty($request->password)){
        $formInputs['password'] = ['required', 'string', 'min:8', 'confirmed'];        
    }
    $validated = $request->validate($formInputs);

    DB::transaction(function () use ($validated, $employee) {
        $employee->user->update([
            'name'  => $validated['name'],
            'email' => $validated['email'],
            'role'  => $validated['role'] ?? $employee->user->role,
        ]);
        $employeeData = [
            'employee_code' => $validated['employee_code'],
            'phone'         => $validated['phone'] ?? null,
            'department_id' => $validated['department_id'],
            'designation_id' => $validated['designation_id'],
            'joining_date'  => $validated['joining_date'] ?? null,
            'address'       => $validated['address'] ?? null,
        ];

        $employee->update($employeeData);

        if (!empty($validated['password'])) {
            $employee->user->update(['password' => Hash::make($validated['password'])]);
        }
    });

    return response()->json([
        'message'  => 'Employee updated successfully',
        'employee' => $employee->fresh()->load('user'),
    ]);
}

public function destroy($id)
{
    $employee = Employee::with('user')->findOrFail($id);

    DB::transaction(function () use ($employee) {
        $user = $employee->user;

        $employee->delete();

        if ($user) {
            $user->delete();
        }
    });

    return response()->json([
        'message' => 'Employee deleted successfully',
    ]);
}


}
