<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class RefreshProductStock extends Command
{
    protected $signature = 'products:refresh-stock';

    protected $description = 'Set each product stock to the count of unsold account logs (fixes stock after bulk log uploads)';

    public function handle(): int
    {
        $products = Product::all();
        $updated = 0;
        foreach ($products as $product) {
            Product::refreshStockFromLogs($product->id);
            $updated++;
        }
        $this->info("Refreshed stock for {$updated} product(s).");
        return self::SUCCESS;
    }
}
