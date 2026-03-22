/**
 * Admin panel — Blade UI, same /api/admin/* as React (proxied).
 */
(function () {
  const TAB_TITLES = {
    overview: "Overview",
    users: "Users",
    orders: "Orders",
    products: "Products",
    logs: "Account Logs",
    categories: "Categories",
    transactions: "Transactions",
    admins: "Admin Roles",
    messages: "Messages",
    broadcasts: "Broadcasts",
    settings: "Settings",
  };

  let usersPage = 1;
  let usersLastPage = 1;
  let userSearch = "";
  let productsCache = [];
  let categoriesCache = [];

  function $(s) {
    return document.querySelector(s);
  }
  function $all(s) {
    return Array.prototype.slice.call(document.querySelectorAll(s));
  }

  function switchTab(name) {
    $all(".admin-nav-item[data-tab]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    $all(".admin-tab-panel").forEach(function (p) {
      p.hidden = p.getAttribute("data-tab-panel") !== name;
    });
    var t = $("#adminTabTitle");
    if (t) t.textContent = TAB_TITLES[name] || "Admin";
    document.getElementById("adminSidebar")?.classList.remove("open");
    document.getElementById("adminSidebarOverlay")?.classList.remove("open");
    if (name === "users") loadUsers();
    if (name === "orders") loadOrders();
    if (name === "products") loadProducts();
    if (name === "logs") loadLogs();
    if (name === "categories") loadCategories();
    if (name === "transactions") loadTransactions();
    if (name === "admins") loadRoles();
    if (name === "messages") loadMessages();
    if (name === "broadcasts") loadBroadcasts();
    if (name === "settings") loadSettings();
    if (name === "overview") loadOverview();
  }

  async function loadOverview() {
    const el = $("#adminStats");
    const note = $("#overviewNote");
    if (note) note.textContent = "Loading…";
    try {
      const [orders, wallets, prof, products] = await Promise.all([
        miniApi("/admin/orders"),
        miniApi("/admin/wallets"),
        miniApi("/admin/profiles?page=1&per_page=1"),
        miniApi("/admin/products"),
      ]);
      const o = Array.isArray(orders) ? orders : [];
      const revenue = o.reduce(function (s, x) {
        return s + Number(x.total_price || 0);
      }, 0);
      const pending = o.filter(function (x) {
        return x.status === "pending";
      }).length;
      const totalUsers = typeof prof.total === "number" ? prof.total : 0;
      if (el) {
        el.innerHTML =
          '<div class="admin-stat-card"><div class="admin-stat-label">Total users</div><div class="admin-stat-val">' +
          totalUsers.toLocaleString() +
          '</div></div><div class="admin-stat-card"><div class="admin-stat-label">Orders</div><div class="admin-stat-val">' +
          o.length +
          '</div><div class="admin-stat-sub">' +
          pending +
          " pending</div></div>" +
          '<div class="admin-stat-card"><div class="admin-stat-label">Revenue (sum)</div><div class="admin-stat-val">₦' +
          revenue.toLocaleString() +
          '</div></div><div class="admin-stat-card"><div class="admin-stat-label">Products</div><div class="admin-stat-val">' +
          (Array.isArray(products) ? products.length : 0) +
          "</div></div>";
      }
      if (note) note.textContent = "";
    } catch (e) {
      if (note) note.textContent = e.message || "Failed to load overview";
    }
  }

  async function loadUsers() {
    const params = new URLSearchParams({ page: String(usersPage), per_page: "50" });
    if (userSearch.trim()) params.set("search", userSearch.trim());
    try {
      const res = await miniApi("/admin/profiles?" + params.toString());
      const list = Array.isArray(res.profiles) ? res.profiles : [];
      usersLastPage = typeof res.last_page === "number" ? res.last_page : 1;
      const tb = $("#adminUsersBody");
      if (tb) {
        tb.innerHTML = "";
        list.forEach(function (p) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            (p.username || "—") +
            "</td><td>" +
            (p.email || "") +
            "</td><td>₦" +
            Number(p.balance || 0).toLocaleString() +
            "</td><td>" +
            (p.is_blocked ? "Yes" : "No") +
            '</td><td><button type="button" class="admin-btn admin-btn-sm block-btn" data-profile-id="' +
            p.id +
            '">' +
            (p.is_blocked ? "Unblock" : "Block") +
            "</button></td>";
          tb.appendChild(tr);
        });
        $all(".block-btn").forEach(function (btn) {
          btn.addEventListener("click", async function () {
            var id = btn.getAttribute("data-profile-id");
            try {
              await miniApi("/admin/profiles/" + id + "/block", { method: "PATCH" });
              loadUsers();
            } catch (e) {
              alert(e.message || "Failed");
            }
          });
        });
      }
      var pi = $("#usersPageInfo");
      if (pi) pi.textContent = "Page " + usersPage + " / " + usersLastPage;
    } catch (e) {
      alert(e.message || "Failed to load users");
    }
  }

  async function loadOrders() {
    try {
      const orders = await miniApi("/admin/orders");
      const o = Array.isArray(orders) ? orders : [];
      const tb = $("#adminOrdersBody");
      if (!tb) return;
      tb.innerHTML = "";
      o.forEach(function (ord) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          (ord.user_id || "").slice(0, 8) +
          "…</td><td>" +
          (ord.product_title || "") +
          "</td><td>₦" +
          Number(ord.total_price || 0).toLocaleString() +
          "</td><td>" +
          (ord.status || "") +
          '</td><td>' +
          (ord.created_at || "").slice(0, 16) +
          '</td><td><select class="admin-form-input order-status" data-id="' +
          ord.id +
          '" style="min-width:120px;">' +
          ["pending", "completed", "cancelled"]
            .map(function (s) {
              return (
                '<option value="' +
                s +
                '"' +
                (ord.status === s ? " selected" : "") +
                ">" +
                s +
                "</option>"
              );
            })
            .join("") +
          "</select></td>";
        tb.appendChild(tr);
      });
      $all(".order-status").forEach(function (sel) {
        sel.addEventListener("change", async function () {
          var id = sel.getAttribute("data-id");
          try {
            await miniApi("/admin/orders/" + id + "/status", {
              method: "PATCH",
              body: JSON.stringify({ status: sel.value }),
            });
          } catch (e) {
            alert(e.message || "Failed");
          }
        });
      });
    } catch (e) {
      alert(e.message || "Failed orders");
    }
  }

  async function loadProducts() {
    try {
      const products = await miniApi("/admin/products");
      productsCache = Array.isArray(products) ? products : [];
      const tb = $("#adminProductsBody");
      if (!tb) return;
      tb.innerHTML = "";
      productsCache.forEach(function (p) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          (p.title || "") +
          "</td><td>" +
          (p.platform || "") +
          "</td><td>₦" +
          Number(p.price || 0).toLocaleString() +
          "</td><td>" +
          (p.stock ?? "") +
          "</td><td>" +
          (p.is_active ? "Yes" : "No") +
          "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed products");
    }
  }

  async function loadLogs() {
    try {
      const res = await miniApi("/admin/account-logs?limit=200");
      const logs = res && res.logs ? res.logs : Array.isArray(res) ? res : [];
      const tb = $("#adminLogsBody");
      if (!tb) return;
      tb.innerHTML = "";
      (Array.isArray(logs) ? logs : []).slice(0, 100).forEach(function (l) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          (l.product_id || "").slice(0, 8) +
          "…</td><td style=\"max-width:180px;overflow:hidden;text-overflow:ellipsis;\">" +
          (l.login || "") +
          "</td><td>" +
          (l.is_sold ? "Yes" : "No") +
          '</td><td><button type="button" class="admin-btn admin-btn-sm log-del" data-id="' +
          l.id +
          '">Delete</button></td>';
        tb.appendChild(tr);
      });
      $all(".log-del").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          if (!confirm("Delete this log?")) return;
          var id = btn.getAttribute("data-id");
          try {
            await miniApi("/admin/account-logs/" + id, { method: "DELETE" });
            loadLogs();
          } catch (e) {
            alert(e.message || "Failed");
          }
        });
      });
    } catch (e) {
      alert(e.message || "Failed logs");
    }
  }

  async function loadCategories() {
    try {
      const cats = await miniApi("/admin/categories");
      categoriesCache = Array.isArray(cats) ? cats : [];
      const tb = $("#adminCatBody");
      if (!tb) return;
      tb.innerHTML = "";
      categoriesCache.forEach(function (c) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          (c.name || "") +
          "</td><td>" +
          (c.slug || "") +
          "</td><td>" +
          (c.emoji || "") +
          "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed categories");
    }
  }

  async function loadTransactions() {
    try {
      const tx = await miniApi("/admin/transactions");
      const list = Array.isArray(tx) ? tx : [];
      const tb = $("#adminTxBody");
      if (!tb) return;
      tb.innerHTML = "";
      list.slice(0, 200).forEach(function (t) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          (t.user_id || "").slice(0, 8) +
          "…</td><td>" +
          (t.currency || "NGN") +
          " " +
          Number(t.amount || 0).toLocaleString() +
          "</td><td>" +
          (t.type || "") +
          "</td><td>" +
          (t.description || "") +
          "</td><td>" +
          (t.created_at || "").slice(0, 16) +
          "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed transactions");
    }
  }

  async function loadRoles() {
    try {
      const roles = await miniApi("/admin/user-roles");
      const list = Array.isArray(roles) ? roles : [];
      const tb = $("#adminRolesBody");
      if (!tb) return;
      tb.innerHTML = "";
      list.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.user_id || "") + "</td><td>" + (r.role || "") + "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed roles");
    }
  }

  async function loadMessages() {
    try {
      const msgs = await miniApi("/admin/messages");
      const list = Array.isArray(msgs) ? msgs : [];
      const tb = $("#adminMsgBody");
      if (!tb) return;
      tb.innerHTML = "";
      list.slice(0, 100).forEach(function (m) {
        var tr = document.createElement("tr");
        var prev = (m.content || "").slice(0, 80);
        tr.innerHTML =
          "<td>" +
          (m.sender_id || "").slice(0, 8) +
          "…</td><td>" +
          (m.receiver_id || "").slice(0, 8) +
          "…</td><td>" +
          prev +
          "</td><td>" +
          (m.created_at || "").slice(0, 16) +
          "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed messages");
    }
  }

  async function loadBroadcasts() {
    try {
      const bc = await miniApi("/admin/broadcast-messages");
      const list = Array.isArray(bc) ? bc : [];
      const tb = $("#adminBcBody");
      if (!tb) return;
      tb.innerHTML = "";
      list.forEach(function (b) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          (b.title || "") +
          "</td><td>" +
          (b.is_active ? "Yes" : "No") +
          "</td><td>" +
          (b.updated_at || b.created_at || "").slice(0, 16) +
          "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed broadcasts");
    }
  }

  async function loadSettings() {
    try {
      const ss = await miniApi("/admin/site-settings");
      const list = Array.isArray(ss) ? ss : [];
      const tb = $("#adminSettingsBody");
      if (!tb) return;
      tb.innerHTML = "";
      list.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (row.key || "") + "</td><td>" + (row.value || "").slice(0, 120) + "</td>";
        tb.appendChild(tr);
      });
    } catch (e) {
      alert(e.message || "Failed settings");
    }
  }

  async function refreshAll() {
    await loadOverview();
    var active = document.querySelector(".admin-nav-item.active");
    if (active) switchTab(active.getAttribute("data-tab"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    $all(".admin-nav-item[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    });
    $("#adminHamburger")?.addEventListener("click", function () {
      document.getElementById("adminSidebar")?.classList.toggle("open");
      document.getElementById("adminSidebarOverlay")?.classList.toggle("open");
    });
    $("#adminSidebarOverlay")?.addEventListener("click", function () {
      document.getElementById("adminSidebar")?.classList.remove("open");
      $("#adminSidebarOverlay").classList.remove("open");
    });
    $("#btnAdminRefresh")?.addEventListener("click", function () {
      refreshAll();
    });
    $("#btnUserSearch")?.addEventListener("click", function () {
      userSearch = $("#userSearch").value || "";
      usersPage = 1;
      loadUsers();
    });
    $("#usersPrev")?.addEventListener("click", function () {
      if (usersPage > 1) {
        usersPage--;
        loadUsers();
      }
    });
    $("#usersNext")?.addEventListener("click", function () {
      if (usersPage < usersLastPage) {
        usersPage++;
        loadUsers();
      }
    });
    loadOverview();
  });
})();
