@extends('layouts.storefront')

@php
    $siteName = $siteName ?? config('app.name');
    $parts = explode(' ', $siteName, 2);
    $dashUrl = url('/dashboard');
    $authUrl = url('/auth');
    $registerUrl = url('/register');
    $primaryCta = ($loggedIn ?? false) ? $dashUrl : $registerUrl;
@endphp

@section('title', $siteName . ' — Digital services simplified')

@push('styles')
<link rel="stylesheet" href="{{ asset('css/react-mirror/landing.css') }}">
<link rel="stylesheet" href="{{ asset('css/react-mirror/landing-redesign.css') }}">
@endpush

@section('content')
<div class="landing-page">
    <nav class="landing-nav" id="landingNav">
        <a href="{{ url('/') }}" class="nav-logo">
            @if(!empty($siteLogo))
                <img src="{{ $siteLogo }}" alt="" class="nav-logo-img">
            @endif
            @if(count($parts) > 1)
                {{ $parts[0] }}<span> {{ $parts[1] }}</span>
            @else
                {{ $siteName }}
            @endif
        </a>
        <ul class="nav-links">
            <li><a href="#services">Services</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#testimonials">Reviews</a></li>
        </ul>
        <div class="nav-right-wrap">
            <button type="button" class="nav-theme-btn theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
              <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
            </button>
            @if($loggedIn ?? false)
                <a href="{{ $dashUrl }}" class="nav-cta nav-cta-desktop">Dashboard</a>
                @if($isAdmin ?? false)
                    <a href="{{ url('/admin') }}" class="nav-cta nav-cta-desktop" style="margin-left:8px;">Admin</a>
                @endif
                <a href="{{ $dashUrl }}" class="nav-cta nav-cta-mobile">Dashboard</a>
            @else
                <a href="{{ $authUrl }}" class="nav-cta nav-cta-desktop" style="margin-right:8px;background:transparent;border:1px solid var(--border);color:var(--text-muted);">Log in</a>
                <a href="{{ $registerUrl }}" class="nav-cta nav-cta-desktop">Get started →</a>
                <a href="{{ $registerUrl }}" class="nav-cta nav-cta-mobile">Get started</a>
            @endif
        </div>
    </nav>

    <section class="hero-v2" id="home">
        <div class="hero-v2-bg"></div>
        <div class="hero-v2-content">
            <p class="hero-top-badge">Now serving 10,000+ users · Accounts · Airtime · Data · VAS</p>
            <h1 class="hero-v2-title">
                <span class="hero-line-1">Digital services,</span>
                <span class="hero-line-2 hero-v2-accent">simplified & secured.</span>
            </h1>
            <p class="hero-v2-desc">
                Airtime &amp; data bundles, value‑added services, and digital listings — wallet checkout, instant fulfilment, and full history in one place. Built for speed and trust.
            </p>
            <div class="hero-v2-btns">
                <a href="{{ $primaryCta }}" class="btn-hero-primary">Start for free</a>
                <a href="#services" class="btn-hero-secondary">Explore services ↓</a>
            </div>
            <div class="hero-v2-stats hero-stats-wide">
                <div class="hero-stat"><span class="hero-stat-num">10K+</span><span class="hero-stat-label">Active users</span></div>
                <div class="hero-stat"><span class="hero-stat-num">99.9%</span><span class="hero-stat-label">Uptime</span></div>
                <div class="hero-stat"><span class="hero-stat-num">200+</span><span class="hero-stat-label">Countries</span></div>
                <div class="hero-stat"><span class="hero-stat-num">24/7</span><span class="hero-stat-label">Access</span></div>
            </div>
        </div>
    </section>

    <div class="ticker-v2" role="marquee">
        <div class="ticker-v2-inner">
            @foreach(array_merge($tickerItems, $tickerItems) as $item)
                <span class="ticker-v2-item">{{ $item }}</span>
            @endforeach
        </div>
    </div>

    <div class="platform-showcase" aria-hidden="true">
        <div class="platform-showcase-inner">
            @foreach($platformChips as $chip)
                <span class="platform-chip"><i class="fa-solid {{ $chip['icon'] }}" aria-hidden="true"></i> {{ $chip['label'] }}</span>
            @endforeach
        </div>
    </div>

    <section class="services-split landing-section" id="services">
        <div class="services-split-head reveal">
            <p class="services-split-kicker">Our services</p>
            <h2 class="services-split-title">Everything you need,<br>one platform.</h2>
            <p class="services-split-sub">Two core pillars — premium digital inventory and telecom &amp; VAS — designed for individuals and businesses who want one wallet and one dashboard.</p>
        </div>
        <div class="services-split-grid">
            @foreach($servicePillars as $i => $pillar)
                <article class="service-pillar reveal{{ $i > 0 ? ' reveal-delay-'.$i : '' }}">
                    <div class="service-pillar-icon"><i class="fa-solid {{ $pillar['icon'] }}" aria-hidden="true"></i></div>
                    <h3>{{ $pillar['title'] }}</h3>
                    <p class="service-pillar-desc">{{ $pillar['desc'] }}</p>
                    <div class="service-pillar-tags">
                        @foreach($pillar['tags'] as $tag)
                            <span>{{ $tag }}</span>
                        @endforeach
                    </div>
                    <a href="{{ $primaryCta }}" class="service-pillar-cta">{{ $pillar['cta'] }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
                </article>
            @endforeach
        </div>
    </section>

    <section class="how-v2 landing-section" id="how">
        <p class="section-tag-v2">How it works</p>
        <h2 class="how-v2-title">Up &amp; running in three simple steps</h2>
        <div class="steps-v2">
            <div class="step-v2 reveal"><span class="step-v2-num">1</span><h3>Create account</h3><p>Sign up with your email. Get instant access to the dashboard and wallet.</p></div>
            <div class="step-v2-line" aria-hidden="true"></div>
            <div class="step-v2 reveal reveal-delay-1"><span class="step-v2-num">2</span><h3>Fund wallet</h3><p>Add money using the payment methods available in your region. Balance updates when payment clears.</p></div>
            <div class="step-v2-line" aria-hidden="true"></div>
            <div class="step-v2 reveal reveal-delay-2"><span class="step-v2-num">3</span><h3>Buy &amp; use</h3><p>Purchase accounts, airtime, data, or VAS — delivery is instant where networks allow; history stays in one place.</p></div>
        </div>
        <div class="how-v2-cta reveal"><a href="{{ $primaryCta }}" class="btn-hero-primary">Create free account</a></div>
    </section>

    <section class="trust-section landing-section" id="features">
        <div class="trust-section-inner">
            <div class="trust-section-head reveal">
                <p class="trust-section-kicker">Why {{ $siteName }}</p>
                <h2 class="trust-section-title">Built on trust,<br>powered by speed.</h2>
                <p class="trust-section-sub">Every feature is aimed at security, clarity, and a smooth experience — whether you’re buying a listing or topping up data.</p>
            </div>
            <div class="trust-grid">
                @foreach($trustFeatures as $i => $tf)
                    <div class="trust-card reveal{{ $i > 0 ? ' reveal-delay-'.min($i, 3) : '' }}">
                        <div class="trust-card-icon"><i class="fa-solid {{ $tf['icon'] }}" aria-hidden="true"></i></div>
                        <h3>{{ $tf['title'] }}</h3>
                        <p>{{ $tf['text'] }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    <section class="testimonials-v2 landing-section" id="testimonials">
        <p class="section-tag-v2">Testimonials</p>
        <h2 class="testimonials-v2-title">Trusted by users every day</h2>
        <div class="testimonials-v2-grid">
            @foreach($testimonials as $i => $t)
                <div class="testimonial-v2-card reveal{{ $i > 0 ? ' reveal-delay-'.$i : '' }}">
                    <div class="testimonial-v2-stars">★★★★★</div>
                    <p class="testimonial-v2-text">"{{ $t['text'] }}"</p>
                    <div class="testimonial-v2-meta">
                        <span class="testimonial-v2-name">{{ $t['name'] }}</span>
                        <span class="testimonial-v2-role">{{ $t['role'] }} · {{ $t['platform'] }}</span>
                    </div>
                </div>
            @endforeach
        </div>
    </section>

    <section class="faq-v2 landing-section" id="faq">
        <div class="faq-v2-inner">
            <div class="faq-v2-head reveal"><p class="section-tag-v2">FAQ</p><h2>Questions? We’ve got answers.</h2></div>
            <div class="faq-v2-list reveal reveal-delay-1">
                @foreach($faqItems as $i => $faq)
                    <details class="faq-v2-item" @if($i === 0) open @endif>
                        <summary class="faq-v2-q">{{ $faq['q'] }}<span class="faq-v2-icon">+</span></summary>
                        <div class="faq-v2-a">{{ $faq['a'] }}</div>
                    </details>
                @endforeach
            </div>
        </div>
    </section>

    <section class="cta-v2">
        <h2 class="cta-v2-title">Ready to join thousands of happy users?</h2>
        <p class="cta-v2-sub">Create your free account in seconds and unlock accounts, airtime, data, and VAS from one dashboard.</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
            <a href="{{ $primaryCta }}" class="btn-hero-primary btn-cta-large">Create free account →</a>
            <a href="{{ $dashUrl }}#panel-support" class="btn-hero-secondary">Contact options</a>
        </div>
    </section>

    <footer class="footer-v2">
        <div class="footer-v2-grid">
            <div class="footer-v2-brand-block">
                <div class="footer-v2-brand">
                    @if(!empty($siteLogo))
                        <img src="{{ $siteLogo }}" alt="" class="footer-v2-logo-img">
                    @endif
                    <span class="footer-v2-name">{{ $siteName }}</span>
                </div>
                <p class="footer-v2-tagline">Premium accounts, airtime &amp; data, and value‑added services — one wallet, transparent pricing, instant delivery where networks allow.</p>
            </div>
            <div class="footer-v2-col">
                <h4>Services</h4>
                <ul>
                    <li><a href="#services">Premium accounts</a></li>
                    <li><a href="#services">Airtime &amp; data</a></li>
                    <li><a href="#services">VAS &amp; add‑ons</a></li>
                </ul>
            </div>
            <div class="footer-v2-col">
                <h4>Company</h4>
                <ul>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#how">How it works</a></li>
                    <li><a href="#faq">FAQ</a></li>
                </ul>
            </div>
            <div class="footer-v2-col">
                <h4>Account</h4>
                <ul>
                    @if($loggedIn ?? false)
                        <li><a href="{{ $dashUrl }}">Dashboard</a></li>
                        <li><a href="{{ $dashUrl }}#panel-support">Messages</a></li>
                    @else
                        <li><a href="{{ $authUrl }}">Log in</a></li>
                        <li><a href="{{ $registerUrl }}">Sign up</a></li>
                    @endif
                </ul>
            </div>
        </div>
        <div class="footer-v2-bottom-bar">
            <span>© {{ date('Y') }} {{ $siteName }}. All rights reserved.</span>
            <div class="footer-v2-legal">
                <a href="#faq">Terms &amp; policies</a>
                <span style="opacity:0.5;">·</span>
                <a href="#faq">Privacy</a>
            </div>
        </div>
    </footer>
</div>
<style>
.nav-theme-btn {
  background: hsl(var(--theme-toggle-bg, 220 20% 94%));
  color: hsl(var(--theme-toggle-fg, 220 25% 12%));
  border: 1px solid hsl(var(--theme-border, 220 15% 88%));
  border-radius: 10px;
  width: 40px; height: 40px;
  cursor: pointer;
  font-size: 17px;
  line-height: 1;
}
[data-theme="dark"] .nav-theme-btn {
  background: rgba(255,255,255,0.08);
  color: #E8EAF0;
  border-color: rgba(57,255,20,0.2);
}
</style>
<script>
document.getElementById('landingNav')?.addEventListener('scroll', function(){}, {passive:true});
window.addEventListener('scroll', function () {
  var n = document.getElementById('landingNav');
  if (n) n.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });
document.querySelectorAll('.reveal').forEach(function (el) {
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08 }).observe(el);
});
</script>
@endsection
