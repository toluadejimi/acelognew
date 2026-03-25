@extends('layouts.dashboard')

@section('title', config('app.name').' — Dashboard')

@push('styles')
<link rel="stylesheet" href="{{ asset('css/vtu-panels.css') }}">
<style>
  /* Non-active dashboard panels must not show (fixes support UI appearing at bottom of other views). */
  .dash-panel[hidden] {
    display: none !important;
  }
  .modal-overlay[hidden] {
    display: none !important;
    pointer-events: none;
    visibility: hidden;
  }
  .chat-msg { margin-bottom: 10px; }
  .chat-msg--user .chat-bubble { margin-left: auto; max-width: 85%; background: hsl(var(--db-blue-dim)); padding: 10px 14px; border-radius: 12px; }
  .chat-msg--support .chat-bubble { margin-right: auto; max-width: 85%; background: hsl(220 20% 96%); padding: 10px 14px; border-radius: 12px; }
  .dash-msg { font-size: 14px; margin-top: 8px; color: hsl(var(--db-muted)); }
  .dash-msg.err { color: #b91c1c; }
  .muted { opacity: 0.8; font-size: 14px; }
  .funds-bank-card { padding: 12px; border: 1px solid hsl(var(--db-border)); border-radius: 12px; margin-bottom: 8px; }
  .broadcast-strip { padding: 12px; background: hsl(var(--db-blue-dim)); border-radius: 12px; margin-bottom: 16px; font-size: 14px; }
  .btn-sm { font-size: 12px; padding: 6px 10px; }
  #supportChatSection[hidden] { display: none !important; }
  #supportHubSection[hidden] { display: none !important; }
  .dash-panel-support { display: flex; flex-direction: column; gap: 0; min-height: 0; }
  .dash-panel-support .support-panel-modern { flex: 1; }
  .dash-panel-support .chat-window { margin-top: 0; }
  /* Support page only — modern icon rings + cards */
  .support-page-shell {
    max-width: 920px;
    margin: 0 auto;
    padding: 8px 20px 32px;
  }
  .support-hero-pro {
    text-align: center;
    padding: 8px 0 28px;
    border-bottom: 1px solid hsl(var(--db-border));
    margin-bottom: 28px;
  }
  .support-hero-pro h2 {
    font-size: clamp(1.45rem, 2.5vw, 1.75rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: hsl(var(--db-text));
    margin: 0 0 10px;
  }
  .support-hero-pro p {
    font-size: 14px;
    color: hsl(var(--db-text-muted));
    max-width: 420px;
    margin: 0 auto;
    line-height: 1.55;
  }
  .support-grid-pro {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }
  @media (min-width: 720px) {
    .support-grid-pro { grid-template-columns: repeat(2, 1fr); }
  }
  .support-card-pro {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 20px 18px;
    background: hsl(var(--db-bg));
    border: 1px solid hsl(var(--db-border));
    border-radius: 16px;
    transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  }
  .support-card-pro:hover {
    border-color: hsl(var(--db-blue) / 0.35);
    box-shadow: 0 8px 28px hsl(220 25% 50% / 0.08);
    transform: translateY(-2px);
  }
  [data-theme="dark"] .support-card-pro {
    background: hsl(220 22% 12%);
    border-color: hsl(220 18% 22%);
  }
  .support-icon-ring {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: 14px;
    background: linear-gradient(145deg, hsl(var(--db-blue) / 0.12), hsl(var(--db-blue) / 0.04));
    border: 1px solid hsl(var(--db-blue) / 0.15);
    color: hsl(var(--db-blue));
  }
  .support-icon-ring--tg { background: linear-gradient(145deg, hsl(200 90% 48% / 0.15), hsl(200 90% 48% / 0.05)); border-color: hsl(200 80% 45% / 0.25); color: hsl(200 85% 42%); }
  .support-icon-ring--wa { background: linear-gradient(145deg, hsl(142 55% 42% / 0.15), hsl(142 55% 42% / 0.05)); border-color: hsl(142 50% 40% / 0.25); color: hsl(142 50% 38%); }
  .support-icon-ring--chat { background: linear-gradient(145deg, hsl(260 55% 52% / 0.12), hsl(260 55% 52% / 0.05)); border-color: hsl(260 45% 50% / 0.22); color: hsl(260 50% 48%); }
  .support-card-pro h3 {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 4px;
    color: hsl(var(--db-text));
    letter-spacing: -0.02em;
  }
  .support-card-pro p {
    font-size: 12.5px;
    color: hsl(var(--db-text-muted));
    line-height: 1.45;
    margin: 0 0 16px;
    flex: 1;
  }
  .support-card-pro .support-card-btn {
    margin-top: auto;
    width: 100%;
    justify-content: center;
    border-radius: 10px;
    font-weight: 600;
    padding: 10px 14px;
  }
  .nav-icon--support i { font-size: 17px; opacity: 0.95; }
  .support-card-btn--primary {
    background: linear-gradient(135deg, hsl(var(--db-blue)), hsl(220 65% 38%)) !important;
    color: #fff !important;
    border: none !important;
  }
  .support-card-btn--primary:hover { filter: brightness(1.06); }
  .support-chat-panel { max-width: 640px; margin: 0 auto; width: 100%; }
</style>
@endpush

@php
    $u = $user ?? session('api_user');
    $email = is_array($u) ? ($u['email'] ?? '') : '';
    $name = is_array($u) ? ($u['name'] ?? 'User') : 'User';
    $initials = strtoupper(mb_substr(preg_replace('/\s+/', '', $name), 0, 2) ?: 'U');
@endphp

@section('content')
<div class="dashboard-layout" id="appDashboard" data-site-name="{{ config('app.name') }}" data-sprintpay-pay-key="{{ e($sprintpayPayKey ?? '') }}" data-user-email="{{ e($email) }}" data-user-id="{{ e(is_array($u) ? ($u['id'] ?? '') : '') }}">
  <div class="sidebar-overlay" id="sidebarOverlay" aria-hidden="true"></div>

  <aside class="dash-sidebar bliss-sidebar-compact" id="dashSidebar">
    <div class="sidebar-logo" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <div class="logo-mark" style="display:flex;align-items:center;gap:10px;">
        <span id="brandLogoFallback" aria-hidden="true" style="width:34px;height:34px;border-radius:12px;background:rgba(15,23,42,.06);display:inline-flex;align-items:center;justify-content:center;font-weight:800;">{{ mb_substr(config('app.name'), 0, 1) }}</span>
        <img id="brandLogoImg" alt="" style="width:34px;height:34px;border-radius:12px;object-fit:cover;display:none;" />
        <span id="brandName">{{ config('app.name') }}</span>
      </div>
    </div>

    <span id="dashBalance" hidden aria-hidden="true"></span>

    <nav class="sidebar-nav">
      <div class="sidebar-nav-section">
        <div class="sidebar-section-label">Overview</div>
        <button type="button" class="dash-nav-item active" data-panel="home"><span class="nav-icon"><i class="fa-solid fa-gauge-high fa-fw" aria-hidden="true"></i></span> Dashboard</button>
        <button type="button" class="dash-nav-item" data-panel="transactions"><span class="nav-icon"><i class="fa-solid fa-arrow-right-arrow-left fa-fw" aria-hidden="true"></i></span> Transactions</button>
      </div>

      <div class="sidebar-nav-section">
        <div class="sidebar-section-label">Services</div>
        <button type="button" class="dash-nav-item" data-panel="add-funds"><span class="nav-icon"><i class="fa-solid fa-wallet fa-fw" aria-hidden="true"></i></span> Add funds</button>
        <button type="button" class="dash-nav-item" data-panel="airtime"><span class="nav-icon"><i class="fa-solid fa-mobile-screen fa-fw" aria-hidden="true"></i></span> Airtime</button>
        <button type="button" class="dash-nav-item" data-panel="data"><span class="nav-icon"><i class="fa-solid fa-wifi fa-fw" aria-hidden="true"></i></span> Data</button>
        <button type="button" class="dash-nav-item" data-panel="electricity"><span class="nav-icon"><i class="fa-solid fa-bolt fa-fw" aria-hidden="true"></i></span> Electricity</button>
        <button type="button" class="dash-nav-item" data-panel="cable-tv"><span class="nav-icon"><i class="fa-solid fa-tv fa-fw" aria-hidden="true"></i></span> Cable TV</button>
        <button type="button" class="dash-nav-item" data-panel="sms-verify"><span class="nav-icon"><i class="fa-solid fa-sms fa-fw" aria-hidden="true"></i></span> SMS verify</button>
        <button type="button" class="dash-nav-item" data-panel="categories"><span class="nav-icon"><i class="fa-solid fa-store fa-fw" aria-hidden="true"></i></span> Browse store</button>
      </div>

      <div class="sidebar-nav-section">
        <div class="sidebar-section-label">Management</div>
        <button type="button" class="dash-nav-item" data-panel="orders"><span class="nav-icon"><i class="fa-solid fa-bag-shopping fa-fw" aria-hidden="true"></i></span> Orders</button>
        <button type="button" class="dash-nav-item" data-panel="sms-history"><span class="nav-icon"><i class="fa-solid fa-comments fa-fw" aria-hidden="true"></i></span> SMS history</button>
        <button type="button" class="dash-nav-item" data-panel="referral"><span class="nav-icon"><i class="fa-solid fa-gift fa-fw" aria-hidden="true"></i></span> Referral</button>
      </div>

      <div class="sidebar-nav-section">
        <div class="sidebar-section-label">Account</div>
        <button type="button" class="dash-nav-item" data-panel="profile"><span class="nav-icon"><i class="fa-regular fa-user fa-fw" aria-hidden="true"></i></span> Profile</button>
        <button type="button" class="dash-nav-item" data-panel="settings"><span class="nav-icon"><i class="fa-solid fa-gear fa-fw" aria-hidden="true"></i></span> Settings</button>
        <button type="button" class="dash-nav-item" id="btnRules"><span class="nav-icon"><i class="fa-solid fa-file-contract fa-fw" aria-hidden="true"></i></span> Rules</button>
        <button type="button" class="dash-nav-item" data-panel="support"><span class="nav-icon nav-icon--support"><i class="fa-solid fa-headset fa-fw" aria-hidden="true"></i></span> Support <span class="nav-badge nav-badge--subtle" title="Always available">24/7</span> <span class="nav-badge" id="supportUnreadBadge" style="display:none;background:hsl(var(--db-green));"></span></button>
      </div>

      @if($isAdmin ?? false)
        <div class="sidebar-nav-section">
          <div class="sidebar-section-label">Admin</div>
          <a href="{{ url('/admin') }}" class="dash-nav-item" style="text-decoration:none;color:inherit;"><span class="nav-icon"><i class="fa-solid fa-shield-halved"></i></span> Admin panel</a>
        </div>
      @endif
    </nav>

    <div class="sidebar-bottom">
      <div class="sidebar-theme-wrap">
        <button type="button" class="nav-theme-btn theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme" style="background:none;border:none;cursor:pointer;font-size:17px;">
          <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
        </button>
      </div>
      <div class="user-row" data-panel="profile" role="button" tabindex="0">
        <div class="user-avatar">{{ $initials }}</div>
        <div class="user-info">
          <div class="uname" id="dashUsername">{{ $name }}</div>
          <div class="uemail">{{ $email }}</div>
        </div>
      </div>
      <form action="{{ route('logout') }}" method="post" style="margin-top:12px;">
        @csrf
        <button type="submit" class="signout-btn" style="width:100%;"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button>
      </form>
    </div>
  </aside>

  <div class="dash-main">
    <div class="dash-topbar">
      <button type="button" class="hamburger-btn" id="hamburgerBtn" aria-label="Menu"><span></span><span></span><span></span></button>
      <div class="topbar-title" id="topbarTitle">Dashboard</div>
      <div class="dash-header-right">
        <button type="button" class="nav-theme-btn theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
          <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
        </button>
        <div class="dash-user-pill" data-panel="add-funds" role="button">
          <span class="bal-icon"><i class="fa-solid fa-wallet"></i></span>
          <span class="bal-text" id="shortBalance" aria-busy="true"><span class="balance-shimmer dash-pill-shimmer" aria-hidden="true"></span></span>
        </div>
        <div class="topbar-avatar" data-panel="profile">{{ $initials }}</div>
      </div>
    </div>

    <div class="dash-content">
      {{-- HOME: Bliss hero + quick services (no product feed — use Browse store → category) --}}
      <section class="dash-panel" id="panel-home" data-panel-id="home">
        <div id="broadcastBanner" class="broadcast-strip" style="display:none;"></div>

        <div class="bliss-dash-home">
          <div class="bliss-hero-card">
            <div class="bliss-hero-top">
              <div class="bliss-hero-user">
                <div class="bliss-hero-avatar">{{ $initials }}</div>
                <div>
                  <div class="bliss-hero-name"><span id="blissHeroName">{{ $name }}</span> <span aria-hidden="true">👋</span></div>
                  <div class="bliss-hero-welcome">Welcome back</div>
                </div>
              </div>
              <div class="bliss-currency-toggle" role="group" aria-label="Display currency">
                <button type="button" class="cc-btn active" id="ccNgn" data-cc="NGN">NGN</button>
                <button type="button" class="cc-btn" id="ccUsd" data-cc="USD">USD</button>
              </div>
            </div>
            <div class="bliss-hero-balance">
              <span class="bliss-balance-label">Balance</span>
              <div class="bliss-balance-num" id="blissBalanceDisplay" aria-busy="true"><span class="balance-shimmer balance-shimmer--hero" aria-hidden="true"></span></div>
            </div>
            <button type="button" class="bliss-add-money" data-panel="add-funds">+ Add money</button>
          </div>

          <p class="bliss-section-kicker" id="quickServicesKicker">Shortcuts</p>
          <h3 class="bliss-section-title" id="quickServicesTitle">Quick services</h3>
          <div class="bliss-quick-grid" id="quickServicesGrid">
            <button type="button" class="bliss-q-card" data-panel="airtime">
              <span class="bliss-q-icon bliss-t-indigo"><i class="fa-solid fa-mobile-screen" aria-hidden="true"></i></span>
              <h4>Airtime</h4>
              <p>Top-up all networks</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="data">
              <span class="bliss-q-icon bliss-t-blue"><i class="fa-solid fa-wifi" aria-hidden="true"></i></span>
              <h4>Data</h4>
              <p>Buy data bundles</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="electricity">
              <span class="bliss-q-icon bliss-t-yellow"><i class="fa-solid fa-bolt" aria-hidden="true"></i></span>
              <h4>Electricity</h4>
              <p>Pay utility bills</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="cable-tv">
              <span class="bliss-q-icon bliss-t-purple"><i class="fa-solid fa-tv" aria-hidden="true"></i></span>
              <h4>Cable TV</h4>
              <p>Decoder &amp; subscriptions</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="sms-verify">
              <span class="bliss-q-icon bliss-t-green"><i class="fa-solid fa-sms" aria-hidden="true"></i></span>
              <h4>SMS verify</h4>
              <p>Virtual numbers</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="add-funds">
              <span class="bliss-q-icon bliss-t-teal"><i class="fa-solid fa-building-columns" aria-hidden="true"></i></span>
              <h4>Fund wallet</h4>
              <p>Bank transfer &amp; more</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="categories">
              <span class="bliss-q-icon bliss-t-pink"><i class="fa-solid fa-store" aria-hidden="true"></i></span>
              <h4>Browse store</h4>
              <p>Accounts &amp; digital goods</p>
            </button>
            <button type="button" class="bliss-q-card" data-panel="referral">
              <span class="bliss-q-icon bliss-t-orange"><i class="fa-solid fa-gift" aria-hidden="true"></i></span>
              <h4>Refer &amp; earn</h4>
              <p>Invite friends</p>
            </button>
          </div>
          <span id="wstatBalance" hidden aria-hidden="true"></span>
          <span id="wstatOrders" hidden aria-hidden="true"></span>
        </div>
      </section>

      {{-- Category drill-in --}}
      <section class="dash-panel" id="panel-category-detail" hidden data-panel-id="category-detail">
        <div class="category-breadcrumb">
          <button type="button" class="breadcrumb-link" id="breadcrumbBack">‹ Back</button>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-current" id="categoryDetailTitle">—</span>
        </div>
        <div class="category-detail-search" style="padding:0 24px 12px;">
          <input type="search" id="productSearch" class="dash-form-input" placeholder="Filter products in this category…" autocomplete="off" aria-label="Filter products" style="max-width:100%;">
        </div>
        <div id="categoryProducts" class="category-detail-list product-list-wrap"></div>
      </section>

      {{-- Categories browse page --}}
      <section class="dash-panel" id="panel-categories" hidden data-panel-id="categories">
        <div class="categories-page">
          <div class="categories-page-header">
            <div class="category-breadcrumb" style="margin-top:0;margin-bottom:16px;padding:0;">
              <button type="button" class="breadcrumb-link" id="catBreadcrumbHome">Dashboard</button>
              <span class="breadcrumb-sep">›</span>
              <span class="breadcrumb-current">Categories</span>
            </div>
            <h1 class="categories-page-title">Browse by category</h1>
            <p class="categories-page-subtitle">Choose a category to see all products. Use search to filter.</p>
            <div class="categories-search-wrap">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="search" id="categorySearchInput" placeholder="Search categories…" autocomplete="off">
            </div>
          </div>
          <div id="categoriesListOnly" class="categories-grid"></div>
        </div>
      </section>

      {{-- Profile --}}
      <section class="dash-panel" id="panel-profile" hidden data-panel-id="profile">
        <div class="profile-page">
          <div class="profile-hero">
            <div class="profile-hero-avatar">{{ $initials }}</div>
            <h1 class="profile-hero-name" id="profileHeroName">{{ $name }}</h1>
            <p class="profile-hero-email">{{ $email }}</p>
            <div class="profile-hero-balance" data-panel="add-funds" role="button">
              <span class="profile-hero-balance-label">Wallet</span>
              <span class="profile-hero-balance-val" id="profileHeroBalance" aria-busy="true"><span class="balance-shimmer balance-shimmer--profile" aria-hidden="true"></span></span>
            </div>
          </div>
          <div class="profile-section">
            <h2 class="profile-section-title">Change password</h2>
            <p class="profile-section-desc">Update your password to keep your account secure.</p>
            <div class="profile-form-grid">
              <div class="profile-field">
                <label class="profile-label">Current password</label>
                <input type="password" id="currentPassword" class="profile-input" autocomplete="current-password">
              </div>
              <div class="profile-field">
                <label class="profile-label">New password</label>
                <input type="password" id="newPassword" class="profile-input" placeholder="Min 6 characters" autocomplete="new-password">
              </div>
              <div class="profile-field">
                <label class="profile-label">Confirm new password</label>
                <input type="password" id="confirmPassword" class="profile-input" autocomplete="new-password">
              </div>
            </div>
            <button type="button" class="profile-save-btn" id="btnUpdatePassword">Save changes</button>
            <p id="profileMsg" class="dash-msg"></p>
          </div>
        </div>
      </section>

      {{-- Orders --}}
      <section class="dash-panel" id="panel-orders" hidden data-panel-id="orders">
        <div style="padding:24px 24px 0;">
          <h2 style="font-size:24px;font-weight:700;margin-bottom:4px;">My Orders</h2>
          <p style="font-size:14px;color:hsl(210 15% 55%);margin-bottom:16px;">View and manage your purchased accounts</p>
          <button type="button" class="btn-refresh" id="btnRefreshOrders"><i class="fa-solid fa-rotate"></i> Refresh</button>
        </div>
        <div id="ordersEmpty" class="orders-empty" style="display:none;">
          <div class="orders-empty-icon">📦</div>
          <h3>No Orders Yet</h3>
          <p>Browse our catalog and complete a purchase to see your orders here.</p>
          <button type="button" class="btn-browse" data-panel="home"><i class="fa-solid fa-cart-shopping"></i> Browse products</button>
        </div>
        <div id="ordersTableWrap" class="orders-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Product</th><th>Status</th><th>Total</th><th>Date</th><th></th></tr></thead>
            <tbody id="ordersBody"></tbody>
          </table>
        </div>
      </section>

      {{-- Transactions --}}
      <section class="dash-panel" id="panel-transactions" hidden data-panel-id="transactions">
        <div style="padding:24px 24px 0;">
          <h2 style="font-size:24px;font-weight:700;margin-bottom:4px;">Transactions</h2>
          <p style="font-size:14px;color:hsl(var(--db-text-muted));margin-bottom:16px;">Your wallet activity: top-ups and purchases</p>
          <button type="button" class="btn-refresh" id="btnRefreshTx"><i class="fa-solid fa-rotate"></i> Refresh</button>
        </div>
        <div id="txEmpty" class="transactions-empty" style="display:none;">
          <div class="transactions-empty-icon">💰</div>
          <h3>No transactions yet</h3>
          <p>Your credit and debit history will appear here.</p>
          <button type="button" class="btn-browse" data-panel="add-funds"><i class="fa-solid fa-wallet"></i> Add funds</button>
        </div>
        <div id="txTableWrap" class="transactions-wrap">
          <div class="table-container transactions-desktop-table">
            <table class="dash-table transactions-table">
              <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
              <tbody id="txBody"></tbody>
            </table>
          </div>
        </div>
      </section>

      {{-- Add funds — SprintPay + virtual account (matches dashboard fund-* styles) --}}
      <section class="dash-panel fund-page-wrap" id="panel-add-funds" hidden data-panel-id="add-funds">
        <div class="fund-page">
          <div id="fundSuccessRoot" class="fund-success" hidden>
            <div class="fund-success__glow" aria-hidden="true"></div>
            <div class="fund-success__icon"><i class="fa-solid fa-check" aria-hidden="true"></i></div>
            <h2 class="fund-success__title">Payment received</h2>
            <p class="fund-success__text"><span class="fund-success__amount" id="fundSuccessAmount">—</span> was added to your wallet. Your updated balance:</p>
            <div class="fund-success__balance" id="fundSuccessBalance">—</div>
            <div class="fund-success__actions">
              <button type="button" class="fund-success__btn fund-success__btn--ghost" id="fundSuccessAddMore"><i class="fa-solid fa-plus" aria-hidden="true"></i> Add more</button>
              <button type="button" class="fund-success__btn fund-success__btn--primary" id="fundSuccessContinue">Continue shopping <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            </div>
          </div>

          <div id="fundFormRoot">
            <header class="fund-header">
              <div class="fund-header__text">
                <p class="fund-header__eyebrow">Wallet</p>
                <h1 class="fund-header__title">Add funds</h1>
                <p class="fund-header__sub">Top up securely. Credits apply automatically once your payment clears.</p>
              </div>
            </header>

            <div class="fund-balance-card">
              <div class="fund-balance-card__icon" aria-hidden="true"><i class="fa-solid fa-wallet"></i></div>
              <div>
                <span class="fund-balance-card__label">Available balance</span>
                <div class="fund-balance-card__value" id="fundBalanceHero" aria-busy="true"><span class="balance-shimmer balance-shimmer--fund-hero" aria-hidden="true"></span></div>
              </div>
            </div>

            <div class="fund-layout">
              <section class="fund-card" aria-labelledby="fund-amount-heading">
                <div class="fund-card__head">
                  <span class="fund-step">1</span>
                  <h2 id="fund-amount-heading" class="fund-card__title">Choose amount</h2>
                </div>
                <p class="fund-card__hint">Quick amounts or enter your own (min ₦100).</p>
                <div class="fund-chips" role="group" aria-label="Preset amounts" id="fundPresetChips">
                  @foreach (['₦1,000', '₦5,000', '₦10,000', '₦20,000', '₦50,000', '₦100,000'] as $chip)
                    <button type="button" class="fund-chip{{ $chip === '₦5,000' ? ' is-selected' : '' }}" data-preset="{{ $chip }}">{{ $chip }}</button>
                  @endforeach
                </div>
                <label class="fund-custom-label" for="fundCustomAmount">Custom amount</label>
                <div class="fund-custom">
                  <span class="fund-custom__prefix" aria-hidden="true">₦</span>
                  <input id="fundCustomAmount" class="fund-custom__input" type="number" inputmode="numeric" min="0" step="1" placeholder="e.g. 15000" autocomplete="off" />
                </div>
              </section>

              <section class="fund-card" aria-labelledby="fund-method-heading">
                <div class="fund-card__head">
                  <span class="fund-step">2</span>
                  <h2 id="fund-method-heading" class="fund-card__title">Pay with</h2>
                </div>
                <div class="fund-methods">
                  <button type="button" class="fund-method is-selected" data-pay-method="sprintpay" id="fundMethodSprintpay">
                    <span class="fund-method__check" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
                    <span class="fund-method__icon fund-method__icon--bolt"><i class="fa-solid fa-bolt"></i></span>
                    <span class="fund-method__name">SprintPay</span>
                    <span class="fund-method__desc">Secure redirect · cards &amp; more</span>
                  </button>
                  <button type="button" class="fund-method" data-pay-method="va" id="fundMethodVa">
                    <span class="fund-method__check" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
                    <span class="fund-method__icon fund-method__icon--bank"><i class="fa-solid fa-building-columns"></i></span>
                    <span class="fund-method__name">Virtual account</span>
                    <span class="fund-method__desc">Bank transfer · copy account details</span>
                  </button>
                </div>
              </section>
            </div>

            <div class="fund-callout fund-callout--info" id="fundCalloutSprintpay">
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              <div>
                <strong>SprintPay</strong>
                <p>You’ll leave this page to complete payment, then return here. Wallet updates when SprintPay confirms.</p>
              </div>
            </div>

            <div class="fund-callout fund-callout--muted" id="fundCalloutVa" hidden>
              <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
              <div>
                <strong>Virtual account</strong>
                <p>Use the account number below. Transfers typically reflect within minutes once your bank sends them.</p>
              </div>
            </div>

            <div class="fund-va" id="fundVaCard" hidden>
              <div class="fund-va__header">
                <span class="fund-va__tag">Transfer to</span>
                <h3 class="fund-va__title">Your dedicated account</h3>
              </div>
              <dl class="fund-va__grid">
                <div class="fund-va__cell">
                  <dt>Bank</dt>
                  <dd id="fundVaBank">—</dd>
                </div>
                <div class="fund-va__cell">
                  <dt>Account name</dt>
                  <dd id="fundVaAcctName">—</dd>
                </div>
              </dl>
              <div class="fund-va__acct">
                <span class="fund-va__acct-label">Account number</span>
                <div class="fund-va__acct-row">
                  <code class="fund-va__number" id="fundVaNumber">—</code>
                  <button type="button" class="fund-va__copy" id="fundVaCopy"><i class="fa-solid fa-copy"></i> Copy</button>
                </div>
              </div>
              <p class="fund-va__foot">This virtual account stays yours — reuse it anytime you add funds.</p>
            </div>

            <p id="fundPageMsg" class="dash-msg err" style="display:none;margin:0 0 12px;"></p>

            <div class="fund-summary">
              <div class="fund-summary__item">
                <span class="fund-summary__k">Adding</span>
                <span class="fund-summary__v" id="fundSummaryAdding">—</span>
              </div>
              <div class="fund-summary__divider" aria-hidden="true"></div>
              <div class="fund-summary__item">
                <span class="fund-summary__k">Method</span>
                <span class="fund-summary__v" id="fundSummaryMethod">SprintPay</span>
              </div>
            </div>

            <button type="button" class="fund-cta" id="fundCta">
              <i class="fa-solid fa-lock" aria-hidden="true"></i> <span id="fundCtaLabel">Pay with SprintPay</span>
            </button>

            <p class="fund-trust">
              <i class="fa-solid fa-clock" aria-hidden="true"></i>
              Most top-ups credit instantly after the provider confirms your payment.
            </p>

            <details class="fund-manual-banks" style="margin-top:20px;border-radius:12px;border:1px solid hsl(var(--db-border));padding:12px 16px;background:hsl(var(--db-bg));">
              <summary style="cursor:pointer;font-weight:700;font-size:13px;color:hsl(var(--db-text-muted));">Manual bank details (optional)</summary>
              <div id="bankDetailsList" class="funds-bank-list" style="margin-top:12px;"></div>
            </details>
          </div>
        </div>
      </section>

      @include('partials.vtu-panels')

      @foreach([
        ['id' => 'sms-verify', 'title' => 'SMS verify', 'icon' => 'fa-sms', 'tint' => 'bliss-t-green', 'desc' => 'Virtual numbers and OTP / verification SMS flows. Wire your SMS or number provider here.'],
        ['id' => 'sms-history', 'title' => 'SMS history', 'icon' => 'fa-comments', 'tint' => 'bliss-t-slate', 'desc' => 'View past verification SMS and delivery status when your backend stores them.'],
        ['id' => 'referral', 'title' => 'Referral program', 'icon' => 'fa-gift', 'tint' => 'bliss-t-pink', 'desc' => 'Invite friends and earn rewards. Configure referral rules in your admin when ready.'],
      ] as $sp)
      <section class="dash-panel" id="panel-{{ $sp['id'] }}" hidden data-panel-id="{{ $sp['id'] }}">
        <div class="service-panel-page">
          <div class="service-panel-hero">
            <div class="service-panel-hero-icon bliss-q-icon {{ $sp['tint'] }}" style="width:64px;height:64px;font-size:26px;"><i class="fa-solid {{ $sp['icon'] }}" aria-hidden="true"></i></div>
            <h2>{{ $sp['title'] }}</h2>
            <p>{{ $sp['desc'] }}</p>
          </div>
          <div class="service-panel-placeholder">Connect your provider API to activate this service in production.</div>
        </div>
      </section>
      @endforeach

      <section class="dash-panel" id="panel-settings" hidden data-panel-id="settings">
        <div class="service-panel-page">
          <div class="service-panel-hero">
            <div class="service-panel-hero-icon" style="background:hsl(var(--db-blue-dim));color:hsl(var(--db-blue));"><i class="fa-solid fa-gear" aria-hidden="true"></i></div>
            <h2>Settings</h2>
            <p>Theme, notifications, and preferences. Use the moon/sun control in the header to switch appearance.</p>
          </div>
          <div class="service-panel-placeholder" style="text-align:left;max-width:400px;margin:0 auto;">
            <p style="margin-bottom:12px;"><strong>Profile &amp; security:</strong> update password under <button type="button" class="btn-sm" data-panel="profile" style="padding:4px 10px;border-radius:8px;border:1px solid hsl(var(--db-border));background:hsl(var(--db-bg));cursor:pointer;">Profile</button></p>
            <p style="margin:0;color:hsl(var(--db-text-muted));font-size:13px;">Additional toggles can be bound to your backend when available.</p>
          </div>
        </div>
      </section>

      {{-- Customer Support: only this panel (sidebar). No support CTAs on other dashboard sections. --}}
      <section class="dash-panel dash-panel-support" id="panel-support" hidden data-panel-id="support">
        <div id="supportHubSection" class="support-page-shell">
          <div class="support-hero-pro">
            <h2>Customer Support</h2>
            <p>Pick a channel below. In-app messages are for account and order questions only.</p>
          </div>
          <div class="support-grid-pro">
            <div class="support-card-pro">
              <div class="support-icon-ring" aria-hidden="true"><i class="fa-solid fa-bullhorn"></i></div>
              <h3>Announcements</h3>
              <p>Product updates and news on Telegram.</p>
              <button type="button" class="support-card-btn btn-secondary" id="btnTgGroup">Open Telegram</button>
            </div>
            <div class="support-card-pro">
              <div class="support-icon-ring support-icon-ring--tg" aria-hidden="true"><i class="fa-brands fa-telegram"></i></div>
              <h3>Telegram</h3>
              <p>Fast answers from the support team.</p>
              <button type="button" class="support-card-btn btn-secondary" id="btnTgSupport">Open chat</button>
            </div>
            <div class="support-card-pro">
              <div class="support-icon-ring support-icon-ring--wa" aria-hidden="true"><i class="fa-brands fa-whatsapp"></i></div>
              <h3>WhatsApp</h3>
              <p>Community and quick help.</p>
              <button type="button" class="support-card-btn btn-secondary" id="btnWa">Open WhatsApp</button>
            </div>
            <div class="support-card-pro">
              <div class="support-icon-ring support-icon-ring--chat" aria-hidden="true"><i class="fa-solid fa-message"></i></div>
              <h3>In-app messages</h3>
              <p>Send a message tied to your account.</p>
              <button type="button" class="support-card-btn support-card-btn--primary" id="btnOpenChat">Open messages</button>
            </div>
          </div>
        </div>

        <div class="chat-window support-chat-panel" id="supportChatSection" hidden>
          <header class="chat-header">
            <button type="button" class="chat-back" id="btnChatBack" aria-label="Back"><i class="fa-solid fa-arrow-left"></i></button>
            <div class="chat-header-avatar"><i class="fa-solid fa-headset"></i></div>
            <div class="chat-header-info">
              <h2 class="chat-header-title">Customer Support</h2>
              <p class="chat-header-status">In-app messages</p>
            </div>
          </header>
          <div id="chatContainer" class="chat-messages"></div>
          <div class="chat-compose" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;padding:12px;border-top:1px solid hsl(var(--db-border));">
            <textarea id="supportInput" class="dash-form-input" rows="2" placeholder="Type a message…" style="flex:1;min-width:200px;"></textarea>
            <button type="button" class="btn-submit-funds" id="btnSendSupport">Send</button>
          </div>
          <p id="supportMsg" class="dash-msg" style="padding:0 12px 12px;"></p>
        </div>
      </section>
    </div>
  </div>
</div>

{{-- Purchase modal --}}
<div class="modal-overlay" id="fundVaModal" hidden>
  <div class="modal fund-va-modal">
    <button type="button" class="modal-close" id="fundVaModalClose" aria-label="Close">✕</button>
    <span class="fund-va-modal__badge"><i class="fa-solid fa-building-columns"></i> Virtual account</span>
    <h2 class="fund-va-modal__title">Almost there</h2>
    <p class="fund-va-modal__desc">We need your name and phone once to generate your dedicated transfer account.</p>
    <div class="form-group">
      <label class="fund-custom-label" for="fundVaModalName">Full name</label>
      <input type="text" id="fundVaModalName" class="dash-form-input" style="width:100%;box-sizing:border-box;" placeholder="As on your bank account" autocomplete="name" />
    </div>
    <div class="form-group">
      <label class="fund-custom-label" for="fundVaModalPhone">Phone</label>
      <input type="tel" id="fundVaModalPhone" class="dash-form-input" style="width:100%;box-sizing:border-box;" placeholder="0801 234 5678" autocomplete="tel" />
    </div>
    <p id="fundVaModalErr" class="dash-msg err" style="display:none;"></p>
    <button type="button" class="fund-va-modal__submit" id="fundVaModalSubmit">Get account number</button>
  </div>
</div>

<div class="modal-overlay" id="purchaseModal" hidden>
  <div class="modal">
    <button type="button" class="modal-close" id="purchaseModalClose">✕</button>
    <div class="modal-tag">Confirm purchase</div>
    <h2 class="modal-title-text" id="modalProductTitle">—</h2>
    <p class="modal-desc-text" id="modalProductDesc">—</p>
    <div class="modal-detail-row"><span class="mdr-label">Price</span><span class="mdr-val" id="modalPrice">—</span></div>
    <div class="modal-detail-row"><span class="mdr-label">Stock</span><span class="mdr-val" id="modalStock">—</span></div>
    <div class="qty-selector" style="margin:16px 0;">
      <button type="button" id="qtyMinus">−</button>
      <span id="qtyVal">1</span>
      <button type="button" id="qtyPlus">+</button>
    </div>
    <button type="button" class="btn-confirm" id="btnConfirmPurchase">Confirm purchase</button>
    <p id="purchaseErr" class="dash-msg err"></p>
  </div>
</div>

<div class="modal-overlay" id="purchaseSuccessModal" hidden>
  <div class="modal purchase-success-modal">
    <button type="button" class="modal-close" id="purchaseSuccessClose">✕</button>
    <div class="purchase-success-head">
      <img src="/images/purchase-success.svg" alt="Purchase successful" class="purchase-success-hero-img" />
      <div class="modal-tag">Purchase successful</div>
      <h2 class="modal-title-text" id="purchaseSuccessTitle">Your account is ready</h2>
      <p class="modal-desc-text" id="purchaseSuccessDesc">Copied credentials are available below. Keep them private.</p>
    </div>
    <div id="purchaseSuccessLogs" class="purchase-success-logs"></div>
    <div class="purchase-success-actions">
      <button type="button" class="btn-secondary" id="purchaseSuccessOrders">Go to Orders</button>
      <button type="button" class="btn-confirm" id="purchaseSuccessDone">Done</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="rulesModal" hidden>
  <div class="modal rules-modal-v2">
    <button type="button" class="modal-close" id="rulesModalClose">✕</button>
    <h2 class="rules-v2-title">Rules & guidelines</h2>
    <p class="rules-v2-desc">Use purchased accounts responsibly. We are not responsible for third-party tools or bans.</p>
    <button type="button" class="rules-v2-btn" id="rulesModalOk">I understand</button>
  </div>
</div>
@endsection

@push('scripts')
<script src="{{ asset('js/dashboard-blade.js') }}"></script>
@endpush
