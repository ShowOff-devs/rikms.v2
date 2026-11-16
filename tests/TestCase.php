<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    /**
     * Refuse to run database-resetting test traits against a persistent database.
     */
    protected function setUpTraits()
    {
        $connection = config('database.default');
        $database = config("database.connections.{$connection}.database");
        $usesSqliteMemory = $connection === 'sqlite' && $database === ':memory:';
        $allowsIsolatedMysql = $connection === 'mysql'
            && filter_var(env('RIKMS_ALLOW_MYSQL_TESTS', false), FILTER_VALIDATE_BOOL)
            && preg_match('/(?:^|_)test(?:_|$)/i', (string) $database) === 1;

        if (! $this->app->environment('testing') || (! $usesSqliteMemory && ! $allowsIsolatedMysql)) {
            throw new \RuntimeException(sprintf(
                'Unsafe test database configuration: environment=%s, connection=%s, database=%s. Tests require sqlite :memory: or an explicitly enabled isolated MySQL database whose name contains test.',
                $this->app->environment(),
                (string) $connection,
                (string) $database,
            ));
        }

        return parent::setUpTraits();
    }

    protected function skipUnlessFortifyFeature(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
