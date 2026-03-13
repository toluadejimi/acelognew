<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = ['name', 'slug', 'display_order', 'emoji', 'icon_url', 'image_url'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
