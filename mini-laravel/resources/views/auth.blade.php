@extends('layouts.storefront')

@php
    $siteName = $siteName ?? config('app.name');
    $parts = explode(' ', $siteName, 2);
    $authMode = $authMode ?? 'login';
    $isRegister = $authMode === 'register';
@endphp

@section('title', ($isRegister ? 'Create account' : 'Sign in') . ' — ' . $siteName)

@push('styles')
<link rel="stylesheet" href="{{ asset('css/react-mirror/auth.css') }}">
@endpush

@section('content')
<div class="auth-wrapper">
    <div class="auth-container">
        <div class="auth-left">
            <div class="auth-orb auth-orb-1"></div>
            <div class="auth-orb auth-orb-2"></div>
            <div class="auth-orb auth-orb-3"></div>
            <div class="auth-left-inner">
                <a href="{{ url('/') }}" class="auth-logo">
                    @if(!empty($siteLogo))
                        <img src="{{ $siteLogo }}" alt="" class="auth-logo-img">
                    @else
                        <div class="auth-logo-dot"></div>
                    @endif
                    @if(count($parts) > 1)
                        <span>{{ $parts[0] }} </span><strong>{{ $parts[1] }}</strong>
                    @else
                        <span>{{ $siteName }}</span>
                    @endif
                </a>
                <div class="auth-left-content">
                    <div class="auth-badge">🛡 Trusted Platform</div>
                    <h1 class="auth-headline">Digital services.<br><span class="auth-headline-accent">One dashboard.</span></h1>
                    <p class="auth-description">Accounts, airtime, data &amp; VAS — {{ $isRegister ? 'create an account to get started.' : 'sign in to manage your wallet and orders.' }}</p>
                </div>
                <div class="auth-features">
                    <div class="auth-feature">
                        <div class="auth-feature-icon">⚡</div>
                        <div><div class="auth-feature-title">Instant Delivery</div><div class="auth-feature-desc">Get your accounts within seconds</div></div>
                    </div>
                    <div class="auth-feature">
                        <div class="auth-feature-icon">🛡</div>
                        <div><div class="auth-feature-title">Fully Verified</div><div class="auth-feature-desc">Every account is quality checked</div></div>
                    </div>
                    <div class="auth-feature">
                        <div class="auth-feature-icon">★</div>
                        <div><div class="auth-feature-title">Order tracking</div><div class="auth-feature-desc">See purchases and history in your dashboard</div></div>
                    </div>
                </div>
                <div class="auth-stats">
                    <div class="auth-stat"><div class="auth-stat-num">10K+</div><div class="auth-stat-label">Accounts Sold</div></div>
                    <div class="auth-stat"><div class="auth-stat-num">98%</div><div class="auth-stat-label">Satisfaction</div></div>
                    <div class="auth-stat"><div class="auth-stat-num">4.9★</div><div class="auth-stat-label">Rating</div></div>
                </div>
            </div>
        </div>
        <div class="auth-right">
            <div class="auth-theme-wrap">
                <button type="button" class="auth-theme-btn theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
                  <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
                </button>
            </div>
            <div class="auth-card">
                @if($isRegister)
                <div class="auth-view active" id="registerView">
                    <div class="auth-form-header">
                        <h2 class="auth-form-title">Create your account</h2>
                        <p class="auth-form-sub">Join in seconds — wallet and dashboard included.</p>
                    </div>
                    <form id="registerForm" class="auth-form">
                        <div class="auth-field">
                            <label for="name">Full name</label>
                            <div class="auth-input-wrap">
                                <span class="auth-input-icon">👤</span>
                                <input id="name" type="text" name="name" required placeholder="Jane Doe" autocomplete="name" maxlength="255">
                            </div>
                        </div>
                        <div class="auth-field">
                            <label for="email">Email</label>
                            <div class="auth-input-wrap">
                                <span class="auth-input-icon">✉</span>
                                <input id="email" type="email" name="email" required placeholder="name@example.com" autocomplete="email">
                            </div>
                        </div>
                        <div class="auth-field">
                            <label for="reg-password">Password</label>
                            <div class="auth-input-wrap">
                                <span class="auth-input-icon">🔒</span>
                                <input id="reg-password" type="password" name="password" required placeholder="••••••••" autocomplete="new-password" minlength="8">
                            </div>
                        </div>
                        <div class="auth-field">
                            <label for="password_confirmation">Confirm password</label>
                            <div class="auth-input-wrap">
                                <span class="auth-input-icon">🔒</span>
                                <input id="password_confirmation" type="password" name="password_confirmation" required placeholder="••••••••" autocomplete="new-password" minlength="8">
                            </div>
                        </div>
                        <p id="registerError" class="auth-field-error" style="display:none;"></p>
                        <button type="submit" class="auth-submit" id="registerBtn">Create account</button>
                    </form>
                    <p class="auth-form-sub auth-switch">
                        Already have an account? <a href="{{ route('auth') }}">Sign in</a>
                    </p>
                </div>
                @else
                <div class="auth-view active" id="loginView">
                    <div class="auth-form-header">
                        <h2 class="auth-form-title">Welcome back</h2>
                        <p class="auth-form-sub">Log in to continue.</p>
                    </div>
                    <form id="loginForm" class="auth-form">
                        <div class="auth-field">
                            <label for="email">Email</label>
                            <div class="auth-input-wrap">
                                <span class="auth-input-icon">✉</span>
                                <input id="email" type="email" name="email" required placeholder="name@example.com" autocomplete="email">
                            </div>
                        </div>
                        <div class="auth-field">
                            <div class="auth-field-header"><label for="password">Password</label></div>
                            <div class="auth-input-wrap">
                                <span class="auth-input-icon">🔒</span>
                                <input id="password" type="password" name="password" required placeholder="••••••••" autocomplete="current-password">
                            </div>
                        </div>
                        <p id="loginError" class="auth-field-error" style="display:none;"></p>
                        <button type="submit" class="auth-submit" id="loginBtn">Sign in</button>
                    </form>
                    <p class="auth-form-sub auth-switch">
                        New here? <a href="{{ route('register') }}">Create an account</a>
                    </p>
                </div>
                @endif
                    <p class="auth-form-sub auth-back-home">
                        <a href="{{ url('/') }}">← Back to home</a>
                    </p>
            </div>
        </div>
    </div>
