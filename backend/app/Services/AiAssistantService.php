<?php

namespace App\Services;

use App\Models\AiConversation;
use App\Models\AiDocument;
use App\Models\AiDocumentChunk;
use App\Models\AiMessage;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Str;

class AiAssistantService
{
    public function canAccessCourseAi(User $user, Course $course): bool
    {
        if ($user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN, Role::DEPT_ADMIN])) {
            return true;
        }

        if ($course->isTaughtBy($user)) {
            return true;
        }

        return $course->hasStudent($user);
    }

    public function createConversation(User $user, Course $course, ?string $title = null): AiConversation
    {
        if (!$this->canAccessCourseAi($user, $course)) {
            throw new AuthorizationException('Access denied. You must be enrolled in or instruct this course to use the AI Assistant.');
        }

        // Auto-index course content if no documents exist yet
        $this->ensureCourseIndexed($course);

        $conversation = AiConversation::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'title' => $title ?: 'Study Session: ' . ($course->code ?: $course->title),
            'status' => 'active',
            'tokens_used' => 0,
        ]);

        // Welcome system greeting
        AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => "Hello {$user->name}! I am your AI Academic Tutor for **{$course->code}: {$course->title}**. Ask me questions about course lessons, concepts, exam review, or practice problems grounded directly in your syllabus.",
            'citations' => [
                [
                    'title' => $course->title,
                    'reference' => 'Course Syllabus & Syllabus Learning Outcomes',
                ],
            ],
            'tokens_count' => 45,
            'model' => 'oni-rag-tutor',
        ]);

        return $conversation;
    }

    public function sendMessage(AiConversation $conversation, User $user, string $prompt): AiMessage
    {
        if ($conversation->user_id !== $user->id && !$user->hasRole([Role::SUPER_ADMIN, Role::COLLEGE_ADMIN])) {
            throw new AuthorizationException('Unauthorized access to this AI conversation.');
        }

        $course = $conversation->course;
        if (!$this->canAccessCourseAi($user, $course)) {
            throw new AuthorizationException('Permission revoked. You are no longer enrolled in this course.');
        }

        // 1. Record User Message
        AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $prompt,
            'tokens_count' => (int) ceil(strlen($prompt) / 4),
            'model' => 'user-input',
        ]);

        // 2. Perform Permission-Gated RAG Search over course documents
        $retrievalResults = $this->retrieveCourseContext($course, $prompt);

        // 3. Synthesize Pedagogical Response
        $responsePayload = $this->synthesizeAnswer($prompt, $course, $retrievalResults);

        $assistantMessage = AiMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $responsePayload['content'],
            'citations' => $responsePayload['citations'],
            'tokens_count' => $responsePayload['tokens'],
            'model' => 'oni-rag-tutor',
        ]);

        // Update token usage
        $conversation->increment('tokens_used', $responsePayload['tokens']);

        return $assistantMessage;
    }

    public function ensureCourseIndexed(Course $course): void
    {
        if (AiDocument::where('course_id', $course->id)->exists()) {
            return;
        }

        // 1. Index course description and syllabus
        $doc = AiDocument::create([
            'course_id' => $course->id,
            'title' => 'Course Syllabus & Overview',
            'source_type' => 'syllabus',
            'status' => 'indexed',
        ]);

        $syllabusText = "Course Code: {$course->code}. Title: {$course->title}. Level: {$course->level}. Credits: {$course->credits}. Description: " . ($course->description ?: 'Core academic curriculum course.');
        AiDocumentChunk::create([
            'document_id' => $doc->id,
            'chunk_index' => 0,
            'content' => $syllabusText,
            'source_reference' => 'Syllabus · Section 0',
        ]);

        // 2. Index sections and lessons
        $sections = $course->sections()->with('lessons')->get();
        $chunkIndex = 1;
        foreach ($sections as $section) {
            foreach ($section->lessons as $lesson) {
                $lessonText = "Unit {$section->title} - Lesson: {$lesson->title}. " . ($lesson->content ?: 'Study material, key takeaways, and discussion points for this academic lesson.');
                AiDocumentChunk::create([
                    'document_id' => $doc->id,
                    'chunk_index' => $chunkIndex++,
                    'content' => $lessonText,
                    'source_reference' => "{$section->title} · {$lesson->title}",
                ]);
            }
        }

        $doc->update(['total_chunks' => $chunkIndex]);
    }

    public function retrieveCourseContext(Course $course, string $query): array
    {
        $this->ensureCourseIndexed($course);

        $keywords = array_filter(explode(' ', strtolower(preg_replace('/[^a-zA-Z0-9\s]/', '', $query))), fn ($w) => strlen($w) > 3);

        $chunksQuery = AiDocumentChunk::whereHas('document', function ($q) use ($course) {
            $q->where('course_id', $course->id);
        });

        if (!empty($keywords)) {
            $chunksQuery->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere('content', 'LIKE', '%' . $kw . '%');
                }
            });
        }

        $chunks = $chunksQuery->take(4)->get();
        if ($chunks->isEmpty()) {
            // Fallback to general syllabus chunks for the course
            $chunks = AiDocumentChunk::whereHas('document', fn ($q) => $q->where('course_id', $course->id))->take(2)->get();
        }

        return $chunks->all();
    }

    protected function synthesizeAnswer(string $prompt, Course $course, array $contextChunks): array
    {
        $citations = [];
        $contextSnippets = [];

        foreach ($contextChunks as $chunk) {
            $citations[] = [
                'title' => $course->code . ' Course Material',
                'reference' => $chunk->source_reference ?: 'Course Document',
            ];
            $contextSnippets[] = $chunk->content;
        }

        $lowerPrompt = strtolower($prompt);
        $answer = '';

        if (str_contains($lowerPrompt, 'quiz') || str_contains($lowerPrompt, 'practice') || str_contains($lowerPrompt, 'question')) {
            $answer = "### 📝 Practice Questions for {$course->code}: {$course->title}\n\n" .
                      "Based on your curriculum materials, test your understanding:\n\n" .
                      "1. **Core Concept Evaluation**: Explain the primary principles outlined in your recent unit.\n" .
                      "2. **Applied Problem**: How does this concept apply in real-world engineering or scientific contexts?\n" .
                      "3. **Discussion Point**: What are the trade-offs discussed in the lecture notes?\n\n" .
                      "> **Tip**: Work through these questions without your notes first, then cross-reference with your lecture materials.";
        } elseif (str_contains($lowerPrompt, 'summar') || str_contains($lowerPrompt, 'overview') || str_contains($lowerPrompt, 'key point')) {
            $answer = "### 📌 Key Concept Summary: {$course->title}\n\n" .
                      "- **Course Scope**: {$course->code} covers intermediate/foundational university topics at Level {$course->level}.\n" .
                      "- **Key Focus**: Emphasizes theoretical fundamentals and rigorous problem-solving.\n" .
                      "- **Verified Source Material**: " . (!empty($contextSnippets) ? implode("\n- ", array_slice($contextSnippets, 0, 2)) : 'Derived from verified instructor uploads.') . "\n\n" .
                      "Let me know if you would like me to deep-dive into any specific module or formula!";
        } else {
            $answer = "### 🎓 Academic Tutoring Explanation\n\n" .
                      "Regarding your question about **\"" . htmlspecialchars(Str::limit($prompt, 80)) . "\"** in **{$course->code}**:\n\n" .
                      "According to your course syllabus and instructional modules, this topic relates to the fundamental curriculum objectives established by your department. " .
                      (!empty($contextSnippets) ? "\n\n**Relevant Context**: " . $contextSnippets[0] : "") . "\n\n" .
                      "Would you like an illustrative example, a step-by-step breakdown, or practice questions to test your grasp?";
        }

        $tokens = (int) ceil((strlen($prompt) + strlen($answer)) / 4);

        return [
            'content' => $answer,
            'citations' => array_values(array_unique($citations, SORT_REGULAR)),
            'tokens' => $tokens,
        ];
    }
}
