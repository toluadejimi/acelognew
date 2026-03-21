import { useState, useCallback, useEffect, useRef } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, apiFormData } from "@/lib/api";
import { getSameOriginPrefix } from "@/lib/env";
import { ProductSkeleton, CategorySkeleton, ProductGridSkeleton, ProductListSkeleton, CategoryGridSkeleton } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import "../styles/dashboard.css";

type PanelName = "home" | "orders" | "profile" | "add-funds" | "support" | "categories" | "transactions";

interface ModalData {
  title: string;
  desc: string;
  platform: string;
  stock: number;
  price: string;
  product_id?: string;
  priceNum?: number;
}

const API_BASE = getSameOriginPrefix();

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
}

interface Product {
  id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  platform: string;
  currency: string;
  image_url: string | null;
  sample_link?: string | null;
}

interface Order {
  id: string;
  product_title: string;
  product_platform: string;
  total_price: number;
  status: string;
  created_at: string;
  account_details: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
  reference: string | null;
  created_at: string;
}

interface Message {
  id: string;
  order_id: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachment_url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface BroadcastMessage {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


type NavSection = { label: string; type: "section" };
type NavLink = { label: string; icon: string; panel?: PanelName; action?: () => void; badge?: string; ext?: boolean };
type NavItem = NavSection | NavLink;

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "fa-solid fa-house", panel: "home" },
  { label: "Categories", icon: "fa-solid fa-layer-group", panel: "categories" },
  { label: "Profile", icon: "fa-solid fa-user", panel: "profile" },
  { label: "My Orders", icon: "fa-solid fa-box", panel: "orders" },
  { label: "Transactions", icon: "fa-solid fa-receipt", panel: "transactions" },
  { label: "Add Funds", icon: "fa-solid fa-credit-card", panel: "add-funds" },
  { label: "Rules", icon: "fa-solid fa-file-lines", panel: undefined as unknown as PanelName },
  { label: "Support", icon: "fa-solid fa-headset", panel: "support" },
];

const PANEL_TITLES: Record<PanelName, string> = {
  home: "Ace Log Store",
  categories: "Categories",
  profile: "My Profile",
  orders: "My Orders",
  transactions: "Transactions",
  "add-funds": "Add Funds",
  support: "Support Center",
};

const SLIDER_SLIDES = [
  { img: "/slider/imgi_8_slide_1-4d9033b5-4979-4305-98b2-17209baf1a64.png", link: null as string | null },
  { img: "/slider/imgi_9_slide_2-0587384e-1df0-43ab-924b-af3bb9c98e01.png", link: "whatsapp" },
  { img: "/slider/imgi_10_slide_3-b45e14cc-b1fe-4aed-ad0b-9338d1524687.png", link: "telegram_group" },
  { img: "/slider/imgi_11_slide_4-da1d2052-3e44-4b83-8473-344b25e878bb.png", link: "support" },
];
const SLIDER_VIEW_COUNT = 3;
const SLIDER_MAX_INDEX = Math.max(0, SLIDER_SLIDES.length - SLIDER_VIEW_COUNT);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userId = user?.id ?? null;
  const [activePanel, setActivePanel] = useState<PanelName>("home");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<ModalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [boughtAccounts, setBoughtAccounts] = useState<{ login: string, password: string, description?: string }[] | null>(null);
 const [selectedPreset, setSelectedPreset] = useState("NGN 5,000");
