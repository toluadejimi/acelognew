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
          <button type="button" class="admin-btn admin-btn-primary" id="btnOpenUserModal">+ Add User</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>User</th><th>Email</th><th>Balance</th><th>Blocked</th><th>Actions</th></tr></thead><tbody id="adminUsersBody"></tbody></table>
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
        <div class="admin-table-header" style="margin-bottom:12px;gap:8px;flex-wrap:wrap;">
          <input type="search" id="productSearch" class="admin-form-input" placeholder="Search products..." style="max-width:320px;">
          <button type="button" class="admin-btn admin-btn-primary" id="btnOpenAddProductModal">+ Add Product</button>
          <span style="color:hsl(var(--admin-muted));font-size:13px;">Edit, disable/enable, or delete products from actions.</span>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Title</th><th>Platform</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead><tbody id="adminProductsBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="logs" hidden>
        <div class="admin-table-header" style="margin-bottom:12px;gap:8px;flex-wrap:wrap;">
          <p style="color:hsl(var(--admin-muted));font-size:14px;margin:0;">Recent logs. Add single or bulk logs like React admin.</p>
          <input type="search" id="logsSearch" class="admin-form-input" placeholder="Search logs..." style="max-width:280px;">
          <button type="button" class="admin-btn admin-btn-primary" id="btnOpenAddLogsModal">+ Add Logs</button>
          <button type="button" class="admin-btn" id="btnBulkDeleteLogs">Delete selected</button>
          <span id="logsSelectionInfo" style="color:hsl(var(--admin-muted));font-size:13px;"></span>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th style="width:42px;"><input type="checkbox" id="logsSelectAll"></th><th>Product</th><th>Login</th><th>Sold</th><th>Actions</th></tr></thead><tbody id="adminLogsBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="categories" hidden>
        <div class="admin-table-header" style="margin-bottom:12px;gap:8px;flex-wrap:wrap;">
          <input type="search" id="categorySearch" class="admin-form-input" placeholder="Search categories..." style="max-width:320px;">
          <button type="button" class="admin-btn admin-btn-primary" id="btnOpenCategoryModal">+ Add Category</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Category</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead><tbody id="adminCatBody"></tbody></table>
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
        <div class="admin-table-header" style="margin-bottom:12px;gap:8px;flex-wrap:wrap;">
          <span style="color:hsl(var(--admin-muted));font-size:13px;">Manage user-facing announcements.</span>
          <button type="button" class="admin-btn admin-btn-primary" id="btnOpenBroadcastModal">+ New Broadcast</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>Title</th><th>Preview</th><th>Active</th><th>Updated</th><th>Actions</th></tr></thead><tbody id="adminBcBody"></tbody></table>
        </div>
      </section>

      <section class="admin-tab-panel" data-tab-panel="settings" hidden>
        <div class="admin-grid" style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:14px;">
          <div class="admin-card" style="background:linear-gradient(180deg,#fff,rgba(248,250,252,.8));border:1px solid rgba(15,23,42,.08);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(2,6,23,.05);">
            <div class="admin-table-header" style="margin-bottom:10px;gap:10px;flex-wrap:wrap;">
              <strong>Brand and appearance</strong>
              <span class="muted" id="settingsSavedMsg" style="display:none;">Saved.</span>
              <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="admin-btn admin-btn-primary" id="btnSaveSiteSettings">Save changes</button>
              </div>
            </div>

            <div class="admin-form-group">
              <label class="admin-label" for="siteNameInput">Site name</label>
              <input id="siteNameInput" class="admin-form-input" placeholder="Your brand name" />
              <p class="muted" style="margin:6px 0 0;">Shown in the dashboard header/sidebar.</p>
            </div>

            <div class="admin-form-group">
              <label class="admin-label">Site logo</label>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div style="width:54px;height:54px;border-radius:14px;border:1px solid rgba(15,23,42,.10);background:rgba(15,23,42,.03);display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img id="siteLogoPreview" alt="" style="width:100%;height:100%;object-fit:cover;display:none;">
                  <span id="siteLogoFallback" style="font-size:20px;opacity:.75;">🏷️</span>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <input id="siteLogoUrlInput" class="admin-form-input" placeholder="/storage/site/logo.png or https://..." style="min-width:320px;max-width:520px;" />
                  <label class="admin-btn admin-btn-sm" style="cursor:pointer;">
                    Upload
                    <input id="siteLogoFileInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
                  </label>
                  <button type="button" class="admin-btn admin-btn-sm" id="btnClearSiteLogo">Clear</button>
                </div>
              </div>
              <p class="muted" style="margin:6px 0 0;">Upload saves into mini-laravel `public/storage/site/`.</p>
            </div>

            <div class="admin-form-group">
              <label class="admin-label" for="themePresetSelect">Color combination</label>
              <select id="themePresetSelect" class="admin-form-input" style="max-width:420px;">
                <option value="emerald">Emerald + Slate (default)</option>
                <option value="blue">Blue + Slate</option>
                <option value="purple">Purple + Slate</option>
                <option value="orange">Orange + Slate</option>
              </select>
              <p class="muted" style="margin:6px 0 0;">Applies to mini-laravel dashboard styling.</p>
            </div>
          </div>

          <div class="admin-card" style="background:#fff;border:1px solid rgba(15,23,42,.08);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(2,6,23,.04);">
            <div class="admin-table-header" style="margin-bottom:10px;">
              <strong>Enable / disable features</strong>
              <span class="muted" style="margin-left:auto;">Dashboard visibility</span>
            </div>
            <div style="display:grid;gap:10px;">
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffProducts" />
                <span><strong>Store</strong> (categories/products)</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffWalletFunding" />
                <span><strong>Add funds</strong> page</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffVtu" />
                <span><strong>VTU</strong> (airtime/data/cable/electricity)</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffVirtualAccount" />
                <span><strong>Virtual account</strong> funding method</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffSprintpayPay" />
                <span><strong>SprintPay redirect</strong> funding method</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffSupport" />
                <span><strong>Support</strong> panel</span>
              </label>
              <label style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="ffQuickServices" />
                <span><strong>Quick services shortcuts</strong> on dashboard home</span>
              </label>
            </div>

            <hr style="border:none;border-top:1px solid rgba(15,23,42,.08);margin:14px 0;">

            <details>
              <summary style="cursor:pointer;font-weight:700;">Advanced (raw keys)</summary>
              <div class="admin-table-wrap" style="margin-top:10px;">
                <table class="admin-table">
                  <thead><tr><th>Key</th><th>Value</th></tr></thead>
                  <tbody id="adminSettingsBody"></tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  </div>
