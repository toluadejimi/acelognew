<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Categories from the Name list (in display order).
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'REDDIT', 'slug' => 'reddit'],
            ['name' => 'TEXTING', 'slug' => 'texting'],
            ['name' => 'INSTAGRAM', 'slug' => 'instagram'],
            ['name' => 'TWITTER/X', 'slug' => 'twitter-x'],
            ['name' => 'FB DATING', 'slug' => 'fb-dating'],
            ['name' => 'AGED RANDOM FACEBOOK', 'slug' => 'aged-random-facebook'],
            ['name' => 'MAILS', 'slug' => 'mails'],
            ['name' => 'FACEBOOK', 'slug' => 'facebook'],
            ['name' => 'ACE OFFER', 'slug' => 'ace-offer'],
            ['name' => '♠{ You Might Like}', 'slug' => 'you-might-like'],
            ['name' => 'VPN', 'slug' => 'vpn'],
            ['name' => 'TIKTOK', 'slug' => 'tiktok'],
            ['name' => '{STREAMING}', 'slug' => 'streaming'],
            ['name' => 'IG WITH FOLLOWERS', 'slug' => 'ig-with-followers'],
            ['name' => '♠{FOREIGN FB WITH FRIENDS}', 'slug' => 'foreign-fb-with-friends'],
        ];

        foreach ($categories as $index => $item) {
            Category::firstOrCreate(
                ['slug' => $item['slug']],
                [
                    'name' => $item['name'],
                    'display_order' => $index,
                ]
            );
        }
    }
}
