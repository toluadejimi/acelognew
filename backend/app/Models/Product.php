<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'category_id', 'title', 'description', 'price', 'currency', 'platform',
        'stock', 'is_active', 'image_url', 'sample_link', 'legacy_id',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
            'stock' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function accountLogs(): HasMany
    {
        return $this->hasMany(AccountLog::class);
    }

    /**
     * Set product stock to the count of unsold account logs for this product.
     * Call this whenever account_logs are added, removed, or is_sold changes.
     */
    public static function refreshStockFromLogs(string $productId): void
    {
        $count = AccountLog::where('product_id', $productId)->where('is_sold', false)->count();
        DB::table('products')->where('id', $productId)->update(['stock' => $count]);
    }
}
