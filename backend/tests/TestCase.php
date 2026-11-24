<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();

        // Force SQLite in-memory before any trait (e.g. RefreshDatabase) can execute
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Safety verification: Ensure test environment is 100% running in sqlite :memory:
        $currentConn = config('database.default');
        $currentDb = config("database.connections.{$currentConn}.database");

        if ($currentConn !== 'sqlite' || $currentDb !== ':memory:') {
            throw new \RuntimeException(
                "CRITICAL SAFETY ABORT: Tests attempted to run against [{$currentConn}: {$currentDb}]! " .
                "All test executions MUST run exclusively in SQLite :memory: to prevent wiping the main application database."
            );
        }
    }
}
