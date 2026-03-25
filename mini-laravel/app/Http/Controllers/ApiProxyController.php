<?php

namespace App\Http\Controllers;

use GuzzleHttp\Client;
use Illuminate\Http\Request;

/**
 * Forwards /api/* to the main Laravel backend (BACKEND_URL).
 * Mirrors same-origin /api calls like the React SPA: session stores token after login;
 * proxy injects Authorization: Bearer from session when the browser does not send it.
 */
class ApiProxyController extends Controller
{
    public function forward(Request $request, ?string $path = null)
    {
        $path = trim((string) $path, '/');
        $base = rtrim((string) config('app.backend_url'), '/');

        if ($base === '') {
            abort(503, 'Set BACKEND_URL in .env to your main Laravel app (e.g. https://host.hotelbiza.online/backend/public).');
        }

        $url = $base.'/api/'.$path;
        if ($request->getQueryString()) {
            $url .= '?'.$request->getQueryString();
        }

        $headers = [];
        foreach (['Accept', 'Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN'] as $h) {
            if ($v = $request->header($h)) {
                $headers[$h] = $v;
            }
        }

        $auth = $request->header('Authorization');
        if (! $auth && session()->has('api_token')) {
            $headers['Authorization'] = 'Bearer '.session('api_token');
        }

        $client = new Client([
            'http_errors' => false,
            'timeout' => 120,
            'connect_timeout' => 30,
        ]);

        $options = ['headers' => $headers];

        $methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (in_array($request->method(), $methodsWithBody, true)) {
            $options['body'] = $request->getContent();
        }

        $guzzleResponse = $client->request($request->method(), $url, $options);

        $body = (string) $guzzleResponse->getBody();
        $status = $guzzleResponse->getStatusCode();

        if ($request->isMethod('POST') && in_array($path, ['auth/login', 'auth/register'], true) && $status >= 200 && $status < 300) {
            $json = json_decode($body, true);
            if (is_array($json) && ! empty($json['token'])) {
                session([
                    'api_token' => $json['token'],
                    'api_user' => $json['user'] ?? null,
                ]);
            }
        }

        // Admin "login as user" flow returns { token, user } as well.
        if ($request->isMethod('POST') && preg_match('#^admin/users/[^/]+/impersonate$#', $path) === 1 && $status >= 200 && $status < 300) {
            $json = json_decode($body, true);
            if (is_array($json) && ! empty($json['token'])) {
                session([
                    'api_token' => $json['token'],
                    'api_user' => $json['user'] ?? null,
                ]);
            }
        }

        if ($request->isMethod('POST') && $path === 'auth/logout' && $status >= 200 && $status < 300) {
            session()->forget(['api_token', 'api_user']);
        }

        if ($status === 401) {
            session()->forget(['api_token', 'api_user']);
        }

        $contentType = $guzzleResponse->getHeaderLine('Content-Type') ?: 'application/json';

        return response($body, $status)->header('Content-Type', $contentType);
    }
}
