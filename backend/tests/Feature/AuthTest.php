<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndPermissionSeeder::class);
    }

    public function test_user_can_login_with_valid_credentials_and_receives_token(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@educare.edu',
            'password' => 'Educare@2026',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'token_type',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'status',
                    'roles',
                    'permissions',
                ],
            ]);

        $this->assertNotEmpty($response->json('token'));
        $this->assertSame('Bearer', $response->json('token_type'));
        $this->assertSame('admin@educare.edu', $response->json('user.email'));
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@educare.edu',
            'password' => 'WrongPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $inactive = User::factory()->create([
            'email' => 'inactive@educare.edu',
            'password' => Hash::make('Secret123!'),
            'status' => 'inactive',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@educare.edu',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Your account is currently inactive. Please contact the administrator.',
            ]);
    }

    public function test_authenticated_user_can_retrieve_profile_via_me(): void
    {
        $user = User::where('email', 'admin@educare.edu')->first();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'admin@educare.edu');
    }

    public function test_user_can_logout_and_token_is_revoked(): void
    {
        $user = User::where('email', 'admin@educare.edu')->first();
        $token = $user->createToken('test')->plainTextToken;

        $logoutResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson(['message' => 'Successfully logged out.']);

        // Reset cached guard state between requests in the test runner
        $this->app['auth']->forgetGuards();

        // Subsequent call with the same token must fail
        $meResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me');

        $meResponse->assertStatus(401);
    }

    public function test_super_admin_can_access_roles_endpoint(): void
    {
        $admin = User::where('email', 'admin@educare.edu')->first();
        $token = $admin->createToken('admin')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/roles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'roles' => [
                    '*' => ['id', 'name', 'label'],
                ],
            ]);
    }

    public function test_student_is_forbidden_from_roles_endpoint(): void
    {
        $studentRole = Role::where('name', Role::STUDENT)->first();

        $student = User::create([
            'name' => 'Alice Student',
            'email' => 'alice@student.educare.edu',
            'password' => Hash::make('StudentPass123!'),
            'status' => 'active',
        ]);
        $student->roles()->attach($studentRole->id);

        $token = $student->createToken('student')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/roles');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden: insufficient role privileges.']);
    }

    public function test_user_can_change_password(): void
    {
        $user = User::where('email', 'admin@educare.edu')->first();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'Educare@2026',
                'new_password' => 'NewSecurePassword2026!',
                'new_password_confirmation' => 'NewSecurePassword2026!',
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password updated successfully.']);

        $this->assertTrue(Hash::check('NewSecurePassword2026!', $user->fresh()->password));
    }

    public function test_stateful_spa_cookie_login_and_logout(): void
    {
        $this->withHeader('Referer', 'http://localhost:5173')
            ->getJson('/sanctum/csrf-cookie')
            ->assertStatus(204);

        $loginResponse = $this->withHeader('Referer', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [
                'email' => 'admin@educare.edu',
                'password' => 'Educare@2026',
                'device_name' => 'browser',
            ]);

        $loginResponse->assertStatus(200)
            ->assertJsonPath('user.email', 'admin@educare.edu');

        $this->withHeader('Referer', 'http://localhost:5173')
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('user.email', 'admin@educare.edu');

        $this->withHeader('Referer', 'http://localhost:5173')
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJson(['message' => 'Successfully logged out.']);
    }

    public function test_must_change_password_is_flagged_on_login_and_cleared_on_password_change(): void
    {
        $user = User::where('email', 'admin@educare.edu')->first();
        $user->forceFill(['must_change_password' => true])->save();

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@educare.edu',
            'password' => 'Educare@2026',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonPath('must_change_password', true)
            ->assertJsonPath('user.must_change_password', true);

        $token = $loginResponse->json('token');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/change-password', [
                'current_password' => 'Educare@2026',
                'new_password' => 'RotatedAdmin@2026!',
                'new_password_confirmation' => 'RotatedAdmin@2026!',
            ])
            ->assertStatus(200);

        $this->assertFalse((bool) $user->fresh()->must_change_password);
    }

    public function test_super_admin_can_login_with_username_admin(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin',
            'password' => 'Educare@2026',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'admin@educare.edu')
            ->assertJsonPath('user.username', 'admin');
    }

    public function test_regular_users_can_login_with_either_username_or_email(): void
    {
        $admin = User::where('email', 'admin@educare.edu')->first();

        $createRes = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/users', [
                'name' => 'Riya Sen',
                'email' => 'riya.sen@educare.edu',
                'password' => 'Student@2026!',
                'role' => 'student',
                'student_id_number' => 'STU-2026-777',
            ])
            ->assertStatus(201);

        $generatedUsername = $createRes->json('data.username');
        $this->assertNotEmpty($generatedUsername);

        $this->app['auth']->forgetGuards();

        // Login with username
        $this->postJson('/api/v1/auth/login', [
            'email' => $generatedUsername,
            'password' => 'Student@2026!',
        ])->assertStatus(200)->assertJsonPath('user.email', 'riya.sen@educare.edu');

        // Login with email
        $this->postJson('/api/v1/auth/login', [
            'email' => 'riya.sen@educare.edu',
            'password' => 'Student@2026!',
        ])->assertStatus(200)->assertJsonPath('user.username', $generatedUsername);
    }
}
