<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Designation;
use Illuminate\Validation\Rule;

class DesignationController extends Controller
{
     public function index(Request $request)
    {
        $designations = Designation::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10);

        return response()->json($designations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:designations,name'],
        ]);

        $designation = Designation::create([
            'name' => trim($validated['name']),
        ]);

        return response()->json([
            'message' => 'Designation created successfully',
            'designation' => $designation,
        ], 201);
    }

    public function show($id)
    {
        $designation = Designation::findOrFail($id);

        return response()->json($designation);
    }

    public function update(Request $request, $id)
    {
        $designation = Designation::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('designations', 'name')->ignore($designation->id),
            ],
        ]);

        $designation->update([
            'name' => trim($validated['name']),
        ]);

        return response()->json([
            'message' => 'Designation updated successfully',
            'designation' => $designation,
        ]);
    }

    public function destroy($id)
    {
        $designation = Designation::findOrFail($id);

        $designation->delete();

        return response()->json([
            'message' => 'Designation deleted successfully',
        ]);
    }
}
