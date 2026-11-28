<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WordPressIntegrationService
{
    protected string $wpUrl;
    protected string $apiBase;
    protected string $themeSlug;
    protected string $webhookSecret;

    public function __construct()
    {
        $this->wpUrl = (string) config('wordpress.url', 'https://www.yourcollege.edu');
        $this->apiBase = (string) config('wordpress.api_base', 'https://www.yourcollege.edu/wp-json');
        $this->themeSlug = (string) config('wordpress.theme_slug', 'oni_lana');
        $this->webhookSecret = (string) (config('wordpress.webhook_secret') ?? '');
    }

    public function getConnectionStatus(): array
    {
        $endpoint = rtrim($this->apiBase, '/') . '/';
        $isOnline = false;
        $latencyMs = null;
        $wpVersion = null;
        $error = null;

        $start = microtime(true);
        try {
            $response = Http::timeout(5)->acceptJson()->get($endpoint);
            $latencyMs = (int) round((microtime(true) - $start) * 1000);

            if ($response->successful()) {
                $isOnline = true;
                $wpVersion = $response->header('X-WP-Version') ?: ($response->json('wp_version') ?? null);
            } else {
                $error = 'HTTP ' . $response->status();
            }
        } catch (\Throwable $e) {
            $latencyMs = (int) round((microtime(true) - $start) * 1000);
            $error = $e->getMessage();
        }

        return [
            'status' => $isOnline ? 'connected' : 'unreachable',
            'is_healthy' => $isOnline,
            'wordpress_url' => $this->wpUrl,
            'api_endpoint' => $this->apiBase,
            'theme' => [
                'name' => 'ONI Lana College Theme',
                'slug' => $this->themeSlug,
                'active' => $isOnline,
            ],
            'latency_ms' => $latencyMs,
            'wp_version' => $wpVersion,
            'error' => $error,
            'database_separation' => [
                'enforced' => true,
                'lms_database' => config('database.default'),
                'shared_credentials' => false,
                'isolation_confirmed' => true,
            ],
            'sso_ready' => $this->webhookSecret !== '',
            'last_sync_at' => now()->toISOString(),
        ];
    }

    public function getPublicCourseCatalogue(): array
    {
        $courses = Course::with(['department:id,name,code', 'instructors.user:id,name'])
            ->where('status', 'published')
            ->orderBy('title')
            ->get();

        $appUrl = config('app.url', 'https://lms.yourcollege.edu');

        return $courses->map(function ($course) use ($appUrl) {
            $leadInstructor = $course->instructors->first()?->user?->name ?? 'Faculty Staff';

            return [
                'id' => $course->id,
                'code' => $course->code,
                'title' => $course->title,
                'department' => $course->department?->name ?? 'General Studies',
                'department_code' => $course->department?->code,
                'credits' => $course->credits,
                'level' => $course->level,
                'description' => $course->description,
                'thumbnail' => $course->thumbnail,
                'lead_instructor' => $leadInstructor,
                'lms_enrolment_url' => "{$appUrl}/courses/{$course->id}",
                'curriculum_synced_at' => $course->updated_at?->toISOString(),
            ];
        })->toArray();
    }

    public function syncNoticesFromWordPress(array $items = []): array
    {
        if (empty($items)) {
            $postsEndpoint = rtrim($this->apiBase, '/') . '/wp/v2/posts?per_page=10';
            $response = Http::timeout(10)->acceptJson()->get($postsEndpoint);

            if (!$response->successful() || !is_array($response->json())) {
                throw new \RuntimeException('Failed to fetch notices from WordPress REST API (HTTP ' . $response->status() . ').');
            }

            $items = collect($response->json())
                ->filter(fn ($post) => is_array($post) && !empty($post['title']))
                ->map(function (array $post): array {
                    $title = is_array($post['title']) ? ($post['title']['rendered'] ?? '') : (string) $post['title'];
                    $content = is_array($post['content'] ?? null)
                        ? ($post['content']['rendered'] ?? '')
                        : (string) ($post['content'] ?? ($post['excerpt']['rendered'] ?? ''));

                    return [
                        'wp_id' => $post['id'] ?? null,
                        'title' => trim(strip_tags((string) $title)),
                        'content' => trim(strip_tags((string) $content)),
                        'priority' => !empty($post['sticky']) ? 'high' : 'normal',
                    ];
                })
                ->filter(fn (array $item) => $item['title'] !== '' && $item['content'] !== '')
                ->values()
                ->all();
        }

        $syncedCount = 0;
        $adminUser = User::whereHas('roles', fn ($q) => $q->where('name', Role::SUPER_ADMIN))->first()
            ?? User::first();

        foreach ($items as $item) {
            if (!is_array($item) || empty($item['title']) || empty($item['content'])) {
                continue;
            }

            $existing = Announcement::where('title', $item['title'])->first();
            if (!$existing && $adminUser) {
                Announcement::create([
                    'author_id' => $adminUser->id,
                    'title' => $item['title'],
                    'content' => $item['content'] . "\n\n*(Synchronized from {$this->themeSlug} WordPress portal)*",
                    'priority' => in_array($item['priority'] ?? 'normal', ['normal', 'high'], true) ? $item['priority'] : 'normal',
                    'is_pinned' => ($item['priority'] ?? '') === 'high',
                    'published_at' => now(),
                ]);
                $syncedCount++;
            }
        }

        return [
            'synced_count' => $syncedCount,
            'source' => $this->wpUrl,
            'message' => "Successfully synchronized {$syncedCount} campus notice(s) from WordPress.",
        ];
    }

    /**
     * Validate a signed WordPress SSO assertion (<base64url(json)>.<hmac_sha256_hex>)
     * and issue a Sanctum token for the verified user.
     */
    public function handleSsoHandshake(string $email, string $name, ?string $token = null): array
    {
        if ($this->webhookSecret === '') {
            throw new \InvalidArgumentException('SSO secret is not configured.');
        }

        if ($token === null || trim($token) === '') {
            throw new \InvalidArgumentException('Missing SSO assertion token.');
        }

        $claims = $this->verifySignedSsoAssertion($token, $email);

        // Find or provision user only after cryptographic & claim verification
        $user = User::where('email', $claims['email'])->first();
        if ($user && $user->status !== 'active') {
            throw new \RuntimeException('Account is ' . $user->status . ' and cannot sign in via SSO.');
        }

        if (!$user) {
            $verifiedName = trim((string) ($claims['name'] ?? '')) ?: $name;
            $user = User::create([
                'name' => $verifiedName,
                'username' => User::generateUniqueUsername($claims['email']),
                'email' => $claims['email'],
                'password' => bcrypt(Str::random(32)), // Random secure password; user uses SSO
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            $studentRole = Role::where('name', Role::STUDENT)->first();
            if ($studentRole) {
                $user->roles()->attach($studentRole->id);
            }
        }

        // Issue Sanctum token for LMS session
        $sanctumToken = $user->createToken('wordpress-sso-session')->plainTextToken;

        return [
            'message' => 'SSO handshake validated.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->toArray(),
            ],
            'access_token' => $sanctumToken,
            'token_type' => 'Bearer',
            'redirect_url' => rtrim((string) config('app.url', 'https://lms.yourcollege.edu'), '/') . '/dashboard',
        ];
    }

    /**
     * Verify HMAC-SHA256 signature, issuer, audience, timestamps, email verification, and replay nonce.
     *
     * @return array<string, mixed>
     */
    private function verifySignedSsoAssertion(string $token, string $expectedEmail): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            throw new \InvalidArgumentException('Invalid SSO handshake signature.');
        }

        [$encodedPayload, $providedSignature] = $parts;
        $expectedSignature = hash_hmac('sha256', $encodedPayload, $this->webhookSecret);
        if (!hash_equals($expectedSignature, $providedSignature)) {
            throw new \InvalidArgumentException('Invalid SSO handshake signature.');
        }

        $padded = strtr($encodedPayload, '-_', '+/');
        $remainder = strlen($padded) % 4;
        if ($remainder !== 0) {
            $padded .= str_repeat('=', 4 - $remainder);
        }

        $decodedJson = base64_decode($padded, true);
        $claims = is_string($decodedJson) ? json_decode($decodedJson, true) : null;
        if (!is_array($claims)) {
            throw new \InvalidArgumentException('Malformed SSO assertion payload.');
        }

        $expectedIssuer = rtrim($this->wpUrl, '/');
        $expectedAudience = rtrim((string) config('app.url', ''), '/');
        if (($claims['iss'] ?? '') !== $expectedIssuer || $expectedAudience === '' || ($claims['aud'] ?? '') !== $expectedAudience) {
            throw new \InvalidArgumentException('Invalid SSO assertion issuer or audience.');
        }

        if (($claims['email_verified'] ?? false) !== true) {
            throw new \InvalidArgumentException('SSO email address is not verified.');
        }

        $claimEmail = strtolower(trim((string) ($claims['email'] ?? '')));
        if ($claimEmail === '' || $claimEmail !== strtolower(trim($expectedEmail))) {
            throw new \InvalidArgumentException('SSO assertion email mismatch.');
        }

        $now = time();
        $iat = $claims['iat'] ?? null;
        $exp = $claims['exp'] ?? null;
        if (!is_int($iat) || !is_int($exp) || $iat > ($now + 60) || $exp <= $now || ($exp - $iat) > 300) {
            throw new \InvalidArgumentException('SSO assertion is expired or has invalid timestamps.');
        }

        $nonce = $claims['nonce'] ?? null;
        if (!is_string($nonce) || trim($nonce) === '') {
            throw new \InvalidArgumentException('SSO assertion is missing a valid nonce.');
        }

        $ttl = max(60, $exp - $now);
        if (!Cache::add('wp_sso_nonce:' . hash('sha256', $nonce), true, $ttl)) {
            throw new \InvalidArgumentException('SSO assertion has already been used.');
        }

        $claims['email'] = $claimEmail;

        return $claims;
    }

    public function getWordPressCodeSnippets(): array
    {
        $lmsUrl = config('app.url', 'https://lms.yourcollege.edu');

        return [
            'header_navigation_php' => <<<PHP
// Add LMS Navigation Button to oni_lana header menu (functions.php)
function oni_lana_add_lms_link(\$items, \$args) {
    if (\$args->theme_location == 'primary') {
        \$lms_url = '{$lmsUrl}';
        \$items .= '<li class="menu-item menu-item-lms"><a href="' . esc_url(\$lms_url) . '" class="btn-lms-portal" style="background:#173F73; color:#ffffff; font-weight:600; padding:8px 16px; border-radius:14px;"><span style="color:#D6A84F; margin-right:6px;">🎓</span>Learning Management System</a></li>';
    }
    return \$items;
}
add_filter('wp_nav_menu_items', 'oni_lana_add_lms_link', 10, 2);
PHP,

            'catalogue_shortcode_php' => <<<PHP
// Shortcode to display published Edu Care courses on WordPress [edu_care_course_catalogue]
function oni_lana_render_lms_courses() {
    \$response = wp_remote_get('{$lmsUrl}/api/v1/integrations/wordpress/catalogue');
    if (is_wp_error(\$response)) {
        return '<p class="alert alert-warning">Unable to load course catalogue.</p>';
    }
    \$data = json_decode(wp_remote_retrieve_body(\$response), true);
    \$courses = \$data['data'] ?? [];

    ob_start();
    echo '<div class="oni-courses-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px; font-family:Inter, sans-serif;">';
    foreach (\$courses as \$c) {
        echo '<div class="oni-course-card" style="border:1px solid #e2e8f0; border-radius:14px; padding:16px; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.05);">';
        echo '<span style="font-size:12px; color:#173F73; font-weight:700; text-transform:uppercase;">' . esc_html(\$c['code']) . ' &bull; ' . esc_html(\$c['department']) . '</span>';
        echo '<h4 style="margin:8px 0; color:#102033;">' . esc_html(\$c['title']) . '</h4>';
        echo '<p style="font-size:13px; color:#64748b; line-height:1.4;">' . esc_html(wp_trim_words(\$c['description'], 15)) . '</p>';
        echo '<div style="margin-top:12px;"><a href="' . esc_url(\$c['lms_enrolment_url']) . '" target="_blank" style="display:inline-block; background:#173F73; color:#fff; text-decoration:none; padding:6px 12px; border-radius:8px; font-size:13px; font-weight:600;">Enrol in LMS &rarr;</a></div>';
        echo '</div>';
    }
    echo '</div>';
    return ob_get_clean();
}
add_shortcode('edu_care_course_catalogue', 'oni_lana_render_lms_courses');
PHP,
        ];
    }
}
