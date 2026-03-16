<?php

namespace App\Console\Commands;

use App\Models\Profile;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Wallet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ImportLegacyUsers extends Command
{
    protected $signature = 'users:import-legacy
                            {--table=users : Legacy table name}
                            {--chunk=1000 : How many rows to process per batch}
                            {--dry-run : Show what would be imported without writing}';

    protected $description = 'Import missing users from legacy DB into users, profiles, wallets, and user_roles (idempotent, chunked)';

    public function handle(): int
    {
        $table = $this->option('table');
        $chunkSize = (int) $this->option('chunk');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY RUN – no data will be written.');
        }

        if ($chunkSize < 100) {
            $chunkSize = 100;
        }

        try {
            $total = DB::connection('legacy')->table($table)->count();
        } catch (\Throwable $e) {
            $this->error('Could not connect to legacy DB or read table "' . $table . '": ' . $e->getMessage());
            $this->line('Check DB_LEGACY_* in .env');
            return self::FAILURE;
        }

        if ($total === 0) {
            $this->warn('No rows in legacy table.');
            return self::SUCCESS;
        }

        $this->info('Found ' . $total . ' legacy user row(s). Importing in chunks of ' . $chunkSize . ' …');

        $created = 0;
        $skippedExisting = 0;
        $skippedNoEmail = 0;
        $skippedError = 0;

        $progress = $this->output->createProgressBar($total);
        $progress->start();

        DB::connection('legacy')
            ->table($table)
            ->orderBy('id')
            ->chunk($chunkSize, function ($rows) use (&$created, &$skippedExisting, &$skippedNoEmail, &$skippedError, $dryRun, $progress) {
                foreach ($rows as $old) {
                    $progress->advance();

                    $email = trim((string) ($old->email ?? ''));
                    if ($email === '') {
                        $skippedNoEmail++;
                        continue;
                    }

                    if (User::where('email', $email)->exists()) {
                        $skippedExisting++;
                        continue;
                    }

                    $name = $this->buildName($old);
                    $passwordHash = trim((string) ($old->password ?? ''));
                    if ($passwordHash === '' || ! str_starts_with($passwordHash, '$2y$')) {
                        $passwordHash = Hash::make('change-me-' . bin2hex(random_bytes(4)));
                    }

                    $status = (int) ($old->status ?? 1);
                    $ev = (int) ($old->ev ?? 0);
                    $emailVerifiedAt = $ev === 1 ? now() : null;

                    if ($dryRun) {
                        $created++;
                        continue;
                    }

                    try {
                        DB::transaction(function () use ($old, $email, $name, $passwordHash, $emailVerifiedAt, $status, &$created) {
                            $user = User::create([
                                'name' => $name,
                                'email' => $email,
                                'password' => Hash::make('temp'), // replaced below
                                'email_verified_at' => $emailVerifiedAt,
                                'remember_token' => $old->remember_token ?? null,
                                'created_at' => $old->created_at ?? now(),
                                'updated_at' => $old->updated_at ?? now(),
                            ]);

                            // Preserve legacy hash without double-hashing
                            DB::table('users')->where('id', $user->id)->update(['password' => $passwordHash]);

                            Profile::create([
                                'user_id' => $user->id,
                                'username' => $old->username ?? null,
                                'is_blocked' => $status === 0,
                            ]);

                            Wallet::create([
                                'user_id' => $user->id,
                                'balance' => (float) ($old->balance ?? 0),
                                'currency' => 'NGN',
                            ]);

                            $role = $this->mapRole((int) ($old->role_id ?? 0));
                            UserRole::create([
                                'user_id' => $user->id,
                                'role' => $role,
                            ]);

                            $created++;
                        });
                    } catch (\Throwable $e) {
                        $skippedError++;
                    }
                }
            });

        $progress->finish();
        $this->newLine(2);
        $this->info('Done. Created: ' . $created);
        $this->line('Skipped existing email: ' . $skippedExisting . ', skipped no email: ' . $skippedNoEmail . ', errors: ' . $skippedError);

        return self::SUCCESS;
    }

    private function buildName(object $old): string
    {
        $first = trim((string) ($old->firstname ?? ''));
        $last = trim((string) ($old->lastname ?? ''));
        $username = trim((string) ($old->username ?? ''));
        $combined = trim($first . ' ' . $last);
        if ($combined !== '') {
            return $combined;
        }
        if ($username !== '') {
            return $username;
        }
        $email = trim((string) ($old->email ?? ''));
        if ($email !== '') {
            return explode('@', $email)[0] ?: 'User';
        }
        return 'User';
    }

    private function mapRole(int $roleId): string
    {
        return match ($roleId) {
            2 => 'admin',
            1 => 'moderator',
            default => 'user',
        };
    }
}

