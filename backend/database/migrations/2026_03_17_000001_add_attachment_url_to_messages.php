<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('messages', 'attachment_url')) {
            return;
        }
        Schema::table('messages', function (Blueprint $table) {
            $table->string('attachment_url', 500)->nullable()->after('content');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('messages', 'attachment_url')) {
            return;
        }
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('attachment_url');
        });
    }
};
