<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
}
