<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BroadcastMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BroadcastMessageController extends Controller
{
    /** Active broadcasts for logged-in users (shown on login). */
    public function index(): JsonResponse
    {
        $messages = BroadcastMessage::where('is_active', true)
            ->orderByDesc('created_at')
            ->get();
        return response()->json($this->mapMessages($messages));
    }

    /** Admin: list all broadcasts. */
    public function adminIndex(): JsonResponse
    {
        $messages = BroadcastMessage::orderByDesc('created_at')->get();
        return response()->json($this->mapMessages($messages));
    }

    /** Admin: create broadcast. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $validated['is_active'] = $validated['is_active'] ?? true;
        $message = BroadcastMessage::create($validated);
        return response()->json($this->mapMessage($message), 201);
    }

    /** Admin: update broadcast. */
    public function update(Request $request, BroadcastMessage $broadcastMessage): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $broadcastMessage->update($validated);
        return response()->json($this->mapMessage($broadcastMessage->fresh()));
    }

    /** Admin: delete broadcast. */
    public function destroy(BroadcastMessage $broadcastMessage): JsonResponse
    {
        $broadcastMessage->delete();
        return response()->json(null, 204);
    }

    private function mapMessages($messages): array
    {
        return $messages->map(fn ($m) => $this->mapMessage($m))->values()->all();
    }

    private function mapMessage(BroadcastMessage $m): array
    {
        return [
            'id' => $m->id,
            'title' => $m->title,
            'body' => $m->body,
            'is_active' => $m->is_active,
            'created_at' => $m->created_at?->toIso8601String(),
            'updated_at' => $m->updated_at?->toIso8601String(),
        ];
    }
}
