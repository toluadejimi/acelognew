<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountLog;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::where('is_active', true);
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        $products = $query->orderBy('title')->get();
        $stockByProduct = $this->getUnsoldCountByProductId($products->pluck('id')->all());
        return response()->json($this->mapProducts($products, $stockByProduct));
    }

    public function adminIndex(): JsonResponse
    {
        $products = Product::with('category')->orderByDesc('created_at')->limit(5000)->get();
        return response()->json($this->mapProducts($products));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string'],
            'platform' => ['required', 'string', 'max:255'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'image_url' => ['nullable', 'string'],
            'sample_link' => ['nullable', 'string', 'max:500'],
        ]);
        $validated['currency'] = $validated['currency'] ?? 'NGN';
        $validated['stock'] = $validated['stock'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $product = Product::create($validated);
        return response()->json($this->mapProduct($product), 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['sometimes', 'exists:categories,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'platform' => ['sometimes', 'string', 'max:255'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'image_url' => ['nullable', 'string'],
            'sample_link' => ['nullable', 'string', 'max:500'],
        ]);
        $product->update($validated);
        return response()->json($this->mapProduct($product->fresh()));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();
        return response()->json(null, 204);
    }

    public function upload(Request $request): JsonResponse
    {
        // Some servers disable php_fileinfo; Laravel's `image` rule then throws
        // "Unable to guess the MIME type". We validate by extension instead.
        $request->validate(['file' => ['required', 'file']]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: '');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!in_array($ext, $allowed, true)) {
            return response()->json(['message' => 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif'], 422);
        }

        $path = $file->store('product_images', 'public');
        $url = asset('storage/' . $path);
        return response()->json(['url' => $url]);
    }

    public function bulkUpload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
            'category_id' => ['required', 'exists:categories,id'],
        ]);
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        $content = $file->get();
        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        $created = [];
        $platform = $request->input('platform', 'General');
        $currency = $request->input('currency', 'NGN');

        foreach ($lines as $i => $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $parts = str_contains($line, ',') ? str_getcsv($line) : preg_split('/\t+/', $line);
            if (count($parts) < 2) {
                continue;
            }
            $title = trim($parts[0]);
            $price = (float) (trim($parts[1] ?? 0));
            $description = trim($parts[2] ?? $title);
            $stock = isset($parts[3]) ? (int) trim($parts[3]) : 1;
            if ($title === '' || $price <= 0) {
                continue;
            }
            $product = Product::create([
                'category_id' => $request->category_id,
                'title' => $title,
                'description' => $description,
                'price' => $price,
                'currency' => $currency,
                'platform' => $platform,
                'stock' => $stock,
                'is_active' => true,
            ]);
            $created[] = $this->mapProduct($product);
        }

        return response()->json(['created' => count($created), 'products' => $created], 201);
    }

    /**
     * Get unsold account log count per product (for accurate frontend stock).
     */
    private function getUnsoldCountByProductId(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }
        $rows = AccountLog::query()
            ->whereIn('product_id', $productIds)
            ->where('is_sold', false)
            ->selectRaw('product_id, count(*) as c')
            ->groupBy('product_id')
            ->get();
        return $rows->pluck('c', 'product_id')->all();
    }

    private function mapProducts($products, array $stockByProduct = []): array
    {
        return $products->map(fn ($p) => $this->mapProduct($p, $stockByProduct))->values()->all();
    }

    private function mapProduct(Product $p, array $stockByProduct = []): array
    {
        $stock = isset($stockByProduct[$p->id])
            ? (int) $stockByProduct[$p->id]
            : (int) $p->stock;
        return [
            'id' => $p->id,
            'category_id' => $p->category_id,
            'title' => $p->title,
            'description' => $p->description,
            'price' => (float) $p->price,
            'currency' => $p->currency,
            'platform' => $p->platform,
            'stock' => $stock,
            'is_active' => $p->is_active,
            'image_url' => $p->image_url,
            'sample_link' => $p->sample_link,
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }
}
