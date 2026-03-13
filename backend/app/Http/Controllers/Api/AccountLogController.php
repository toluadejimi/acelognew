<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountLog;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountLogController extends Controller
{
    public function index(): JsonResponse
    {
        $logs = AccountLog::with(['product', 'order'])->orderByDesc('created_at')->get();
        return response()->json($this->mapLogs($logs));
    }

    public function byOrder(Request $request, Order $order): JsonResponse
    {
        if ((string) $order->user_id !== (string) $request->user()->id) {
            abort(404);
        }
        $logs = AccountLog::where('order_id', $order->id)->get();
        return response()->json($logs->map(fn (AccountLog $l) => [
            'login' => $l->login,
            'password' => $l->password,
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'order_id' => ['nullable', 'exists:orders,id'],
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);
        $log = AccountLog::create($validated);
        return response()->json($this->mapLog($log), 201);
    }

    public function destroy(AccountLog $accountLog): JsonResponse
    {
        $accountLog->delete();
        return response()->json(null, 204);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logs' => ['required', 'array'],
            'logs.*.product_id' => ['required', 'exists:products,id'],
            'logs.*.login' => ['required', 'string'],
            'logs.*.password' => ['nullable', 'string'],
            'logs.*.description' => ['nullable', 'string'],
        ]);
        $created = collect($validated['logs'])->map(fn ($l) => AccountLog::create([
            'product_id' => $l['product_id'],
            'login' => $l['login'],
            'password' => $l['password'] ?? '',
        ]));
        return response()->json($created->map(fn ($l) => $this->mapLog($l))->values()->all(), 201);
    }

    private function mapLogs($logs): array
    {
        return $logs->map(fn ($l) => $this->mapLog($l))->values()->all();
    }

    private function mapLog(AccountLog $l): array
    {
        return [
            'id' => $l->id,
            'product_id' => $l->product_id,
            'order_id' => $l->order_id,
            'login' => $l->login,
            'password' => $l->password,
            'is_sold' => $l->is_sold,
            'created_at' => $l->created_at?->toIso8601String(),
        ];
    }
}
