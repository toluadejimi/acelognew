<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = (string) $request->user()->id;
        $messages = Message::where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->orderBy('created_at')
            ->get();
        return response()->json($this->mapMessages($messages));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => ['nullable', 'string'],
            'attachment_url' => ['nullable', 'string', 'max:500'],
            'order_id' => ['nullable', 'exists:orders,id'],
            'receiver_id' => ['nullable', 'string'],
        ]);
        $content = isset($validated['content']) ? trim($validated['content']) : '';
        $attachmentUrl = isset($validated['attachment_url']) ? trim($validated['attachment_url']) : null;
        if ($content === '' && $attachmentUrl === null) {
            return response()->json(['message' => 'Message must have content or an attachment.'], 422);
        }
        $msg = Message::create([
            'sender_id' => (string) $request->user()->id,
            'receiver_id' => $validated['receiver_id'] ?? '00000000-0000-0000-0000-000000000000',
            'content' => $content,
            'attachment_url' => $attachmentUrl,
            'order_id' => $validated['order_id'] ?? null,
        ]);
        return response()->json($this->mapMessage($msg), 201);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file']]);
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: '');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!in_array($ext, $allowed, true)) {
            return response()->json(['message' => 'Invalid file type. Allowed: jpg, jpeg, png, webp, gif'], 422);
        }
        $path = $file->store('message_attachments', 'public');
        $url = asset('storage/' . $path);
        return response()->json(['url' => $url]);
    }

    public function adminIndex(): JsonResponse
    {
        $messages = Message::orderBy('created_at')->limit(5000)->get();
        $userIds = $messages->pluck('sender_id')->merge($messages->pluck('receiver_id'))->unique()->filter()->values()->all();
        $users = User::with('profile')->whereIn('id', $userIds)->get()->keyBy('id');
        $displayByUserId = [];
        foreach ($users as $id => $user) {
            $profile = $user->relationLoaded('profile') ? $user->profile : null;
            $displayByUserId[(string) $id] = $profile && trim((string) $profile->username) !== ''
                ? trim($profile->username)
                : ($user->email ?? (string) $id);
        }
        $mapped = $messages->map(fn ($m) => $this->mapMessageForAdmin($m, $displayByUserId))->values()->all();
        return response()->json($mapped);
    }

    public function markRead(Request $request, Message $message): JsonResponse
    {
        $userId = (string) $request->user()->id;
        if ($message->receiver_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $message->update(['is_read' => true]);
        return response()->json($this->mapMessage($message->fresh()));
    }

    private function mapMessages($messages): array
    {
        return $messages->map(fn ($m) => $this->mapMessage($m))->values()->all();
    }

    private function mapMessage(Message $m): array
    {
        return [
            'id' => $m->id,
            'sender_id' => $m->sender_id,
            'receiver_id' => $m->receiver_id,
            'content' => $m->content ?? '',
            'attachment_url' => $m->attachment_url,
            'order_id' => $m->order_id,
            'is_read' => $m->is_read,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    private function mapMessageForAdmin(Message $m, array $displayByUserId): array
    {
        return [
            'id' => $m->id,
            'sender_id' => $m->sender_id,
            'receiver_id' => $m->receiver_id,
            'sender_display' => $displayByUserId[(string) $m->sender_id] ?? (string) $m->sender_id,
            'receiver_display' => $displayByUserId[(string) $m->receiver_id] ?? (string) $m->receiver_id,
            'content' => $m->content ?? '',
            'attachment_url' => $m->attachment_url,
            'order_id' => $m->order_id,
            'is_read' => $m->is_read,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
