<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::orderBy('display_order')->orderBy('name')->get();
        return response()->json($this->mapCategories($categories));
    }

    public function adminIndex(): JsonResponse
    {
        $categories = Category::withTrashed()->orderBy('display_order')->orderBy('name')->get();
        return response()->json($this->mapCategories($categories));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string'],
            'display_order' => ['nullable', 'integer'],
            'emoji' => ['nullable', 'string'],
            'icon_url' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
        ]);
        $validated['slug'] = $validated['slug'] ?? Str::slug($validated['name']);
        $category = Category::create($validated);
        return response()->json($this->mapCategory($category), 201);
    }

    public function update(Request $request, string $category): JsonResponse
    {
        $category = Category::withTrashed()->findOrFail($category);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string'],
            'display_order' => ['sometimes', 'integer'],
            'emoji' => ['nullable', 'string'],
            'icon_url' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
        ]);
        $category->update($validated);
        return response()->json($this->mapCategory($category->fresh()));
    }

    public function upload(Request $request): JsonResponse
    {
        // Avoid MIME guessing (fileinfo) on shared hosting; validate presence and extension only
        $request->validate(['file' => ['required', 'file']]);

        $file = $request->file('file');

        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, $allowed, true)) {
            return response()->json([
                'message' => 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif.',
            ], 422);
        }

        // Manually move file without calling hashName()/store() (which rely on fileinfo)
        $filename = uniqid('cat_', true) . '.' . $ext;

        // Keep category/product media inside mini-laravel/public/storage when available.
        $miniStorageRoot = env('MEDIA_STORAGE_ROOT', base_path('../mini-laravel/public/storage'));
        $targetDir = rtrim((string) $miniStorageRoot, '/').'/category_images';
        if (! is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }
        if (! is_writable($targetDir)) {
            return response()->json([
                'message' => 'Upload directory is not writable on the server.',
            ], 500);
        }
        $file->move($targetDir, $filename);

        $path = 'category_images/' . $filename;
        $baseUrl = trim((string) env('MEDIA_PUBLIC_BASE_URL', ''), '/');
        $url = $baseUrl !== '' ? $baseUrl.'/storage/'.$path : '/storage/'.$path;

        return response()->json(['url' => $url]);
    }

    public function destroy(string $category): JsonResponse
    {
        $category = Category::withTrashed()->findOrFail($category);

        $category->forceDelete();
        return response()->json(null, 204);
    }

    public function toggle(string $category): JsonResponse
    {
        $category = Category::withTrashed()->findOrFail($category);

        if ($category->trashed()) {
            $category->restore();
        } else {
            $category->delete();
        }

        return response()->json($this->mapCategory($category->fresh()));
    }

    private function mapCategories($categories): array
    {
        return $categories->map(fn ($c) => $this->mapCategory($c))->values()->all();
    }

    private function mapCategory(Category $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'display_order' => (int) $c->display_order,
            'emoji' => $c->emoji,
            'icon_url' => $c->icon_url,
            'image_url' => $this->normalizeMediaUrl($c->image_url),
            'is_active' => ! $c->trashed(),
            'deleted_at' => $c->deleted_at?->toIso8601String(),
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }

    private function normalizeMediaUrl(?string $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }
        $pos = strpos($value, '/storage/');
        if ($pos === false) {
            return $value;
        }

        $relative = substr($value, $pos);
        $baseUrl = trim((string) env('MEDIA_PUBLIC_BASE_URL', ''), '/');

        return $baseUrl !== '' ? $baseUrl.$relative : $relative;
    }
}
