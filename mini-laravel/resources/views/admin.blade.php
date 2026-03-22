@extends('layouts.admin')

@section('title', config('app.name').' — Admin')

@php
    $u = $user ?? session('api_user');
    $name = is_array($u) ? ($u['name'] ?? 'Admin') : 'Admin';
@endphp

@section('content')
<div class="admin-layout">
  <div class="admin-mobile-header">
    <button type="button" class="admin-hamburger" id="adminHamburger" aria-label="Menu">☰</button>
    <span class="admin-mobile-title">Admin Panel</span>
  </div>
  <div class="admin-sidebar-overlay" id="adminSidebarOverlay"></div>

  <aside class="admin-sidebar" id="adminSidebar">
    <div class="admin-sidebar-logo">
      <div class="logo-dot">A</div>
      <span>{{ config('app.name') }}</span>
    </div>
    <nav class="admin-nav">
      <button type="button" class="admin-nav-item active" data-tab="overview"><span>📊</span> Overview</button>
      <button type="button" class="admin-nav-item" data-tab="users"><span>👥</span> Users</button>
      <button type="button" class="admin-nav-item" data-tab="orders"><span>📦</span> Orders</button>
      <button type="button" class="admin-nav-item" data-tab="products"><span>🛍️</span> Products</button>
      <button type="button" class="admin-nav-item" data-tab="logs"><span>🔑</span> Account Logs</button>
      <button type="button" class="admin-nav-item" data-tab="categories"><span>📁</span> Categories</button>
      <button type="button" class="admin-nav-item" data-tab="transactions"><span>💰</span> Transactions</button>
      <button type="button" class="admin-nav-item" data-tab="admins"><span>🛡️</span> Admin Roles</button>
      <button type="button" class="admin-nav-item" data-tab="messages"><span>💬</span> Messages</button>
      <button type="button" class="admin-nav-item" data-tab="broadcasts"><span>📢</span> Broadcasts</button>
      <button type="button" class="admin-nav-item" data-tab="settings"><span>⚙️</span> Settings</button>
    </nav>
    <div class="admin-sidebar-bottom">
      <a href="{{ url('/dashboard') }}" class="admin-nav-item" style="text-decoration:none;"><span>🏠</span> User dashboard</a>
      <form action="{{ route('logout') }}" method="post">
        @csrf
        <button type="submit" class="admin-btn" style="width:100%;justify-content:center;">Sign out</button>
      </form>
    </div>
  </aside>

  <div class="admin-main">
    <div class="admin-topbar">
      <h1 class="admin-topbar-title" id="adminTabTitle">Overview</h1>
      <div style="display:flex;gap:10px;align-items:center;">
        <button type="button" class="admin-btn theme-toggle-btn" onclick="toggleTheme()" title="Toggle theme" aria-label="Toggle theme">
          <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
        </button>
        <button type="button" class="admin-btn admin-btn-primary" id="btnAdminRefresh">Refresh</button>
      </div>
    </div>

    <div class="admin-content">
      <section class="admin-tab-panel" data-tab-panel="overview">
        <div class="admin-stats" id="adminStats"></div>
        <p id="overviewNote" style="color:hsl(var(--admin-muted));font-size:14px;"></p>
      </section>

      <section class="admin-tab-panel" data-tab-panel="users" hidden>
        <div class="admin-table-header" style="margin-bottom:12px;">
          <input type="search" id="userSearch" class="admin-form-input" placeholder="Search users…" style="max-width:320px;">
          <button type="button" class="admin-btn admin-btn-primary" id="btnUserSearch">Search</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>User</th><th>Email</th><th>Balance</th><th>Blocked</th><th></th></tr></thead><tbody id="adminUsersBody"></tbody></table>
        </div>
        <div style="display:flex;gap:12px;margin-top:12px;align-items:center;">
          <button type="button" class="admin-btn" id="usersPrev">Prev</button>
          <span id="usersPageInfo"></span>
          <button type="button" class="admin-btn" id="usersNext">Next</button>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="orders" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>User</th><th>Product</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody id="adminOrdersBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="products" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Title</th><th>Platform</th><th>Price</th><th>Stock</th><th>Active</th></tr></thead><tbody id="adminProductsBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="logs" hidden>
        <p style="color:hsl(var(--admin-muted));font-size:14px;margin-bottom:12px;">Recent logs (bulk upload available via API).</p>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Product</th><th>Login</th><th>Sold</th><th></th></tr></thead><tbody id="adminLogsBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="categories" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Emoji</th></tr></thead><tbody id="adminCatBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="transactions" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>User</th><th>Amount</th><th>Type</th><th>Description</th><th>Date</th></tr></thead><tbody id="adminTxBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="admins" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>User ID</th><th>Role</th></tr></thead><tbody id="adminRolesBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="messages" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>From</th><th>To</th><th>Preview</th><th>Date</th></tr></thead><tbody id="adminMsgBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="broadcasts" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Title</th><th>Active</th><th>Updated</th></tr></thead><tbody id="adminBcBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="settings" hidden>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody id="adminSettingsBody"></tbody></table>
        </div>
      </section>
    </div>
  </div>
</div>
@endsection

@push('scripts')
<script src="{{ asset('js/admin-blade.js') }}"></script>
@endpush
