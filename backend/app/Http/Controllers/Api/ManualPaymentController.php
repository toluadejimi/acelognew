<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ManualPayment;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManualPaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $payments = ManualPayment::where('user_id', $request->user()->id)->orderByDesc('created_at')->get();
        return response()->json($this->mapPayments($payments));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string'],
            'method' => ['required', 'string', 'max:255'],
        ]);
        $payment = ManualPayment::create([
            'user_id' => $request->user()->id,
            'amount' => $validated['amount'],
            'reference' => $validated['reference'] ?? null,
            'method' => $validated['method'],
            'status' => 'pending',
        ]);
        return response()->json($this->mapPayment($payment), 201);
    }

    public function approve(ManualPayment $manualPayment): JsonResponse
    {
        if ($manualPayment->status !== 'pending') {
            return response()->json(['message' => 'Payment already processed.'], 400);
        }
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $manualPayment->user_id],
            ['currency' => 'NGN']
        );
        $wallet->increment('balance', $manualPayment->amount);
        Transaction::create([
            'user_id' => $manualPayment->user_id,
            'amount' => $manualPayment->amount,
            'type' => 'credit',
            'description' => 'Manual payment approved',
            'reference' => $manualPayment->reference,
        ]);
        $manualPayment->update(['status' => 'approved']);
        return response()->json($this->mapPayment($manualPayment->fresh()));
    }

    public function reject(ManualPayment $manualPayment): JsonResponse
    {
        $manualPayment->update(['status' => 'rejected']);
        return response()->json($this->mapPayment($manualPayment->fresh()));
    }

    public function update(Request $request, ManualPayment $manualPayment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string'],
            'admin_notes' => ['nullable', 'string'],
        ]);
        $manualPayment->update($validated);
        return response()->json($this->mapPayment($manualPayment->fresh()));
    }

    public function adminIndex(): JsonResponse
    {
        $payments = ManualPayment::with('user')->orderByDesc('created_at')->limit(2000)->get();
        return response()->json($this->mapPayments($payments));
    }

    public function adminStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string'],
            'method' => ['required', 'string', 'max:255'],
        ]);
        $payment = ManualPayment::create([
            'user_id' => $validated['user_id'],
            'amount' => $validated['amount'],
            'reference' => $validated['reference'] ?? null,
            'method' => $validated['method'],
            'status' => 'pending',
        ]);
        return response()->json($this->mapPayment($payment), 201);
    }

    private function mapPayments($payments): array
    {
        return $payments->map(fn ($p) => $this->mapPayment($p))->values()->all();
    }

    private function mapPayment(ManualPayment $p): array
    {
        return [
            'id' => $p->id,
            'user_id' => (string) $p->user_id,
            'amount' => (float) $p->amount,
            'reference' => $p->reference,
            'method' => $p->method,
            'status' => $p->status,
            'admin_notes' => $p->admin_notes,
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }
}
