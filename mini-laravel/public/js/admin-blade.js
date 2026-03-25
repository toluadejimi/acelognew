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
  let productSearch = "";
  let categorySearch = "";
  let productsCache = [];
  let categoriesCache = [];
  let editingProduct = null;
  let editingUser = null;
  let editingCategory = null;
  let broadcastCache = [];
  let editingBroadcast = null;
  let logProductOptions = [];
  let selectedLogIds = [];
  let logsSearch = "";

  function $(s) {
    return document.querySelector(s);
  }
  function $all(s) {
    return Array.prototype.slice.call(document.querySelectorAll(s));
  }

  function resolveImageUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return String(url).startsWith("/") ? url : "/" + url;
  }

  async function miniApiFormData(path, formData, method) {
    const p = path.startsWith("/") ? path : "/" + path;
    const res = await fetch("/api" + p, {
      method: method || "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      body: formData,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      throw new Error(data.message || data.error || res.statusText || "Request failed");
    }
    return data;
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
    if (name === "logs") {
      loadProducts().then(function () {
        loadLogs();
      });
    }
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
            '</td><td style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="admin-btn admin-btn-sm block-btn" data-profile-id="' +
            p.id +
            '">' +
            (p.is_blocked ? "Unblock" : "Block") +
            '</button><button type="button" class="admin-btn admin-btn-sm user-edit" data-profile-id="' +
            p.id +
            '">Edit</button><button type="button" class="admin-btn admin-btn-sm user-credit" data-user-id="' +
            p.user_id +
            '">Credit</button><button type="button" class="admin-btn admin-btn-sm" style="background:hsl(210 85% 92%);color:hsl(210 70% 35%);" data-impersonate="' +
            p.user_id +
            '">Login As</button><button type="button" class="admin-btn admin-btn-sm" style="background:hsl(0 72% 92%);color:hsl(0 60% 40%);" data-user-del="' +
            p.user_id +
            '">Delete</button></td>';
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
        $all(".user-edit").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var pid = btn.getAttribute("data-profile-id");
            var p = list.find(function (x) { return x.id === pid; });
            if (!p) return;
            editingUser = p;
            $("#userModalTitle").textContent = "Edit User";
            $("#userModalProfileId").value = p.id || "";
            $("#userModalUserId").value = p.user_id || "";
            $("#userModalName").value = p.username || "";
            $("#userModalUsername").value = p.username || "";
            $("#userModalEmail").value = p.email || "";
            $("#userModalPassword").value = "";
            $("#userModal").hidden = false;
          });
        });
        $all(".user-credit").forEach(function (btn) {
          btn.addEventListener("click", async function () {
            var uid = btn.getAttribute("data-user-id");
            var amountRaw = prompt("Enter amount (positive to credit, negative to debit):", "1000");
            if (amountRaw === null) return;
            var amount = Number(amountRaw);
            if (!isFinite(amount) || amount === 0) return alert("Invalid amount.");
            var description = prompt("Description (optional):", "Admin credit") || "";
            try {
              await miniApi("/admin/wallets/credit", {
                method: "POST",
                body: JSON.stringify({ user_id: uid, amount: amount, description: description }),
              });
              loadUsers();
            } catch (e) {
              alert(e.message || "Credit failed");
            }
          });
        });
        $all('button[data-user-del]').forEach(function (btn) {
          btn.addEventListener("click", async function () {
            var uid = btn.getAttribute("data-user-del");
            if (!confirm("Delete this user? This is permanent (if no order/transaction history).")) return;
            try {
              await miniApi("/admin/users/" + uid, { method: "DELETE" });
              loadUsers();
            } catch (e) {
              alert(e.message || "Delete failed");
            }
          });
        });
        $all('button[data-impersonate]').forEach(function (btn) {
          btn.addEventListener("click", async function () {
            var uid = btn.getAttribute("data-impersonate");
            if (!confirm("Login as this user now?")) return;
            try {
              await miniApi("/admin/users/" + uid + "/impersonate", { method: "POST" });
              window.location.href = "/dashboard";
            } catch (e) {
              alert(e.message || "Impersonation failed");
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

  async function saveUserModal() {
    var userId = ($("#userModalUserId") && $("#userModalUserId").value) || "";
    var name = ($("#userModalName") && $("#userModalName").value.trim()) || "";
    var username = ($("#userModalUsername") && $("#userModalUsername").value.trim()) || "";
    var email = ($("#userModalEmail") && $("#userModalEmail").value.trim()) || "";
    var password = ($("#userModalPassword") && $("#userModalPassword").value) || "";
    if (!name || !email) return alert("Name and email are required.");
    try {
      if (userId) {
        var body = { name: name, email: email, username: username };
        if (password.trim()) body.password = password;
        await miniApi("/admin/users/" + userId, { method: "PUT", body: JSON.stringify(body) });
      } else {
        if (!password.trim()) return alert("Password is required for new user.");
        await miniApi("/admin/users", {
          method: "POST",
          body: JSON.stringify({ name: name, email: email, password: password, username: username }),
        });
      }
      $("#userModal").hidden = true;
      editingUser = null;
      loadUsers();
    } catch (e) {
      alert(e.message || "Failed to save user");
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
      if (!categoriesCache.length) {
        const cats = await miniApi("/admin/categories").catch(function () {
          return [];
        });
        categoriesCache = Array.isArray(cats) ? cats : [];
      }
      const tb = $("#adminProductsBody");
      if (!tb) return;
      tb.innerHTML = "";
      var q = (productSearch || "").trim().toLowerCase();
      var filtered = productsCache.filter(function (p) {
        if (!q) return true;
        return (
          String(p.title || "").toLowerCase().includes(q) ||
          String(p.platform || "").toLowerCase().includes(q) ||
          String(p.description || "").toLowerCase().includes(q)
        );
      });
      filtered.forEach(function (p) {
        var tr = document.createElement("tr");
        var activeLabel = p.is_active ? "Yes" : "No";
        var toggleLabel = p.is_active ? "Disable" : "Enable";
        var img = resolveImageUrl(p.image_url);
        var titleHtml =
          '<div style="display:flex;align-items:center;gap:10px;min-width:220px;">' +
          (img
            ? '<img src="' +
              img +
              '" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover;border:1px solid hsl(var(--admin-border));background:hsl(220 20% 96%);" loading="lazy" />'
            : '<span aria-hidden="true" style="width:34px;height:34px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:1px solid hsl(var(--admin-border));background:hsl(220 20% 96%);font-size:14px;">🛍️</span>') +
          '<span style="font-weight:600;">' +
          (p.title || "") +
          "</span></div>";
        tr.innerHTML =
          "<td>" +
          titleHtml +
          "</td><td>" +
          (p.platform || "") +
          "</td><td>₦" +
          Number(p.price || 0).toLocaleString() +
          "</td><td>" +
          (p.stock ?? "") +
          "</td><td>" +
          activeLabel +
          '</td><td style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="admin-btn admin-btn-sm p-edit" data-id="' +
          p.id +
          '">Edit</button><button type="button" class="admin-btn admin-btn-sm p-toggle" data-id="' +
          p.id +
          '">' +
          toggleLabel +
          '</button><button type="button" class="admin-btn admin-btn-sm" style="background:hsl(0 72% 92%);color:hsl(0 60% 40%);" data-id="' +
          p.id +
          '" data-del="1">Delete</button></td>';
        tb.appendChild(tr);
      });
      $all(".p-edit").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var p = productsCache.find(function (x) {
            return x.id === id;
          });
          if (!p) return;
          editingProduct = p;
          $("#productModalTitle").textContent = "Edit Product";
          $("#editProductId").value = p.id || "";
          $("#editProductTitle").value = p.title || "";
          $("#editProductDescription").value = p.description || "";
          $("#editProductPlatform").value = p.platform || "";
          $("#editProductPrice").value = Number(p.price || 0);
          $("#editProductStock").value = Number(p.stock || 0);
          $("#editProductCurrency").value = p.currency || "NGN";
          $("#editProductActive").value = p.is_active ? "1" : "0";
          $("#editProductImageUrl").value = p.image_url || "";
          fillProductCategorySelect(p.category_id || "");
          $("#productEditModal").hidden = false;
        });
      });
      $all(".p-toggle").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var id = btn.getAttribute("data-id");
          var p = productsCache.find(function (x) { return x.id === id; });
          if (!p) return;
          try {
            await miniApi("/admin/products/" + id, {
              method: "PUT",
              body: JSON.stringify({ is_active: !p.is_active }),
            });
            await loadProducts();
          } catch (e) {
            alert(e.message || "Failed to toggle product");
          }
        });
      });
      $all('button[data-del="1"]').forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var id = btn.getAttribute("data-id");
          if (!confirm("Delete this product?")) return;
          try {
            await miniApi("/admin/products/" + id, { method: "DELETE" });
            await loadProducts();
          } catch (e) {
            alert(e.message || "Failed to delete product");
          }
        });
      });
    } catch (e) {
      alert(e.message || "Failed products");
    }
  }

  function fillProductCategorySelect(selectedId) {
    var sel = $("#editProductCategory");
    if (!sel) return;
    sel.innerHTML = '<option value="">Select category</option>';
    categoriesCache.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = (c.emoji || "📁") + " " + (c.name || "Category");
      if (selectedId && selectedId === c.id) o.selected = true;
      sel.appendChild(o);
    });
  }

  async function loadLogs() {
    try {
      const res = await miniApi("/admin/account-logs?limit=200");
      const allLogs = res && res.logs ? res.logs : Array.isArray(res) ? res : [];
      var q = (logsSearch || "").trim().toLowerCase();
      const logs = (Array.isArray(allLogs) ? allLogs : []).filter(function (l) {
        if (!q) return true;
        var p = productsCache.find(function (x) { return x.id === l.product_id; });
        var productTitle = p ? (p.title || "") : "";
        var sold = l.is_sold ? "yes sold true" : "no unsold false";
        var accountLine = String(l.login || "") + " " + String(l.password || "");
        var hay = (productTitle + " " + accountLine + " " + sold).toLowerCase();
        return hay.indexOf(q) >= 0;
      });
      const tb = $("#adminLogsBody");
      if (!tb) return;
      tb.innerHTML = "";
      var visibleIds = [];
      (Array.isArray(logs) ? logs : []).slice(0, 100).forEach(function (l) {
        var p = productsCache.find(function (x) {
          return x.id === l.product_id;
        });
        visibleIds.push(l.id);
        var checked = selectedLogIds.indexOf(l.id) >= 0 ? " checked" : "";
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td><input type="checkbox" class="log-select" data-id="' +
          l.id +
          '"' +
          checked +
          "></td><td>" +
          (p ? p.title : (l.product_id || "").slice(0, 8) + "…") +
          "</td><td style=\"max-width:180px;overflow:hidden;text-overflow:ellipsis;\">" +
          (l.login || "") +
          "</td><td>" +
          (l.is_sold ? "Yes" : "No") +
          '</td><td style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="admin-btn admin-btn-sm log-view" data-id="' +
          l.id +
          '">View</button><button type="button" class="admin-btn admin-btn-sm log-del" data-id="' +
          l.id +
          '">Delete</button></td>';
        tb.appendChild(tr);
      });
      selectedLogIds = selectedLogIds.filter(function (id) {
        return visibleIds.indexOf(id) >= 0;
      });

      function syncLogsSelectionUi() {
        var all = $("#logsSelectAll");
        var boxes = $all(".log-select");
        var count = boxes.filter(function (x) { return x.checked; }).length;
        var info = $("#logsSelectionInfo");
        if (info) info.textContent = count > 0 ? count + " selected" : "";
        if (all) {
          all.checked = boxes.length > 0 && count === boxes.length;
          all.indeterminate = count > 0 && count < boxes.length;
        }
      }

      $all(".log-select").forEach(function (box) {
        box.addEventListener("change", function () {
          var id = box.getAttribute("data-id");
          if (!id) return;
          if (box.checked) {
            if (selectedLogIds.indexOf(id) === -1) selectedLogIds.push(id);
          } else {
            selectedLogIds = selectedLogIds.filter(function (x) { return x !== id; });
          }
          syncLogsSelectionUi();
        });
      });
      $all(".log-del").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          if (!confirm("Delete this log?")) return;
          var id = btn.getAttribute("data-id");
          try {
            await miniApi("/admin/account-logs/" + id, { method: "DELETE" });
            selectedLogIds = selectedLogIds.filter(function (x) { return x !== id; });
            loadLogs();
          } catch (e) {
            alert(e.message || "Failed");
          }
        });
      });
      $all(".log-view").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var l = logs.find(function (x) { return x.id === id; });
          if (!l) return;
          var p = productsCache.find(function (x) { return x.id === l.product_id; });
          var accountLine = String(l.login || "") + "\t" + String(l.password || "");
          if ($("#logViewProduct")) $("#logViewProduct").textContent = p ? p.title : (l.product_id || "—");
          if ($("#logViewAccount")) $("#logViewAccount").textContent = accountLine || "—";
          if ($("#logViewSold")) $("#logViewSold").textContent = l.is_sold ? "Yes" : "No";
          if ($("#logViewCreated")) $("#logViewCreated").textContent = (l.created_at || "").slice(0, 19) || "—";
          if ($("#logViewModal")) $("#logViewModal").hidden = false;
        });
      });
      syncLogsSelectionUi();
    } catch (e) {
      alert(e.message || "Failed logs");
    }
  }

  async function bulkDeleteSelectedLogs() {
    if (!selectedLogIds.length) {
      alert("Select at least one log.");
      return;
    }
    if (!confirm("Delete " + selectedLogIds.length + " selected logs?")) return;
    try {
      await miniApi("/admin/account-logs/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedLogIds.slice() }),
      });
      selectedLogIds = [];
      await loadLogs();
      await loadProducts();
    } catch (e) {
      alert(e.message || "Bulk delete failed");
    }
  }

  function parseLogLine(line) {
    var s = (line || "").trim();
    if (!s) return null;
    var delimiters = [":", "|", "\t", ","];
    for (var i = 0; i < delimiters.length; i++) {
      var d = delimiters[i];
      var idx = s.indexOf(d);
      if (idx > 0) {
        var login = s.slice(0, idx).trim();
        var password = s.slice(idx + 1).trim();
        if (!login || !password) return null;
        return { login: login, password: password };
      }
    }
    return null;
  }

  function fillLogProductSelect() {
    var list = $("#addLogsProductList");
    if (!list) return;
    list.innerHTML = "";
    logProductOptions = [];
    productsCache.forEach(function (p) {
      var label = (p.title || "Untitled") + " (" + (p.platform || "General") + ")";
      logProductOptions.push({ id: p.id, label: label });
      var o = document.createElement("option");
      o.value = label;
      list.appendChild(o);
    });
  }

  function getSelectedLogProductId() {
    var raw = ($("#addLogsProduct") && $("#addLogsProduct").value.trim()) || "";
    if (!raw) return "";
    // Backward compatibility if ID is somehow pasted in.
    var byId = productsCache.find(function (p) { return p.id === raw; });
    if (byId) return byId.id;
    var byLabel = logProductOptions.find(function (x) { return x.label.toLowerCase() === raw.toLowerCase(); });
    return byLabel ? byLabel.id : "";
  }

  async function saveProductEdit() {
    var id = ($("#editProductId") && $("#editProductId").value) || "";
    var title = ($("#editProductTitle") && $("#editProductTitle").value.trim()) || "";
    var description = ($("#editProductDescription") && $("#editProductDescription").value.trim()) || "";
    var platform = ($("#editProductPlatform") && $("#editProductPlatform").value.trim()) || "";
    var categoryId = ($("#editProductCategory") && $("#editProductCategory").value) || "";
    var price = Number(($("#editProductPrice") && $("#editProductPrice").value) || 0);
    var stock = Number(($("#editProductStock") && $("#editProductStock").value) || 0);
    var currency = ($("#editProductCurrency") && $("#editProductCurrency").value.trim()) || "NGN";
    var isActive = ($("#editProductActive") && $("#editProductActive").value) === "1";
    var imageUrl = ($("#editProductImageUrl") && $("#editProductImageUrl").value.trim()) || null;
    if (!title || !platform || !categoryId || !description || !isFinite(price)) {
      alert("Fill required fields: title, description, category, platform, price.");
      return;
    }
    var body = {
      title: title,
      description: description,
      platform: platform,
      category_id: categoryId,
      price: price,
      stock: isFinite(stock) ? stock : 0,
      currency: currency || "NGN",
      is_active: isActive,
      image_url: imageUrl,
    };
    try {
      if (id) await miniApi("/admin/products/" + id, { method: "PUT", body: JSON.stringify(body) });
      else await miniApi("/admin/products", { method: "POST", body: JSON.stringify(body) });
      $("#productEditModal").hidden = true;
      editingProduct = null;
      await loadProducts();
    } catch (e) {
      alert(e.message || "Failed to save product");
    }
  }

  async function addSingleLogFromModal() {
    var productId = getSelectedLogProductId();
    var login = ($("#addLogsSingleLogin") && $("#addLogsSingleLogin").value.trim()) || "";
    var password = ($("#addLogsSinglePassword") && $("#addLogsSinglePassword").value.trim()) || "";
    if (!productId || !login || !password) {
      alert("Select a valid product from dropdown and fill login/password.");
      return;
    }
    try {
      await miniApi("/admin/account-logs", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, login: login, password: password }),
      });
      $("#addLogsSingleLogin").value = "";
      $("#addLogsSinglePassword").value = "";
      await loadLogs();
      await loadProducts();
    } catch (e) {
      alert(e.message || "Failed to add log");
    }
  }

  async function addBulkLogsFromModal() {
    var productId = getSelectedLogProductId();
    var raw = ($("#addLogsBulkText") && $("#addLogsBulkText").value) || "";
    if (!productId || !raw.trim()) {
      alert("Select a valid product from dropdown and paste logs.");
      return;
    }
    var lines = raw.split(/\r\n|\r|\n/);
    var logs = [];
    lines.forEach(function (line) {
      var parsed = parseLogLine(line);
      if (!parsed) return;
      logs.push({ product_id: productId, login: parsed.login, password: parsed.password });
    });
    if (logs.length === 0) {
      alert("No valid logs parsed. Use login:password format.");
      return;
    }
    try {
      var BATCH = 250;
      for (var i = 0; i < logs.length; i += BATCH) {
        var chunk = logs.slice(i, i + BATCH);
        await miniApi("/admin/account-logs/bulk", { method: "POST", body: JSON.stringify({ logs: chunk }) });
      }
      $("#addLogsBulkText").value = "";
      await loadLogs();
      await loadProducts();
      $("#addLogsModal").hidden = true;
    } catch (e) {
      alert(e.message || "Failed bulk upload");
    }
  }

  async function loadCategories() {
    try {
      const cats = await miniApi("/admin/categories");
      categoriesCache = Array.isArray(cats) ? cats : [];
      const tb = $("#adminCatBody");
      if (!tb) return;
      tb.innerHTML = "";
      var q = (categorySearch || "").trim().toLowerCase();
      categoriesCache.forEach(function (c) {
        var label = (c.name || "") + " " + (c.slug || "");
        if (q && label.toLowerCase().indexOf(q) === -1) return;
        var tr = document.createElement("tr");
        var icon = resolveImageUrl(c.image_url || c.icon_url);
        var titleHtml =
          '<div style="display:flex;align-items:center;gap:10px;">' +
          (icon
            ? '<img src="' + icon + '" alt="" style="width:30px;height:30px;border-radius:8px;object-fit:cover;border:1px solid hsl(var(--admin-border));background:hsl(220 20% 96%);" />'
            : '<span style="width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:1px solid hsl(var(--admin-border));background:hsl(220 20% 96%);">' + (c.emoji || "📁") + "</span>") +
          '<span style="font-weight:600;">' + (c.name || "") + "</span></div>";
        var isActive = c.is_active !== false;
        var toggleLabel = isActive ? "Disable" : "Enable";
        tr.innerHTML =
          "<td>" +
          titleHtml +
          "</td><td>" +
          (c.slug || "") +
          "</td><td>" +
          (isActive ? "Active" : "Disabled") +
          '</td><td style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="admin-btn admin-btn-sm cat-edit" data-id="' +
          c.id +
          '">Edit</button><button type="button" class="admin-btn admin-btn-sm cat-toggle" data-id="' +
          c.id +
          '">' +
          toggleLabel +
          '</button><button type="button" class="admin-btn admin-btn-sm" style="background:hsl(0 72% 92%);color:hsl(0 60% 40%);" data-cat-del="' +
          c.id +
          '">Delete</button></td>';
        tb.appendChild(tr);
      });
      $all(".cat-edit").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var c = categoriesCache.find(function (x) { return x.id === id; });
          if (!c) return;
          editingCategory = c;
          $("#categoryModalTitle").textContent = "Edit Category";
          $("#categoryId").value = c.id || "";
          $("#categoryName").value = c.name || "";
          $("#categorySlug").value = c.slug || "";
          $("#categoryEmoji").value = c.emoji || "";
          $("#categoryDisplayOrder").value = Number(c.display_order || 0);
          $("#categoryImageUrl").value = c.image_url || c.icon_url || "";
          $("#categoryModal").hidden = false;
        });
      });
      $all(".cat-toggle").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var id = btn.getAttribute("data-id");
          try {
            await miniApi("/admin/categories/" + id + "/toggle", { method: "PATCH" });
            await loadCategories();
          } catch (e) {
            alert(e.message || "Failed to toggle category");
          }
        });
      });
      $all("button[data-cat-del]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var id = btn.getAttribute("data-cat-del");
          if (!confirm("Delete this category?")) return;
          try {
            await miniApi("/admin/categories/" + id, { method: "DELETE" });
            await loadCategories();
          } catch (e) {
            alert(e.message || "Failed to delete category");
          }
        });
      });
    } catch (e) {
      alert(e.message || "Failed categories");
    }
  }

  async function saveCategoryModal() {
    var id = ($("#categoryId") && $("#categoryId").value) || "";
    var name = ($("#categoryName") && $("#categoryName").value.trim()) || "";
    var slug = ($("#categorySlug") && $("#categorySlug").value.trim()) || "";
    var emoji = ($("#categoryEmoji") && $("#categoryEmoji").value.trim()) || "";
    var displayOrder = Number(($("#categoryDisplayOrder") && $("#categoryDisplayOrder").value) || 0);
    var imageUrl = ($("#categoryImageUrl") && $("#categoryImageUrl").value.trim()) || "";
    if (!name) return alert("Category name is required.");
    var body = {
      name: name,
      slug: slug || undefined,
      emoji: emoji || null,
      display_order: isFinite(displayOrder) ? displayOrder : 0,
      image_url: imageUrl || null,
      icon_url: imageUrl || null,
    };
    try {
      if (id) await miniApi("/admin/categories/" + id, { method: "PUT", body: JSON.stringify(body) });
      else await miniApi("/admin/categories", { method: "POST", body: JSON.stringify(body) });
      $("#categoryModal").hidden = true;
      editingCategory = null;
      await loadCategories();
      await loadProducts();
    } catch (e) {
      alert(e.message || "Failed to save category");
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
      broadcastCache = list.slice();
      const tb = $("#adminBcBody");
      if (!tb) return;
      tb.innerHTML = "";
      list.forEach(function (b) {
        var tr = document.createElement("tr");
        var preview = (b.body || "").slice(0, 90);
        tr.innerHTML =
          "<td>" +
          (b.title || "") +
          "</td><td>" +
          preview +
          "</td><td>" +
          (b.is_active ? "Yes" : "No") +
          "</td><td>" +
          (b.updated_at || b.created_at || "").slice(0, 16) +
          '</td><td style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="admin-btn admin-btn-sm bc-edit" data-id="' +
          b.id +
          '">Edit</button><button type="button" class="admin-btn admin-btn-sm" style="background:hsl(0 72% 92%);color:hsl(0 60% 40%);" data-bc-del="' +
          b.id +
          '">Delete</button></td>';
        tb.appendChild(tr);
      });
      $all(".bc-edit").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var b = broadcastCache.find(function (x) { return x.id === id; });
          if (!b) return;
          editingBroadcast = b;
          $("#broadcastModalTitle").textContent = "Edit Broadcast";
          $("#broadcastId").value = b.id || "";
          $("#broadcastTitle").value = b.title || "";
          $("#broadcastBody").value = b.body || "";
          $("#broadcastActive").checked = !!b.is_active;
          $("#broadcastModal").hidden = false;
        });
      });
      $all("button[data-bc-del]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var id = btn.getAttribute("data-bc-del");
          if (!confirm("Delete this broadcast?")) return;
          try {
            await miniApi("/admin/broadcast-messages/" + id, { method: "DELETE" });
            await loadBroadcasts();
          } catch (e) {
            alert(e.message || "Failed to delete broadcast");
          }
        });
      });
    } catch (e) {
      alert(e.message || "Failed broadcasts");
    }
  }

  async function saveBroadcastModal() {
    var id = ($("#broadcastId") && $("#broadcastId").value) || "";
    var title = ($("#broadcastTitle") && $("#broadcastTitle").value.trim()) || "";
    var body = ($("#broadcastBody") && $("#broadcastBody").value.trim()) || "";
    var isActive = !!($("#broadcastActive") && $("#broadcastActive").checked);
    if (!title || !body) return alert("Title and message are required.");
    var payload = { title: title, body: body, is_active: isActive };
    try {
      if (id) await miniApi("/admin/broadcast-messages/" + id, { method: "PUT", body: JSON.stringify(payload) });
      else await miniApi("/admin/broadcast-messages", { method: "POST", body: JSON.stringify(payload) });
      $("#broadcastModal").hidden = true;
      editingBroadcast = null;
      await loadBroadcasts();
    } catch (e) {
      alert(e.message || "Failed to save broadcast");
    }
  }

  async function loadSettings() {
    try {
      const ss = await miniApi("/admin/site-settings");
      const list = Array.isArray(ss) ? ss : [];
      const tb = $("#adminSettingsBody");
      if (!tb) return;
      tb.innerHTML = "";
      var map = {};
      list.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (row.key || "") + "</td><td>" + (row.value || "").slice(0, 120) + "</td>";
        tb.appendChild(tr);
        if (row && row.key) map[row.key] = row.value;
      });

      // Fill modern settings UI
      var siteName = $("#siteNameInput");
      if (siteName) siteName.value = map.site_name || "";

      var logoUrl = $("#siteLogoUrlInput");
      if (logoUrl) logoUrl.value = map.site_logo || "";

      var preset = $("#themePresetSelect");
      if (preset) preset.value = map.theme_preset || "emerald";

      function isOn(v, def) {
        if (v === undefined || v === null || v === "") return !!def;
        var s = String(v).trim().toLowerCase();
        return s === "1" || s === "true" || s === "yes" || s === "on";
      }
      $("#ffProducts") && ($("#ffProducts").checked = isOn(map.feature_store_enabled, true));
      $("#ffWalletFunding") && ($("#ffWalletFunding").checked = isOn(map.feature_add_funds_enabled, true));
      $("#ffVtu") && ($("#ffVtu").checked = isOn(map.feature_vtu_enabled, true));
      $("#ffVirtualAccount") && ($("#ffVirtualAccount").checked = isOn(map.feature_virtual_account_enabled, true));
      $("#ffSprintpayPay") && ($("#ffSprintpayPay").checked = isOn(map.feature_sprintpay_pay_enabled, true));
      $("#ffSupport") && ($("#ffSupport").checked = isOn(map.feature_support_enabled, true));
      $("#ffQuickServices") && ($("#ffQuickServices").checked = isOn(map.feature_quick_services_enabled, true));

      var img = $("#siteLogoPreview");
      var fb = $("#siteLogoFallback");
      if (img && fb) {
        var u = (map.site_logo || "").trim();
        if (!u) {
          img.style.display = "none";
          img.removeAttribute("src");
          fb.style.display = "inline";
        } else {
          img.src = u;
          img.style.display = "block";
          fb.style.display = "none";
        }
      }
    } catch (e) {
      alert(e.message || "Failed settings");
    }
  }

  function flashSettingsSaved() {
    var el = $("#settingsSavedMsg");
    if (!el) return;
    el.style.display = "inline";
    clearTimeout(flashSettingsSaved._t);
    flashSettingsSaved._t = setTimeout(function () {
      el.style.display = "none";
    }, 1400);
  }

  function normalizeBoolSetting(v) {
    return v ? "1" : "0";
  }

  async function saveSiteSettings() {
    try {
      var payload = [];
      function set(key, value) {
        payload.push({ key: key, value: String(value == null ? "" : value) });
      }

      set("site_name", ($("#siteNameInput") && $("#siteNameInput").value.trim()) || "");
      set("site_logo", ($("#siteLogoUrlInput") && $("#siteLogoUrlInput").value.trim()) || "");
      set("theme_preset", ($("#themePresetSelect") && $("#themePresetSelect").value) || "emerald");

      set("feature_store_enabled", normalizeBoolSetting($("#ffProducts") && $("#ffProducts").checked));
      set("feature_add_funds_enabled", normalizeBoolSetting($("#ffWalletFunding") && $("#ffWalletFunding").checked));
      set("feature_vtu_enabled", normalizeBoolSetting($("#ffVtu") && $("#ffVtu").checked));
      set("feature_virtual_account_enabled", normalizeBoolSetting($("#ffVirtualAccount") && $("#ffVirtualAccount").checked));
      set("feature_sprintpay_pay_enabled", normalizeBoolSetting($("#ffSprintpayPay") && $("#ffSprintpayPay").checked));
      set("feature_support_enabled", normalizeBoolSetting($("#ffSupport") && $("#ffSupport").checked));
      set("feature_quick_services_enabled", normalizeBoolSetting($("#ffQuickServices") && $("#ffQuickServices").checked));

      await miniApi("/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({ settings: payload }),
      });
      flashSettingsSaved();
      await loadSettings();
    } catch (e) {
      alert(e.message || "Failed to save settings");
    }
  }

  async function uploadSiteLogo(file) {
    if (!file) return;
    try {
      var fd = new FormData();
      fd.append("file", file);
      var res = await miniApiFormData("/admin/site-settings/upload-logo", fd, "POST");
      var url = res && res.url ? String(res.url) : "";
      if (url && $("#siteLogoUrlInput")) $("#siteLogoUrlInput").value = url;
      await saveSiteSettings();
    } catch (e) {
      alert(e.message || "Logo upload failed");
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
    $("#btnSaveSiteSettings")?.addEventListener("click", function () {
      saveSiteSettings();
    });
    $("#siteLogoFileInput")?.addEventListener("change", function () {
      var f = $("#siteLogoFileInput").files && $("#siteLogoFileInput").files[0];
      if (f) uploadSiteLogo(f);
      $("#siteLogoFileInput").value = "";
    });
    $("#btnClearSiteLogo")?.addEventListener("click", function () {
      if ($("#siteLogoUrlInput")) $("#siteLogoUrlInput").value = "";
      if ($("#siteLogoPreview")) $("#siteLogoPreview").style.display = "none";
      if ($("#siteLogoFallback")) $("#siteLogoFallback").style.display = "inline";
    });
    $("#siteLogoUrlInput")?.addEventListener("input", function () {
      var u = ($("#siteLogoUrlInput").value || "").trim();
      if (!$("#siteLogoPreview") || !$("#siteLogoFallback")) return;
      if (!u) {
        $("#siteLogoPreview").style.display = "none";
        $("#siteLogoFallback").style.display = "inline";
        return;
      }
      $("#siteLogoPreview").src = u;
      $("#siteLogoPreview").style.display = "block";
      $("#siteLogoFallback").style.display = "none";
    });
    $("#btnUserSearch")?.addEventListener("click", function () {
      userSearch = $("#userSearch").value || "";
      usersPage = 1;
      loadUsers();
    });
    $("#btnOpenUserModal")?.addEventListener("click", function () {
      editingUser = null;
      $("#userModalTitle").textContent = "Add User";
      $("#userModalProfileId").value = "";
      $("#userModalUserId").value = "";
      $("#userModalName").value = "";
      $("#userModalUsername").value = "";
      $("#userModalEmail").value = "";
      $("#userModalPassword").value = "";
      $("#userModal").hidden = false;
    });
    $("#btnCloseUserModal")?.addEventListener("click", function () {
      $("#userModal").hidden = true;
    });
    $("#btnSaveUserModal")?.addEventListener("click", function () {
      saveUserModal();
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

    $("#btnOpenAddLogsModal")?.addEventListener("click", async function () {
      if (!productsCache.length) {
        await loadProducts();
      }
      if ($("#addLogsProduct")) $("#addLogsProduct").value = "";
      fillLogProductSelect();
      $("#addLogsModal").hidden = false;
    });
    $("#logsSelectAll")?.addEventListener("change", function () {
      var checked = !!$("#logsSelectAll").checked;
      $all(".log-select").forEach(function (box) {
        box.checked = checked;
        var id = box.getAttribute("data-id");
        if (!id) return;
        if (checked) {
          if (selectedLogIds.indexOf(id) === -1) selectedLogIds.push(id);
        } else {
          selectedLogIds = selectedLogIds.filter(function (x) { return x !== id; });
        }
      });
      var info = $("#logsSelectionInfo");
      if (info) info.textContent = checked ? $all(".log-select").length + " selected" : "";
    });
    $("#btnBulkDeleteLogs")?.addEventListener("click", function () {
      bulkDeleteSelectedLogs();
    });
    $("#logsSearch")?.addEventListener("input", function () {
      logsSearch = $("#logsSearch").value || "";
      loadLogs();
    });
    $("#btnCloseLogViewModal")?.addEventListener("click", function () {
      $("#logViewModal").hidden = true;
    });
    $("#btnCloseAddLogsModal")?.addEventListener("click", function () {
      $("#addLogsModal").hidden = true;
    });
    $("#btnAddSingleLog")?.addEventListener("click", function () {
      addSingleLogFromModal();
    });
    $("#btnUploadBulkLogs")?.addEventListener("click", function () {
      addBulkLogsFromModal();
    });
    $("#addLogsBulkFile")?.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var txt = typeof ev.target.result === "string" ? ev.target.result : "";
        $("#addLogsBulkText").value = txt;
      };
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    });

    $("#categorySearch")?.addEventListener("input", function () {
      categorySearch = $("#categorySearch").value || "";
      loadCategories();
    });
    $("#btnOpenCategoryModal")?.addEventListener("click", function () {
      editingCategory = null;
      $("#categoryModalTitle").textContent = "Add Category";
      $("#categoryId").value = "";
      $("#categoryName").value = "";
      $("#categorySlug").value = "";
      $("#categoryEmoji").value = "";
      $("#categoryDisplayOrder").value = "0";
      $("#categoryImageUrl").value = "";
      $("#categoryModal").hidden = false;
    });
    $("#btnCloseCategoryModal")?.addEventListener("click", function () {
      $("#categoryModal").hidden = true;
    });
    $("#btnSaveCategoryModal")?.addEventListener("click", function () {
      saveCategoryModal();
    });
    $("#btnUploadCategoryImage")?.addEventListener("click", async function () {
      var file = $("#categoryImageFile") && $("#categoryImageFile").files && $("#categoryImageFile").files[0];
      if (!file) return alert("Choose an image first.");
      try {
        var fd = new FormData();
        fd.append("file", file);
        var data = await miniApiFormData("/admin/categories/upload", fd, "POST");
        if (data && data.url) $("#categoryImageUrl").value = data.url;
      } catch (e) {
        alert(e.message || "Image upload failed");
      }
    });

    $("#btnOpenBroadcastModal")?.addEventListener("click", function () {
      editingBroadcast = null;
      $("#broadcastModalTitle").textContent = "New Broadcast";
      $("#broadcastId").value = "";
      $("#broadcastTitle").value = "";
      $("#broadcastBody").value = "";
      $("#broadcastActive").checked = true;
      $("#broadcastModal").hidden = false;
    });
    $("#btnCloseBroadcastModal")?.addEventListener("click", function () {
      $("#broadcastModal").hidden = true;
    });
    $("#btnSaveBroadcastModal")?.addEventListener("click", function () {
      saveBroadcastModal();
    });

    $("#btnCloseProductEditModal")?.addEventListener("click", function () {
      $("#productEditModal").hidden = true;
    });
    $("#btnOpenEditProductModal")?.addEventListener("click", function () {
      if (!editingProduct) {
        alert("Use the Edit button on a product row to choose a product first.");
        return;
      }
      $("#productEditModal").hidden = false;
    });
    $("#btnOpenAddProductModal")?.addEventListener("click", async function () {
      if (!categoriesCache.length) {
        var cats = await miniApi("/admin/categories").catch(function () {
          return [];
        });
        categoriesCache = Array.isArray(cats) ? cats : [];
      }
      editingProduct = null;
      $("#productModalTitle").textContent = "Add Product";
      $("#editProductId").value = "";
      $("#editProductTitle").value = "";
      $("#editProductDescription").value = "";
      $("#editProductPlatform").value = "";
      $("#editProductPrice").value = "";
      $("#editProductStock").value = "0";
      $("#editProductCurrency").value = "NGN";
      $("#editProductActive").value = "1";
      $("#editProductImageUrl").value = "";
      fillProductCategorySelect("");
      $("#productEditModal").hidden = false;
    });
    $("#btnSaveProductEdit")?.addEventListener("click", function () {
      saveProductEdit();
    });
    $("#btnUploadProductImage")?.addEventListener("click", async function () {
      var file = $("#editProductImageFile") && $("#editProductImageFile").files && $("#editProductImageFile").files[0];
      if (!file) {
        alert("Choose an image first.");
        return;
      }
      try {
        var fd = new FormData();
        fd.append("file", file);
        var data = await miniApiFormData("/admin/products/upload", fd, "POST");
        if (data && data.url) $("#editProductImageUrl").value = data.url;
      } catch (e) {
        alert(e.message || "Image upload failed");
      }
    });

    document.getElementById("addLogsModal")?.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    document.getElementById("productEditModal")?.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    document.getElementById("userModal")?.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    document.getElementById("categoryModal")?.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    document.getElementById("broadcastModal")?.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    document.getElementById("logViewModal")?.addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (document.getElementById("addLogsModal") && !document.getElementById("addLogsModal").hidden) {
        document.getElementById("addLogsModal").hidden = true;
      }
      if (document.getElementById("productEditModal") && !document.getElementById("productEditModal").hidden) {
        document.getElementById("productEditModal").hidden = true;
      }
      if (document.getElementById("userModal") && !document.getElementById("userModal").hidden) {
        document.getElementById("userModal").hidden = true;
      }
      if (document.getElementById("categoryModal") && !document.getElementById("categoryModal").hidden) {
        document.getElementById("categoryModal").hidden = true;
      }
      if (document.getElementById("broadcastModal") && !document.getElementById("broadcastModal").hidden) {
        document.getElementById("broadcastModal").hidden = true;
      }
      if (document.getElementById("logViewModal") && !document.getElementById("logViewModal").hidden) {
        document.getElementById("logViewModal").hidden = true;
      }
    });
    $("#productSearch")?.addEventListener("input", function () {
      productSearch = $("#productSearch").value || "";
      loadProducts();
    });
    loadOverview();
  });
})();
