<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = SiteSetting::all();
        $map = $settings->pluck('value', 'key')->all();
        return response()->json($map);
    }

    public function adminIndex(): JsonResponse
    {
        $settings = SiteSetting::all();
        return response()->json($settings->map(fn (SiteSetting $s) => [
            'key' => $s->key,
            'value' => $s->value,
            'updated_at' => $s->updated_at?->toIso8601String(),
        ]));
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.value' => ['required', 'string'],
        ]);
        foreach ($validated['settings'] as $item) {
            SiteSetting::updateOrCreate(
                ['key' => $item['key']],
                ['value' => $item['value']]
            );
        }
        return response()->json(['message' => 'Updated.']);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:2048', 'mimes:png,jpg,jpeg,webp,svg'],
        ]);

        $file = $validated['file'];
        $ext = strtolower((string) $file->getClientOriginalExtension());
        $ext = $ext !== '' ? $ext : 'png';

        $miniStorageRoot = env('MEDIA_STORAGE_ROOT', base_path('../mini-laravel/public/storage'));
        $targetDir = rtrim((string) $miniStorageRoot, '/').'/site';
        if (! is_dir($targetDir)) {
            @mkdir($targetDir, 0775, true);
        }
        if (! is_dir($targetDir) || ! is_writable($targetDir)) {
            return response()->json([
                'message' => 'Logo upload storage not writable. Check MEDIA_STORAGE_ROOT.',
            ], 500);
        }

        $filename = 'logo_'.date('Ymd_His').'_'.bin2hex(random_bytes(4)).'.'.$ext;
        $file->move($targetDir, $filename);

        $path = 'site/'.$filename;
        $baseUrl = trim((string) env('MEDIA_PUBLIC_BASE_URL', ''), '/');
        $url = $baseUrl !== '' ? $baseUrl.'/storage/'.$path : '/storage/'.$path;

        SiteSetting::updateOrCreate(['key' => 'site_logo'], ['value' => $url]);

        return response()->json([
            'message' => 'Uploaded.',
            'url' => $url,
            'path' => $path,
        ]);
    }
}
