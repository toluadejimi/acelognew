<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountLog;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountLogController extends Controller
{
    public function index(): JsonResponse
    {
        $limit = (int) request('limit', 2000);
        $limit = min(max(1, $limit), 5000);

        $logs = AccountLog::orderByDesc('created_at')->limit($limit)->get();
        $total = AccountLog::count();
        $unsold = AccountLog::where('is_sold', false)->count();

        return response()->json([
            'logs' => $this->mapLogs($logs),
            'total' => $total,
            'unsold' => $unsold,
        ]);
    }

    // Used by the admin UI to warn/skip oversize log lines before bulk insert.
    // Prevents MySQL "Data too long for column 'password'" 500s.
    public function limits(): JsonResponse
    {
        $driver = DB::getDriverName();

        if ($driver !== 'mysql') {
            return response()->json([
                'driver' => $driver,
                'loginMaxLen' => null,
                'passwordMaxLen' => null,
                'loginColumnType' => null,
                'passwordColumnType' => null,
            ]);
        }

        $dbName = DB::connection()->getDatabaseName();

        $columns = DB::table('information_schema.columns')
            ->select([
                'COLUMN_NAME as column_name',
                'CHARACTER_MAXIMUM_LENGTH as character_maximum_length',
                'COLUMN_TYPE as column_type',
                'DATA_TYPE as data_type',
            ])
            ->where('table_schema', $dbName)
            ->where('table_name', 'account_logs')
            ->whereIn('column_name', ['login', 'password'])
            ->get()
            ->keyBy('column_name');

        $login = $columns->get('login');
        $password = $columns->get('password');

        return response()->json([
            'driver' => $driver,
            'loginMaxLen' => $login && $login->character_maximum_length !== null ? (int) $login->character_maximum_length : null,
            'passwordMaxLen' => $password && $password->character_maximum_length !== null ? (int) $password->character_maximum_length : null,
            'loginColumnType' => $login?->column_type,
            'passwordColumnType' => $password?->column_type,
        ]);
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
        Product::refreshStockFromLogs($log->product_id);
        return response()->json($this->mapLog($log), 201);
    }

    public function destroy(AccountLog $accountLog): JsonResponse
    {
        $productId = $accountLog->product_id;
        $accountLog->delete();
        Product::refreshStockFromLogs($productId);
        return response()->json(null, 204);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        // Only validate shape — do not require exists:* (stale IDs from the UI would otherwise 422).
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['required', 'string', 'max:64'],
        ]);
        $ids = array_values(array_unique(array_filter($validated['ids'])));
        if ($ids === []) {
            return response()->json(['message' => 'No valid ids provided.', 'errors' => ['ids' => ['No valid ids provided.']]], 422);
        }
        $logs = AccountLog::whereIn('id', $ids)->get();
        $productIds = $logs->pluck('product_id')->unique()->values()->all();
        $deleted = AccountLog::whereIn('id', $ids)->delete();
        foreach ($productIds as $productId) {
            Product::refreshStockFromLogs($productId);
        }
        return response()->json(['deleted' => $deleted]);
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
        foreach ($created->pluck('product_id')->unique() as $productId) {
            Product::refreshStockFromLogs($productId);
        }
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
