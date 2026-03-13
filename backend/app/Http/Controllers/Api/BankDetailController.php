<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankDetailController extends Controller
{
    public function index(): JsonResponse
    {
        $details = BankDetail::where('is_active', true)->orderBy('display_order')->get();
        return response()->json($this->mapDetails($details));
    }

    public function adminIndex(): JsonResponse
    {
        $details = BankDetail::orderBy('display_order')->get();
        return response()->json($this->mapDetails($details));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer'],
        ]);
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['display_order'] = $validated['display_order'] ?? 0;
        $detail = BankDetail::create($validated);
        return response()->json($this->mapDetail($detail), 201);
    }

    public function update(Request $request, BankDetail $bankDetail): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:255'],
            'account_name' => ['sometimes', 'string', 'max:255'],
            'account_number' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'display_order' => ['sometimes', 'integer'],
        ]);
        $bankDetail->update($validated);
        return response()->json($this->mapDetail($bankDetail->fresh()));
    }

    public function destroy(BankDetail $bankDetail): JsonResponse
    {
        $bankDetail->delete();
        return response()->json(null, 204);
    }

    private function mapDetails($details): array
    {
        return $details->map(fn ($d) => $this->mapDetail($d))->values()->all();
    }

    private function mapDetail(BankDetail $d): array
    {
        return [
            'id' => $d->id,
            'label' => $d->label,
            'account_name' => $d->account_name,
            'account_number' => $d->account_number,
            'is_active' => $d->is_active,
            'display_order' => (int) $d->display_order,
            'created_at' => $d->created_at?->toIso8601String(),
        ];
    }
}
