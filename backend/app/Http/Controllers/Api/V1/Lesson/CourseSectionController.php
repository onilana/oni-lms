<?php

namespace App\Http\Controllers\Api\V1\Lesson;

use App\Http\Requests\Lesson\CourseSectionRequest;
use App\Http\Resources\Lesson\CourseSectionResource;
use App\Models\Course;
use App\Models\CourseSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseSectionController
{
    public function index(Request $request, Course $course): JsonResponse
    {
        $sections = CourseSection::where('course_id', $course->id)
            ->with(['lessons'])
            ->orderBy('order_index')
            ->get();

        return response()->json([
            'sections' => CourseSectionResource::collection($sections),
        ]);
    }

    public function store(CourseSectionRequest $request, Course $course): JsonResponse
    {
        $data = $request->validated();
        $data['course_id'] = $course->id;

        $section = CourseSection::create($data);
        $section->load('lessons');

        return response()->json([
            'message' => 'Section created successfully.',
            'section' => new CourseSectionResource($section),
        ], 201);
    }

    public function show(Course $course, CourseSection $section): JsonResponse
    {
        $section->load('lessons');

        return response()->json([
            'section' => new CourseSectionResource($section),
        ]);
    }

    public function update(CourseSectionRequest $request, Course $course, CourseSection $section): JsonResponse
    {
        $section->update($request->validated());
        $section->load('lessons');

        return response()->json([
            'message' => 'Section updated successfully.',
            'section' => new CourseSectionResource($section),
        ]);
    }

    public function destroy(Course $course, CourseSection $section): JsonResponse
    {
        $section->delete();

        return response()->json([
            'message' => 'Section deleted successfully.',
        ]);
    }
}