const [selectedPayment, setSelectedPayment] = useState(0);
const [customAmount, setCustomAmount] = useState("");
const [fundSuccess, setFundSuccess] = useState(false);
const [fundAmount, setFundAmount] = useState(0);
const [payLoading, setPayLoading] = useState(false);
  const [virtualAccount, setVirtualAccount] = useState<{ account_no: string; account_name: string; bank_name: string; amount: number } | null>(null);
  const [vaLoading, setVaLoading] = useState(false);
  const [vaModalOpen, setVaModalOpen] = useState(false);
  const [vaFullName, setVaFullName] = useState("");
  const [vaPhone, setVaPhone] = useState("");
  const [bankDetails, setBankDetails] = useState<any[]>([]);
  const [viewingOrderLogs, setViewingOrderLogs] = useState<any[] | null>(null);
  const [viewingOrderTitle, setViewingOrderTitle] = useState("");
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);
  const [broadcastCurrent, setBroadcastCurrent] = useState<BroadcastMessage | null>(null);
  const [broadcastDropdownOpen, setBroadcastDropdownOpen] = useState(false);
  const broadcastDropdownRef = useRef<HTMLDivElement>(null);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({
    telegram_group: "https://t.me/social_store_group",
    telegram_support: "https://t.me/social_store_support",
    whatsapp_channel: "https://wa.me/social_store_channel"
  });

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // User data
  const [username, setUsername] = useState("");
  const email = user?.email ?? "";
  const [balance, setBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [pendingAttachmentUrl, setPendingAttachmentUrl] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentFeed, setRecentFeed] = useState<any[]>([]);
  const { isAdmin } = useAdminCheck();

  // Slider on home (announcements / support banners)
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (activePanel !== "home" || selectedCategory) return;
    const t = setInterval(() => setSlideIndex((i) => (i >= SLIDER_MAX_INDEX ? 0 : i + 1)), 5000);
    return () => clearInterval(t);
  }, [activePanel, selectedCategory]);

  const handleSlideClick = (slide: typeof SLIDER_SLIDES[0]) => {
    if (!slide.link) return;
    if (slide.link === "support") {
      setActivePanel("support");
      setSupportChatOpen(true);
    } else if (slide.link === "telegram_group" && siteSettings.telegram_group) window.open(siteSettings.telegram_group, "_blank");
    else if (slide.link === "whatsapp" && siteSettings.whatsapp_channel) window.open(siteSettings.whatsapp_channel, "_blank");
  };

  // Scroll animation
  useEffect(() => {
    let obs: IntersectionObserver | null = null;
    const timer = setTimeout(() => {
      obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("slide-visible");
        }),
        { threshold: 0.05, rootMargin: "0px 0px 100px 0px" }
      );
      const elements = document.querySelectorAll(".slide-from-left, .slide-from-right");
      elements.forEach((el) => {
        // Immediately show elements already in the viewport
        const rect = el.getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (inView) {
          el.classList.add("slide-visible");
        } else {
          obs!.observe(el);
        }
      });
    }, 200);
    return () => {
      clearTimeout(timer);
      if (obs) obs.disconnect();
    };
  }, [activePanel, selectedCategory, dbProducts, dataLoading, renderKey, activeFilter, searchQuery]);

  const refreshWalletBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const walletRes = await api<{ balance: number }>("/wallet");
      setBalance(Number(walletRes.balance));
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    loadUserData().then(() => {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      const payment = params.get("payment");
      if (ref && payment === "success") {
        window.history.replaceState({}, '', '/dashboard');
        setFundSuccess(true);
        setActivePanel("add-funds");
        refreshWalletBalance();
        const t1 = setTimeout(refreshWalletBalance, 2000);
        const t2 = setTimeout(refreshWalletBalance, 4000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    });
    fetchRecentFeed();
  }, [navigate, refreshWalletBalance]);

  // Refetch real balance when user opens Add Funds so wallet always shows current value
  useEffect(() => {
    if (activePanel === "add-funds") refreshWalletBalance();
  }, [activePanel, refreshWalletBalance]);

  useEffect(() => {
    console.log("STATE UPDATED - categories:", dbCategories.length, "products:", dbProducts.length);
  }, [dbCategories, dbProducts]);

  const BROADCAST_DISMISSED_KEY = "broadcast_dismissed_ids";
  const getDismissedIds = (): string[] => {
    try {
      const raw = localStorage.getItem(BROADCAST_DISMISSED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const dismissBroadcast = (id: string) => {
    const dismissed = getDismissedIds();
    const updated = dismissed.includes(id) ? dismissed : [...dismissed, id];
    localStorage.setItem(BROADCAST_DISMISSED_KEY, JSON.stringify(updated));
    const next = broadcastMessages.filter((m) => !updated.includes(m.id))[0] ?? null;
    setBroadcastCurrent(next);
  };

  const openBroadcastInModal = (b: BroadcastMessage) => {
    setBroadcastCurrent(b);
    setBroadcastDropdownOpen(false);
  };

  const newBroadcastCount = broadcastMessages.filter((m) => !getDismissedIds().includes(m.id)).length;

  useEffect(() => {
    if (!broadcastDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (broadcastDropdownRef.current && !broadcastDropdownRef.current.contains(e.target as Node)) {
        setBroadcastDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [broadcastDropdownOpen]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await api<BroadcastMessage[]>("/broadcast-messages");
        if (cancelled) return;
        setBroadcastMessages(Array.isArray(list) ? list : []);
        const dismissed = getDismissedIds();
        const firstUndismissed = (Array.isArray(list) ? list : []).find((m) => !dismissed.includes(m.id)) ?? null;
        setBroadcastCurrent(firstUndismissed);
      } catch {
        if (!cancelled) setBroadcastMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const fetchRecentFeed = async () => {
    let realOrders: { product_title: string; total_price: number; created_at: string }[] = [];
    try {
      realOrders = await api<{ product_title: string; total_price: number; created_at: string }[]>("/orders/feed");
    } catch {
      // ignore
    }
    const fakes = [
      { user: "Sage.", product: "MALE POF(NOT PAI...", price: "₦6,000", time: "Just now" },
      { user: "Phoenix.", product: "PRIVATE PROXIES", price: "₦4,000", time: "10 mins ago" },
      { user: "Cameron.", product: "POF AGED ACCOUNT", price: "₦4,500", time: "25 mins ago" },
      { user: "Avery.", product: "DATACENTER PROXY", price: "₦3,500", time: "5 mins ago" },
      { user: "Jordan.", product: "TRUSTED EMAIL", price: "₦2,000", time: "42 mins ago" },
      { user: "Skyler.", product: "DASHBOARD VIP", price: "₦12,000", time: "1 hour ago" }
    ];

    const mappedReal = (realOrders || []).map(o => ({
      user: "User**",
      product: o.product_title,
      price: `₦${Number(o.total_price).toLocaleString()}`,
      time: "Recent"
    }));

    setRecentFeed([...mappedReal, ...fakes].slice(0, 10));
  };

  const loadUserData = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    try {
      const [profile, walletRes, userOrders, userTxns, cats, prods, msgs, bds, ss] = await Promise.all([
        api<{ username?: string }>("/profile"),
        api<{ balance: number }>("/wallet"),
        api<Order[]>("/orders"),
        api<Transaction[]>("/transactions"),
        api<Category[]>("/categories"),
        api<Product[]>("/products"),
        api<Message[]>("/messages"),
        api<unknown[]>("/bank-details"),
        api<Record<string, string>>("/site-settings"),
      ]);
      if (profile?.username) setUsername(profile.username);
      if (walletRes) setBalance(Number(walletRes.balance));
      if (userOrders) setOrders(userOrders);
      if (userTxns) setTransactions(Array.isArray(userTxns) ? userTxns : []);
      if (cats) setDbCategories(cats);
      if (prods) setDbProducts(prods);
      if (msgs) {
        setMessages(msgs);
        setUnreadCount(msgs.filter(m => m.receiver_id === userId && !m.is_read).length);
      }
      if (bds) setBankDetails(bds);
      if (ss) setSiteSettings(prev => ({ ...prev, ...ss }));
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setDataLoading(false);
      setRenderKey(prev => prev + 1);
    }
  }, [userId]);

  // Load existing virtual account (one per user) when on Add Funds + Virtual Account
  const loadExistingVirtualAccount = useCallback(async (amountToShow: number) => {
    if (!userId) return;
    setVaLoading(true);
    try {
      const json = await api<{ account_no?: string; account_name?: string; bank_name?: string; amount?: number }>("/virtual-account", {
        method: "POST",
        body: JSON.stringify({ amount: amountToShow }),
      });
      if (json.account_no) {
        setVirtualAccount({
          account_no: json.account_no,
          account_name: json.account_name ?? "",
          bank_name: json.bank_name ?? "SprintPay",
          amount: json.amount ?? amountToShow,
        });
      }
    } catch {
      // ignore
    } finally {
      setVaLoading(false);
    }
  }, [userId]);

  const fetchOrderDetails = async (orderId: string, productTitle: string) => {
    setDataLoading(true);
    try {
      const logs = await api<{ login: string; password: string }[]>(`/orders/${orderId}/account-logs`);
      setViewingOrderLogs(logs || []);
      setViewingOrderTitle(productTitle);
    } catch {
      toast.error("Failed to fetch order details");
    } finally {
      setDataLoading(false);
    }
  };

  // When user opens Add Funds and selects Virtual Account, load their existing account if any (one per user)
  useEffect(() => {
    if (activePanel !== "add-funds" || selectedPayment !== 1 || !userId) return;
    const amount = customAmount ? Number(customAmount) : selectedPreset ? Number(selectedPreset.replace(/[^\d]/g, "")) : 0;
    loadExistingVirtualAccount(amount || 0);
  }, [activePanel, selectedPayment, userId, loadExistingVirtualAccount]);

  // Poll messages when on support panel
  const markMessagesRead = useCallback(async () => {
    if (!userId) return;
    const unread = messages.filter(m => m.receiver_id === userId && !m.is_read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(m => api(`/messages/${m.id}/read`, { method: "PATCH" })));
      const msgs = await api<Message[]>("/messages");
      setMessages(msgs);
      setUnreadCount(msgs.filter(m => m.receiver_id === userId && !m.is_read).length);
    } catch {
      // ignore
    }
  }, [userId, messages]);

  useEffect(() => {
    if (!userId || activePanel !== "support") return;
    const t = setInterval(async () => {
      try {
        const msgs = await api<Message[]>("/messages");
        setMessages(msgs);
        setUnreadCount(msgs.filter(m => m.receiver_id === userId && !m.is_read).length);
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(t);
  }, [userId, activePanel]);

  // Mark messages as read when user opens the support chat
  useEffect(() => {
    if (supportChatOpen && userId && messages.some(m => m.receiver_id === userId && !m.is_read)) {
      markMessagesRead();
    }
  }, [supportChatOpen, userId, messages, markMessagesRead]);

  // Scroll chat to bottom
  useEffect(() => {
    const container = document.getElementById('chat-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, activePanel]);

  useEffect(() => {
    if (activePanel === "support" && supportChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activePanel, supportChatOpen]);

  const sendMessage = async (orderId?: string) => {
    const content = msgInput.trim();
    if ((!content && !pendingAttachmentUrl) || !userId) return;
    try {
      await api("/messages", {
        method: "POST",
        body: JSON.stringify({
          content: content || undefined,
          attachment_url: pendingAttachmentUrl || undefined,
          order_id: orderId || undefined,
          receiver_id: "00000000-0000-0000-0000-000000000000",
        }),
      });
      setMsgInput("");
      setPendingAttachmentUrl(null);
      toast.success("Message sent!");
      const msgs = await api<Message[]>("/messages");
      setMessages(msgs);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) {
      toast.error("Allowed: JPG, PNG, WebP, GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setAttachmentUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFormData<{ url: string }>("/messages/upload", form);
      if (res?.url) setPendingAttachmentUrl(res.url);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setAttachmentUploading(false);
      e.target.value = "";
    }
  };

  const switchPanel = useCallback((panel: PanelName) => {
    setActivePanel(panel);
    setSidebarOpen(false);
    setSelectedCategory(null);
  }, []);

  const getProductsForCategory = (catId: string) => dbProducts.filter(p => p.category_id === catId);

  const platformIconMap: Record<string, string> = {
    Facebook: "fa-brands fa-facebook", Instagram: "fa-brands fa-instagram",
    TikTok: "fa-brands fa-tiktok", "Twitter/X": "fa-brands fa-x-twitter",
    YouTube: "fa-brands fa-youtube", Snapchat: "fa-brands fa-snapchat",
    LinkedIn: "fa-brands fa-linkedin", Discord: "fa-brands fa-discord",
    Gmail: "fa-brands fa-google", Telegram: "fa-brands fa-telegram",
  };
  const resolveImageUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (!API_BASE) return url;
    return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const getCatIcon = (cat: Category) => {
    const url = resolveImageUrl(cat.image_url);
    if (url) {
      return <img src={url} alt={cat.name} style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />;
    }
    const prods = getProductsForCategory(cat.id);
    if (prods.length > 0 && platformIconMap[prods[0].platform]) return <i className={platformIconMap[prods[0].platform]} />;
    return cat.emoji || "📦";
  };

  const formatPrice = (currency: string, price: number) =>
    currency === "NGN" ? `₦${price.toLocaleString("en-NG")}` : `${currency} ${price.toLocaleString("en-NG")}`;

  const getProductImage = (product: Product, cat?: Category | null) => {
    const productUrl = resolveImageUrl(product.image_url);
    if (productUrl) {
      return <img src={productUrl} alt={product.title} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />;
    }
    const catUrl = resolveImageUrl(cat?.image_url ?? null);
    if (catUrl) {
      return <img src={catUrl} alt={product.title} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />;
    }
    if (platformIconMap[product.platform]) {
      return <i className={platformIconMap[product.platform]} />;
    }
    return <span>{cat?.emoji || "📦"}</span>;
  };

  const filteredDbCategories = dbCategories.filter(cat => {
    if (activeFilter === "all") return true;
    // "Popular" pills now represent categories (activeFilter is a category id).
    return cat.id === activeFilter;
  });

  // Debug logging - only log when data actually changes
  useEffect(() => {
    if (!dataLoading) {
      console.log("Debug - dbCategories length:", dbCategories.length);
      console.log("Debug - dbProducts length:", dbProducts.length);
      console.log("Debug - filteredDbCategories length:", filteredDbCategories.length);
      console.log("Debug - activeFilter:", activeFilter);
      console.log("Debug - searchQuery:", searchQuery);
    }
  }, [dataLoading, dbCategories, dbProducts, filteredDbCategories, activeFilter, searchQuery]);

  const filterBySearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };


  const initials = username ? username.slice(0, 2).toUpperCase() : email ? email.slice(0, 2).toUpperCase() : "U";

  const handleUpdatePassword = async () => {
    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await api("/user/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: currentPass,
          password: newPass,
          password_confirmation: confirmPass,
        }),
      });
      toast.success("Password updated successfully!");
      setNewPass("");
      setConfirmPass("");
      setCurrentPass("");
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message || "Failed to update password");
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };
  const formattedBalance = `NGN ${balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  const shortBalance = `NGN ${balance.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

  return (
    <div className="dashboard-layout">
      {/* Broadcast message popup (on login) */}
      {broadcastCurrent && (
        <div className="broadcast-overlay" onClick={(e) => { if (e.target === e.currentTarget) dismissBroadcast(broadcastCurrent.id); }}>
          <div className="broadcast-modal">
            <div className="broadcast-modal-header">
              <span className="broadcast-badge">Announcement</span>
              <button type="button" className="broadcast-close" onClick={() => dismissBroadcast(broadcastCurrent.id)} aria-label="Close">×</button>
            </div>
            <h3 className="broadcast-title">{broadcastCurrent.title}</h3>
            <div className="broadcast-body">{broadcastCurrent.body}</div>
            <div className="broadcast-actions">
              <button type="button" className="broadcast-btn-dismiss" onClick={() => dismissBroadcast(broadcastCurrent.id)}>
                {broadcastMessages.filter((m) => !getDismissedIds().includes(m.id)).length > 1 ? "Next" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <div style={{ marginBottom: 20 }}>
              <div className="modal-tag">Confirm Purchase</div>
              <h2 className="modal-title-text">{modal.title.toUpperCase()}</h2>
              <p className="modal-desc-text">{modal.desc}</p>
            </div>
            <div className="modal-detail-row">
              <span className="mdr-label">Platform</span>
              <span className="mdr-val">{modal.platform}</span>
            </div>
            <div className="modal-detail-row">
              <span className="mdr-label">Stock Available</span>
              <span className="mdr-val">{modal.stock}</span>
            </div>
            <div className="modal-detail-row">
              <span className="mdr-label">Your Balance</span>
              <span className={`mdr-val ${modal.priceNum && balance < modal.priceNum ? "modal-balance-low" : "modal-balance-ok"}`}>{formattedBalance}</span>
            </div>
            {modal.priceNum && balance < modal.priceNum && (
              <div className="modal-insufficient-msg">
                ⚠️ Insufficient balance. Please add funds first.
              </div>
            )}
            <div className="modal-detail-row">
              <span className="mdr-label">Quantity</span>
              <div className="qty-selector">
                <button onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}>-</button>
                <span className="qty-val">{purchaseQuantity}</span>
                <button onClick={() => setPurchaseQuantity(Math.min(modal.stock, purchaseQuantity + 1))}>+</button>
              </div>
            </div>
            <div className="modal-total">
              <span className="mt-label">Total Cost</span>
              <span className="mt-val">₦{((modal.priceNum || 0) * purchaseQuantity).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <button
              className={`btn-confirm${loading ? " loading" : ""}`}
              disabled={loading}
              onClick={async () => {
                if (!modal.product_id) {
                  toast.error("This product is not available for purchase yet.");
                  return;
                }
                const totalPrice = (modal.priceNum || 0) * purchaseQuantity;
                if (balance < totalPrice) {
                  toast.error("Insufficient balance. Please add funds first.");
                  return;
                }
                setLoading(true);
                try {
                  const result = await api<{ success: boolean; error_msg?: string; new_balance: number; purchased_accounts?: { login: string; password: string }[] }>("/purchase", {
                    method: "POST",
                    body: JSON.stringify({
                      product_id: modal.product_id,
                      quantity: purchaseQuantity,
                    }),
                  });
                  if (!result.success) {
                    toast.error(result.error_msg || "Purchase failed");
                  } else {
                    toast.success(`✅ Purchase successful!`);
                    setBalance(Number(result.new_balance));
                    if (result.purchased_accounts?.length) {
                      setBoughtAccounts(result.purchased_accounts);
                    } else {
                      setBoughtAccounts([]);
                      await loadUserData();
                    }
                  }
                } catch (e: unknown) {
                  toast.error((e as { message?: string }).message || "Purchase failed.");
                }
                setLoading(false);
              }}
            >
              {loading ? "Processing..." : `Confirm Purchase (₦${((modal.priceNum || 0) * purchaseQuantity).toLocaleString()}) →`}
            </button>

            {boughtAccounts && (
  <div className="purchase-success-overlay">
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
      <h3 className="purchase-success-title" style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
        Purchase Successful!
      </h3>
      <p className="purchase-success-desc" style={{ fontSize: 13 }}>
        Your accounts are ready. Also available in <strong>My Orders</strong>.
      </p>
    </div>

    <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
      {boughtAccounts.length > 0 ? (
        boughtAccounts.map((acc, i) => (
          <div key={i} className="purchase-success-card" style={{
            borderRadius: 14,
            padding: '16px',
            marginBottom: 12,
            position: 'relative'
          }}>
            {/* Account number badge */}
            <div className="purchase-success-badge" style={{
              position: 'absolute', top: 12, left: 16,
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              Account {i + 1}
            </div>

            {/* Copy button */}
            <button
              className="purchase-success-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(`${acc.login}|${acc.password}`);
                toast.success("Copied!");
              }}
              style={{
                position: 'absolute', top: 10, right: 12,
                border: 'none', borderRadius: 8, padding: '5px 12px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5
              }}
            >
              <i className="fa-solid fa-copy" style={{ fontSize: 10 }} /> Copy
            </button>

            {/* Credentials */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="purchase-success-credential-box" style={{ fontFamily: '', fontSize: 14, borderRadius: 8, padding: '12px 14px', wordBreak: 'break-all', lineHeight: 1.7 }}>
  <strong>{`${acc.login}|${acc.password}`}</strong>
</div>
            </div>

            {/* Instructions */}
            {acc.description && (
              <div className="purchase-success-instructions" style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 10,
                display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                <div>
                  <div className="purchase-success-instructions-title" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Instructions
                  </div>
                  <div className="purchase-success-instructions-body" style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
                    {acc.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <button className="btn-secondary" onClick={() => { setModal(null); setBoughtAccounts(null); switchPanel("orders"); }}>
            View Accounts in My Orders
          </button>
        </div>
      )}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      <button
  onClick={() => {
    const textContent = boughtAccounts.map((acc, i) =>
      `Account ${i + 1}:\n${acc.login}|${acc.password}\n` +
      (acc.description ? `Instructions: ${acc.description}\n` : '') +
      `---\n`
    ).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `accounts_${Date.now()}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  }}
  style={{
    background: 'hsl(220 70% 55%)', color: 'white', border: 'none',
    borderRadius: 12, padding: '13px 20px', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
  }}
>
  <i className="fa-solid fa-download" /> Download Details
</button>
      <button className="btn-confirm" onClick={() => { setModal(null); setBoughtAccounts(null); }}>
        Done ✓
      </button>
    </div>
  </div>
)}
          </div>
        </div>
      )}

      {/* Virtual Account: Full name & phone popup */}
      {vaModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setVaModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="modal-close" onClick={() => setVaModalOpen(false)}>✕</button>
            <div className="modal-tag">Virtual Account</div>
            <h2 className="modal-title-text" style={{ fontSize: 18, marginBottom: 8 }}>Enter your details</h2>
            <p className="modal-desc-text" style={{ marginBottom: 20 }}>Full name and phone number are required to generate your account.</p>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="dash-form-input"
                placeholder="e.g. John Okonkwo"
                value={vaFullName}
                onChange={(e) => setVaFullName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Phone number</label>
              <input
                type="tel"
                className="dash-form-input"
                placeholder="e.g. 08012345678 (11 digits)"
                value={vaPhone}
                onChange={(e) => setVaPhone(e.target.value)}
              />
            </div>
            <button
              className="btn-submit-funds"
              disabled={vaLoading}
              style={{ width: "100%" }}
              onClick={async () => {
                const name = vaFullName.trim();
                const phoneDigits = vaPhone.replace(/\D/g, "");
                if (!name || name.length < 2) {
                  toast.error("Please enter your full name");
                  return;
                }
                if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 15) {
                  toast.error("Please enter a valid phone number (10–15 digits)");
                  return;
                }
                const amount = customAmount ? Number(customAmount) : selectedPreset ? Number(selectedPreset.replace(/[^\d]/g, "")) : 0;
                if (!amount || amount < 100) {
                  toast.error("Minimum amount is ₦100");
                  return;
                }
                setVaLoading(true);
                try {
                  const json = await api<{ account_no?: string; account_name?: string; bank_name?: string; amount?: number }>("/virtual-account", {
                    method: "POST",
                    body: JSON.stringify({ amount, account_name: name, phone: phoneDigits }),
                  });
                  if (!json.account_no || !json.account_name || !json.bank_name) {
                    toast.error("Invalid response from server. Try again.");
                    return;
                  }
                  setVirtualAccount({
                    account_no: String(json.account_no),
                    account_name: String(json.account_name),
                    bank_name: String(json.bank_name),
                    amount: Number(json.amount) || amount,
                  });
                  setVaModalOpen(false);
                  setVaFullName("");
                  setVaPhone("");
                  toast.success("Account details ready. Transfer the amount to credit your wallet.");
                } catch (e) {
                  const msg = (e as { message?: string })?.message || (e instanceof Error ? e.message : "Something went wrong. Try again.");
                  toast.error(msg);
                  console.error("Virtual account error:", e);
                } finally {
                  setVaLoading(false);
                }
              }}
            >
              {vaLoading ? "Generating..." : "Continue →"}
            </button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {rulesOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRulesOpen(false); }}>
          <div className="modal rules-modal-v2">
            <button className="modal-close rules-modal-close" onClick={() => setRulesOpen(false)} aria-label="Close">✕</button>
            <div className="rules-v2-header">
              <div className="rules-v2-icon-wrap">📋</div>
              <h2 className="rules-v2-title">Rules & guidelines</h2>
              <p className="rules-v2-desc">Please read before using purchased accounts</p>
            </div>

            <div className="rules-v2-list">
              <div className="rules-v2-item">
                <div className="rules-v2-item-icon">🌐</div>
                <div className="rules-v2-item-body">
                  <h3 className="rules-v2-item-title">Change of UserAgent</h3>
                  <p className="rules-v2-item-text">Use browsers that change device fingerprints. Change UserAgent and avoid default detection.</p>
                </div>
              </div>
              <div className="rules-v2-item">
                <div className="rules-v2-item-icon">⏱️</div>
                <div className="rules-v2-item-body">
                  <h3 className="rules-v2-item-title">Observe limits</h3>
                  <p className="rules-v2-item-text">Conduct human-like activity. Avoid mass actions right after purchase.</p>
                </div>
              </div>
              <div className="rules-v2-item rules-v2-item-warning">
                <div className="rules-v2-item-icon">⚠️</div>
                <div className="rules-v2-item-body">
                  <h3 className="rules-v2-item-title">Problem</h3>
                  <p className="rules-v2-item-text">Mass likes, mass messaging, etc. right after purchase can get accounts blocked quickly.</p>
                </div>
              </div>
              <div className="rules-v2-item rules-v2-item-success">
                <div className="rules-v2-item-icon">✅</div>
                <div className="rules-v2-item-body">
                  <h3 className="rules-v2-item-title">Solution</h3>
                  <p className="rules-v2-item-text">Do normal user actions first: fill profile, follow a few users, like, add photos, reposts, comments.</p>
                </div>
              </div>
              <div className="rules-v2-item">
                <div className="rules-v2-item-icon">💡</div>
                <div className="rules-v2-item-body">
                  <h3 className="rules-v2-item-title">Example</h3>
                  <p className="rules-v2-item-text">Fill out a profile, subscribe to several users, leave a few likes, add photos, make reposts and comments.</p>
                </div>
              </div>
            </div>

            <div className="rules-v2-disclaimers">
              <p className="rules-v2-disclaimer"><strong>Important:</strong> We are not responsible for third-party programs, services or proxy providers. Accounts are created using private software and proxy servers.</p>
              <p className="rules-v2-disclaimer">By using our services you agree to these rules. Violation may result in suspension or permanent ban without refund.</p>
            </div>

            <button type="button" className="rules-v2-btn" onClick={() => setRulesOpen(false)}>I understand & close</button>
          </div>
        </div>
      )}

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay show" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {siteSettings.site_logo ? (
            <img src={siteSettings.site_logo} alt="" className="sidebar-logo-img" style={{ height: 32, maxWidth: 120, objectFit: "contain" }} />
          ) : null}
          <div className="logo-mark">{siteSettings.site_name || "Ace Log Store"}</div>
        </div>

        <div className="sidebar-balance">
          <div>
            <div className="balance-label">Wallet Balance</div>
            <div className="balance-val">{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</div>
            <div className="balance-currency">NGN</div>
          </div>
          <button className="add-funds-mini" onClick={() => switchPanel("add-funds")}>+</button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => {
            if ("type" in item && item.type === "section") {
              return <div key={i} className="nav-section-label">{item.label}</div>;
            }
            const nav = item as NavLink;
            return (
              <button
                key={i}
                className={`dash-nav-item ${nav.panel && activePanel === nav.panel && !selectedCategory ? "active" : ""}`}
                onClick={() => {
                  if (nav.label === "Rules") { setRulesOpen(true); setSidebarOpen(false); }
                  else if (nav.panel) switchPanel(nav.panel);
                  else if (nav.action) nav.action();
                }}
              >
                <span className="nav-icon"><i className={nav.icon} /></span>
                {nav.label}
                {nav.badge && <span className="nav-badge">{nav.badge}</span>}
                {nav.label === "Support" && unreadCount > 0 && <span className="nav-badge" style={{ background: "hsl(var(--db-green))" }}>{unreadCount}</span>}
                {nav.ext && <span className="nav-ext"><i className="fa-solid fa-arrow-up-right-from-square" /></span>}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="nav-section-label">Admin</div>
              <button className="dash-nav-item" onClick={() => navigate("/admin")}>
                <span className="nav-icon"><i className="fa-solid fa-shield-halved" /></span>
                Admin Panel
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-theme-wrap">
            <ThemeToggle size="sm" />
          </div>
          <div className="user-row" onClick={() => switchPanel("profile")}>
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="uname">{username || "User"}</div>
              <div className="uemail">{email}</div>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut} style={{ marginTop: 12 }}>
            <i className="fa-solid fa-arrow-right-from-bracket" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        {/* Topbar */}
        <div className="dash-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <div className="topbar-title">
            {activePanel === "home" && siteSettings.site_logo ? (
              <img src={siteSettings.site_logo} alt={siteSettings.site_name || "Store"} className="topbar-logo" />
            ) : (
              activePanel === "home" && siteSettings.site_name ? siteSettings.site_name : PANEL_TITLES[activePanel]
            )}
          </div>
          <div className="topbar-search">
            <span className="s-icon"><i className="fa-solid fa-magnifying-glass" /></span>
            <input type="text" placeholder="Search for products or categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="dash-header-right">
            <div className="topbar-bell-wrap" ref={broadcastDropdownRef}>
              <button
                type="button"
                className="topbar-bell-btn"
                onClick={() => setBroadcastDropdownOpen((o) => !o)}
                aria-label={newBroadcastCount > 0 ? `${newBroadcastCount} new announcements` : "Announcements"}
              >
                <i className="fa-solid fa-bell" />
                {newBroadcastCount > 0 && (
                  <span className="topbar-bell-badge">{newBroadcastCount > 99 ? "99+" : newBroadcastCount}</span>
                )}
              </button>
              {broadcastDropdownOpen && (
                <div className="topbar-broadcast-dropdown">
                  <div className="topbar-broadcast-dropdown-header">Announcements</div>
                  <div className="topbar-broadcast-list">
                    {broadcastMessages.length === 0 ? (
                      <div className="topbar-broadcast-empty">No announcements</div>
                    ) : (
                      broadcastMessages.map((b) => (
                        <div key={b.id} className="topbar-broadcast-item">
                          <div className="topbar-broadcast-item-title">{b.title}</div>
                          <div className="topbar-broadcast-item-preview">{(b.body || "").slice(0, 60)}{(b.body || "").length > 60 ? "…" : ""}</div>
                          <button type="button" className="topbar-broadcast-view-btn" onClick={() => openBroadcastInModal(b)}>
                            View
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {broadcastMessages.length > 0 && newBroadcastCount > 0 && (
                    <button
                      type="button"
                      className="topbar-broadcast-view-more"
                      onClick={() => {
                        const first = broadcastMessages.find((m) => !getDismissedIds().includes(m.id)) ?? broadcastMessages[0];
                        openBroadcastInModal(first);
                      }}
                    >
                      View more
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-theme-wrap">
              <ThemeToggle size="sm" />
            </div>
            <div className={`dash-user-pill${activePanel === "add-funds" ? " active" : ""}`} onClick={() => switchPanel("add-funds")}>
              <span className="bal-icon"><i className="fa-solid fa-wallet" /></span>
              <span className="bal-text">{shortBalance}</span>
            </div>
            <div className="topbar-avatar" onClick={() => switchPanel("profile")}>{initials}</div>
          </div>
        </div>

        {/* Content */}
        <div className="dash-content" key={renderKey}>
          {/* CATEGORY DETAIL */}
          {activePanel === "home" && selectedCategory && (
            <div className="dash-panel">
              <div className="category-breadcrumb">
                <span className="breadcrumb-link" onClick={() => { setSelectedCategory(null); setActivePanel("home"); }}>Dashboard</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-link" onClick={() => { setSelectedCategory(null); setActivePanel("categories"); }}>Categories</span>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-current">{selectedCategory.name.toUpperCase()}</span>
              </div>

              <div className="category-banner">
                <div className="category-banner-icon">
                  {typeof getCatIcon(selectedCategory) === 'string' ? getCatIcon(selectedCategory) : getCatIcon(selectedCategory)}
                </div>
                <div>
                  <h2 className="category-banner-title">{selectedCategory.name.toUpperCase()}</h2>
                  <p className="category-banner-count">{getProductsForCategory(selectedCategory.id).length} products available</p>
                </div>
              </div>

              <div className="category-detail-list product-list-wrap">
                {dataLoading ? (
                  <ProductListSkeleton count={6} />
                ) : (
                  <div className="product-list">
                    {getProductsForCategory(selectedCategory.id).filter(p => filterBySearch(p.title + p.description)).map((product) => (
                      <div key={product.id} className="account-row">
                        <div className="acc-platform-icon">
                          {(() => {
                            const url = resolveImageUrl(product.image_url);
                            if (url) {
                              return (
                                <img
                                  src={url}
                                  alt={product.title}
                                  style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }}
                                />
                              );
                            }
                            return getProductImage(product, selectedCategory);
                          })()}
                        </div>
                        <div className="acc-content">
                          <div className="acc-info">
                            <div className="acc-desc-title">{product.title}</div>
                            <div className="acc-desc" style={{ WebkitLineClamp: 2 }}>{product.description}</div>
                            {product.sample_link && (
                              <a href={product.sample_link} target="_blank" rel="noopener noreferrer" className="product-list-sample">
                                <i className="fa-solid fa-external-link" /> View sample
                              </a>
                            )}
                          </div>
                          <div className="acc-meta-row">
                            <div className="acc-stock-price">
                              <span className={`stock-pill ${product.stock === 0 ? "zero" : product.stock < 10 ? "low" : ""}`}>{product.stock}</span>
                              <span className="price-pill">{formatPrice(product.currency, product.price)}</span>
                            </div>
                            {product.stock > 0 ? (
                              <button type="button" className="buy-btn buy-btn-icon" onClick={() => { setModal({ title: product.title, desc: product.description, platform: product.platform, stock: product.stock, price: formatPrice(product.currency, product.price), product_id: product.id, priceNum: product.price }); setPurchaseQuantity(1); }} aria-label="Add to cart">
                                <i className="fa-solid fa-cart-shopping" />
                              </button>
                            ) : (
                              <button type="button" className="buy-btn buy-btn-icon" disabled aria-label="Out of stock"><i className="fa-solid fa-cart-shopping" /></button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {activePanel === "categories" && (
            <div className="dash-panel">
              <div className="categories-page">
                <div className="categories-page-header">
                  <div className="category-breadcrumb" style={{ marginTop: 0, marginBottom: 16, padding: 0 }}>
                    <span className="breadcrumb-link" onClick={() => setActivePanel("home")}>Dashboard</span>
                    <span className="breadcrumb-sep">›</span>
                    <span className="breadcrumb-current">Categories</span>
                  </div>
                  <h1 className="categories-page-title">Browse by category</h1>
                  <p className="categories-page-subtitle">Choose a category to see all products. Use search to filter.</p>
                  <div className="categories-search-wrap">
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="categories-grid">
                  {dataLoading ? (
                    <CategoryGridSkeleton count={8} />
                  ) : dbCategories.filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 ? (
                    <div className="categories-empty">
                      <div className="categories-empty-icon">📂</div>
                      <h3 className="categories-empty-title">No categories found</h3>
                      <p className="categories-empty-desc">Try a different search or check back later.</p>
                    </div>
                  ) : (
                    dbCategories
                      .filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className="category-card"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setActivePanel("home");
                            setCategorySearch("");
                          }}
                        >
                          <div className="category-card-icon">
                            {getCatIcon(cat)}
                          </div>
                          <div className="category-card-body">
                            <div className="category-card-title">{cat.name}</div>
                            <div className="category-card-count">{getProductsForCategory(cat.id).length} products</div>
                          </div>
                          <div className="category-card-arrow">
                            <i className="fa-solid fa-chevron-right" />
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HOME */}
          {activePanel === "home" && !selectedCategory && (
            <div className="dash-panel">
              {/* Your overview — summary and quick stats */}
              <div className="welcome-banner">
                <div className="welcome-inner">
                  <div className="welcome-left">
                    <div className="wtag">● Your overview</div>
                    <h2>Welcome back{username ? `, ${username}` : ""}</h2>
                    <div className="welcome-actions">
                      <button type="button" className="welcome-action-btn" onClick={() => switchPanel("add-funds")}>
                        <i className="fa-solid fa-wallet" /> Add funds
                      </button>
                      <button type="button" className="welcome-action-btn" onClick={() => switchPanel("orders")}>
                        <i className="fa-solid fa-box" /> My orders
                      </button>
                      <button type="button" className="welcome-action-btn" onClick={() => { setActivePanel("support"); setSupportChatOpen(true); }}>
                        <i className="fa-solid fa-headset" /> Support
                      </button>
                    </div>
                  </div>
                  <div className="welcome-right">
                    <div className="wstat" style={{ cursor: "pointer" }} onClick={() => switchPanel("add-funds")} title="Add funds">
                      <div className="wstat-num">₦{balance.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</div>
                      <div className="wstat-label">Wallet balance</div>
                    </div>
                    <div className="wstat" style={{ cursor: "pointer" }} onClick={() => switchPanel("orders")} title="View orders">
                      <div className="wstat-num">{orders.length}</div>
                      <div className="wstat-label">Total orders</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile search bar */}
              <div className="mobile-search-section">
                <div className="mobile-search-wrap">
                  <i className="fa-solid fa-magnifying-glass" />
                  <input type="text" placeholder="Search for products or categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="filter-row" style={{ padding: 0, marginTop: 12 }}>
                  <span className="filter-label">Popular:</span>
                  {dbCategories.length
                    ? dbCategories
                      .slice()
                      .sort((a, b) => getProductsForCategory(b.id).length - getProductsForCategory(a.id).length)
                      .slice(0, 4)
                      .map((cat) => (
                        <button
                          key={cat.id}
                          className={`filter-pill ${activeFilter === cat.id ? "active" : ""}`}
                          onClick={() => setActiveFilter(cat.id)}
                        >
                          {cat.name}
                        </button>
                      ))
                    : null}
                </div>
              </div>

              <div className="filter-row desktop-filter-row">
                <span className="filter-label">Popular:</span>
                <button className={`filter-pill ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>
                  All
                </button>
                {dbCategories.length
                  ? dbCategories
                    .slice()
                    .sort((a, b) => getProductsForCategory(b.id).length - getProductsForCategory(a.id).length)
                    .slice(0, 6)
                    .map((cat) => (
                      <button
                        key={cat.id}
                        className={`filter-pill ${activeFilter === cat.id ? "active" : ""}`}
                        onClick={() => setActiveFilter(cat.id)}
                      >
                        {cat.name}
                      </button>
                    ))
                  : null}
              </div>

              {dataLoading ? (
                <ProductListSkeleton count={6} />
              ) : filteredDbCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--db-text-muted))' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <h3 style={{ marginBottom: '8px', color: 'hsl(var(--db-text))' }}>No Products Available</h3>
                  <p>Check back later for new products or adjust your filters.</p>
                  <div style={{ marginTop: '16px', fontSize: '12px', color: 'hsl(var(--db-text-muted))' }}>
                    Debug: {dbCategories.length} categories, {dbProducts.length} products total
                  </div>
                </div>
              ) : (
                filteredDbCategories.map((cat) => {
                  const prods = getProductsForCategory(cat.id).filter(p => filterBySearch(p.title + p.description));
                  if (prods.length === 0) return null;
                  const icon = getCatIcon(cat);
                  return (
                    <div key={cat.id} className="category-block">
                      <div className="category-header">
                        <div className="cat-head-left">
                          <div className="cat-platform-icon">
                            {getCatIcon(cat)}
                          </div>
                          <div>
                            <div className="cat-title">{cat.name}</div>
                          </div>
                        </div>
                        <button className="cat-see-more" onClick={() => setSelectedCategory(cat)}>See all →</button>
                      </div>
                      <div className="product-list category-block-list">
                        {prods.map((product) => (
                          <div key={product.id} className="account-row">
                            <div className="acc-platform-icon">
                              {(() => {
                                const url = resolveImageUrl(product.image_url);
                                if (url) {
                                  return (
                                    <img
                                      src={url}
                                      alt={product.title}
                                      style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }}
                                    />
                                  );
                                }
                                return getProductImage(product, cat);
                              })()}
                            </div>
                            <div className="acc-content">
                              <div className="acc-info">
                                <div className="acc-desc-title">{product.title}</div>
                                <div className="acc-desc">{product.description}</div>
                                {product.sample_link && (
                                  <a href={product.sample_link} target="_blank" rel="noopener noreferrer" className="product-list-sample">
                                    <i className="fa-solid fa-external-link" /> View sample
                                  </a>
                                )}
                              </div>
                              <div className="acc-meta-row">
                                <div className="acc-stock-price">
                                  <span className={`stock-pill ${product.stock === 0 ? "zero" : product.stock < 10 ? "low" : ""}`}>{product.stock}</span>
                                  <span className="price-pill">{formatPrice(product.currency, product.price)}</span>
                                </div>
                                {product.stock > 0 ? (
                                  <button type="button" className="buy-btn buy-btn-icon" onClick={() => { setModal({ title: product.title, desc: product.description, platform: product.platform, stock: product.stock, price: formatPrice(product.currency, product.price), product_id: product.id, priceNum: product.price }); setPurchaseQuantity(1); }} aria-label="Add to cart">
                                    <i className="fa-solid fa-cart-shopping" />
                                  </button>
                                ) : (
                                  <button type="button" className="buy-btn buy-btn-icon" disabled aria-label="Out of stock"><i className="fa-solid fa-cart-shopping" /></button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
          
              <div style={{ height: 28 }} />
            </div>
          )}

          {/* ORDERS */}
          {activePanel === "orders" && (
            <div className="dash-panel">
              <div style={{ padding: "24px 24px 0" }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>My Orders</h2>
                <p style={{ fontSize: 14, color: "hsl(210 15% 55%)", marginBottom: 16 }}>View and manage your purchased accounts</p>
                <button className="btn-refresh" onClick={loadUserData}>
                  <i className="fa-solid fa-rotate" /> Refresh
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="orders-empty">
                  <div className="orders-empty-icon">🔒</div>
                  <h3>No Orders Yet</h3>
                  <p>You haven't made any purchases yet. Browse our collection of premium social media accounts to get started.</p>
                  <button className="btn-browse" onClick={() => switchPanel("home")}>
                    <i className="fa-solid fa-cart-shopping" /> Browse Products
                  </button>
                </div>
              ) : (
                <div className="orders-table-wrap">
                  {/* Desktop table */}
                  <div className="table-container orders-desktop-table">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Order ID</th><th>Account</th><th>Platform</th><th>Price</th><th>Date</th><th>Status</th><th>Access</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id}>
                            <td className="order-id">#{o.id.slice(0, 6)}</td>
                            <td><div className="order-name">{o.product_title}</div></td>
                            <td>{o.product_platform}</td>
                            <td className="order-price">NGN {Number(o.total_price).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
                            <td className="order-date">{new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                            <td><span className={`status-pill status-${o.status}`}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
                            <td>
                              <button
                                className="order-view-btn"
                                onClick={() => fetchOrderDetails(o.id, o.product_title)}
                              >
                                👁️ View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="orders-mobile-cards">
                    {orders.map((o) => (
                      <div key={o.id} className="order-mobile-card">
                        <div className="omc-row">
                          <span className="omc-label">Order ID</span>
                          <span className="omc-val order-id">#{o.id.slice(0, 6)}</span>
                        </div>
                        <div className="omc-row">
                          <span className="omc-label">Account</span>
                          <span className="omc-val">{o.product_title}</span>
                        </div>
                        <div className="omc-row">
                          <span className="omc-label">Platform</span>
                          <span className="omc-val">{o.product_platform}</span>
                        </div>
                        <div className="omc-row">
                          <span className="omc-label">Price</span>
                          <span className="omc-val order-price">NGN {Number(o.total_price).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="omc-row">
                          <span className="omc-label">Date</span>
                          <span className="omc-val">{new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        <div className="omc-row">
                          <span className="omc-label">Status</span>
                          <span className={`status-pill status-${o.status}`}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
                        </div>
                        <button
                          className="order-view-btn"
                          style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
                          onClick={() => fetchOrderDetails(o.id, o.product_title)}
                        >
                          👁️ View Account Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS */}
          {activePanel === "transactions" && (
            <div className="dash-panel">
              <div style={{ padding: "24px 24px 0" }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Transactions</h2>
                <p style={{ fontSize: 14, color: "hsl(var(--db-text-muted))", marginBottom: 16 }}>Your wallet activity: top-ups and purchases</p>
                <button className="btn-refresh" onClick={loadUserData}>
                  <i className="fa-solid fa-rotate" /> Refresh
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="transactions-empty">
                  <div className="transactions-empty-icon">💰</div>
                  <h3>No transactions yet</h3>
                  <p>Your credit and debit history will appear here after you add funds or make a purchase.</p>
                  <button type="button" className="btn-browse" onClick={() => switchPanel("add-funds")}>
                    <i className="fa-solid fa-wallet" /> Add funds
                  </button>
                </div>
              ) : (
                <div className="transactions-wrap">
                  <div className="table-container transactions-desktop-table">
                    <table className="dash-table transactions-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id}>
                            <td className="txn-date">{new Date(t.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</td>
                            <td className="txn-desc">{t.description}</td>
                            <td><span className={`txn-type-pill txn-type-${t.type}`}>{t.type === "credit" ? "Credit" : "Debit"}</span></td>
                            <td className={`txn-amount txn-amount-${t.type}`}>{t.type === "credit" ? "+" : "−"} {t.currency} {Number(t.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
                            <td className="txn-ref">{t.reference || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="transactions-mobile-cards">
                    {transactions.map((t) => (
                      <div key={t.id} className="txn-card">
                        <div className="txn-card-row">
                          <span className="txn-card-label">Date</span>
                          <span className="txn-card-val">{new Date(t.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                        <div className="txn-card-row">
                          <span className="txn-card-label">Description</span>
                          <span className="txn-card-val">{t.description}</span>
                        </div>
                        <div className="txn-card-row">
                          <span className="txn-card-label">Type</span>
                          <span className={`txn-type-pill txn-type-${t.type}`}>{t.type === "credit" ? "Credit" : "Debit"}</span>
                        </div>
                        <div className="txn-card-row">
                          <span className="txn-card-label">Amount</span>
                          <span className={`txn-card-amount txn-amount-${t.type}`}>{t.type === "credit" ? "+" : "−"} {t.currency} {Number(t.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {t.reference && (
                          <div className="txn-card-row">
                            <span className="txn-card-label">Reference</span>
                            <span className="txn-card-val txn-ref">{t.reference}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewingOrderLogs && (
            <div className="details-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingOrderLogs(null); }}>
              <div className="details-modal">
                <div className="details-modal-header">
                  <h3><i className="fa-solid fa-receipt" style={{ marginRight: 12, opacity: 0.8 }} />Order Details</h3>
                  <button onClick={() => setViewingOrderLogs(null)}><i className="fa-solid fa-xmark" /></button>
                </div>
                <div className="details-modal-body">
                  <div style={{ marginBottom: 24, padding: '16px', background: 'hsl(var(--db-blue-dim))', borderRadius: 12, border: '1px solid hsl(var(--db-blue-border))' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--db-blue))', opacity: 0.8, marginBottom: 4 }}>Product Purchased</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: 'hsl(var(--db-blue))' }}>{viewingOrderTitle}</div>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'hsl(var(--db-text))', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fa-solid fa-key" style={{ opacity: 0.5 }} /> Your Account Credentials
                  </div>

                  <div className="accounts-list">
  {viewingOrderLogs.length > 0 ? viewingOrderLogs.map((acc, i) => (
    <div key={i} style={{
      background: 'hsl(220 20% 97%)',
      border: '1px solid hsl(220 20% 90%)',
      borderRadius: 14,
      padding: '16px',
      marginBottom: 12,
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute', top: 12, left: 16,
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'hsl(220 10% 55%)'
      }}>
        Account {i + 1}
      </div>

      <button
        onClick={() => {
          navigator.clipboard.writeText(`${acc.login}|${acc.password}`);
  toast.success("Copied!");
}}
        style={{
          position: 'absolute', top: 10, right: 12,
          background: 'hsl(220 70% 55%)', color: 'white',
          border: 'none', borderRadius: 8, padding: '5px 12px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5
        }}
      >
        <i className="fa-solid fa-copy" style={{ fontSize: 10 }} /> Copy
      </button>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ marginTop: 24 }}>
                <div style={{ fontFamily: '', fontSize: 14, background: 'white', borderRadius: 8, padding: '12px 14px', border: '1px solid hsl(220 20% 86%)', wordBreak: 'break-all', lineHeight: 1.7 }}>
    {`${acc.login}|${acc.password}`}
  </div>
</div>
      </div>

      {acc.description && (
        <div style={{
          marginTop: 10,
          padding: '12px 14px',
          background: 'linear-gradient(135deg, hsl(45 100% 97%), hsl(38 100% 93%))',
          border: '1px solid hsl(45 80% 78%)',
          borderRadius: 10,
          display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(38 80% 35%)', marginBottom: 4 }}>
              Instructions
            </div>
            <div style={{ fontSize: 13, color: 'hsl(38 60% 25%)', lineHeight: 1.6, fontWeight: 500 }}>
              {acc.description}
            </div>
          </div>
        </div>
      )}
    </div>
  )) : (
    <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
      <i className="fa-solid fa-ghost" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
      <p>No access details found for this order.</p>
    </div>
  )}
</div>

                  <div style={{ marginTop: 24, textAlign: 'center', paddingTop: '20px' }}>
                    
                    
                    <button className="btn-save" style={{ width: '100%' }} onClick={() => setViewingOrderLogs(null)}>Done</button>
                <button style={{ 
                    backgroundColor: '#3b82f6', 
                    padding: '14px 140px', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: 'white', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    marginTop: '20px'
                  }} className="btn-download" onClick={() => {
                      const textContent = viewingOrderLogs.map((acc, i) => 
                        `Account ${i + 1}:\n` +
                        `${acc.login}|${acc.password}\n` +
                        (acc.description ? `Instructions: ${acc.description}\n` : '') +
                        `Platform: ${viewingOrderTitle}\n` +
                        `Order Date: ${new Date().toLocaleDateString()}\n` +
                        `---\n`
                      ).join('\n');
                      
                      const blob = new Blob([textContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `order_details_${Date.now()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast.success("Order details downloaded!");
                    }}>
                      <i className="fa-solid fa-download" />
                      Download Details
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activePanel === "profile" && (
            <div className="dash-panel">
              <div className="profile-page">
                <div className="profile-hero">
                  <div className="profile-hero-avatar">{initials}</div>
                  <h1 className="profile-hero-name">{username || "User"}</h1>
                  <p className="profile-hero-email">{email}</p>
                  <div className="profile-hero-balance" onClick={() => switchPanel("add-funds")}>
                    <span className="profile-hero-balance-label">Wallet</span>
                    <span className="profile-hero-balance-val">{formattedBalance}</span>
                  </div>
                </div>

                <div className="profile-section">
                  <h2 className="profile-section-title">Change password</h2>
                  <p className="profile-section-desc">Update your password to keep your account secure.</p>
                  <div className="profile-form-grid">
                    <div className="profile-field">
                      <label className="profile-label">New password</label>
                      <input
                        type="password"
                        className="profile-input"
                        placeholder="Enter new password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                      />
                      <span className="profile-hint">At least 6 characters</span>
                    </div>
                    <div className="profile-field">
                      <label className="profile-label">Confirm new password</label>
                      <input
                        type="password"
                        className="profile-input"
                        placeholder="Confirm new password"
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="button" className="profile-submit-btn" onClick={handleUpdatePassword}>
                    Update password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD FUNDS */}
          {/* ADD FUNDS */}
{activePanel === "add-funds" && (
  <div className="dash-panel">
    <div className="funds-panel">

      {/* SUCCESS STATE */}
      {fundSuccess ? (
        <div className="funds-success-card">
          <div className="funds-success-icon">✓</div>
          <h2 className="funds-success-title">Funds added successfully</h2>
          <p className="funds-success-amount">
            <strong>₦{fundAmount.toLocaleString()}</strong> has been credited to your wallet. New balance below.
          </p>
          <div className="funds-success-balance-card">
            <div className="funds-success-balance-label">Wallet balance</div>
            <div className="funds-success-balance-value">{formattedBalance}</div>
          </div>
          <div className="funds-success-actions">
            <button type="button" className="funds-success-btn-secondary" onClick={() => { setFundSuccess(false); setCustomAmount(""); }}>
              + Add more funds
            </button>
            <button type="button" className="funds-success-btn-primary" onClick={() => switchPanel("home")}>
              Browse products →
            </button>
          </div>
        </div>

      ) : (
        <>
          {/* Hero: current balance */}
          <div className="funds-hero">
            <div className="funds-hero-label">Available balance</div>
            <div className="funds-hero-amount">{formattedBalance}</div>
          </div>

          {/* Amount */}
          <div className="funds-section">
            <div className="funds-section-title">How much do you want to add?</div>
            <div className="funds-presets">
              {["₦1,000", "₦5,000", "₦10,000", "₦20,000", "₦50,000", "₦100,000"].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`funds-preset ${selectedPreset === amt && !customAmount ? "selected" : ""}`}
                  onClick={() => { setSelectedPreset(amt); setCustomAmount(""); }}
                >
                  {amt}
                </button>
              ))}
            </div>
            <div className="funds-custom-wrap">
              <span className="funds-custom-prefix">₦</span>
              <input
                type="number"
                className="funds-custom-input"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  if (e.target.value) setSelectedPreset("");
                }}
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="funds-section">
            <div className="funds-section-title">Payment method</div>
            <div className="funds-method-grid">
              <button
                type="button"
                className={`funds-method-card ${selectedPayment === 0 ? "selected" : ""}`}
                onClick={() => setSelectedPayment(0)}
              >
                <div className="funds-method-icon">⚡</div>
                <span className="funds-method-name">SprintPay</span>
                <span className="funds-method-desc">Redirect to payment · Fast & secure</span>
              </button>
              <button
                type="button"
                className={`funds-method-card ${selectedPayment === 1 ? "selected" : ""}`}
                onClick={() => setSelectedPayment(1)}
              >
                <div className="funds-method-icon">📱</div>
                <span className="funds-method-name">Virtual account</span>
                <span className="funds-method-desc">Your unique account · Copy & pay</span>
              </button>
            </div>
          </div>

          {selectedPayment === 0 && (
            <div className="funds-info-box">
              <strong>⚡ SprintPay checkout</strong><br />
              You’ll be redirected to SprintPay’s secure page. After payment, you’re sent back here and your wallet is credited automatically.
            </div>
          )}

          {selectedPayment === 1 && (
            <>
              <div className="funds-info-box">
                <strong>📱 Your unique virtual account</strong><br />
                Generate a dedicated account number. Transfer the amount and your wallet is credited automatically.
              </div>
              {virtualAccount && (
                <div className="funds-va-card">
                  <div className="funds-va-title">Pay to this account</div>
                  <div className="funds-va-row">
                    <div className="funds-va-label">Bank name</div>
                    <div className="funds-va-value">{virtualAccount.bank_name}</div>
                  </div>
                  <div className="funds-va-row">
                    <div className="funds-va-label">Account name</div>
                    <div className="funds-va-value">{virtualAccount.account_name}</div>
                  </div>
                  <div className="funds-va-copy-row">
                    <span className="funds-va-account-no">{virtualAccount.account_no}</span>
                    <button
                      type="button"
                      className="funds-va-copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(virtualAccount.account_no);
                        toast.success("Account number copied");
                      }}
                    >
                      <i className="fa-solid fa-copy" /> Copy
                    </button>
                  </div>
                  <p className="funds-va-label" style={{ marginTop: 14, marginBottom: 0 }}>
                    Your virtual account is permanent. Use it whenever you add funds.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            className="funds-cta"
            disabled={payLoading || vaLoading}
            onClick={async () => {
              const amount = customAmount
                ? Number(customAmount)
                : selectedPreset ? Number(selectedPreset.replace(/[^\d]/g, "")) : 0;
              if (!amount || amount < 100) {
                toast.error("Minimum amount is ₦100");
                return;
              }
              if (selectedPayment === 1) {
                if (!virtualAccount) {
                  setVaModalOpen(true);
                  return;
                }
                setVaLoading(true);
                try {
                  const json = await api<{ account_no?: string; account_name?: string; bank_name?: string; amount?: number }>("/virtual-account", {
                    method: "POST",
                    body: JSON.stringify({ amount }),
                  });
                  if (json.account_no) {
                    setVirtualAccount({
                      account_no: json.account_no,
                      account_name: json.account_name ?? "",
                      bank_name: json.bank_name ?? "SprintPay",
                      amount: json.amount ?? amount,
                    });
                    toast.success("Account details ready. Transfer the amount to credit your wallet.");
                  }
                } catch (e) {
                  const msg = (e as { message?: string })?.message || "Something went wrong. Try again.";
                  toast.error(msg);
                } finally {
                  setVaLoading(false);
                }
                return;
              }
              const SPRINT_API_KEY = (import.meta.env.VITE_SPRINTPAY_API_KEY || "").trim();
              if (!SPRINT_API_KEY) {
                toast.error("SprintPay key not set. Add VITE_SPRINTPAY_API_KEY to your .env.");
                return;
              }
              setPayLoading(true);
              const ref = `sp-${userId.slice(0, 8)}-${Date.now()}`;
              const payUrl = `https://web.sprintpay.online/pay?amount=${amount}&key=${SPRINT_API_KEY}&ref=${ref}&email=${encodeURIComponent(email)}`;
              window.location.href = payUrl;
            }}
          >
            {payLoading
              ? "Redirecting..."
              : vaLoading
              ? "Getting account..."
              : selectedPayment === 1
              ? (virtualAccount ? "Update amount to pay" : "Get account details →")
              : `Pay ₦${(customAmount ? Number(customAmount) : selectedPreset ? Number(selectedPreset.replace(/[^\d]/g, "")) : 0).toLocaleString()} via SprintPay →`
            }
          </button>

          <div className="funds-info-box" style={{ marginTop: 20 }}>
            <strong>⏳ Processing</strong> — SprintPay and Virtual Account both credit your wallet instantly after payment.
          </div>
        </>
      )}
    </div>
  </div>
)}

          {/* SUPPORT */}
          {activePanel === "support" && (
            <div className="dash-panel">
              {!supportChatOpen ? (
                <div className="support-panel-modern">
                  <div className="support-hero">
                    <h2 className="support-hero-title">Customer Support</h2>
                    <p className="support-hero-desc">We're here to help! Choose your preferred support channel below and our team will assist you promptly.</p>
                  </div>

                  <div className="support-grid-modern">
                    <div className="support-card-modern">
                      <div className="support-card-icon-wrap" style={{ background: 'hsl(210 100% 25% / 0.1)', color: 'hsl(210 100% 25%)' }}>
                        <i className="fa-solid fa-bullhorn" />
                      </div>
                      <div className="support-card-info">
                        <h3>Telegram Announcement Group</h3>
                        <p>Get latest updates, announcements and news</p>
                      </div>
                      <button className="support-card-btn" onClick={() => window.open(siteSettings.telegram_group, '_blank')}>
                        Click to Join Group
                      </button>
                    </div>

                    <div className="support-card-modern">
                      <div className="support-card-icon-wrap" style={{ background: 'hsl(200 100% 45% / 0.1)', color: 'hsl(200 100% 45%)' }}>
                        <i className="fa-brands fa-telegram" />
                      </div>
                      <div className="support-card-info">
                        <h3>Telegram Support</h3>
                        <p>Chat with our support team 24/7</p>
                      </div>
                      <button className="support-card-btn" onClick={() => window.open(siteSettings.telegram_support, '_blank')}>
                        Start Telegram Chat
                      </button>
                    </div>

                    <div className="support-card-modern">
                      <div className="support-card-icon-wrap" style={{ background: 'hsl(140 70% 45% / 0.1)', color: 'hsl(140 70% 45%)' }}>
                        <i className="fa-brands fa-whatsapp" />
                      </div>
                      <div className="support-card-info">
                        <h3>WhatsApp Channel</h3>
                        <p>Join our WhatsApp community for instant support</p>
                      </div>
                      <button className="support-card-btn" onClick={() => window.open(siteSettings.whatsapp_channel, '_blank')}>
                        Click to Join WhatsApp Channel
                      </button>
                    </div>

                    {/* Dashboard Chat Option */}
                    <div className="support-card-modern">
                      <div className="support-card-icon-wrap" style={{ background: 'hsl(260 70% 55% / 0.1)', color: 'hsl(260 70% 55%)' }}>
                        <i className="fa-solid fa-comments" />
                      </div>
                      <div className="support-card-info">
                        <h3>Internal Dashboard Chat</h3>
                        <p>Message us directly here if you prefer not to use other apps.</p>
                      </div>
                      <button className="support-card-btn" onClick={() => setSupportChatOpen(true)}>
                        Open Dashboard Chat
                      </button>
                    </div>
                  </div>

                  <div className="support-info-banner">
                    <div className="sib-icon">🕒</div>
                    <div className="sib-content">
                      <h3>24/7 Support Available</h3>
                      <p>Our support team responds within 24 hours. For urgent matters, please use Telegram or WhatsApp for faster response.</p>
                    </div>
                  </div>

                  <div className="support-tips-section">
                    <h3 className="tips-title">Quick Tips for Better Support</h3>
                    <div className="tips-grid">
                      <div className="tip-item">
                        <i className="fa-solid fa-hashtag" />
                        <span>Include your order number in all support requests</span>
                      </div>
                      <div className="tip-item">
                        <i className="fa-solid fa-camera" />
                        <span>Provide screenshots for technical issues</span>
                      </div>
                      <div className="tip-item">
                        <i className="fa-solid fa-circle-question" />
                        <span>Check FAQ section before contacting support</span>
                      </div>
                      <div className="tip-item">
                        <i className="fa-solid fa-bolt" />
                        <span>Use Telegram/WhatsApp for urgent matters</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chat-window">
                  <header className="chat-header">
                    <button type="button" className="chat-back" onClick={() => setSupportChatOpen(false)} aria-label="Back">
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                    <div className="chat-header-avatar">
                      <i className="fa-solid fa-headset" />
                    </div>
                    <div className="chat-header-info">
                      <h2 className="chat-header-title">Support</h2>
                      <p className="chat-header-status">We typically respond within 15 minutes</p>
                    </div>
                  </header>

                  <div id="chat-container" className="chat-messages">
                    {messages.length === 0 ? (
                      <div className="chat-empty">
                        <div className="chat-empty-icon"><i className="fa-regular fa-message" /></div>
                        <p className="chat-empty-title">Start a conversation</p>
                        <p className="chat-empty-desc">Send a message or attach an image. Our team will get back to you shortly.</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`chat-bubble ${msg.sender_id === userId ? "chat-bubble--sent" : "chat-bubble--received"} ${msg.receiver_id === userId && !msg.is_read ? "chat-bubble--unread" : ""}`}
                        >
                          {(msg.content || msg.attachment_url) && (
                            <>
                              {msg.attachment_url && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="chat-bubble-image-wrap">
                                  <img src={msg.attachment_url} alt="Attachment" className="chat-bubble-image" />
                                </a>
                              )}
                              {msg.content && <div className="chat-bubble-text">{msg.content}</div>}
                            </>
                          )}
                          <div className="chat-bubble-meta">
                            {msg.receiver_id === userId && !msg.is_read && <span className="chat-bubble-new">New</span>}
                            <span className="chat-bubble-time">{new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                            {msg.sender_id !== userId && <span className="chat-bubble-badge">Support</span>}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  <div className="chat-composer">
                    {pendingAttachmentUrl && (
                      <div className="chat-attach-preview">
                        <img src={pendingAttachmentUrl} alt="Attach" />
                        <button type="button" className="chat-attach-remove" onClick={() => setPendingAttachmentUrl(null)} aria-label="Remove image">
                          <i className="fa-solid fa-times" />
                        </button>
                      </div>
                    )}
                    <div className="chat-composer-row">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="chat-file-input"
                        onChange={handleAttachmentChange}
                        aria-label="Upload image"
                      />
                      <button
                        type="button"
                        className="chat-composer-btn chat-composer-btn--attach"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachmentUploading}
                        title="Attach image"
                      >
                        {attachmentUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-image" />}
                      </button>
                      <input
                        type="text"
                        className="chat-composer-input"
                        placeholder="Type your message..."
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <button
                        type="button"
                        className="chat-composer-btn chat-composer-btn--send"
                        onClick={() => sendMessage()}
                        disabled={(!msgInput.trim() && !pendingAttachmentUrl) || attachmentUploading}
                      >
                        <i className="fa-solid fa-paper-plane" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
