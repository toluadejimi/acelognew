<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE account_logs MODIFY login TEXT NOT NULL');
            DB::statement('ALTER TABLE account_logs MODIFY password TEXT NOT NULL');
        } elseif ($driver === 'sqlite') {
            // SQLite: recreate if needed; skip for minimal sqlite dev
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE account_logs MODIFY login VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE account_logs MODIFY password VARCHAR(255) NOT NULL');
        }
    }
};
