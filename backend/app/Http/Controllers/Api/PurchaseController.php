<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function process(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);
        $product = Product::findOrFail($validated['product_id']);
        $quantity = (int) $validated['quantity'];
        $totalPrice = $product->price * $quantity;
        $user = $request->user();
        $wallet = $user->wallet;
        if (!$wallet) {
            $wallet = Wallet::create(['user_id' => $user->id]);
        }
        if ((float) $wallet->balance < $totalPrice) {
            return response()->json([
                'success' => false,
                'error_msg' => 'Insufficient balance.',
                'new_balance' => (float) $wallet->balance,
                'purchased_accounts' => [],
            ]);
        }
        $availableLogs = AccountLog::where('product_id', $product->id)->where('is_sold', false)->limit($quantity)->get();
        if ($availableLogs->count() < $quantity) {
            return response()->json([
                'success' => false,
                'error_msg' => 'Insufficient stock for this product.',
                'new_balance' => (float) $wallet->balance,
                'purchased_accounts' => [],
            ]);
        }
        return DB::transaction(function () use ($user, $wallet, $product, $quantity, $totalPrice, $availableLogs) {
            $wallet->decrement('balance', $totalPrice);
            $order = Order::create([
                'user_id' => $user->id,
                'product_id' => $product->id,
                'product_title' => $product->title,
                'product_platform' => $product->platform,
                'quantity' => $quantity,
                'total_price' => $totalPrice,
                'currency' => $product->currency,
                'status' => 'completed',
            ]);
            $purchasedAccounts = [];
            foreach ($availableLogs as $log) {
                $log->update(['order_id' => $order->id, 'is_sold' => true]);
                $purchasedAccounts[] = [
                    'login' => $log->login,
                    'password' => $log->password,
                ];
            }
            Transaction::create([
                'user_id' => $user->id,
                'amount' => -$totalPrice,
                'type' => 'debit',
                'description' => 'Purchase: ' . $product->title,
                'reference' => $order->id,
            ]);
            $newBalance = (float) $wallet->fresh()->balance;
            return response()->json([
                'success' => true,
                'error_msg' => '',
                'new_balance' => $newBalance,
                'purchased_accounts' => $purchasedAccounts,
            ]);
        });
    }
}
