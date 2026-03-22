/**
 * Page loader: hides when DOM is ready; shows on in-app navigations.
 * window.pageLoader.show() / .hide() for manual control (e.g. form submit).
 */
(function () {
  var ID = "page-loader";

  function el() {
    return document.getElementById(ID);
  }

  function hide() {
    var node = el();
    if (node) node.classList.add("page-loader--hidden");
  }

  function show() {
    var node = el();
    if (node) node.classList.remove("page-loader--hidden");
  }

  function initHide() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hide);
    } else {
      hide();
    }
    window.addEventListener("load", hide);
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) hide();
    });
  }

  function initNav() {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a) return;
        if (a.target === "_blank" || a.hasAttribute("download")) return;
        var href = a.getAttribute("href");
        if (!href || href === "#" || href.startsWith("#") || href.startsWith("javascript:")) return;
        if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
        try {
          var u = new URL(href, window.location.href);
          if (u.origin !== window.location.origin) return;
          if (u.pathname === window.location.pathname && u.search === window.location.search) return;
        } catch (_) {
          return;
        }
        show();
      },
      true
    );
  }

  window.pageLoader = { show: show, hide: hide };
  initHide();
  initNav();
})();
