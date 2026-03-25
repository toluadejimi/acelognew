/**
 * User dashboard — layout aligned with React Dashboard.tsx (same /api/* proxy).
 */
(function () {
  const SLIDER_SLIDES = [
    { img: "/slider/imgi_8_slide_1-4d9033b5-4979-4305-98b2-17209baf1a64.png" },
    { img: "/slider/imgi_9_slide_2-0587384e-1df0-43ab-924b-af3bb9c98e01.png" },
    { img: "/slider/imgi_10_slide_3-b45e14cc-b1fe-4aed-ad0b-9338d1524687.png" },
    { img: "/slider/imgi_11_slide_4-da1d2052-3e44-4b83-8473-344b25e878bb.png" },
  ];
  const SLIDER_VIEW = 3;
  const SLIDER_MAX = Math.max(0, SLIDER_SLIDES.length - SLIDER_VIEW);

  const PANEL_TITLES = {
    categories: "Browse store",
    profile: "My Profile",
    orders: "My Orders",
    transactions: "Transactions",
    "add-funds": "Add Funds",
    support: "Customer Support",
    "category-detail": "Category",
    airtime: "Airtime",
    data: "Data bundles",
    electricity: "Electricity",
    "cable-tv": "Cable TV",
    "sms-verify": "SMS verify",
    "sms-history": "SMS history",
    referral: "Referral",
    settings: "Settings",
  };

  /** Display-only: NGN wallet vs illustrative USD */
  let displayCurrency = "NGN";
  const USD_RATE = 1550;

  let categories = [];
  let products = [];
  let orders = [];
  let transactions = [];
  let messages = [];
  let balance = 0;
  let userId = null;
  let username = "";
  let selectedCategory = null;
  let modalProduct = null;
  let qty = 1;
  let siteSettings = {};
  let activeFilter = "all";
  let sliderIndex = 0;
  let sliderTimer = null;

  function $(sel) {
    return document.querySelector(sel);
  }
  function $all(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function siteName() {
    var fromAttr = ($("#appDashboard") && $("#appDashboard").getAttribute("data-site-name")) || "";
    var fromSettings = siteSettings && siteSettings.site_name ? String(siteSettings.site_name) : "";
    return (fromSettings || fromAttr || "Store").trim();
  }

  function featureOn(key, def) {
    var v = siteSettings ? siteSettings[key] : undefined;
    if (v === undefined || v === null || v === "") return !!def;
    var s = String(v).trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  }

  function applyBranding() {
    // Site name
    var name = siteName();
    var el = document.getElementById("brandName");
    if (el) el.textContent = name;
    var title = document.getElementById("topbarTitle");
    if (title && title.textContent && title.textContent.trim() === "") title.textContent = name;

    // Site logo (optional)
    var logo = siteSettings && siteSettings.site_logo ? String(siteSettings.site_logo).trim() : "";
    var img = document.getElementById("brandLogoImg");
    var fb = document.getElementById("brandLogoFallback");
    if (img && fb) {
      if (!logo) {
        img.style.display = "none";
        img.removeAttribute("src");
        fb.style.display = "inline-flex";
      } else {
        img.src = resolveImg(logo);
        img.style.display = "inline-flex";
        fb.style.display = "none";
      }
    }
  }

  function applyThemePreset() {
    var preset = (siteSettings && siteSettings.theme_preset ? String(siteSettings.theme_preset) : "emerald").toLowerCase();
    var root = document.documentElement;
    var presets = {
      emerald: { green: "152 70% 45%", greenDim: "152 60% 35%", greenBorder: "152 45% 28%", blue: "216 92% 60%", blueLight: "216 90% 96%" },
      blue: { green: "217 91% 60%", greenDim: "217 80% 48%", greenBorder: "217 50% 28%", blue: "217 91% 60%", blueLight: "216 90% 96%" },
      purple: { green: "266 86% 62%", greenDim: "266 70% 52%", greenBorder: "266 45% 28%", blue: "266 86% 62%", blueLight: "268 85% 96%" },
      orange: { green: "24 95% 53%", greenDim: "24 85% 45%", greenBorder: "24 50% 28%", blue: "24 95% 53%", blueLight: "26 95% 96%" },
    };
    var p = presets[preset] || presets.emerald;
    root.style.setProperty("--db-green", p.green);
    root.style.setProperty("--db-green-dim", p.greenDim);
    root.style.setProperty("--db-green-border", p.greenBorder);
    root.style.setProperty("--db-blue", p.blue);
    root.style.setProperty("--db-blue-light", p.blueLight);
  }

  function applyFeatureFlags() {
    // Panels/nav visibility
    var storeOn = featureOn("feature_store_enabled", true);
    var fundsOn = featureOn("feature_add_funds_enabled", true);
    var vtuOn = featureOn("feature_vtu_enabled", true);
    var supportOn = featureOn("feature_support_enabled", true);
    var quickOn = featureOn("feature_quick_services_enabled", true);

    function togglePanel(panelId, enabled) {
      $all('.dash-nav-item[data-panel="' + panelId + '"]').forEach(function (b) {
        b.style.display = enabled ? "" : "none";
      });
      var p = document.querySelector('.dash-panel[data-panel-id="' + panelId + '"]') || document.getElementById("panel-" + panelId);
      if (p) p.style.display = enabled ? "" : "none";
    }

    // store related
    togglePanel("home", true);
    togglePanel("categories", storeOn);
    togglePanel("category-detail", storeOn);

    // add funds
    togglePanel("add-funds", fundsOn);

    // support
    togglePanel("support", supportOn);

    // vtu panels
    togglePanel("airtime", vtuOn);
    togglePanel("data", vtuOn);
    togglePanel("cable-tv", vtuOn);
    togglePanel("electricity", vtuOn);
    togglePanel("sms-verify", vtuOn);

    // If current panel is disabled, bounce to home.
    var active = document.querySelector(".dash-panel:not([hidden])");
    if (active) {
      var id = active.getAttribute("data-panel-id");
      if (id === "categories" || id === "category-detail") {
        if (!storeOn) switchPanel("home");
      } else if (id === "add-funds" && !fundsOn) {
        switchPanel("home");
      } else if ((id === "airtime" || id === "data" || id === "cable-tv" || id === "electricity") && !vtuOn) {
        switchPanel("home");
      } else if (id === "support" && !supportOn) {
        switchPanel("home");
      }
    }

    // Funding-method toggles inside Add Funds
    var vaOn = featureOn("feature_virtual_account_enabled", true);
    var spOn = featureOn("feature_sprintpay_pay_enabled", true);
    var btnSp = document.getElementById("fundMethodSprintpay");
    var btnVa = document.getElementById("fundMethodVa");
    if (btnSp) btnSp.style.display = spOn ? "" : "none";
    if (btnVa) btnVa.style.display = vaOn ? "" : "none";
    if (fundPayMethod === "sprintpay" && !spOn) fundPayMethod = vaOn ? "va" : "sprintpay";
    if (fundPayMethod === "va" && !vaOn) fundPayMethod = spOn ? "sprintpay" : "va";
    syncFundUi();

    // Quick services: show only cards for enabled destinations
    var quickMap = {
      "airtime": vtuOn,
      "data": vtuOn,
      "electricity": vtuOn,
      "cable-tv": vtuOn,
      "sms-verify": vtuOn,
      "add-funds": fundsOn,
      "categories": storeOn,
      "referral": true
    };
    $all(".bliss-q-card[data-panel]").forEach(function (btn) {
      var panel = btn.getAttribute("data-panel") || "";
      var visible = quickMap.hasOwnProperty(panel) ? !!quickMap[panel] : true;
      btn.style.display = quickOn && visible ? "" : "none";
    });
    var quickGrid = document.getElementById("quickServicesGrid");
    var quickKicker = document.getElementById("quickServicesKicker");
    var quickTitle = document.getElementById("quickServicesTitle");
    if (!quickOn) {
      if (quickGrid) quickGrid.style.display = "none";
      if (quickKicker) quickKicker.style.display = "none";
      if (quickTitle) quickTitle.style.display = "none";
    } else {
      if (quickGrid) quickGrid.style.display = "";
      if (quickKicker) quickKicker.style.display = "";
      if (quickTitle) quickTitle.style.display = "";
    }
  }

  function fmtShort(n) {
    return "NGN " + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
  }

  function formatBlissBalance(b) {
    var n = Number(b) || 0;
    if (displayCurrency === "USD") {
      return "$" + (n / USD_RATE).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPrice(currency, price) {
    var c = currency || "NGN";
    return c + " " + Number(price || 0).toLocaleString("en-NG", { minimumFractionDigits: 0 });
  }

  function resolveImg(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith("/") ? url : "/" + url;
  }

  function getProductsForCategory(cid) {
    return products.filter(function (p) {
      return p.category_id === cid;
    });
  }

  function getCatIconHtml(cat) {
    if (cat.image_url) {
      return '<img src="' + resolveImg(cat.image_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" />';
    }
    return cat.emoji || "📁";
  }

  function searchQuery() {
    var a = $("#productSearch");
    var b = $("#mobileSearchInput");
    return (((a && a.value) || (b && b.value) || "") + "").trim().toLowerCase();
  }

  function filterProductText(p, q) {
    if (!q) return true;
    return (
      (p.title || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.platform || "").toLowerCase().includes(q)
    );
  }

  function filteredCategoriesForHome() {
    var sorted = categories
      .slice()
      .sort(function (a, b) {
        return getProductsForCategory(b.id).length - getProductsForCategory(a.id).length;
      });
    if (activeFilter === "all") return sorted;
    return sorted.filter(function (c) {
      return c.id === activeFilter;
    });
  }

  function renderFilterPills() {
    var desk = $("#desktopFilterPills");
    var mob = $("#mobileFilterPills");
    if (!desk && !mob) return;

    var popular = categories
      .slice()
      .sort(function (a, b) {
        return getProductsForCategory(b.id).length - getProductsForCategory(a.id).length;
      });
    var top6 = popular.slice(0, 6);
    var top4 = popular.slice(0, 4);

    function pill(catId, label, isActive) {
      return (
        '<button type="button" class="filter-pill' +
        (isActive ? " active" : "") +
        '" data-filter="' +
        catId +
        '">' +
        label +
        "</button>"
      );
    }

    var deskHtml =
      '<span class="filter-label">Popular:</span>' +
      pill("all", "All", activeFilter === "all");
    top6.forEach(function (c) {
      deskHtml += pill(c.id, c.name, activeFilter === c.id);
    });
    if (desk) desk.innerHTML = deskHtml;

    var mobHtml =
      '<span class="filter-label">Popular:</span>' + pill("all", "All", activeFilter === "all");
    top4.forEach(function (c) {
      mobHtml += pill(c.id, c.name, activeFilter === c.id);
    });
    if (mob) mob.innerHTML = mobHtml;

    $all(".filter-pill[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.getAttribute("data-filter") || "all";
        renderFilterPills();
        renderHomeFeed();
      });
    });
  }

  function renderHomeFeed() {
    var feed = $("#homeFeed");
    var loading = $("#homeLoading");
    if (loading) loading.style.display = "none";
    if (!feed) return;

    var q = searchQuery();
    var list = filteredCategoriesForHome();
    feed.innerHTML = "";

    var hasAny = false;
    list.forEach(function (cat) {
      var prods = getProductsForCategory(cat.id).filter(function (p) {
        return filterProductText(p, q);
      });
      if (prods.length === 0) return;
      hasAny = true;

      var block = document.createElement("div");
      block.className = "category-block";
      block.innerHTML =
        '<div class="category-header">' +
        '<div class="cat-head-left">' +
        '<div class="cat-platform-icon">' +
        getCatIconHtml(cat) +
        '</div><div><div class="cat-title">' +
        (cat.name || "") +
        '</div></div></div>' +
        '<button type="button" class="cat-see-more" data-cat-id="' +
        cat.id +
        '">See all →</button></div>' +
        '<div class="product-list category-block-list"></div>';

      var plist = block.querySelector(".product-list");
      prods.forEach(function (p) {
        var row = buildProductRow(p, cat);
        plist.appendChild(row);
      });

      block.querySelector(".cat-see-more").addEventListener("click", function () {
        showCategoryDetail(cat);
      });

      feed.appendChild(block);
    });

    if (!hasAny) {
      feed.innerHTML =
        '<div class="categories-empty" style="grid-column:1/-1;"><div class="categories-empty-icon">📦</div>' +
        '<h3 class="categories-empty-title">No products match</h3>' +
        '<p class="categories-empty-desc">Try another filter or search term.</p></div>';
    }
  }

  function buildProductRow(p, cat) {
    var row = document.createElement("div");
    row.className = "account-row";
    var imgUrl = resolveImg(p.image_url);
    var iconHtml = imgUrl
      ? '<img src="' + imgUrl + '" alt="" style="width:44px;height:44px;border-radius:12px;object-fit:cover;" />'
      : getCatIconHtml(cat);
    var stock = Number(p.stock || 0);
    var stockClass = stock === 0 ? "zero" : stock < 10 ? "low" : "";
    var sample =
      p.sample_link ?
        '<a href="' +
        p.sample_link +
        '" target="_blank" rel="noopener noreferrer" class="product-list-sample"><i class="fa-solid fa-external-link"></i> View sample</a>' :
        "";
    row.innerHTML =
      '<div class="acc-platform-icon">' +
      iconHtml +
      '</div><div class="acc-content"><div class="acc-info"><div class="acc-desc-title">' +
      (p.title || "") +
      '</div><div class="acc-desc">' +
      (p.description || "").slice(0, 220) +
      "</div>" +
      sample +
      '</div><div class="acc-meta-row"><div class="acc-stock-price">' +
      '<span class="stock-pill ' +
      stockClass +
      '">' +
      stock +
      '</span><span class="price-pill">' +
      formatPrice(p.currency, p.price) +
      "</span></div>" +
      (stock > 0
        ? '<button type="button" class="buy-btn buy-btn-icon" aria-label="Buy"><i class="fa-solid fa-cart-shopping"></i></button>'
        : '<button type="button" class="buy-btn buy-btn-icon" disabled><i class="fa-solid fa-cart-shopping"></i></button>') +
      "</div></div>";

    var buy = row.querySelector(".buy-btn:not([disabled])");
    if (buy) {
      buy.addEventListener("click", function () {
        openPurchaseModal(p);
      });
    }
    return row;
  }

  function renderCategoriesPage() {
    var el = $("#categoriesListOnly");
    if (!el) return;
    var q = ($("#categorySearchInput") && $("#categorySearchInput").value.trim().toLowerCase()) || "";
    el.innerHTML = "";
    categories.forEach(function (c) {
      if (q && !(c.name || "").toLowerCase().includes(q)) return;
      var card = document.createElement("div");
      card.className = "category-card";
      card.innerHTML =
        '<div class="category-card-icon">' +
        getCatIconHtml(c) +
        '</div><div class="category-card-body"><div class="category-card-title">' +
        (c.name || "") +
        '</div><div class="category-card-count">' +
        getProductsForCategory(c.id).length +
        ' products</div></div><div class="category-card-arrow"><i class="fa-solid fa-chevron-right"></i></div>';
      card.addEventListener("click", function () {
        showCategoryDetail(c);
      });
      el.appendChild(card);
    });
  }

  function switchPanel(name, opts) {
    if (name === "support") closeSupportChat();
    $all(".dash-nav-item[data-panel]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-panel") === name);
    });
    $all(".dash-panel").forEach(function (p) {
      var id = p.getAttribute("data-panel-id");
      p.hidden = id !== name;
    });
    var tb = $("#topbarTitle");
    if (tb) {
      if (name === "home") tb.textContent = "Dashboard";
      else tb.textContent = PANEL_TITLES[name] || siteName();
    }
    document.getElementById("dashSidebar") && document.getElementById("dashSidebar").classList.remove("open");
    document.getElementById("sidebarOverlay") && document.getElementById("sidebarOverlay").classList.remove("show");

    if (name === "categories") renderCategoriesPage();
    if (name === "add-funds") {
      if (!(opts && opts.keepSuccess)) resetFundSuccessUi();
      syncFundUi();
      loadUserData().catch(function () {});
    }
  }

  function showCategoryDetail(cat) {
    selectedCategory = cat;
    $("#categoryDetailTitle").textContent = (cat.name || "").toUpperCase();
    switchPanel("category-detail");
    var tb = $("#topbarTitle");
    if (tb) tb.textContent = cat.name || "Category";
    renderCategoryProducts();
  }

  function hideCategoryDetail() {
    selectedCategory = null;
    switchPanel("home");
  }

  function renderCategoryProducts() {
    var wrap = $("#categoryProducts");
    if (!wrap || !selectedCategory) return;
    var list = products.filter(function (p) {
      return p.category_id === selectedCategory.id;
    });
    var q = searchQuery();
    wrap.innerHTML = '<div class="product-list"></div>';
    var inner = wrap.querySelector(".product-list");
    list.forEach(function (p) {
      if (!filterProductText(p, q)) return;
      inner.appendChild(buildProductRow(p, selectedCategory));
    });
  }

  function openPurchaseModal(p) {
    modalProduct = p;
    qty = 1;
    var pm = document.getElementById("purchaseModal");
    if (pm) {
      pm.hidden = false;
      pm.setAttribute("aria-hidden", "false");
    }
    $("#modalProductTitle").textContent = (p.title || "").toUpperCase();
    $("#modalProductDesc").textContent = p.description || "";
    $("#modalPrice").textContent = formatPrice(p.currency, p.price);
    $("#modalStock").textContent = String(p.stock || 0);
    $("#qtyVal").textContent = "1";
    $("#purchaseErr").textContent = "";
  }

  function closePurchaseModal() {
    var pm = document.getElementById("purchaseModal");
    if (pm) {
      pm.hidden = true;
      pm.setAttribute("aria-hidden", "true");
    }
    modalProduct = null;
  }

  function openPurchaseSuccessModal(productTitle, purchasedAccounts) {
    var modal = document.getElementById("purchaseSuccessModal");
    var list = document.getElementById("purchaseSuccessLogs");
    var title = document.getElementById("purchaseSuccessTitle");
    var desc = document.getElementById("purchaseSuccessDesc");
    if (!modal || !list) return;

    title && (title.textContent = (productTitle || "Purchase") + " delivered");
    var rows = Array.isArray(purchasedAccounts) ? purchasedAccounts : [];
    desc &&
      (desc.textContent =
        rows.length > 0
          ? "Your purchased account details are below. Keep them safe."
          : "Purchase completed. Details will appear in your orders.");

    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = '<div class="purchase-success-log-item"><div class="purchase-success-log-title">No account details were returned.</div></div>';
    } else {
      rows.forEach(function (row, i) {
        var login = row && row.login ? String(row.login) : "";
        var password = row && row.password ? String(row.password) : "";
        var accountLine = (login || "") + "\t" + (password || "");
        var wrap = document.createElement("div");
        wrap.className = "purchase-success-log-item";
        wrap.innerHTML =
          '<div class="purchase-success-log-top"><span class="purchase-success-log-title">Account #' +
          (i + 1) +
          '</span><button type="button" class="purchase-success-log-copy" data-copy="' +
          encodeURIComponent(accountLine) +
          '">Copy</button></div>' +
          '<div class="purchase-success-cred"><strong>account:</strong> ' +
          escapeHtml(accountLine || "—") +
          "</div>";
        list.appendChild(wrap);
      });
    }

    list.querySelectorAll("button[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var raw = decodeURIComponent(btn.getAttribute("data-copy") || "");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(raw).catch(function () {});
        }
        btn.textContent = "Copied";
        setTimeout(function () {
          btn.textContent = "Copy";
        }, 900);
      });
    });

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }

  function closePurchaseSuccessModal() {
    var modal = document.getElementById("purchaseSuccessModal");
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }
  }

  async function confirmPurchase() {
    if (!modalProduct) return;
    var err = $("#purchaseErr");
    err.textContent = "";
    var total = Number(modalProduct.price || 0) * qty;
    if (balance < total) {
      err.textContent = "Insufficient balance. Add funds first.";
      return;
    }
    try {
      var boughtTitle = modalProduct.title || "Purchase";
      var res = await miniApi("/purchase", {
        method: "POST",
        body: JSON.stringify({ product_id: modalProduct.id, quantity: qty }),
      });
      if (!res.success) {
        err.textContent = res.error_msg || "Purchase failed";
        return;
      }
      balance = Number(res.new_balance);
      updateBalanceUI();
      closePurchaseModal();
      await loadUserData();
      openPurchaseSuccessModal(boughtTitle, res.purchased_accounts || []);
    } catch (e) {
      err.textContent = e.message || "Purchase failed";
    }
  }

  function balanceLoadingMarkup(which) {
    var cls = "balance-shimmer";
    if (which === "pill") cls += " dash-pill-shimmer";
    else if (which === "hero") cls += " balance-shimmer--hero";
    else if (which === "profile") cls += " balance-shimmer--profile";
    else if (which === "fund") cls += " balance-shimmer--fund-hero";
    return '<span class="' + cls + '" aria-hidden="true"></span>';
  }

  function setBalanceLoading(on) {
    var s = document.getElementById("shortBalance");
    if (s) {
      if (on) {
        s.innerHTML = balanceLoadingMarkup("pill");
        s.setAttribute("aria-busy", "true");
      } else {
        s.removeAttribute("aria-busy");
      }
    }
    var bliss = document.getElementById("blissBalanceDisplay");
    if (bliss) {
      if (on) {
        bliss.innerHTML = balanceLoadingMarkup("hero");
        bliss.setAttribute("aria-busy", "true");
      } else {
        bliss.removeAttribute("aria-busy");
      }
    }
    var ph = document.getElementById("profileHeroBalance");
    if (ph) {
      if (on) {
        ph.innerHTML = balanceLoadingMarkup("profile");
        ph.setAttribute("aria-busy", "true");
      } else {
        ph.removeAttribute("aria-busy");
      }
    }
    var fh = document.getElementById("fundBalanceHero");
    if (fh) {
      if (on) {
        fh.innerHTML = balanceLoadingMarkup("fund");
        fh.setAttribute("aria-busy", "true");
      } else {
        fh.removeAttribute("aria-busy");
      }
    }
  }

  function updateBalanceUI() {
    var b = document.getElementById("dashBalance");
    if (b) b.textContent = balance.toLocaleString("en-NG", { minimumFractionDigits: 2 });
    var bliss = document.getElementById("blissBalanceDisplay");
    if (bliss) {
      bliss.textContent = formatBlissBalance(balance);
      bliss.removeAttribute("aria-busy");
    }
    var s = document.getElementById("shortBalance");
    if (s) {
      s.textContent = fmtShort(balance);
      s.removeAttribute("aria-busy");
    }
    var wb = $("#wstatBalance");
    if (wb) wb.textContent = "₦" + balance.toLocaleString("en-NG", { maximumFractionDigits: 0 });
    var ph = $("#profileHeroBalance");
    if (ph) {
      ph.textContent = fmtShort(balance);
      ph.removeAttribute("aria-busy");
    }
    var fh = document.getElementById("fundBalanceHero");
    if (fh) {
      fh.textContent = "NGN " + balance.toLocaleString("en-NG", { minimumFractionDigits: 2 });
      fh.removeAttribute("aria-busy");
    }
    var fsr = document.getElementById("fundSuccessRoot");
    var fsb = document.getElementById("fundSuccessBalance");
    if (fsb && fsr && !fsr.hidden) {
      fsb.textContent = "NGN " + balance.toLocaleString("en-NG", { minimumFractionDigits: 2 });
    }
  }

  function updateWelcomeHeading() {
    var bh = $("#blissHeroName");
    if (bh && username) bh.textContent = username;
  }

  function initDashSlider() {
    var track = $("#dashSliderTrack");
    var dots = $("#dashSliderDots");
    if (!track) return;

    track.innerHTML = SLIDER_SLIDES.map(function (s) {
      return (
        '<div class="dash-slider-slide"><img src="' + s.img + '" alt="" /></div>'
      );
    }).join("");

    function go(i) {
      sliderIndex = Math.max(0, Math.min(SLIDER_MAX, i));
      track.style.transform = "translateX(-" + sliderIndex * 25 + "%)";
      if (dots) {
        dots.innerHTML = "";
        for (var d = 0; d <= SLIDER_MAX; d++) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "dash-slider-dot" + (d === sliderIndex ? " active" : "");
          dot.setAttribute("aria-label", "Slide " + (d + 1));
          (function (idx) {
            dot.addEventListener("click", function () {
              go(idx);
            });
          })(d);
          dots.appendChild(dot);
        }
      }
    }

    $("#dashSliderPrev") &&
      $("#dashSliderPrev").addEventListener("click", function () {
        go(sliderIndex - 1);
      });
    $("#dashSliderNext") &&
      $("#dashSliderNext").addEventListener("click", function () {
        go(sliderIndex + 1);
      });

    go(0);
    if (sliderTimer) clearInterval(sliderTimer);
    sliderTimer = setInterval(function () {
      go(sliderIndex >= SLIDER_MAX ? 0 : sliderIndex + 1);
    }, 5000);
  }

  async function loadUserData() {
    setBalanceLoading(true);
    const [profile, wallet, ord, tx, cats, prods, msgs, bds, ss] = await Promise.all([
      miniApi("/profile").catch(function () {
        return {};
      }),
      miniApi("/wallet").catch(function () {
        return { balance: 0 };
      }),
      miniApi("/orders").catch(function () {
        return [];
      }),
      miniApi("/transactions").catch(function () {
        return [];
      }),
      miniApi("/categories").catch(function () {
        return [];
      }),
      miniApi("/products").catch(function () {
        return [];
      }),
      miniApi("/messages").catch(function () {
        return [];
      }),
      miniApi("/bank-details").catch(function () {
        return [];
      }),
      miniApi("/site-settings").catch(function () {
        return {};
      }),
    ]);

    if (profile && profile.username) {
      username = profile.username;
      var un = $("#dashUsername");
      if (un) un.textContent = username;
      var phn = $("#profileHeroName");
      if (phn) phn.textContent = username;
      var blissn = $("#blissHeroName");
      if (blissn) blissn.textContent = username;
    }
    updateWelcomeHeading();

    balance = Number((wallet && wallet.balance) || 0);
    updateBalanceUI();
    var wo = $("#wstatOrders");
    orders = Array.isArray(ord) ? ord : [];
    if (wo) wo.textContent = String(orders.length);

    transactions = Array.isArray(tx) ? tx : [];
    categories = Array.isArray(cats) ? cats : [];
    products = Array.isArray(prods) ? prods : [];
    messages = Array.isArray(msgs) ? msgs : [];
    siteSettings = ss && typeof ss === "object" ? ss : {};

    applyThemePreset();
    applyBranding();
    applyFeatureFlags();

    try {
      var u = await miniApi("/user");
      if (u && u.user && u.user.id) userId = u.user.id;
    } catch (_) {}

    renderFilterPills();
    renderHomeFeed();
    renderCategoriesPage();
    renderOrders();
    renderTx();
    renderSupport();
    renderBanks(bds);
    updateUnreadBadge();
  }

  function renderOrders() {
    var tb = $("#ordersBody");
    var empty = $("#ordersEmpty");
    var wrap = $("#ordersTableWrap");
    if (!tb) return;
    tb.innerHTML = "";
    if (orders.length === 0) {
      if (empty) empty.style.display = "block";
      if (wrap) wrap.style.display = "none";
      return;
    }
    if (empty) empty.style.display = "none";
    if (wrap) wrap.style.display = "block";

    orders.forEach(function (o) {
      var tr = document.createElement("tr");
      var st = (o.status || "").toLowerCase();
      tr.innerHTML =
        "<td><div class=\"order-name\">" +
        (o.product_title || "") +
        '</div></td><td><span class="status-pill status-' +
        st +
        '">' +
        (o.status || "") +
        "</span></td><td class=\"order-price\">NGN " +
        Number(o.total_price || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 }) +
        "</td><td class=\"order-date\">" +
        (o.created_at || "").slice(0, 16) +
        '</td><td><button type="button" class="order-view-btn" data-id="' +
        o.id +
        '"><i class="fa-solid fa-eye"></i> View</button></td>';
      tb.appendChild(tr);
    });
    $all(".order-view-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var id = btn.getAttribute("data-id");
        try {
          var logs = await miniApi("/orders/" + id + "/account-logs");
          var text = Array.isArray(logs)
            ? logs.map(function (l) {
                return (l.login || "") + "|" + (l.password || "");
              }).join("\n")
            : JSON.stringify(logs);
          alert(text || "No credentials");
        } catch (e) {
          alert(e.message || "Failed to load order");
        }
      });
    });
  }

  function renderTx() {
    var tb = $("#txBody");
    var empty = $("#txEmpty");
    var wrap = $("#txTableWrap");
    if (!tb) return;
    tb.innerHTML = "";
    if (transactions.length === 0) {
      if (empty) empty.style.display = "block";
      if (wrap) wrap.style.display = "none";
      return;
    }
    if (empty) empty.style.display = "none";
    if (wrap) wrap.style.display = "block";

    transactions.forEach(function (t) {
      var tr = document.createElement("tr");
      var typ = (t.type || "").toLowerCase();
      tr.innerHTML =
        '<td class="txn-date">' +
        (t.created_at || "").slice(0, 16) +
        '</td><td class="txn-desc">' +
        (t.description || "") +
        '</td><td><span class="txn-type-pill txn-type-' +
        typ +
        '">' +
        (typ === "credit" ? "Credit" : "Debit") +
        '</span></td><td class="txn-amount txn-amount-' +
        typ +
        '">' +
        (typ === "credit" ? "+" : "−") +
        " " +
        (t.currency || "NGN") +
        " " +
        Number(t.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 }) +
        "</td>";
      tb.appendChild(tr);
    });
  }

  function updateUnreadBadge() {
    if (!userId) return;
    var n = messages.filter(function (m) {
      return m.receiver_id === userId && !m.is_read;
    }).length;
    var badge = $("#supportUnreadBadge");
    if (badge) {
      badge.style.display = n > 0 ? "inline-flex" : "none";
      badge.textContent = n > 99 ? "99+" : String(n);
    }
  }

  function renderSupport() {
    var box = $("#chatContainer");
    if (!box) return;
    box.innerHTML = "";
    messages.forEach(function (m) {
      var mine = m.sender_id === userId;
      var div = document.createElement("div");
      div.className = "chat-msg " + (mine ? "chat-msg--user" : "chat-msg--support");
      div.innerHTML =
        '<div class="chat-bubble">' +
        (m.content ? escapeHtml(m.content) : "") +
        (m.attachment_url
          ? '<div><a href="' + m.attachment_url + '" target="_blank" rel="noopener">Attachment</a></div>'
          : "") +
        "</div>";
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderBanks(bds) {
    var el = $("#bankDetailsList");
    if (!el) return;
    el.innerHTML = "";
    if (!Array.isArray(bds) || !bds.length) {
      el.innerHTML = '<p class="muted">No manual bank details configured.</p>';
      return;
    }
    bds.forEach(function (b) {
      if (b.is_active === false) return;
      var div = document.createElement("div");
      div.className = "funds-bank-card";
      div.innerHTML =
        "<strong>" +
        (b.label || "Bank") +
        "</strong><br>" +
        (b.account_name || "") +
        "<br>" +
        (b.account_number || "");
      el.appendChild(div);
    });
  }

  /** Add funds — SprintPay redirect + virtual account (matches fund-* CSS). */
  var fundSelectedPreset = "₦5,000";
  var fundCustomAmountStr = "";
  var fundPayMethod = "sprintpay";
  var fundVirtualAccount = null;
  var fundCtaLoading = false;

  function parsePresetAmount(label) {
    var n = String(label || "").replace(/[^\d]/g, "");
    return n ? Number(n) : 0;
  }

  function getFundAmountNaira() {
    var raw = (fundCustomAmountStr || "").trim();
    if (raw !== "") {
      var x = Number(raw);
      return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
    }
    return parsePresetAmount(fundSelectedPreset);
  }

  function fundShowMsg(text) {
    var el = $("#fundPageMsg");
    if (!el) return;
    if (!text) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = text;
  }

  function syncFundUi() {
    var customEmpty = !(fundCustomAmountStr || "").trim();
    document.querySelectorAll("#fundPresetChips .fund-chip").forEach(function (ch) {
      var p = ch.getAttribute("data-preset");
      ch.classList.toggle("is-selected", customEmpty && p === fundSelectedPreset);
    });

    var sp = $("#fundMethodSprintpay");
    var va = $("#fundMethodVa");
    if (sp) sp.classList.toggle("is-selected", fundPayMethod === "sprintpay");
    if (va) va.classList.toggle("is-selected", fundPayMethod === "va");

    var cSp = $("#fundCalloutSprintpay");
    var cVa = $("#fundCalloutVa");
    if (cSp) cSp.hidden = fundPayMethod !== "sprintpay";
    if (cVa) cVa.hidden = fundPayMethod !== "va";

    var amt = getFundAmountNaira();
    var sumAdd = $("#fundSummaryAdding");
    if (sumAdd) sumAdd.textContent = amt >= 100 ? "₦" + amt.toLocaleString("en-NG") : "—";

    var sumM = $("#fundSummaryMethod");
    if (sumM) sumM.textContent = fundPayMethod === "sprintpay" ? "SprintPay" : "Virtual account";

    var cta = $("#fundCta");
    var ctaL = $("#fundCtaLabel");
    if (cta && !fundCtaLoading) {
      cta.disabled = false;
      if (fundPayMethod === "sprintpay") {
        if (ctaL) ctaL.textContent = amt >= 100 ? "Pay ₦" + amt.toLocaleString("en-NG") + " with SprintPay" : "Pay with SprintPay";
      } else if (ctaL) {
        ctaL.textContent = fundVirtualAccount
          ? "Refresh details for ₦" + amt.toLocaleString("en-NG")
          : "Get account number";
      }
    }

    var card = $("#fundVaCard");
    if (card) {
      card.hidden = fundPayMethod !== "va" || !fundVirtualAccount;
      if (fundVirtualAccount && fundPayMethod === "va") {
        var fb = $("#fundVaBank");
        var fn = $("#fundVaAcctName");
        var fnum = $("#fundVaNumber");
        if (fb) fb.textContent = fundVirtualAccount.bank_name || "—";
        if (fn) fn.textContent = fundVirtualAccount.account_name || "—";
        if (fnum) fnum.textContent = fundVirtualAccount.account_no || "—";
      }
    }
  }

  function resetFundSuccessUi() {
    var root = $("#fundSuccessRoot");
    var form = $("#fundFormRoot");
    if (root) root.hidden = true;
    if (form) form.hidden = false;
  }

  function showFundSuccessDisplay(amountNgn) {
    var root = $("#fundSuccessRoot");
    var form = $("#fundFormRoot");
    if (root) root.hidden = false;
    if (form) form.hidden = true;
    var a = $("#fundSuccessAmount");
    if (a) a.textContent = "₦" + Number(amountNgn || 0).toLocaleString("en-NG");
    var b = $("#fundSuccessBalance");
    if (b) b.textContent = "NGN " + balance.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  }

  function openFundVaModal() {
    var m = $("#fundVaModal");
    if (m) {
      m.hidden = false;
      m.setAttribute("aria-hidden", "false");
    }
    var err = $("#fundVaModalErr");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
  }

  function closeFundVaModal() {
    var m = $("#fundVaModal");
    if (m) {
      m.hidden = true;
      m.setAttribute("aria-hidden", "true");
    }
  }

  function sprintPayPublicKey() {
    var el = $("#appDashboard");
    return el ? (el.getAttribute("data-sprintpay-pay-key") || "").trim() : "";
  }

  function fundUserEmail() {
    var el = $("#appDashboard");
    return el ? (el.getAttribute("data-user-email") || "").trim() : "";
  }

  function fundUserIdShort() {
    var el = $("#appDashboard");
    var id = el ? (el.getAttribute("data-user-id") || "").trim() : "";
    return id.length >= 8 ? id.slice(0, 8) : id || "user";
  }

  function checkFundReturnQuery() {
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get("fund") !== "success" && q.get("paid") !== "1") return;
      var pending = sessionStorage.getItem("fund_pending_amount");
      var amt = pending ? Number(pending) : 0;
      sessionStorage.removeItem("fund_pending_amount");
      if (window.history && window.history.replaceState) {
        var u = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", u);
      }
      switchPanel("add-funds", { keepSuccess: true });
      showFundSuccessDisplay(amt);
      loadUserData().catch(function () {});
    } catch (e) {}
  }

  function initFundWallet() {
    if (!$("#fundPresetChips")) return;

    $("#fundPresetChips").addEventListener("click", function (e) {
      var btn = e.target.closest(".fund-chip");
      if (!btn) return;
      fundSelectedPreset = btn.getAttribute("data-preset") || "₦5,000";
      var inp = $("#fundCustomAmount");
      if (inp) inp.value = "";
      fundCustomAmountStr = "";
      fundShowMsg("");
      syncFundUi();
    });

    var custom = $("#fundCustomAmount");
    if (custom) {
      custom.addEventListener("input", function () {
        fundCustomAmountStr = custom.value;
        syncFundUi();
      });
    }

    $("#fundMethodSprintpay") &&
      $("#fundMethodSprintpay").addEventListener("click", function () {
        fundPayMethod = "sprintpay";
        fundShowMsg("");
        syncFundUi();
      });
    $("#fundMethodVa") &&
      $("#fundMethodVa").addEventListener("click", function () {
        fundPayMethod = "va";
        fundShowMsg("");
        syncFundUi();
      });

    $("#fundVaCopy") &&
      $("#fundVaCopy").addEventListener("click", function () {
        var n = $("#fundVaNumber");
        var num = n && n.textContent ? n.textContent.trim() : "";
        if (!num || num === "—") return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(num).catch(function () {});
        }
      });

    $("#fundSuccessAddMore") &&
      $("#fundSuccessAddMore").addEventListener("click", function () {
        resetFundSuccessUi();
        syncFundUi();
      });
    $("#fundSuccessContinue") &&
      $("#fundSuccessContinue").addEventListener("click", function () {
        resetFundSuccessUi();
        switchPanel("home");
      });

    $("#fundVaModalClose") &&
      $("#fundVaModalClose").addEventListener("click", function (e) {
        e.preventDefault();
        closeFundVaModal();
      });
    $("#fundVaModal") &&
      $("#fundVaModal").addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeFundVaModal();
      });
    $("#fundVaModalSubmit") &&
      $("#fundVaModalSubmit").addEventListener("click", async function () {
        var name = ($("#fundVaModalName") && $("#fundVaModalName").value.trim()) || "";
        var phone = ($("#fundVaModalPhone") && $("#fundVaModalPhone").value.replace(/\D/g, "")) || "";
        var err = $("#fundVaModalErr");
        if (err) {
          err.style.display = "none";
          err.textContent = "";
        }
        if (name.length < 2) {
          if (err) {
            err.textContent = "Enter your full name.";
            err.style.display = "block";
          }
          return;
        }
        if (phone.length < 10) {
          if (err) {
            err.textContent = "Enter a valid phone number.";
            err.style.display = "block";
          }
          return;
        }
        var amt = getFundAmountNaira();
        var sub = $("#fundVaModalSubmit");
        if (sub) sub.disabled = true;
        try {
          var json = await miniApi("/virtual-account", {
            method: "POST",
            body: JSON.stringify({ amount: amt, account_name: name, phone: phone }),
          });
          fundVirtualAccount = {
            account_no: json.account_no,
            account_name: json.account_name,
            bank_name: json.bank_name || "SprintPay",
            amount: Number(json.amount != null ? json.amount : amt),
          };
          closeFundVaModal();
          await loadUserData();
          syncFundUi();
        } catch (e) {
          if (err) {
            err.textContent = e.message || "Failed";
            err.style.display = "block";
          }
        } finally {
          if (sub) sub.disabled = false;
        }
      });

    $("#fundCta") &&
      $("#fundCta").addEventListener("click", async function () {
        if (fundCtaLoading) return;
        var amt = getFundAmountNaira();
        fundShowMsg("");
        if (!amt || amt < 100) {
          fundShowMsg("Minimum amount is ₦100.");
          return;
        }

        var cta = $("#fundCta");
        var ctaL = $("#fundCtaLabel");

        if (fundPayMethod === "sprintpay") {
          var key = sprintPayPublicKey();
          if (!key) {
            fundShowMsg("SprintPay key not set. Add SPRINTPAY_PAY_PUBLIC_KEY to mini-laravel .env.");
            return;
          }
          var em = fundUserEmail();
          if (!em) {
            fundShowMsg("Your account needs an email to pay with SprintPay.");
            return;
          }
          fundCtaLoading = true;
          if (cta) cta.disabled = true;
          if (ctaL) ctaL.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Redirecting…';
          sessionStorage.setItem("fund_pending_amount", String(amt));
          var ref = "sp-" + fundUserIdShort() + "-" + Date.now();
          window.location.href =
            "https://web.sprintpay.online/pay?amount=" +
            encodeURIComponent(String(amt)) +
            "&key=" +
            encodeURIComponent(key) +
            "&ref=" +
            encodeURIComponent(ref) +
            "&email=" +
            encodeURIComponent(em);
          return;
        }

        if (!fundVirtualAccount) {
          openFundVaModal();
          return;
        }

        fundCtaLoading = true;
        if (cta) cta.disabled = true;
        if (ctaL) ctaL.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Updating…';
        try {
          var json = await miniApi("/virtual-account", {
            method: "POST",
            body: JSON.stringify({ amount: amt }),
          });
          fundVirtualAccount = {
            account_no: json.account_no,
            account_name: json.account_name,
            bank_name: json.bank_name || "SprintPay",
            amount: Number(json.amount != null ? json.amount : amt),
          };
          await loadUserData();
        } catch (e) {
          fundShowMsg(e.message || "Request failed");
        } finally {
          fundCtaLoading = false;
          if (cta) cta.disabled = false;
          syncFundUi();
        }
      });

    syncFundUi();
  }

  function openSupportChat() {
    var hub = $("#supportHubSection");
    var chat = $("#supportChatSection");
    if (hub) hub.hidden = true;
    if (chat) chat.hidden = false;
    renderSupport();
  }

  function closeSupportChat() {
    var hub = $("#supportHubSection");
    var chat = $("#supportChatSection");
    if (hub) hub.hidden = false;
    if (chat) chat.hidden = true;
  }

  function bindPanelClicks(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-panel]").forEach(function (el) {
      if (el.tagName === "FORM" || el.closest("form")) return;
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-panel");
        if (!p) return;
        switchPanel(p);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDashSlider();
    loadUserData()
      .catch(function (e) {
        console.error(e);
      })
      .then(function () {
        checkFundReturnQuery();
      });

    bindPanelClicks(document);
    initFundWallet();

    function initCurrencyToggle() {
      var ngn = $("#ccNgn");
      var usd = $("#ccUsd");
      if (!ngn || !usd) return;
      ngn.addEventListener("click", function () {
        displayCurrency = "NGN";
        ngn.classList.add("active");
        usd.classList.remove("active");
        updateBalanceUI();
      });
      usd.addEventListener("click", function () {
        displayCurrency = "USD";
        usd.classList.add("active");
        ngn.classList.remove("active");
        updateBalanceUI();
      });
    }
    initCurrencyToggle();

    $("#breadcrumbBack") && $("#breadcrumbBack").addEventListener("click", hideCategoryDetail);
    $("#catBreadcrumbHome") && $("#catBreadcrumbHome").addEventListener("click", function () {
      switchPanel("home");
    });

    $("#hamburgerBtn") &&
      $("#hamburgerBtn").addEventListener("click", function () {
        document.getElementById("dashSidebar") && document.getElementById("dashSidebar").classList.toggle("open");
        document.getElementById("sidebarOverlay") &&
          document.getElementById("sidebarOverlay").classList.toggle("show");
      });
    $("#sidebarOverlay") &&
      $("#sidebarOverlay").addEventListener("click", function () {
        document.getElementById("dashSidebar") && document.getElementById("dashSidebar").classList.remove("open");
        $("#sidebarOverlay").classList.remove("show");
      });

    $("#productSearch") &&
      $("#productSearch").addEventListener("input", function () {
        if (selectedCategory) renderCategoryProducts();
      });
    $("#categorySearchInput") &&
      $("#categorySearchInput").addEventListener("input", function () {
        renderCategoriesPage();
      });

    $("#btnRefreshOrders") &&
      $("#btnRefreshOrders").addEventListener("click", function () {
        loadUserData();
      });
    $("#btnRefreshTx") &&
      $("#btnRefreshTx").addEventListener("click", function () {
        loadUserData();
      });

    $all(".btn-browse[data-panel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchPanel(btn.getAttribute("data-panel"));
      });
    });

    function closeRulesModal() {
      var m = document.getElementById("rulesModal");
      if (m) {
        m.hidden = true;
        m.setAttribute("aria-hidden", "true");
      }
    }
    function openRulesModal() {
      var m = document.getElementById("rulesModal");
      if (m) {
        m.hidden = false;
        m.setAttribute("aria-hidden", "false");
      }
    }

    $("#btnRules") && $("#btnRules").addEventListener("click", openRulesModal);
    $("#rulesModalClose") &&
      $("#rulesModalClose").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeRulesModal();
      });
    $("#rulesModalOk") &&
      $("#rulesModalOk").addEventListener("click", function (e) {
        e.preventDefault();
        closeRulesModal();
      });
    document.getElementById("rulesModal") &&
      document.getElementById("rulesModal").addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closeRulesModal();
      });

    $("#purchaseModalClose") && $("#purchaseModalClose").addEventListener("click", closePurchaseModal);
    document.getElementById("purchaseModal") &&
      document.getElementById("purchaseModal").addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closePurchaseModal();
      });
    $("#purchaseSuccessClose") &&
      $("#purchaseSuccessClose").addEventListener("click", function () {
        closePurchaseSuccessModal();
      });
    $("#purchaseSuccessDone") &&
      $("#purchaseSuccessDone").addEventListener("click", function () {
        closePurchaseSuccessModal();
      });
    $("#purchaseSuccessOrders") &&
      $("#purchaseSuccessOrders").addEventListener("click", function () {
        closePurchaseSuccessModal();
        switchPanel("orders");
      });
    document.getElementById("purchaseSuccessModal") &&
      document.getElementById("purchaseSuccessModal").addEventListener("click", function (e) {
        if (e.target === e.currentTarget) closePurchaseSuccessModal();
      });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (document.getElementById("rulesModal") && !document.getElementById("rulesModal").hidden) closeRulesModal();
      var pm = document.getElementById("purchaseModal");
      if (pm && !pm.hidden) closePurchaseModal();
      var psm = document.getElementById("purchaseSuccessModal");
      if (psm && !psm.hidden) closePurchaseSuccessModal();
      var fvm = document.getElementById("fundVaModal");
      if (fvm && !fvm.hidden) closeFundVaModal();
    });

    $("#qtyMinus") &&
      $("#qtyMinus").addEventListener("click", function () {
        if (qty > 1) {
          qty--;
          $("#qtyVal").textContent = String(qty);
        }
      });
    $("#qtyPlus") &&
      $("#qtyPlus").addEventListener("click", function () {
        if (modalProduct && qty < Number(modalProduct.stock || 0)) {
          qty++;
          $("#qtyVal").textContent = String(qty);
        }
      });
    $("#btnConfirmPurchase") && $("#btnConfirmPurchase").addEventListener("click", confirmPurchase);

    $("#btnUpdatePassword") &&
      $("#btnUpdatePassword").addEventListener("click", async function () {
        var cur = $("#currentPassword").value;
        var p1 = $("#newPassword").value;
        var p2 = $("#confirmPassword").value;
        var msg = $("#profileMsg");
        msg.textContent = "";
        if (p1.length < 6) {
          msg.textContent = "Password must be at least 6 characters.";
          return;
        }
        if (p1 !== p2) {
          msg.textContent = "Passwords do not match.";
          return;
        }
        try {
          await miniApi("/user/password", {
            method: "PATCH",
            body: JSON.stringify({
              current_password: cur,
              password: p1,
              password_confirmation: p2,
            }),
          });
          msg.textContent = "Password updated.";
          $("#currentPassword").value = "";
          $("#newPassword").value = "";
          $("#confirmPassword").value = "";
        } catch (e) {
          msg.textContent = e.message || "Failed";
        }
      });

    function openUrl(key) {
      var u = siteSettings[key];
      if (u) window.open(u, "_blank");
    }
    $("#btnTgGroup") && $("#btnTgGroup").addEventListener("click", function () {
      openUrl("telegram_group");
    });
    $("#btnTgSupport") && $("#btnTgSupport").addEventListener("click", function () {
      openUrl("telegram_support");
    });
    $("#btnWa") && $("#btnWa").addEventListener("click", function () {
      openUrl("whatsapp_channel");
    });
    $("#btnOpenChat") &&
      $("#btnOpenChat").addEventListener("click", function () {
        openSupportChat();
      });
    $("#btnChatBack") &&
      $("#btnChatBack").addEventListener("click", function () {
        closeSupportChat();
      });

    $("#btnSendSupport") &&
      $("#btnSendSupport").addEventListener("click", async function () {
        var input = $("#supportInput");
        var msg = $("#supportMsg");
        msg.textContent = "";
        var content = (input && input.value.trim()) || "";
        if (!content) return;
        try {
          await miniApi("/messages", {
            method: "POST",
            body: JSON.stringify({
              content: content,
              receiver_id: "00000000-0000-0000-0000-000000000000",
            }),
          });
          input.value = "";
          messages = await miniApi("/messages");
          renderSupport();
          updateUnreadBadge();
        } catch (e) {
          msg.textContent = e.message || "Failed";
        }
      });

    function vtuShowResult(el, msg, ok) {
      if (!el) return;
      el.style.display = "block";
      el.textContent = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
      el.classList.remove("is-ok", "is-err");
      el.classList.add(ok ? "is-ok" : "is-err");
    }

    function vtuSyncBalance(json) {
      if (json && json.new_balance !== undefined && json.new_balance !== null) {
        balance = Number(json.new_balance);
        updateBalanceUI();
      }
    }

    /** SprintPay catalog: get-data / get-data-variations (proxied). */
    var vtuDataNetworkRows = [];
    var vtuDataBundleRows = [];

    function vtuStrField(row, keys) {
      for (var k = 0; k < keys.length; k++) {
        var v = row[keys[k]];
        if (typeof v === "string" && v.trim()) return v.trim();
        if (typeof v === "number" && isFinite(v)) return String(v);
      }
      return "";
    }

    function vtuPickCatalogRows(catalog) {
      if (!catalog) return [];
      if (Array.isArray(catalog)) return catalog;
      if (typeof catalog !== "object") return [];
      var root = catalog;
      var inner = root.catalog || root;
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        if (Array.isArray(inner.data)) return inner.data;
        if (Array.isArray(inner.variations)) return inner.variations;
        if (inner.content && Array.isArray(inner.content.variations)) return inner.content.variations;
      }
      if (Array.isArray(root.data)) return root.data;
      if (Array.isArray(root.variations)) return root.variations;
      if (root.content && Array.isArray(root.content.variations)) return root.content.variations;
      return [];
    }

    function vtuNetworkForPost(row, fallback) {
      var f = (fallback || "mtn").toLowerCase();
      if (!row) return f;
      var n = vtuStrField(row, ["network", "Network"]).toLowerCase();
      if (["mtn", "airtel", "glo", "9mobile"].indexOf(n) >= 0) return n;
      var sid = vtuStrField(row, ["service_id", "serviceID", "serviceId"]).toLowerCase();
      if (sid.indexOf("mtn") >= 0) return "mtn";
      if (sid.indexOf("airtel") >= 0) return "airtel";
      if (sid.indexOf("glo") >= 0) return "glo";
      if (sid.indexOf("9mobile") >= 0 || sid.indexOf("etisalat") >= 0) return "9mobile";
      return f;
    }

    function vtuCatalogVariationQuery(row, postNetwork) {
      var sid = vtuStrField(row, ["service_id", "serviceID", "serviceId"]);
      if (sid) return sid;
      var n = vtuStrField(row, ["network", "Network"]).toLowerCase();
      if (n) return n;
      return postNetwork || "mtn";
    }

    function vtuBundleLabel(row) {
      return vtuStrField(row, ["name", "Name", "variation_name", "title", "product_name"]) || "Bundle";
    }

    function vtuBundleVariationCode(row) {
      return vtuStrField(row, ["variation_code", "variationCode", "plan_code", "planCode", "code", "id"]);
    }

    function vtuBundleAmount(row) {
      var raw = vtuStrField(row, ["variation_amount", "variationAmount", "amount", "price", "fixedPrice"]).replace(/,/g, "");
      var n = Number(raw);
      return isFinite(n) && n > 0 ? n : 0;
    }

    function vtuRebuildDataNetworkSelect(rows) {
      var sel = $("#vtuDataNetwork");
      if (!sel) return;
      sel.innerHTML = "";
      var staticNets = ["mtn", "airtel", "glo", "9mobile"];
      if (!rows || !rows.length) {
        staticNets.forEach(function (n) {
          var o = document.createElement("option");
          o.value = n;
          o.textContent = n.toUpperCase();
          o.setAttribute("data-variation-query", n);
          o.setAttribute("data-service-id", "");
          o.setAttribute("data-row-index", "");
          sel.appendChild(o);
        });
        return;
      }
      rows.forEach(function (row, i) {
        var post = vtuNetworkForPost(row, "mtn");
        var q = vtuCatalogVariationQuery(row, post);
        var sid = vtuStrField(row, ["service_id", "serviceID", "serviceId"]);
        var o = document.createElement("option");
        o.value = post;
        o.textContent = vtuBundleLabel(row);
        o.setAttribute("data-variation-query", q);
        o.setAttribute("data-service-id", sid);
        o.setAttribute("data-row-index", String(i));
        sel.appendChild(o);
      });
    }

    async function vtuLoadDataBundlesForSelectedNetwork() {
      var sel = $("#vtuDataNetwork");
      var st = $("#vtuDataBundleStatus");
      var bundleSel = $("#vtuDataBundle");
      if (!sel || !bundleSel) return;
      var opt = sel.selectedOptions[0];
      var q = (opt && opt.getAttribute("data-variation-query")) || sel.value || "mtn";
      if (st) st.textContent = "(loading…)";
      vtuDataBundleRows = [];
      try {
        var json = await miniApi("/vtu/catalog/data-variations?network=" + encodeURIComponent(q), { method: "GET" });
        vtuDataBundleRows = vtuPickCatalogRows(json.catalog || json);
      } catch (e) {
        vtuDataBundleRows = [];
      }
      bundleSel.innerHTML = '<option value="">— Custom (amount &amp; code below) —</option>';
      vtuDataBundleRows.forEach(function (row, i) {
        var code = vtuBundleVariationCode(row);
        if (!code) return;
        var o = document.createElement("option");
        o.value = code;
        var a = vtuBundleAmount(row);
        o.textContent = vtuBundleLabel(row) + (a ? " — ₦" + a.toLocaleString("en-NG") : "");
        o.setAttribute("data-row-index", String(i));
        bundleSel.appendChild(o);
      });
      if (st) st.textContent = "";
    }

    async function vtuLoadDataCatalog() {
      vtuDataNetworkRows = [];
      try {
        var json = await miniApi("/vtu/catalog/data-networks", { method: "GET" });
        vtuDataNetworkRows = vtuPickCatalogRows(json.catalog || json);
      } catch (e) {
        vtuDataNetworkRows = [];
      }
      vtuRebuildDataNetworkSelect(vtuDataNetworkRows);
      var opt = $("#vtuDataNetwork") && $("#vtuDataNetwork").selectedOptions[0];
      var hid = $("#vtuDataServiceId");
      if (hid && opt) hid.value = opt.getAttribute("data-service-id") || "";
      await vtuLoadDataBundlesForSelectedNetwork();
    }

    function initVtuPanels() {
      $("#formVtuAirtime") &&
        $("#formVtuAirtime").addEventListener("submit", async function (e) {
          e.preventDefault();
          var btn = $("#btnVtuAirtime");
          var resEl = $("#vtuAirtimeResult");
          btn.disabled = true;
          vtuShowResult(resEl, "Processing…", true);
          try {
            var json = await miniApi("/vtu/airtime", {
              method: "POST",
              body: JSON.stringify({
                network: $("#vtuAirtimeNetwork").value,
                phone: $("#vtuAirtimePhone").value.trim(),
                amount: Number($("#vtuAirtimeAmount").value),
              }),
            });
            vtuSyncBalance(json);
            vtuShowResult(
              resEl,
              (json.message || "Done") + (json.provider ? "\n\n" + JSON.stringify(json.provider, null, 2) : ""),
              !!json.success
            );
          } catch (err) {
            vtuShowResult(resEl, err.message || "Request failed", false);
          } finally {
            btn.disabled = false;
          }
        });

      $("#vtuDataNetwork") &&
        $("#vtuDataNetwork").addEventListener("change", function () {
          var opt = $("#vtuDataNetwork").selectedOptions[0];
          var hid = $("#vtuDataServiceId");
          if (hid && opt) hid.value = opt.getAttribute("data-service-id") || "";
          vtuLoadDataBundlesForSelectedNetwork();
        });
      $("#vtuDataBundle") &&
        $("#vtuDataBundle").addEventListener("change", function () {
          var sel = $("#vtuDataBundle");
          var plan = $("#vtuDataPlan");
          var amt = $("#vtuDataAmount");
          if (!sel || !sel.selectedOptions[0]) return;
          var ix = sel.selectedOptions[0].getAttribute("data-row-index");
          if (sel.value === "") {
            if (plan) plan.value = "";
            return;
          }
          if (plan) plan.value = sel.value;
          if (ix !== null && ix !== "" && vtuDataBundleRows[Number(ix)] && amt) {
            var a = vtuBundleAmount(vtuDataBundleRows[Number(ix)]);
            if (a >= 50) amt.value = String(a);
          }
        });

      $("#formVtuData") &&
        $("#formVtuData").addEventListener("submit", async function (e) {
          e.preventDefault();
          var btn = $("#btnVtuData");
          var resEl = $("#vtuDataResult");
          var nsel = $("#vtuDataNetwork");
          var opt = nsel && nsel.selectedOptions[0];
          var ix = opt && opt.getAttribute("data-row-index");
          var nrow = ix !== null && ix !== "" && vtuDataNetworkRows.length ? vtuDataNetworkRows[Number(ix)] : null;
          var postNetwork = nrow ? vtuNetworkForPost(nrow, nsel.value) : nsel.value;
          var plan = ($("#vtuDataPlan") && $("#vtuDataPlan").value.trim()) || "";
          var sid = ($("#vtuDataServiceId") && $("#vtuDataServiceId").value.trim()) || "";
          btn.disabled = true;
          vtuShowResult(resEl, "Processing…", true);
          try {
            var body = {
              network: postNetwork,
              phone: $("#vtuDataPhone").value.trim(),
              amount: Number($("#vtuDataAmount").value),
            };
            if (plan) body.variation_code = plan;
            if (sid) body.service_id = sid;
            var json = await miniApi("/vtu/data", { method: "POST", body: JSON.stringify(body) });
            vtuSyncBalance(json);
            vtuShowResult(
              resEl,
              (json.message || "Done") + (json.provider ? "\n\n" + JSON.stringify(json.provider, null, 2) : ""),
              !!json.success
            );
          } catch (err) {
            vtuShowResult(resEl, err.message || "Request failed", false);
          } finally {
            btn.disabled = false;
          }
        });

      vtuLoadDataCatalog().catch(function () {});

      $("#btnVtuCableValidate") &&
        $("#btnVtuCableValidate").addEventListener("click", async function () {
          var resEl = $("#vtuCableResult");
          vtuShowResult(resEl, "Validating…", true);
          try {
            var q =
              "provider=" +
              encodeURIComponent($("#vtuCableProvider").value) +
              "&smartcard_number=" +
              encodeURIComponent($("#vtuCableNumber").value.trim());
            var json = await miniApi("/vtu/cable/validate?" + q, { method: "GET" });
            vtuShowResult(resEl, JSON.stringify(json.data || json, null, 2), true);
          } catch (err) {
            vtuShowResult(resEl, err.message || "Validation failed", false);
          }
        });

      $("#btnVtuCableBuy") &&
        $("#btnVtuCableBuy").addEventListener("click", async function () {
          var btn = $("#btnVtuCableBuy");
          var resEl = $("#vtuCableResult");
          btn.disabled = true;
          vtuShowResult(resEl, "Processing payment…", true);
          try {
            var json = await miniApi("/vtu/cable/buy", {
              method: "POST",
              body: JSON.stringify({
                provider: $("#vtuCableProvider").value,
                smartcard_number: $("#vtuCableNumber").value.trim(),
                product_code: ($("#vtuCableProduct") && $("#vtuCableProduct").value.trim()) || "",
                amount: Number($("#vtuCableAmount").value),
              }),
            });
            vtuSyncBalance(json);
            vtuShowResult(
              resEl,
              (json.message || "Done") + (json.provider ? "\n\n" + JSON.stringify(json.provider, null, 2) : ""),
              !!json.success
            );
          } catch (err) {
            vtuShowResult(resEl, err.message || "Request failed", false);
          } finally {
            btn.disabled = false;
          }
        });

      $("#btnVtuElectricityValidate") &&
        $("#btnVtuElectricityValidate").addEventListener("click", async function () {
          var resEl = $("#vtuElectricityResult");
          vtuShowResult(resEl, "Verifying meter…", true);
          try {
            var q =
              "disco=" +
              encodeURIComponent($("#vtuElectricityDisco").value.trim()) +
              "&meter_type=" +
              encodeURIComponent($("#vtuElectricityMeterType").value) +
              "&meter_number=" +
              encodeURIComponent($("#vtuElectricityMeter").value.trim());
            var json = await miniApi("/vtu/electricity/validate?" + q, { method: "GET" });
            vtuShowResult(resEl, JSON.stringify(json.data || json, null, 2), true);
          } catch (err) {
            vtuShowResult(resEl, err.message || "Verification failed", false);
          }
        });

      $("#btnVtuElectricityBuy") &&
        $("#btnVtuElectricityBuy").addEventListener("click", async function () {
          var btn = $("#btnVtuElectricityBuy");
          var resEl = $("#vtuElectricityResult");
          btn.disabled = true;
          vtuShowResult(resEl, "Processing payment…", true);
          try {
            var json = await miniApi("/vtu/electricity/buy", {
              method: "POST",
              body: JSON.stringify({
                disco: $("#vtuElectricityDisco").value.trim(),
                meter_type: $("#vtuElectricityMeterType").value,
                meter_number: $("#vtuElectricityMeter").value.trim(),
                amount: Number($("#vtuElectricityAmount").value),
              }),
            });
            vtuSyncBalance(json);
            vtuShowResult(
              resEl,
              (json.message || "Done") + (json.provider ? "\n\n" + JSON.stringify(json.provider, null, 2) : ""),
              !!json.success
            );
          } catch (err) {
            vtuShowResult(resEl, err.message || "Request failed", false);
          } finally {
            btn.disabled = false;
          }
        });
    }

    initVtuPanels();

    setInterval(function () {
      var ps = $("#panel-support");
      if (ps && !ps.hidden && $("#supportChatSection") && !$("#supportChatSection").hidden) {
        miniApi("/messages")
          .then(function (m) {
            messages = Array.isArray(m) ? m : [];
            renderSupport();
            updateUnreadBadge();
          })
          .catch(function () {});
      }
    }, 8000);
  });
})();
