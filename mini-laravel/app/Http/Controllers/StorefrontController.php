<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;

class StorefrontController extends Controller
{
    public function landing(): View
    {
        return view('landing', array_merge($this->sharedData(), [
            'loggedIn' => session()->has('api_token'),
            'isAdmin' => $this->sessionUserIsAdmin(),
        ]));
    }

    public function signIn(): View|RedirectResponse
    {
        if (session()->has('api_token')) {
            return redirect()->route('dashboard');
        }

        return view('auth', array_merge($this->sharedData(), [
            'authMode' => 'login',
        ]));
    }

    public function register(): View|RedirectResponse
    {
        if (session()->has('api_token')) {
            return redirect()->route('dashboard');
        }

        return view('auth', array_merge($this->sharedData(), [
            'authMode' => 'register',
        ]));
    }

    /**
     * User store dashboard — Blade + CSS from src/styles/dashboard.css; data via same-origin /api.
     */
    public function dashboard(): View
    {
        return view('dashboard', array_merge($this->sharedData(), [
            'user' => session('api_user'),
            'isAdmin' => $this->sessionUserIsAdmin(),
            'sprintpayPayKey' => (string) config('services.sprintpay.pay_public_key', ''),
        ]));
    }

    /**
     * Admin panel — Blade + CSS from src/styles/admin.css; data via same-origin /api/admin/*.
     */
    public function admin(): View
    {
        return view('admin', array_merge($this->sharedData(), [
            'user' => session('api_user'),
        ]));
    }

    private function sessionUserIsAdmin(): bool
    {
        $user = session('api_user');

        return is_array($user) && in_array('admin', $user['roles'] ?? [], true);
    }

    /**
     * @return array<string, mixed>
     */
    private function sharedData(): array
    {
        $backend = rtrim((string) config('app.backend_url'), '/');

        return [
            'backendUrl' => $backend !== '' ? $backend : url('/'),
            'siteName' => config('app.name'),
            'siteLogo' => null,
            'tickerItems' => [
                'AIRTIME & DATA',
                'PREMIUM ACCOUNTS',
                'VALUE‑ADDED SERVICES',
                'INSTANT DELIVERY',
                'WALLET & CHECKOUT',
                'ALL NETWORKS',
            ],
            'platformChips' => [
                ['icon' => 'fa-tower-cell', 'label' => 'MTN · Airtel · Glo · 9mobile'],
                ['icon' => 'fa-user-check', 'label' => 'Verified listings & inventory'],
                ['icon' => 'fa-bolt', 'label' => 'Instant airtime & bundles'],
                ['icon' => 'fa-shield-halved', 'label' => 'Secure wallet & history'],
                ['icon' => 'fa-globe', 'label' => 'VAS & digital add‑ons'],
                ['icon' => 'fa-wallet', 'label' => 'One dashboard'],
            ],
            'servicePillars' => [
                [
                    'icon' => 'fa-layer-group',
                    'title' => 'Premium accounts & digital inventory',
                    'desc' => 'Curated listings for streaming, gaming, and productivity — clear product details, fair pricing, and secure delivery to your dashboard. One place to buy trusted access alongside airtime and data.',
                    'tags' => ['Streaming', 'Gaming', 'Productivity', 'Subscriptions', 'More'],
                    'cta' => 'Open store',
                    'ctaHref' => null,
                ],
                [
                    'icon' => 'fa-mobile-screen-button',
                    'title' => 'Airtime, data & value‑added services',
                    'desc' => 'Recharge airtime, buy data bundles, and access digital VAS from one wallet — fast fulfilment, clear pricing, and full transaction history in your dashboard.',
                    'tags' => ['Airtime', 'Data bundles', 'VAS', 'Receipts'],
                    'cta' => 'Fund & buy',
                    'ctaHref' => null,
                ],
            ],
            'trustFeatures' => [
                ['icon' => 'fa-lock', 'title' => 'Bank‑level security', 'text' => 'Encrypted sessions, secure checkout, and a wallet you control — every transaction logged.'],
                ['icon' => 'fa-bolt', 'title' => 'Instant delivery', 'text' => 'Digital goods and telecom services fulfilled as soon as payment confirms.'],
                ['icon' => 'fa-tags', 'title' => 'Competitive rates', 'text' => 'Transparent pricing on accounts, airtime, data, and VAS — no surprises.'],
                ['icon' => 'fa-clock', 'title' => 'Always available', 'text' => 'Access your dashboard anytime; top‑ups and purchases on your schedule.'],
                ['icon' => 'fa-certificate', 'title' => 'Trusted operations', 'text' => 'Structured processes, clear policies, and support channels when you need help.'],
                ['icon' => 'fa-wand-magic-sparkles', 'title' => 'Simple experience', 'text' => 'One login for accounts, recharge, and VAS — built for first‑timers and power users.'],
            ],
            'testimonials' => [
                ['name' => 'Sarah J.', 'role' => 'Creator', 'platform' => 'Instagram', 'text' => 'Bought a verified account and later topped up data from the same wallet. Everything just works — fast and clear.'],
                ['name' => 'Michael C.', 'role' => 'Marketer', 'platform' => 'Lagos', 'text' => 'We use the store for accounts and team airtime. One dashboard beats juggling five vendors.'],
                ['name' => 'Emily R.', 'role' => 'Business', 'platform' => 'Abuja', 'text' => 'Data bundles and account orders both show in history. Refunds were handled properly when something failed.'],
                ['name' => 'David K.', 'role' => 'Reseller', 'platform' => 'Port Harcourt', 'text' => 'VAS and premium listings in one place. My customers get instant delivery; I get peace of mind.'],
            ],
            'faqItems' => [
                ['q' => 'What services do you offer besides accounts?', 'a' => 'You can buy airtime and data bundles, access value‑added digital services, and manage everything from a single wallet — alongside our premium account catalog.'],
                ['q' => 'How do I fund my wallet?', 'a' => 'Add funds through the payment options shown in your dashboard (e.g. bank transfer or card, depending on your backend configuration). Balance updates when payment is confirmed.'],
                ['q' => 'How fast is airtime and data delivery?', 'a' => 'Telecom top‑ups and bundles are typically delivered instantly after a successful payment, subject to network availability.'],
                ['q' => 'Are premium accounts vetted?', 'a' => 'Yes. Listings are reviewed for authenticity and transparency. Details shown on each product page before you buy.'],
                ['q' => 'What if a transaction fails?', 'a' => 'Failed or reversed amounts are reflected per your platform rules — usually credited back to your wallet or refunded through the original method. Check your transaction history in the dashboard.'],
                ['q' => 'How do I get help?', 'a' => 'Use in‑app messages (logged‑in), or the channels listed under Customer Support in your dashboard for faster responses on urgent issues.'],
            ],
        ];
    }
}
