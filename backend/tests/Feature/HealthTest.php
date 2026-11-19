<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_json_structure(): void
    {
        $response = $this->getJson('/api/v1/health');

        // Health endpoint returns 200 if dependencies are ok, or 503 if db/redis not running
        $this->assertContains($response->status(), [200, 503]);
        $response->assertJsonStructure([
            'success',
            'service',
            'checks' => [
                'application',
                'database',
                'redis',
            ],
        ]);
        $this->assertSame('oni-lms-api', $response->json('service'));
        $this->assertSame('ok', $response->json('checks.application'));
    }
}