</div>

<div id="userModal" class="admin-modal-overlay" hidden>
  <div class="admin-modal" style="max-width:640px;">
    <div class="admin-table-header" style="margin-bottom:12px;">
      <strong id="userModalTitle">Add User</strong>
      <button type="button" class="admin-btn admin-btn-sm" id="btnCloseUserModal">Close</button>
    </div>
    <input type="hidden" id="userModalProfileId">
    <input type="hidden" id="userModalUserId">
    <div class="admin-form-group">
      <label class="admin-form-label" for="userModalName">Name *</label>
      <input class="admin-form-input" id="userModalName" placeholder="Full name">
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="userModalUsername">Username</label>
      <input class="admin-form-input" id="userModalUsername" placeholder="Username">
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="userModalEmail">Email *</label>
      <input class="admin-form-input" id="userModalEmail" type="email" placeholder="user@email.com">
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="userModalPassword">Password <span style="opacity:.7;">(required for new user, optional for edit)</span></label>
      <input class="admin-form-input" id="userModalPassword" type="text" placeholder="Minimum 8 chars">
    </div>
    <div class="admin-form-actions">
      <button type="button" class="admin-btn admin-btn-primary" id="btnSaveUserModal">Save</button>
    </div>
  </div>
</div>

<div id="productEditModal" class="admin-modal-overlay" hidden>
  <div class="admin-modal" style="max-width:760px;">
    <div class="admin-table-header" style="margin-bottom:12px;">
      <strong id="productModalTitle">Edit Product</strong>
      <button type="button" class="admin-btn admin-btn-sm" id="btnCloseProductEditModal">Close</button>
    </div>
    <input type="hidden" id="editProductId">
    <div class="admin-form-group">
      <label class="admin-form-label" for="editProductTitle">Product name</label>
      <input class="admin-form-input" id="editProductTitle" placeholder="Product title">
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="editProductDescription">Description</label>
      <textarea class="admin-form-input" id="editProductDescription" rows="3" placeholder="Product description"></textarea>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="editProductCategory">Category *</label>
      <select class="admin-form-input" id="editProductCategory"></select>
    </div>
    <div class="admin-form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div>
        <label class="admin-form-label" for="editProductPlatform">Platform *</label>
        <input class="admin-form-input" id="editProductPlatform" placeholder="e.g. Instagram">
      </div>
      <div>
        <label class="admin-form-label" for="editProductCurrency">Currency</label>
        <input class="admin-form-input" id="editProductCurrency" value="NGN">
      </div>
    </div>
    <div class="admin-form-group" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
      <div>
        <label class="admin-form-label" for="editProductPrice">Price *</label>
        <input class="admin-form-input" id="editProductPrice" type="number" min="0" step="0.01" placeholder="0">
      </div>
      <div>
        <label class="admin-form-label" for="editProductStock">Stock</label>
        <input class="admin-form-input" id="editProductStock" type="number" min="0" step="1" placeholder="0">
      </div>
      <div>
        <label class="admin-form-label" for="editProductActive">Active</label>
        <select class="admin-form-input" id="editProductActive">
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </div>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="editProductImageUrl">Image URL</label>
      <input class="admin-form-input" id="editProductImageUrl" placeholder="/storage/product_images/..." />
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <input type="file" id="editProductImageFile" accept="image/*" class="admin-form-input" style="max-width:280px;">
        <button type="button" class="admin-btn" id="btnUploadProductImage">Upload image</button>
      </div>
    </div>
    <div class="admin-form-actions">
      <button type="button" class="admin-btn admin-btn-primary" id="btnSaveProductEdit">Save changes</button>
    </div>
  </div>
