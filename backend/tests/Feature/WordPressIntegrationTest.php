<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\Course;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WordPressIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $student;
    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@educare.edu')->first();
        $this->student = User::where('email', 'student@educare.edu')->first();

        $dept = Department::create([
            'code' => 'CS',
            'name' => 'Computer Science & Engineering',
            'is_active' => true,
        ]);

        $prog = Programme::create([
            'department_id' => $dept->id,
            'code' => 'BTECH-CS',
            'name' => 'B.Tech Computer Science',
            'degree_type' => 'undergraduate',
            'duration_semesters' => 8,
            'is_active' => true,
        ]);

        $this->course = Course::create([
            'department_id' => $dept->id,
            'programme_id' => $prog->id,
            'code' => 'CS101',
            'title' => 'Introduction to Computing',
            'description' => 'Fundamental algorithms, data structures, and computer architecture.',
            'credits' => 4,
            'level' => 'introductory',
            'status' => 'published',
        ]);
    }

    public function test_public_can_fetch_course_catalogue_for_wordpress_embedding(): void
    {
        $response = $this->getJson('/api/v1/integrations/wordpress/catalogue');

        $response->assertStatus(200)
            ->assertJsonPath('source', 'Edu Care Learning Management System')
            ->assertJsonPath('count', 1)
            ->assertJsonPath('data.0.code', 'CS101')
            ->assertJsonPath('data.0.title', 'Introduction to Computing');
    }

    public function test_admin_can_view_wordpress_integration_status(): void
    {
        Http::fake([
            '*' => Http::response(['name' => 'College WordPress'], 200, ['X-WP-Version' => '6.7']),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/integrations/wordpress/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'connected')
            ->assertJsonPath('data.is_healthy', true)
            ->assertJsonPath('data.theme.slug', 'oni_lana')
            ->assertJsonPath('data.database_separation.enforced', true)
            ->assertJsonPath('data.database_separation.shared_credentials', false);
    }

    public function test_wordpress_status_reports_unreachable_when_api_fails(): void
    {
        Http::fake([
            '*' => Http::response([], 503),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/integrations/wordpress/status');

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'unreachable')
            ->assertJsonPath('data.is_healthy', false);
    }

    public function test_student_cannot_view_wordpress_integration_status(): void
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/integrations/wordpress/status');

        $response->assertStatus(403);
    }

    public function test_admin_can_sync_notices_from_wordpress(): void
    {
        $payload = [
            'notices' => [
                [
                    'wp_id' => 999,
                    'title' => 'Campus Library Extended Hours',
                    'content' => 'The library will remain open 24/7 during final exam revision week.',
                    'priority' => 'high',
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/integrations/wordpress/sync-notices', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.synced_count', 1);

        $this->assertDatabaseHas('announcements', [
            'title' => 'Campus Library Extended Hours',
            'priority' => 'high',
        ]);
    }

    private function makeSignedSsoToken(array $overrides = [], string $secret = 'test-wp-sso-secret-key'): string
    {
        $now = time();
        $claims = array_merge([
            'iss' => rtrim((string) config('wordpress.url'), '/'),
            'aud' => rtrim((string) config('app.url'), '/'),
            'email' => 'alex.turner@oni-test.edu',
            'email_verified' => true,
            'iat' => $now,
            'exp' => $now + 120,
            'nonce' => bin2hex(random_bytes(16)),
        ], $overrides);

        $encodedPayload = rtrim(strtr(base64_encode(json_encode($claims)), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $encodedPayload, $secret);

        return "{$encodedPayload}.{$signature}";
    }

    public function test_sso_handshake_authenticates_student_and_issues_token(): void
    {
        config(['wordpress.webhook_secret' => 'test-wp-sso-secret-key']);
        $token = $this->makeSignedSsoToken();

        $response = $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'alex.turner@oni-test.edu',
            'name' => 'Alex Turner',
            'token' => $token,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'SSO handshake validated.')
            ->assertJsonPath('user.email', 'alex.turner@oni-test.edu')
            ->assertJsonStructure(['access_token', 'token_type', 'redirect_url']);

        $this->assertDatabaseHas('users', [
            'email' => 'alex.turner@oni-test.edu',
            'name' => 'Alex Turner',
        ]);
    }

    public function test_sso_handshake_with_missing_or_prefix_token_is_rejected(): void
    {
        config(['wordpress.webhook_secret' => 'test-wp-sso-secret-key']);

        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'admin@educare.edu',
            'name' => 'Admin',
        ])->assertStatus(422);

        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'admin@educare.edu',
            'name' => 'Admin',
            'token' => 'wp-sso-forged-token',
        ])->assertStatus(401);
    }

    public function test_sso_handshake_with_invalid_token_is_rejected(): void
    {
        config(['wordpress.webhook_secret' => 'test-wp-sso-secret-key']);

        $response = $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'intruder@unknown.com',
            'name' => 'Intruder',
            'token' => 'invalid-tampered-token',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Invalid SSO handshake signature.');
    }

    public function test_sso_handshake_rejects_expired_unverified_and_replayed_assertions(): void
    {
        config(['wordpress.webhook_secret' => 'test-wp-sso-secret-key']);

        $expiredToken = $this->makeSignedSsoToken([
            'iat' => time() - 300,
            'exp' => time() - 60,
        ]);
        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'alex.turner@oni-test.edu',
            'name' => 'Alex Turner',
            'token' => $expiredToken,
        ])->assertStatus(401);

        $unverifiedToken = $this->makeSignedSsoToken([
            'email_verified' => false,
        ]);
        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'alex.turner@oni-test.edu',
            'name' => 'Alex Turner',
            'token' => $unverifiedToken,
        ])->assertStatus(401);

        $replayToken = $this->makeSignedSsoToken();
        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'alex.turner@oni-test.edu',
            'name' => 'Alex Turner',
            'token' => $replayToken,
        ])->assertStatus(200);

        $this->postJson('/api/v1/integrations/wordpress/sso-handshake', [
            'email' => 'alex.turner@oni-test.edu',
            'name' => 'Alex Turner',
            'token' => $replayToken,
        ])->assertStatus(401);
    }

    public function test_admin_can_retrieve_wordpress_code_snippets(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/integrations/wordpress/snippets');

        $response->assertStatus(200)
            ->assertJsonPath('theme_slug', 'oni_lana')
            ->assertJsonStructure([
                'theme_slug',
                'snippets' => [
                    'header_navigation_php',
                    'catalogue_shortcode_php',
                ],
            ]);
    }
}