</div>
<style>
.auth-theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--theme-toggle-bg, 220 20% 94%));
  color: hsl(var(--theme-toggle-fg, 220 25% 12%));
  border: 1px solid hsl(var(--theme-border, 220 15% 88%));
  border-radius: 10px;
  width: 40px; height: 40px;
  cursor: pointer;
  font-size: 17px;
}
[data-theme="dark"] .auth-theme-btn {
  background: rgba(255,255,255,0.08);
  color: #E8EAF0;
  border-color: rgba(57,255,20,0.2);
}
.auth-badge { display: inline-flex; align-items: center; gap: 6px; }
#loginBtn:disabled, #registerBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-switch { margin-top: 1rem; text-align: center; }
.auth-switch a { font-weight: 600; }
.auth-back-home { margin-top: 0.75rem; text-align: center; }
</style>
<script src="{{ asset('js/mini-api.js') }}"></script>
@if($isRegister)
<script>
function formatRegisterErrors(err) {
  if (err.errors && typeof err.errors === 'object') {
    const parts = [];
    for (const k of Object.keys(err.errors)) {
      const v = err.errors[k];
      if (Array.isArray(v)) parts.push(v.join(' '));
      else if (v) parts.push(String(v));
    }
    if (parts.length) return parts.join(' ');
  }
  return err.message || 'Registration failed';
}
document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  const btn = document.getElementById('registerBtn');
  errEl.style.display = 'none';
  btn.disabled = true;
  if (window.pageLoader) window.pageLoader.show();
  try {
    await miniApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('reg-password').value,
        password_confirmation: document.getElementById('password_confirmation').value,
      }),
    });
    window.location.href = @json(url('/dashboard'));
  } catch (err) {
    if (window.pageLoader) window.pageLoader.hide();
    errEl.textContent = formatRegisterErrors(err);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});
</script>
@else
<script>
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  errEl.style.display = 'none';
  btn.disabled = true;
  if (window.pageLoader) window.pageLoader.show();
  try {
    await miniApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });
    window.location.href = @json(url('/dashboard'));
  } catch (err) {
    if (window.pageLoader) window.pageLoader.hide();
    errEl.textContent = err.message || 'Login failed';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});
</script>
@endif
@endsection
