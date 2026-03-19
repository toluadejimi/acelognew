<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        $dbName = DB::connection()->getDatabaseName();

        // Only expand VARCHAR columns. If they're already TEXT/LongTEXT, keep them as-is.
        $loginMaxLen = DB::table('information_schema.columns')
            ->where('table_schema', $dbName)
            ->where('table_name', 'account_logs')
            ->where('column_name', 'login')
            ->value('CHARACTER_MAXIMUM_LENGTH');

        $passwordMaxLen = DB::table('information_schema.columns')
            ->where('table_schema', $dbName)
            ->where('table_name', 'account_logs')
            ->where('column_name', 'password')
            ->value('CHARACTER_MAXIMUM_LENGTH');

        $targetLen = 1000;

        if ($loginMaxLen !== null && (int) $loginMaxLen < $targetLen) {
            DB::statement("ALTER TABLE account_logs MODIFY login VARCHAR({$targetLen}) NOT NULL");
        }

        if ($passwordMaxLen !== null && (int) $passwordMaxLen < $targetLen) {
            DB::statement("ALTER TABLE account_logs MODIFY password VARCHAR({$targetLen}) NOT NULL");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        $dbName = DB::connection()->getDatabaseName();

        // Best-effort rollback; can truncate if your data currently exceeds 255.
        $loginMaxLen = DB::table('information_schema.columns')
            ->where('table_schema', $dbName)
            ->where('table_name', 'account_logs')
            ->where('column_name', 'login')
            ->value('CHARACTER_MAXIMUM_LENGTH');

        $passwordMaxLen = DB::table('information_schema.columns')
            ->where('table_schema', $dbName)
            ->where('table_name', 'account_logs')
            ->where('column_name', 'password')
            ->value('CHARACTER_MAXIMUM_LENGTH');

        if ($loginMaxLen !== null && (int) $loginMaxLen > 255) {
            DB::statement("ALTER TABLE account_logs MODIFY login VARCHAR(255) NOT NULL");
        }

        if ($passwordMaxLen !== null && (int) $passwordMaxLen > 255) {
            DB::statement("ALTER TABLE account_logs MODIFY password VARCHAR(255) NOT NULL");
        }
    }
};