</div>

<div id="addLogsModal" class="admin-modal-overlay" hidden>
  <div class="admin-modal" style="max-width:760px;">
    <div class="admin-table-header" style="margin-bottom:12px;">
      <strong>Add Account Logs</strong>
      <button type="button" class="admin-btn admin-btn-sm" id="btnCloseAddLogsModal">Close</button>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="addLogsProduct">Product *</label>
      <input class="admin-form-input" id="addLogsProduct" list="addLogsProductList" placeholder="Search and select product..." autocomplete="off">
      <datalist id="addLogsProductList"></datalist>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="addLogsSingleLogin">Single log (optional)</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <input class="admin-form-input" id="addLogsSingleLogin" placeholder="login/email">
        <input class="admin-form-input" id="addLogsSinglePassword" placeholder="password">
      </div>
      <button type="button" class="admin-btn admin-btn-sm" id="btnAddSingleLog" style="margin-top:8px;">Add single log</button>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="addLogsBulkText">Bulk logs</label>
      <textarea class="admin-form-input" id="addLogsBulkText" rows="8" placeholder="one per line: login:password"></textarea>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <input type="file" id="addLogsBulkFile" accept=".txt,.csv,text/plain" class="admin-form-input" style="max-width:280px;">
        <button type="button" class="admin-btn admin-btn-primary" id="btnUploadBulkLogs">Bulk upload</button>
      </div>
    </div>
  </div>
</div>

<div id="logViewModal" class="admin-modal-overlay" hidden>
  <div class="admin-modal" style="max-width:640px;">
    <div class="admin-table-header" style="margin-bottom:12px;">
      <strong>Account Log Details</strong>
      <button type="button" class="admin-btn admin-btn-sm" id="btnCloseLogViewModal">Close</button>
    </div>
    <div style="display:grid;gap:10px;">
      <div><strong>Product:</strong> <span id="logViewProduct">—</span></div>
      <div><strong>Account:</strong> <code id="logViewAccount">—</code></div>
      <div><strong>Sold:</strong> <span id="logViewSold">—</span></div>
      <div><strong>Created:</strong> <span id="logViewCreated">—</span></div>
    </div>
  </div>
</div>

<div id="categoryModal" class="admin-modal-overlay" hidden>
  <div class="admin-modal" style="max-width:680px;">
    <div class="admin-table-header" style="margin-bottom:12px;">
      <strong id="categoryModalTitle">Add Category</strong>
      <button type="button" class="admin-btn admin-btn-sm" id="btnCloseCategoryModal">Close</button>
    </div>
    <input type="hidden" id="categoryId">
    <div class="admin-form-group">
      <label class="admin-form-label" for="categoryName">Name *</label>
      <input class="admin-form-input" id="categoryName" placeholder="Category name">
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="categorySlug">Slug</label>
      <input class="admin-form-input" id="categorySlug" placeholder="category-slug">
    </div>
    <div class="admin-form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div>
        <label class="admin-form-label" for="categoryEmoji">Emoji</label>
        <input class="admin-form-input" id="categoryEmoji" placeholder="📁">
      </div>
      <div>
        <label class="admin-form-label" for="categoryDisplayOrder">Display order</label>
        <input class="admin-form-input" id="categoryDisplayOrder" type="number" min="0" step="1" placeholder="0">
      </div>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="categoryImageUrl">Category icon/image URL</label>
      <input class="admin-form-input" id="categoryImageUrl" placeholder="/storage/category_images/...">
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <input type="file" id="categoryImageFile" accept="image/*" class="admin-form-input" style="max-width:280px;">
        <button type="button" class="admin-btn" id="btnUploadCategoryImage">Upload image</button>
      </div>
    </div>
    <div class="admin-form-actions">
      <button type="button" class="admin-btn admin-btn-primary" id="btnSaveCategoryModal">Save category</button>
    </div>
  </div>
</div>

<div id="broadcastModal" class="admin-modal-overlay" hidden>
  <div class="admin-modal" style="max-width:760px;">
    <div class="admin-table-header" style="margin-bottom:12px;">
      <strong id="broadcastModalTitle">New Broadcast</strong>
      <button type="button" class="admin-btn admin-btn-sm" id="btnCloseBroadcastModal">Close</button>
    </div>
    <input type="hidden" id="broadcastId">
    <div class="admin-form-group">
      <label class="admin-form-label" for="broadcastTitle">Title *</label>
      <input class="admin-form-input" id="broadcastTitle" placeholder="Service update">
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label" for="broadcastBody">Message *</label>
      <textarea class="admin-form-input" id="broadcastBody" rows="6" placeholder="Write the broadcast message shown to users..."></textarea>
    </div>
    <div class="admin-form-group">
      <label style="display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="broadcastActive" checked />
        <span>Broadcast is active</span>
      </label>
    </div>
    <div class="admin-form-actions">
      <button type="button" class="admin-btn admin-btn-primary" id="btnSaveBroadcastModal">Save broadcast</button>
    </div>
  </div>
</div>

@endsection

@push('scripts')
<script src="{{ asset('js/admin-blade.js') }}"></script>
@endpush
