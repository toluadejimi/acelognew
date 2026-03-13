<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with('product')
            ->orderByDesc('created_at')
            ->get();
        return response()->json($this->mapOrders($orders));
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ((string) $order->user_id !== (string) $request->user()->id) {
            abort(404);
        }
        return response()->json($this->mapOrder($order->load('product')));
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $request->validate(['status' => ['required', 'string', 'max:50']]);
        $order->update(['status' => $request->status]);
        return response()->json($this->mapOrder($order->fresh()));
    }

    public function feed(): JsonResponse
    {
        $orders = Order::select('product_title', 'total_price', 'created_at')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();
        return response()->json($orders->map(fn (Order $o) => [
            'product_title' => $o->product_title,
            'total_price' => (float) $o->total_price,
            'created_at' => $o->created_at?->toIso8601String(),
        ]));
    }

    public function adminIndex(): JsonResponse
    {
        $orders = Order::with('user', 'product')->orderByDesc('created_at')->get();
        return response()->json($this->mapOrders($orders));
    }

    private function mapOrders($orders): array
    {
        return $orders->map(fn ($o) => $this->mapOrder($o))->values()->all();
    }

    private function mapOrder(Order $o): array
    {
        return [
            'id' => $o->id,
            'user_id' => (string) $o->user_id,
            'product_id' => $o->product_id,
            'product_title' => $o->product_title,
            'product_platform' => $o->product_platform,
            'quantity' => (int) $o->quantity,
            'total_price' => (float) $o->total_price,
            'currency' => $o->currency,
            'status' => $o->status,
            'account_details' => $o->account_details,
            'created_at' => $o->created_at?->toIso8601String(),
            'updated_at' => $o->updated_at?->toIso8601String(),
        ];
    }
}
