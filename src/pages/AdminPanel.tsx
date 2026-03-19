import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, apiFormData } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import "../styles/admin.css";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

type AdminTab = "overview" | "users" | "orders" | "products" | "categories" | "transactions" | "admins" | "messages" | "broadcasts" | "logs" | "settings";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  created_at: string;
  is_blocked: boolean;
  balance?: number;
}

interface Wallet {
  user_id: string;
  balance: number;
  id: string;
}

interface Order {
  id: string;
  user_id: string;
  product_title: string;
  product_platform: string;
  total_price: number;
  status: string;
  created_at: string;
  quantity: number;
  account_details: string | null;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  platform: string;
  category_id: string;
  is_active: boolean;
  currency: string;
  image_url: string | null;
  sample_link: string | null;
  deleted_at: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  display_order: number;
  image_url: string | null;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
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
  sender_display?: string;
  receiver_display?: string;
  content: string;
  attachment_url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface BankDetail {
  id: string;
  label: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
  display_order: number;
}

interface AccountLog {
  id: string;
  product_id: string;
  login: string;
  password: string;
  is_sold: boolean;
  order_id: string | null;
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

/** Normalize line endings and strip UTF-8 BOM so full file content is preserved. */
function normalizeLogFileText(raw: string): string {
  let s = raw;
  if (s.length > 0 && s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function countNonEmptyLines(text: string): number {
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

/**
 * Parse one log line: split only on the FIRST delimiter so login/password can contain :, |, commas.
 * Order: tab, |, :, comma. If none, whole line is login (password empty).
 */
function parseLogLine(trimmed: string): { login: string; password: string } | null {
  if (!trimmed) return null;
  const withSep = (sep: string): { login: string; password: string } | null => {
    const i = trimmed.indexOf(sep);
    if (i < 0) return null;
    return {
      login: trimmed.slice(0, i).trim(),
      password: trimmed.slice(i + sep.length).trim(),
    };
  };
  return withSep("\t") ?? withSep("|") ?? withSep(":") ?? withSep(",") ?? { login: trimmed, password: "" };
}

const NAV: { label: string; icon: string; tab: AdminTab }[] = [
  { label: "Overview", icon: "📊", tab: "overview" },
  { label: "Users", icon: "👥", tab: "users" },
  { label: "Orders", icon: "📦", tab: "orders" },
  { label: "Products", icon: "🛍️", tab: "products" },
  { label: "Account Logs", icon: "🔑", tab: "logs" },
  { label: "Categories", icon: "📁", tab: "categories" },
  { label: "Transactions", icon: "💰", tab: "transactions" },
  { label: "Admin Roles", icon: "🛡️", tab: "admins" },
  { label: "Messages", icon: "💬", tab: "messages" },
  { label: "Broadcasts", icon: "📢", tab: "broadcasts" },
  { label: "Settings", icon: "⚙️", tab: "settings" },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const adminUserId = user?.id ?? "";
  const [tab, setTab] = useState<AdminTab>("overview");
  const [search, setSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PER_PAGE = 50;
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 50;
  const [logsPage, setLogsPage] = useState(1);
  const LOGS_PER_PAGE = 75;
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletAction, setWalletAction] = useState<"credit" | "debit" | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [accountLogs, setAccountLogs] = useState<AccountLog[]>([]);
  const [logStats, setLogStats] = useState({ total: 0, unsold: 0 });
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [siteSettings, setSiteSettings] = useState<{ key: string, value: string }[]>([]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editBank, setEditBank] = useState<BankDetail | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadCategoryId, setBulkUploadCategoryId] = useState("");
  const [bulkUploadPlatform, setBulkUploadPlatform] = useState("General");

  const [productForm, setProductForm] = useState({ title: "", description: "", price: 0, stock: 0, platform: "", category_id: "", currency: "NGN", image_url: "", sample_link: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", emoji: "", display_order: 0, image_url: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogs, setIsUploadingLogs] = useState(false);
  const [accountLogLimits, setAccountLogLimits] = useState<{ loginMaxLen: number | null; passwordMaxLen: number | null } | null>(null);
  const [accountLogLimitsLoading, setAccountLogLimitsLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [logForm, setLogForm] = useState({ product_id: "", login: "", password: "", description: "" });
  const [bankForm, setBankForm] = useState({ label: "", account_name: "", account_number: "", is_active: true, display_order: 0 });
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [adminMsgInput, setAdminMsgInput] = useState("");
  const [adminPendingAttachmentUrl, setAdminPendingAttachmentUrl] = useState<string | null>(null);
  const [adminAttachmentUploading, setAdminAttachmentUploading] = useState(false);
  const adminMessageFileInputRef = useRef<HTMLInputElement>(null);
  const [logModalTab, setLogModalTab] = useState<"single" | "bulk">("bulk");
  const [bulkLogInput, setBulkLogInput] = useState("");
  const [logProductSearch, setLogProductSearch] = useState("");
  const [logProductDropdownOpen, setLogProductDropdownOpen] = useState(false);
  const logProductDropdownRef = useRef<HTMLDivElement>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [editBroadcast, setEditBroadcast] = useState<BroadcastMessage | null>(null);
  const [broadcastForm, setBroadcastForm] = useState({ title: "", body: "", is_active: true });
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLastPage, setUsersLastPage] = useState(1);
  const [adminLoading, setAdminLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adminRefreshing, setAdminRefreshing] = useState(false);
  const initialLoadDone = useRef(false);
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLimits = async () => {
      setAccountLogLimitsLoading(true);
      try {
        const res = await api<{ loginMaxLen: number | null; passwordMaxLen: number | null }>(`/admin/account-logs/limits`);
        if (!cancelled) setAccountLogLimits(res ?? null);
      } catch {
        // If this endpoint isn't available for some reason, we fall back to a conservative 255 check later.
      } finally {
        if (!cancelled) setAccountLogLimitsLoading(false);
      }
    };
    loadLimits();
    return () => { cancelled = true; };
  }, []);

  const fetchProfilesPage = async (page: number, searchQuery?: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(USERS_PER_PAGE) });
      const q = typeof searchQuery === "string" ? searchQuery.trim() : "";
      if (q) params.set("search", q);
      const res = await api<{ profiles: Profile[]; total: number; current_page: number; last_page: number; per_page: number }>(
        `/admin/profiles?${params.toString()}`
      );
      const list = Array.isArray(res.profiles) ? res.profiles : [];
      setProfiles(list);
      setUsersTotal(typeof res.total === "number" ? res.total : 0);
      setUsersLastPage(typeof res.last_page === "number" ? res.last_page : 1);
      setUsersPage(page);
    } catch (e) {
      console.error("fetchProfilesPage:", e);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "users") return;
    const t = setTimeout(() => fetchProfilesPage(1, search), 300);
    return () => clearTimeout(t);
  }, [tab, search]);

  const loadAll = async () => {
    const isInitial = !initialLoadDone.current;
    if (isInitial) setAdminLoading(true);
    try {
      const [w, o, pr, c, t, r, m, al, bd, ss, bc, profilesRes] = await Promise.all([
        api<Wallet[]>("/admin/wallets"),
        api<Order[]>("/admin/orders"),
        api<Product[]>("/admin/products"),
        api<Category[]>("/admin/categories"),
        api<Transaction[]>("/admin/transactions"),
        api<UserRole[]>("/admin/user-roles"),
        api<Message[]>("/admin/messages"),
        api<{ logs: AccountLog[]; total: number; unsold: number }>("/admin/account-logs"),
        api<BankDetail[]>("/admin/bank-details"),
        api<{ key: string; value: string }[]>("/admin/site-settings"),
        api<BroadcastMessage[]>("/admin/broadcast-messages"),
        api<{ profiles: Profile[]; total: number; current_page: number; last_page: number; per_page: number }>(
          `/admin/profiles?page=1&per_page=${USERS_PER_PAGE}`
        ),
      ]);
      setWallets(Array.isArray(w) ? w : []);
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setCategories(Array.isArray(c) ? c : []);
      setTransactions(Array.isArray(t) ? t : []);
      setRoles(Array.isArray(r) ? r : []);
      setAllMessages(Array.isArray(m) ? m : []);
      if (al && typeof al === "object" && "logs" in al && Array.isArray((al as { logs: AccountLog[] }).logs)) {
        setAccountLogs((al as { logs: AccountLog[]; total?: number; unsold?: number }).logs);
        setLogStats({ total: (al as { total: number }).total ?? 0, unsold: (al as { unsold: number }).unsold ?? 0 });
      } else if (Array.isArray(al)) {
        setAccountLogs(al);
        setLogStats({ total: al.length, unsold: al.filter((l: AccountLog) => !l.is_sold).length });
      } else {
        setAccountLogs([]);
        setLogStats({ total: 0, unsold: 0 });
      }
      setBankDetails(Array.isArray(bd) ? bd : []);
      setSiteSettings(Array.isArray(ss) ? ss : []);
      setBroadcasts(Array.isArray(bc) ? bc : []);
      if (isInitial && profilesRes && typeof profilesRes === "object" && "profiles" in profilesRes) {
        const list = Array.isArray(profilesRes.profiles) ? profilesRes.profiles : [];
        setProfiles(list);
        setUsersTotal(typeof profilesRes.total === "number" ? profilesRes.total : 0);
        setUsersLastPage(typeof profilesRes.last_page === "number" ? profilesRes.last_page : 1);
        setUsersPage(1);
      }
    } catch (e) {
      console.error("Admin loadAll:", e);
      toast.error("Failed to load data");
    } finally {
      initialLoadDone.current = true;
      setAdminLoading(false);
    }
  };

  /** Only refetch logs + products (stock). Fast — avoids full admin reload after log delete/upload. */
  const refreshAccountLogsAndProducts = async () => {
    try {
      const [al, pr] = await Promise.all([
        api<{ logs: AccountLog[]; total: number; unsold: number }>("/admin/account-logs?limit=5000"),
        api<Product[]>("/admin/products"),
      ]);
      if (al && typeof al === "object" && "logs" in al && Array.isArray((al as { logs: AccountLog[] }).logs)) {
        const payload = al as { logs: AccountLog[]; total?: number; unsold?: number };
        setAccountLogs(payload.logs);
        setLogStats({ total: payload.total ?? 0, unsold: payload.unsold ?? 0 });
      } else if (Array.isArray(al)) {
        setAccountLogs(al);
        setLogStats({ total: al.length, unsold: al.filter((l: AccountLog) => !l.is_sold).length });
      }
      if (Array.isArray(pr)) setProducts(pr);
    } catch (e) {
      console.error("refreshAccountLogsAndProducts:", e);
      await loadAll();
    }
  };

  const handleAdminRefresh = async () => {
    setAdminRefreshing(true);
    try {
      await loadAll();
      if (tab === "users") await fetchProfilesPage(usersPage, search);
      toast.success("Data refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setAdminRefreshing(false);
    }
  };

  // Poll messages for admin (runs every 10s; does not show full-page loading)
  useEffect(() => {
    const t = setInterval(() => { loadAll(); }, 10000);
    return () => clearInterval(t);
  }, []);

  const getChatUsers = () => {
    const userIds = new Set(allMessages.map(m => m.sender_id === adminUserId ? m.receiver_id : m.sender_id));
    userIds.delete("00000000-0000-0000-0000-000000000000");
    userIds.delete(adminUserId);
    allMessages.forEach(m => {
      if (m.receiver_id === "00000000-0000-0000-0000-000000000000") userIds.add(m.sender_id);
    });
    return Array.from(userIds);
  };

  const getChatMessages = (chatUserId: string) => {
    return allMessages.filter(m =>
      (m.sender_id === chatUserId) ||
      (m.receiver_id === chatUserId) ||
      (m.sender_id === chatUserId && m.receiver_id === "00000000-0000-0000-0000-000000000000")
    );
  };

  useEffect(() => {
    if (!selectedChatUser) return;
    const unreadInConversation = allMessages.filter(
      m => m.sender_id === selectedChatUser && !m.is_read
    );
    if (unreadInConversation.length === 0) return;
    const idsToMark = new Set(unreadInConversation.map(m => m.id));
    setAllMessages(prev =>
      prev.map(m => (idsToMark.has(m.id) ? { ...m, is_read: true } : m))
    );
    (async () => {
      try {
        await Promise.all(
          unreadInConversation.map(msg =>
            api(`/admin/messages/${msg.id}/read`, { method: "PATCH" })
          )
        );
        const msgs = await api<Message[]>("/admin/messages");
        setAllMessages(Array.isArray(msgs) ? msgs : []);
      } catch (e) {
        console.error("Mark messages read:", e);
      }
    })();
  }, [selectedChatUser, allMessages]);

  const getMessageUserDisplay = (userId: string) => {
    const msg = allMessages.find(m => m.sender_id === userId || m.receiver_id === userId);
    let display: string;
    if (msg) {
      if (msg.sender_id === userId && msg.sender_display) display = msg.sender_display;
      else if (msg.receiver_id === userId && msg.receiver_display) display = msg.receiver_display;
      else display = getUserName(userId);
    } else {
      display = getUserName(userId);
    }
    if (!display || /^[0-9a-f-]{36}$/i.test(display.trim())) return "User";
    return display;
  };

  const sendAdminMessage = async () => {
    const content = adminMsgInput.trim();
    if ((!content && !adminPendingAttachmentUrl) || !selectedChatUser || !adminUserId) return;
    try {
      await api("/admin/messages", {
        method: "POST",
        body: JSON.stringify({
          content: content || undefined,
          attachment_url: adminPendingAttachmentUrl || undefined,
          receiver_id: selectedChatUser,
        }),
      });
      setAdminMsgInput("");
      setAdminPendingAttachmentUrl(null);
      loadAll();
    } catch {
      toast.error("Failed to send");
    }
  };

  const handleAdminAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) {
      toast.error("Allowed: JPG, PNG, WebP, GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setAdminAttachmentUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFormData<{ url: string }>("/messages/upload", form);
      if (res?.url) setAdminPendingAttachmentUrl(res.url);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setAdminAttachmentUploading(false);
      e.target.value = "";
    }
  };

  const getWalletBalance = (userId: string) => {
    const w = wallets.find((x) => x.user_id === userId);
    return w ? Number(w.balance) : 0;
  };

  const getDisplayBalance = (p: Profile) =>
    typeof p.balance === "number" ? p.balance : getWalletBalance(p.user_id);

  const getUserName = (userId: string) => {
    const p = profiles.find((x) => x.user_id === userId);
    const name = p?.username?.trim();
    if (name) return name;
    if (p?.email) return p.email;
    return userId.slice(0, 8);
  };

  const isUserAdmin = (userId: string) => roles.some((r) => r.user_id === userId && r.role === "admin");
  const isUserBlocked = (userId: string) => profiles.find((p) => p.user_id === userId)?.is_blocked || false;

  const toggleBlockUser = async (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    if (!profile) return;
    try {
      await api(`/admin/profiles/${profile.id}/block`, { method: "PATCH" });
      const newStatus = !profile.is_blocked;
      toast.success(newStatus ? "User blocked" : "User unblocked");
      setProfiles(profiles.map((p) => p.user_id === userId ? { ...p, is_blocked: newStatus } : p));
      if (selectedUser?.user_id === userId) setSelectedUser({ ...selectedUser, is_blocked: newStatus });
    } catch {
      toast.error("Failed to update user");
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_price), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;

  const getUserOrders = (userId: string) => orders.filter((o) => o.user_id === userId);
  const getUserTransactions = (userId: string) => transactions.filter((t) => t.user_id === userId);

  // Get unsold logs count for a product
  const getUnsoldLogsCount = (productId: string) => accountLogs.filter(l => l.product_id === productId && !l.is_sold).length;

  const platformIconMap: Record<string, string> = {
    Facebook: "fa-brands fa-facebook", Instagram: "fa-brands fa-instagram",
    TikTok: "fa-brands fa-tiktok", "Twitter/X": "fa-brands fa-x-twitter",
    YouTube: "fa-brands fa-youtube", Snapchat: "fa-brands fa-snapchat",
    LinkedIn: "fa-brands fa-linkedin", Discord: "fa-brands fa-discord",
    Gmail: "fa-brands fa-google", Telegram: "fa-brands fa-telegram",
  };

  const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (!API_BASE) return url;
    return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const getProductImageNode = (p: Product) => {
    const productUrl = resolveImageUrl(p.image_url);
    if (productUrl) {
      return <img src={productUrl} alt={p.title} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />;
    }
    const cat = categories.find((c) => c.id === p.category_id);
    const catUrl = resolveImageUrl(cat?.image_url ?? null);
    if (catUrl) {
      return <img src={catUrl} alt={p.title} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />;
    }
    if (platformIconMap[p.platform]) {
      return <i className={platformIconMap[p.platform]} />;
    }
    return <div style={{ width: 36, height: 36, borderRadius: 8, background: "hsl(220 20% 93%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📦</div>;
  };

  const switchTab = (t: AdminTab) => {
    setTab(t);
    setSearch("");
    setUsersPage(1);
    setProductSearch("");
    setSelectedUser(null);
    setSidebarOpen(false);
  };

  // Wallet credit/debit
  const handleWalletAction = async () => {
    if (!selectedUser || !walletAmount || !walletAction) return;
    const amount = Number(walletAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }

    const wallet = wallets.find((w) => w.user_id === selectedUser.user_id);
    if (!wallet) { toast.error("User has no wallet"); return; }

    const newBalance = walletAction === "credit"
      ? Number(wallet.balance) + amount
      : Number(wallet.balance) - amount;

    if (newBalance < 0) { toast.error("Insufficient balance for debit"); return; }

    try {
      await api("/admin/wallets/credit", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          amount: walletAction === "credit" ? amount : -amount,
          description: `Admin ${walletAction}`,
        }),
      });
      toast.success(`₦${amount.toLocaleString()} ${walletAction}ed successfully`);
      setWalletAmount("");
      setWalletAction(null);
      loadAll();
    } catch {
      toast.error("Failed to update wallet");
    }
  };

  // Order status update
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api(`/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success(`Order ${status}`);
      loadAll();
    } catch {
      toast.error("Failed to update order");
    }
  };

  const saveBankDetail = async () => {
    if (!bankForm.label || !bankForm.account_number) { toast.error("Fill required fields"); return; }

    try {
      if (editBank) {
        await api(`/admin/bank-details/${editBank.id}`, { method: "PUT", body: JSON.stringify(bankForm) });
        toast.success("Bank detail updated");
      } else {
        await api("/admin/bank-details", { method: "POST", body: JSON.stringify(bankForm) });
        toast.success("Bank detail added");
      }
      setShowBankModal(false);
      setEditBank(null);
      loadAll();
    } catch {
      toast.error(editBank ? "Failed to update" : "Failed to create");
    }
  };

  const deleteBankDetail = async (id: string) => {
    try {
      await api(`/admin/bank-details/${id}`, { method: "DELETE" });
      toast.success("Bank detail deleted");
      loadAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Product CRUD
  const saveProduct = async () => {
    if (!productForm.title || !productForm.category_id) { toast.error("Fill required fields"); return; }
    let image_url = productForm.image_url || null;
    if (!image_url) {
      const cat = categories.find(c => c.id === productForm.category_id);
      if (cat?.image_url) image_url = cat.image_url;
    }

    const formData = {
      title: productForm.title,
      description: productForm.description,
      price: productForm.price,
      stock: productForm.stock,
      platform: productForm.platform,
      category_id: productForm.category_id,
      currency: productForm.currency,
      image_url: image_url,
      sample_link: productForm.sample_link || null,
    };
    try {
      if (editProduct) {
        await api(`/admin/products/${editProduct.id}`, { method: "PUT", body: JSON.stringify(formData) });
        toast.success("Product updated");
      } else {
        await api("/admin/products", { method: "POST", body: JSON.stringify(formData) });
        toast.success("Product created");
      }
      setShowProductModal(false);
      setEditProduct(null);
      setProductForm({ title: "", description: "", price: 0, stock: 0, platform: "", category_id: "", currency: "NGN", image_url: "", sample_link: "" });
      loadAll();
    } catch {
      toast.error(editProduct ? "Failed to update product" : "Failed to create product");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api(`/admin/products/${id}`, { method: "DELETE" });
      toast.success("Product deleted successfully");
      loadAll();
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message || "Failed to delete product");
    }
  };

  const toggleProductActive = async (p: Product) => {
    try {
      await api(`/admin/products/${p.id}`, { method: "PUT", body: JSON.stringify({ is_active: !p.is_active }) });
      toast.success(p.is_active ? "Product disabled" : "Product enabled");
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e: unknown) {
      toast.error((e as { message?: string }).message || "Failed to update product");
    }
  };

  const saveBroadcast = async () => {
    if (!broadcastForm.title.trim()) { toast.error("Enter a title"); return; }
    if (!broadcastForm.body.trim()) { toast.error("Enter message body"); return; }
    try {
      if (editBroadcast) {
        await api(`/admin/broadcast-messages/${editBroadcast.id}`, {
          method: "PUT",
          body: JSON.stringify(broadcastForm),
        });
        toast.success("Broadcast updated");
      } else {
        await api("/admin/broadcast-messages", {
          method: "POST",
          body: JSON.stringify(broadcastForm),
        });
        toast.success("Broadcast created");
      }
      setShowBroadcastModal(false);
      setEditBroadcast(null);
      setBroadcastForm({ title: "", body: "", is_active: true });
      loadAll();
    } catch {
      toast.error(editBroadcast ? "Failed to update broadcast" : "Failed to create broadcast");
    }
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm("Delete this broadcast? Users who haven't seen it yet won't see it.")) return;
    try {
      await api(`/admin/broadcast-messages/${id}`, { method: "DELETE" });
      toast.success("Broadcast deleted");
      loadAll();
    } catch {
      toast.error("Failed to delete broadcast");
    }
  };

  const submitBulkUpload = async () => {
    if (!bulkUploadFile || !bulkUploadCategoryId) {
      toast.error("Select a file and category");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", bulkUploadFile);
      formData.append("category_id", bulkUploadCategoryId);
      if (bulkUploadPlatform) formData.append("platform", bulkUploadPlatform);
      const data = await apiFormData<{ created: number; products?: unknown[] }>("/admin/products/bulk-upload", formData);
      toast.success(`Created ${data?.created ?? 0} products`);
      setShowBulkUploadModal(false);
      setBulkUploadFile(null);
      setBulkUploadCategoryId("");
      setBulkUploadPlatform("General");
      loadAll();
    } catch {
      toast.error("Bulk upload failed");
    }
  };

  // Account Log CRUD
  const saveLog = async () => {
    if (!logForm.product_id || !logForm.login || !logForm.password) { toast.error("Fill all fields"); return; }
    try {
      await api("/admin/account-logs", {
        method: "POST",
        body: JSON.stringify({
          product_id: logForm.product_id,
          login: logForm.login,
          password: logForm.password,
        }),
      });
      toast.success("Account log added!");
      setLogForm({ ...logForm, login: "", password: "" });
      await refreshAccountLogsAndProducts();
    } catch {
      toast.error("Failed to create log");
    }
  };

  const deleteLog = async (id: string) => {
    if (!confirm("Delete this log?")) return;
    const prevLogs = accountLogs;
    const prevStats = logStats;
    setAccountLogs((p) => p.filter((l) => l.id !== id));
    setSelectedLogIds((prev) => prev.filter((x) => x !== id));
    const removed = prevLogs.find((l) => l.id === id);
    setLogStats((s) => ({
      total: Math.max(0, s.total - 1),
      unsold: Math.max(0, s.unsold - (removed && !removed.is_sold ? 1 : 0)),
    }));
    try {
      await api(`/admin/account-logs/${id}`, { method: "DELETE" });
      toast.success("Log deleted");
      await refreshAccountLogsAndProducts();
    } catch {
      setAccountLogs(prevLogs);
      setLogStats(prevStats);
      toast.error("Failed to delete");
    }
  };

  const deleteSelectedLogs = async () => {
    const ids = [...new Set(selectedLogIds)];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected log(s)? This cannot be undone.`)) return;
    const idSet = new Set(ids);
    const prevLogs = accountLogs;
    const prevStats = logStats;
    const unsoldRemoved = prevLogs.filter((l) => idSet.has(l.id) && !l.is_sold).length;
    setAccountLogs((p) => p.filter((l) => !idSet.has(l.id)));
    setSelectedLogIds([]);
    setLogStats((s) => ({
      total: Math.max(0, s.total - ids.length),
      unsold: Math.max(0, s.unsold - unsoldRemoved),
    }));
    const chunkSize = 500;
    try {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        await api("/admin/account-logs/bulk-delete", { method: "POST", body: JSON.stringify({ ids: chunk }) });
      }
      toast.success(`Deleted ${ids.length} log(s)`);
      await refreshAccountLogsAndProducts();
    } catch {
      setAccountLogs(prevLogs);
      setLogStats(prevStats);
      toast.error("Failed to delete selected logs");
    }
  };

  const saveBulkLogs = async () => {
    if (!logForm.product_id || !bulkLogInput.trim()) { toast.error("Select a product and enter logs"); return; }

    const lines = normalizeLogFileText(bulkLogInput).split("\n");
    const logsToInsert: { product_id: string; login: string; password: string }[] = [];
    for (const line of lines) {
      const parsed = parseLogLine(line.trim());
      if (!parsed || !parsed.login) continue;
      logsToInsert.push({
        product_id: logForm.product_id,
        login: parsed.login,
        password: parsed.password,
      });
    }

    if (logsToInsert.length === 0) {
      toast.error("No valid logs found. Use one line per account: login:password (or tab / | / comma). Extra colons in the password are kept.");
      return;
    }

    // If your MySQL columns are still VARCHAR(255), the upload will 500 on long passwords.
    // This pre-check scans the parsed lines and skips oversize entries with a warning.
    const FALLBACK_MAX_LEN = 1000;
    const passwordMaxLen = typeof accountLogLimits?.passwordMaxLen === "number" ? accountLogLimits.passwordMaxLen : null;
    const loginMaxLen = typeof accountLogLimits?.loginMaxLen === "number" ? accountLogLimits.loginMaxLen : null;

    // If limits haven't loaded yet, be conservative to prevent 500s.
    const shouldFallback = accountLogLimits === null;
    const effectivePasswordMax = passwordMaxLen ?? (shouldFallback ? FALLBACK_MAX_LEN : null);
    const effectiveLoginMax = loginMaxLen ?? (shouldFallback ? FALLBACK_MAX_LEN : null);

    let skipped = 0;
    const safeLogs: { product_id: string; login: string; password: string }[] = [];
    for (const l of logsToInsert) {
      if (effectiveLoginMax !== null && l.login.length > effectiveLoginMax) { skipped++; continue; }
      if (effectivePasswordMax !== null && l.password.length > effectivePasswordMax) { skipped++; continue; }
      safeLogs.push(l);
    }

    if (skipped > 0) {
      const maxLabel = [
        effectiveLoginMax !== null ? `login<=${effectiveLoginMax}` : null,
        effectivePasswordMax !== null ? `password<=${effectivePasswordMax}` : null,
      ].filter(Boolean).join(", ");
      toast.warning(`Skipped ${skipped.toLocaleString()} log(s) because ${maxLabel || "field length limit"} would overflow.`);
    }
    if (safeLogs.length === 0) {
      toast.error("All parsed logs are too long for the current DB column sizes. Reduce password/login length then try again.");
      return;
    }

    setIsUploadingLogs(true);
    let uploadedAny = false;
    try {
      const BATCH = 250;
      for (let i = 0; i < safeLogs.length; i += BATCH) {
        const chunk = safeLogs.slice(i, i + BATCH);
        await api("/admin/account-logs/bulk", { method: "POST", body: JSON.stringify({ logs: chunk }) });
        uploadedAny = true;
      }
      toast.success(`Successfully added ${safeLogs.length.toLocaleString()} log(s)!${skipped > 0 ? ` (skipped ${skipped.toLocaleString()})` : ""}`);
      setBulkLogInput("");
      setLogForm({ product_id: "", login: "", password: "", description: "" });
      setShowLogModal(false);
      await refreshAccountLogsAndProducts();
    } catch {
      if (uploadedAny) {
        await refreshAccountLogsAndProducts();
        toast.error("Upload failed after some chunks. Check the updated logs list.");
      } else {
        toast.error("Failed to upload logs");
      }
    } finally {
      setIsUploadingLogs(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result;
      if (typeof raw !== "string") {
        toast.error("Could not read file as text");
        return;
      }
      const normalized = normalizeLogFileText(raw);
      setBulkLogInput(normalized);
      toast.success(`Loaded ${file.name} — ${countNonEmptyLines(normalized)} non-empty line(s)`);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // Category CRUD
  const saveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) { toast.error("Fill required fields"); return; }
    try {
      if (editCategory) {
        await api(`/admin/categories/${editCategory.id}`, { method: "PUT", body: JSON.stringify(categoryForm) });
        toast.success("Category updated");
      } else {
        await api("/admin/categories", { method: "POST", body: JSON.stringify(categoryForm) });
        toast.success("Category created");
      }
      setEditCategory(null);
      setCategoryForm({ name: "", slug: "", emoji: "", display_order: 0, image_url: "" });
      loadAll();
    } catch {
      toast.error(editCategory ? "Failed to update" : "Failed to create");
    }
  };

  const uploadImage = async (file: File, endpoint: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiFormData<{ url: string }>(endpoint, formData);
      return data?.url ?? null;
    } catch {
      toast.error("Upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "/admin/categories/upload");
    if (url) setCategoryForm(prev => ({ ...prev, image_url: url }));
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "/admin/products/upload");
    if (url) setProductForm(prev => ({ ...prev, image_url: url }));
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api(`/admin/categories/${id}`, { method: "DELETE" });
      toast.success("Category deleted");
      loadAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Admin role management
  const addAdmin = async () => {
    if (!adminEmail) { toast.error("Enter an email"); return; }
    const match = profiles.find((p) =>
      p.username?.toLowerCase() === adminEmail.toLowerCase() ||
      p.username?.toLowerCase() === adminEmail.split("@")[0].toLowerCase()
    );
    if (!match) { toast.error("User not found. Make sure they have signed up."); return; }
    try {
      await api("/admin/user-roles", {
        method: "POST",
        body: JSON.stringify({ user_id: match.user_id, role: "admin" }),
      });
      toast.success("Admin added!");
      setAdminEmail("");
      setShowAdminModal(false);
      loadAll();
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "";
      toast.error(msg.includes("Duplicate") || msg.includes("already") ? "Already an admin" : "Failed to add admin");
    }
  };

  const removeAdmin = async (roleId: string) => {
    if (!confirm("Remove this admin role?")) return;
    try {
      await api(`/admin/user-roles/${roleId}`, { method: "DELETE" });
      toast.success("Admin removed");
      loadAll();
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };

  // Users list is server-side filtered via fetchProfilesPage(page, search); no client-side filter.
  const filteredProfiles = profiles;

  const filteredOrders = orders.filter((o) =>
    !search || o.product_title.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search) || getUserName(o.user_id).toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter((t) =>
    !search || t.description.toLowerCase().includes(search.toLowerCase()) || getUserName(t.user_id).toLowerCase().includes(search.toLowerCase())
  );

  const getProductTitle = (productId: string) => {
    const p = products.find(pr => pr.id === productId);
    return p?.title || productId.slice(0, 8);
  };

  const filteredLogs = accountLogs.filter(l =>
    !search || getProductTitle(l.product_id).toLowerCase().includes(search.toLowerCase()) || l.login.toLowerCase().includes(search.toLowerCase())
  );

  const sortedLogs = useMemo(() => {
    const titleKey = (productId: string) => {
      const p = products.find((pr) => pr.id === productId);
      return (p?.title || productId.slice(0, 8)).toLowerCase();
    };
    return [...filteredLogs].sort((a, b) => {
      const cmp = titleKey(a.product_id).localeCompare(titleKey(b.product_id));
      if (cmp !== 0) return cmp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredLogs, products]);

  const totalLogPages = Math.max(1, Math.ceil(sortedLogs.length / LOGS_PER_PAGE));
  const currentLogsPage = Math.min(logsPage, totalLogPages);
  const paginatedLogs = sortedLogs.slice(
    (currentLogsPage - 1) * LOGS_PER_PAGE,
    currentLogsPage * LOGS_PER_PAGE
  );

  const logGroupsOnPage = useMemo(() => {
    const m = new Map<string, AccountLog[]>();
    paginatedLogs.forEach((l) => {
      const arr = m.get(l.product_id) || [];
      arr.push(l);
      m.set(l.product_id, arr);
    });
    return Array.from(m.entries()).sort((a, b) =>
      getProductTitle(a[0]).localeCompare(getProductTitle(b[0]), undefined, { sensitivity: "base" })
    );
  }, [paginatedLogs, products]);

  const paginatedLogIds = useMemo(() => paginatedLogs.map((l) => l.id), [paginatedLogs]);
  const allPaginatedSelected =
    paginatedLogIds.length > 0 && paginatedLogIds.every((id) => selectedLogIds.includes(id));

  const toggleLogSelect = (id: string) => {
    setSelectedLogIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllPaginated = () => {
    if (allPaginatedSelected) {
      setSelectedLogIds((prev) => prev.filter((id) => !paginatedLogIds.includes(id)));
    } else {
      setSelectedLogIds((prev) => Array.from(new Set([...prev, ...paginatedLogIds])));
    }
  };

  const toggleSelectGroupOnPage = (productId: string) => {
    const ids = paginatedLogs.filter((l) => l.product_id === productId).map((l) => l.id);
    const allOn = ids.length > 0 && ids.every((id) => selectedLogIds.includes(id));
    if (allOn) {
      setSelectedLogIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedLogIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  useEffect(() => {
    if (tab !== "logs") setSelectedLogIds([]);
  }, [tab]);

  useEffect(() => {
    setLogsPage(1);
  }, [search]);

  useEffect(() => {
    if (logsPage > totalLogPages) setLogsPage(totalLogPages);
  }, [logsPage, totalLogPages]);

  const totalUserPages = Math.max(1, usersLastPage);
  const currentUsersPage = Math.min(usersPage, totalUserPages);
  const paginatedProfiles = filteredProfiles;

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const currentOrdersPage = Math.min(ordersPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice(
    (currentOrdersPage - 1) * ORDERS_PER_PAGE,
    currentOrdersPage * ORDERS_PER_PAGE
  );

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    const cat = categories.find((c) => c.id === p.category_id);
    return (
      p.title.toLowerCase().includes(q) ||
      (p.platform || "").toLowerCase().includes(q) ||
      (cat?.name || "").toLowerCase().includes(q)
    );
  });

  const logModalFilteredProducts = products.filter((p) => {
    if (!logProductSearch.trim()) return true;
    const q = logProductSearch.toLowerCase();
    const cat = categories.find((c) => c.id === p.category_id);
    return (
      p.title.toLowerCase().includes(q) ||
      (p.platform || "").toLowerCase().includes(q) ||
      (cat?.name || "").toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (logProductDropdownRef.current && !logProductDropdownRef.current.contains(e.target as Node)) {
        setLogProductDropdownOpen(false);
      }
    };
    if (logProductDropdownOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [logProductDropdownOpen]);

  const renderModal = (show: boolean, onClose: () => void, title: string, children: React.ReactNode) => {
    if (!show) return null;
    return (
      <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="admin-modal">
          <h3>{title}</h3>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <span className="admin-mobile-title">Admin Panel</span>
      </div>

      {/* Sidebar Overlay */}
      <div className={`admin-sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* Product Modal */}
      {renderModal(showProductModal, () => { setShowProductModal(false); setEditProduct(null); }, editProduct ? "Edit Product" : "Add Product", (
        <>
          <div className="admin-form-group">
            <label className="admin-form-label">Title *</label>
            <input className="admin-form-input" value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Description</label>
            <textarea className="admin-form-input" rows={3} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Platform</label>
            <input className="admin-form-input" value={productForm.platform} onChange={(e) => setProductForm({ ...productForm, platform: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Image URL / Upload</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                className="admin-form-input"
                style={{ flex: 1 }}
                value={productForm.image_url}
                onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                placeholder="Image URL or upload →"
              />
              <input type="file" accept="image/*" onChange={handleProductImageUpload} style={{ display: "none" }} id="p-img" />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => document.getElementById("p-img")?.click()}
                disabled={isUploading}
                title="Upload image"
              >
                {isUploading ? "..." : "📁"}
              </button>
            </div>
            {resolveImageUrl(productForm.image_url) ? (
              <div style={{ marginTop: 10 }}>
                <img
                  src={resolveImageUrl(productForm.image_url)!}
                  alt="Preview"
                  style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: "1px solid hsl(220 20% 90%)" }}
                />
              </div>
            ) : null}
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Sample link (optional)</label>
            <input className="admin-form-input" value={productForm.sample_link} onChange={(e) => setProductForm({ ...productForm, sample_link: e.target.value })} placeholder="https://..." />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Category *</label>
            <select className="admin-form-input" value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label">Price (₦)</label>
              <input type="number" className="admin-form-input" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} />
            </div>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label">Stock</label>
              <input type="number" className="admin-form-input" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={saveProduct} disabled={isUploading}>
              {isUploading ? "Uploading..." : (editProduct ? "Update" : "Create")}
            </button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => { setShowProductModal(false); setEditProduct(null); }}>Cancel</button>
          </div>
        </>
      ))}

      {/* Log Modal */}
      {renderModal(showLogModal, () => { setShowLogModal(false); setLogProductSearch(""); setLogProductDropdownOpen(false); }, "Account Logs", (
        <>
          <div className="admin-form-group" ref={logProductDropdownRef}>
            <label className="admin-form-label">Product *</label>
            <div className="admin-select-search-wrap">
              <input
                type="text"
                className="admin-form-input"
                placeholder="Search products by name, platform..."
                value={logProductDropdownOpen ? logProductSearch : (logForm.product_id ? (() => { const p = products.find(pr => pr.id === logForm.product_id); return p ? `${p.title} (${p.platform})` : getProductTitle(logForm.product_id); })() : "")}
                onChange={(e) => { setLogProductSearch(e.target.value); setLogProductDropdownOpen(true); }}
                onFocus={() => { setLogProductDropdownOpen(true); if (logForm.product_id) setLogProductSearch(""); }}
              />
              {logForm.product_id && (
                <button type="button" className="admin-select-search-clear" onClick={(e) => { e.stopPropagation(); setLogForm({ ...logForm, product_id: "" }); setLogProductSearch(""); }} aria-label="Clear selection">
                  <i className="fa-solid fa-times" />
                </button>
              )}
              {logProductDropdownOpen && (
                <ul className="admin-select-search-list">
                  {logModalFilteredProducts.length === 0 ? (
                    <li className="admin-select-search-item admin-select-search-item--empty">No products match</li>
                  ) : (
                    logModalFilteredProducts.map((p) => (
                      <li
                        key={p.id}
                        className="admin-select-search-item"
                        onClick={() => { setLogForm({ ...logForm, product_id: p.id }); setLogProductSearch(""); setLogProductDropdownOpen(false); }}
                      >
                        {p.title} <span style={{ color: "hsl(220 10% 55%)", fontSize: 12 }}>({p.platform})</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Instructions/Description</label>
            <textarea
              className="admin-form-input"
              rows={3}
              value={logForm.description}
              onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
              placeholder="Enter instructions for these accounts (e.g., 'Change password immediately', 'Use VPN', etc.)"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Upload TXT File</label>
            <input type="file" accept=".txt,.csv,text/plain" onChange={handleFileUpload} className="admin-form-input" />
            <p style={{ fontSize: 12, color: "hsl(var(--admin-muted))", marginTop: 6 }}>
              UTF-8, Windows or Unix line endings. One account per line: <code>login:password</code> (only the first <code>:</code>, <code>|</code>, tab, or comma splits — rest stays in the password).
            </p>
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Or Paste Logs</label>
            <textarea
              className="admin-form-input"
              rows={10}
              value={bulkLogInput}
              onChange={(e) => setBulkLogInput(e.target.value)}
              placeholder={"user@email.com:password123\nanother_user|secret:with:colons\nthird\tpass phrase with spaces"}
            />
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={saveBulkLogs} disabled={isUploadingLogs}>
              {isUploadingLogs ? "Uploading..." : "Bulk Upload →"}
            </button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => setShowLogModal(false)}>Cancel</button>
          </div>
        </>
      ))}

      {/* Category Modal */}
      {renderModal(showCategoryModal, () => { setShowCategoryModal(false); setEditCategory(null); }, editCategory ? "Edit Category" : "Add Category", (
        <>
          <div className="admin-form-group">
            <label className="admin-form-label">Name *</label>
            <input className="admin-form-input" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Slug *</label>
            <input className="admin-form-input" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Image URL / Upload</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="admin-form-input" style={{ flex: 1 }} value={categoryForm.image_url} onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })} placeholder="URL or upload →" />
              <input type="file" accept="image/*" onChange={handleCategoryImageUpload} style={{ display: 'none' }} id="c-img" />
              <button className="admin-btn admin-btn-sm" onClick={() => document.getElementById('c-img')?.click()} disabled={isUploading}>
                {isUploading ? "..." : "📁"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label">Emoji (Fallback)</label>
              <input className="admin-form-input" value={categoryForm.emoji} onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })} />
            </div>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label">Order</label>
              <input type="number" className="admin-form-input" value={categoryForm.display_order} onChange={(e) => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={saveCategory}>{editCategory ? "Update" : "Create"}</button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => { setShowCategoryModal(false); setEditCategory(null); }}>Cancel</button>
          </div>
        </>
      ))}

      {/* Admin Modal */}
      {renderModal(showAdminModal, () => setShowAdminModal(false), "Add Admin User", (
        <>
          <p style={{ fontSize: 13, color: "hsl(220 10% 50%)", marginBottom: 16 }}>Enter the username or email prefix of the user. They must have an account.</p>
          <div className="admin-form-group">
            <label className="admin-form-label">Username or Email</label>
            <input className="admin-form-input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="e.g. john or john@example.com" />
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={addAdmin}>Add Admin</button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => setShowAdminModal(false)}>Cancel</button>
          </div>
        </>
      ))}

      {/* Manual Payment Modal */}
      {renderModal(showBankModal, () => { setShowBankModal(false); setEditBank(null); }, editBank ? "Edit Bank Detail" : "Add Bank Detail", (
        <>
          <div className="admin-form-group">
            <label className="admin-form-label">Bank Name / Label *</label>
            <input className="admin-form-input" value={bankForm.label} onChange={(e) => setBankForm({ ...bankForm, label: e.target.value })} placeholder="e.g. First Bank" />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Account Name *</label>
            <input className="admin-form-input" value={bankForm.account_name} onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })} placeholder="e.g. J. Doe" />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Account Number *</label>
            <input className="admin-form-input" value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} placeholder="e.g. 0123456789" />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Order (Lower first)</label>
            <input type="number" className="admin-form-input" value={bankForm.display_order} onChange={(e) => setBankForm({ ...bankForm, display_order: Number(e.target.value) })} />
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={saveBankDetail}>{editBank ? "Update" : "Add Bank"}</button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => { setShowBankModal(false); setEditBank(null); }}>Cancel</button>
          </div>
        </>
      ))}

      {/* Bulk Upload Products Modal */}
      {renderModal(showBulkUploadModal, () => { setShowBulkUploadModal(false); setBulkUploadFile(null); setBulkUploadCategoryId(""); }, "Bulk Upload Products", (
        <>
          <p style={{ fontSize: 13, color: "hsl(220 10% 50%)", marginBottom: 16 }}>
            Upload a CSV or TXT file. Each line: <strong>title, price</strong> or <strong>title, price, description</strong> or <strong>title, price, description, stock</strong> (comma or tab separated).
          </p>
          <div className="admin-form-group">
            <label className="admin-form-label">File (CSV or TXT) *</label>
            <input type="file" accept=".csv,.txt" className="admin-form-input" onChange={(e) => setBulkUploadFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Category *</label>
            <select className="admin-form-input" value={bulkUploadCategoryId} onChange={(e) => setBulkUploadCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Platform (optional)</label>
            <input className="admin-form-input" value={bulkUploadPlatform} onChange={(e) => setBulkUploadPlatform(e.target.value)} placeholder="e.g. General" />
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={submitBulkUpload}>Upload</button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => { setShowBulkUploadModal(false); setBulkUploadFile(null); }}>Cancel</button>
          </div>
        </>
      ))}

      {/* Wallet Action Modal */}
      {renderModal(!!walletAction, () => setWalletAction(null), `${walletAction === "credit" ? "Credit" : "Debit"} Wallet — ${selectedUser?.username || ""}`, (
        <>
          <p style={{ fontSize: 13, color: "hsl(220 10% 50%)", marginBottom: 16 }}>
            Current balance: <strong>₦{selectedUser ? getDisplayBalance(profiles.find(pr => pr.user_id === selectedUser.user_id) ?? selectedUser).toLocaleString() : 0}</strong>
          </p>
          <div className="admin-form-group">
            <label className="admin-form-label">Amount (₦)</label>
            <input type="number" className="admin-form-input" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="Enter amount" />
          </div>
          <div className="admin-form-actions">
            <button className={`admin-btn ${walletAction === "credit" ? "admin-btn-success" : "admin-btn-danger"}`}
              style={{ padding: "10px 20px" }} onClick={handleWalletAction}>
              {walletAction === "credit" ? "💰 Credit" : "💸 Debit"}
            </button>
            <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => setWalletAction(null)}>Cancel</button>
          </div>
        </>
      ))}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-logo">
          {siteSettings.find(s => s.key === "site_logo")?.value ? (
            <img src={siteSettings.find(s => s.key === "site_logo")?.value} alt="" style={{ height: 28, maxWidth: 100, objectFit: "contain" }} />
          ) : (
            <div className="logo-dot">V</div>
          )}
          <span>{siteSettings.find(s => s.key === "site_name")?.value || "Admin"}</span>
        </div>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <button key={n.tab} className={`admin-nav-item ${tab === n.tab ? "active" : ""}`} onClick={() => switchTab(n.tab)}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-theme">
            <ThemeToggle size="sm" />
          </div>
          <button className="admin-nav-item" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
          <button className="admin-nav-item signout-admin" onClick={handleSignOut} style={{ color: '#ff4444' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="admin-topbar-title">{NAV.find((n) => n.tab === tab)?.icon} {NAV.find((n) => n.tab === tab)?.label || "Admin"}</div>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              style={{ background: "hsl(220 20% 93%)", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={handleAdminRefresh}
              disabled={adminRefreshing || adminLoading}
              title="Reload all admin data from server"
            >
              {adminRefreshing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-arrows-rotate" />}
              Refresh
            </button>
          </div>
          {["users", "orders", "transactions", "logs"].includes(tab) && (
            <div className="admin-search">
              <span style={{ fontSize: 14 }}>🔍</span>
              <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
        </div>

        <div className="admin-content">
          {adminLoading && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 320,
              gap: 16,
              color: "hsl(220 10% 50%)",
            }}>
              <div style={{
                width: 48,
                height: 48,
                border: "4px solid hsl(220 20% 90%)",
                borderTopColor: "hsl(var(--admin-accent, 230 65% 55%))",
                borderRadius: "50%",
                animation: "admin-spin 0.8s linear infinite",
              }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>Loading admin data…</div>
              <div style={{ fontSize: 13 }}>Users, orders, products, and more</div>
            </div>
          )}
          {!adminLoading && (
          <>
          {/* ═══ OVERVIEW ═══ */}
          {tab === "overview" && (
            <>
              <h2 className="admin-section-title" style={{ marginBottom: 20 }}>Store overview</h2>
              <p style={{ color: "hsl(220 10% 50%)", fontSize: 14, marginBottom: 24 }}>Key metrics and latest activity at a glance.</p>

              <div className="admin-stats" style={{ marginBottom: 28 }}>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Users</div>
                  <div className="admin-stat-val">{usersTotal.toLocaleString()}</div>
                  <div className="admin-stat-sub">registered</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Orders</div>
                  <div className="admin-stat-val">{orders.length}</div>
                  <div className="admin-stat-sub">{pendingOrders} pending · {completedOrders} completed</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Revenue</div>
                  <div className="admin-stat-val">₦{totalRevenue.toLocaleString()}</div>
                  <div className="admin-stat-sub">total</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Products</div>
                  <div className="admin-stat-val">{products.length}</div>
                  <div className="admin-stat-sub">{products.filter((p) => p.is_active).length} active</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Account logs</div>
                  <div className="admin-stat-val">{logStats.total}</div>
                  <div className="admin-stat-sub">{logStats.unsold} available</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Categories</div>
                  <div className="admin-stat-val">{categories.length}</div>
                </div>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "hsl(220 20% 15%)" }}>Recent orders</h3>
              <div className="admin-table-wrap">
                <div className="admin-table-header">
                  <div className="admin-table-title">Latest {Math.min(8, orders.length)} orders</div>
                </div>
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>User</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 8).map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id.slice(0, 6)}</td>
                        <td>{getUserName(o.user_id)}</td>
                        <td>{o.product_title}</td>
                        <td style={{ fontWeight: 700 }}>₦{Number(o.total_price).toLocaleString()}</td>
                        <td><span className={`admin-status admin-status-${o.status}`}>{o.status}</span></td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">📦</div>No orders yet</div>}
              </div>

              <div className="admin-card-list">
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: "hsl(220 20% 12%)" }}>Recent Orders</div>
                {orders.slice(0, 8).map((o) => (
                  <div className="admin-card-item" key={o.id}>
                    <div className="admin-card-item-row">
                      <span className="admin-card-item-label">Product</span>
                      <span className="admin-card-item-value">{o.product_title}</span>
                    </div>
                    <div className="admin-card-item-row">
                      <span className="admin-card-item-label">User</span>
                      <span className="admin-card-item-value">{getUserName(o.user_id)}</span>
                    </div>
                    <div className="admin-card-item-row">
                      <span className="admin-card-item-label">Amount</span>
                      <span className="admin-card-item-value" style={{ fontWeight: 700 }}>₦{Number(o.total_price).toLocaleString()}</span>
                    </div>
                    <div className="admin-card-item-row">
                      <span className="admin-card-item-label">Status</span>
                      <span className={`admin-status admin-status-${o.status}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">📦</div>No orders yet</div>}
              </div>
            </>
          )}

          {/* ═══ USERS ═══ */}
          {tab === "users" && (
            <>
              {selectedUser ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <button className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => setSelectedUser(null)}>
                      ← Back to Users
                    </button>
                  </div>
                  <div className="admin-user-detail">
                    <div className="admin-user-detail-header">
                      <div className="admin-user-detail-info">
                        <div className="admin-user-avatar">
                          {(selectedUser.username || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="admin-user-detail-name">{selectedUser.username || "Unknown"}</div>
                          <div className="admin-user-detail-id">{selectedUser.user_id}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {isUserAdmin(selectedUser.user_id) && <span className="admin-status admin-status-active">Admin</span>}
                        {selectedUser.is_blocked && <span className="admin-status admin-status-blocked">Blocked</span>}
                      </div>
                    </div>
                    <div className="admin-user-detail-stats">
                      <div>
                        <div className="admin-stat-label">Wallet Balance</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "hsl(220 20% 12%)" }}>₦{getDisplayBalance(profiles.find(pr => pr.user_id === selectedUser.user_id) ?? selectedUser).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="admin-stat-label">Total Orders</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "hsl(220 20% 12%)" }}>{getUserOrders(selectedUser.user_id).length}</div>
                      </div>
                      <div>
                        <div className="admin-stat-label">Transactions</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "hsl(220 20% 12%)" }}>{getUserTransactions(selectedUser.user_id).length}</div>
                      </div>
                      <div>
                        <div className="admin-stat-label">Joined</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(220 20% 12%)", marginTop: 4 }}>{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="admin-user-detail-actions">
                      <button className="admin-btn admin-btn-success" onClick={() => { setWalletAction("credit"); setWalletAmount(""); }}>
                        💰 Credit Wallet
                      </button>
                      <button className="admin-btn admin-btn-danger" onClick={() => { setWalletAction("debit"); setWalletAmount(""); }}>
                        💸 Debit Wallet
                      </button>
                      <button
                        className={`admin-btn ${selectedUser.is_blocked ? "admin-btn-success" : "admin-btn-danger"}`}
                        onClick={() => toggleBlockUser(selectedUser.user_id)}
                      >
                        {selectedUser.is_blocked ? "✅ Unblock User" : "🚫 Block User"}
                      </button>
                    </div>
                  </div>

                  <div className="admin-table-wrap" style={{ marginBottom: 20 }}>
                    <div className="admin-table-header">
                      <div className="admin-table-title">Orders ({getUserOrders(selectedUser.user_id).length})</div>
                    </div>
                    <table className="admin-table">
                      <thead><tr><th>Product</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                      <tbody>
                        {getUserOrders(selectedUser.user_id).map((o) => (
                          <tr key={o.id}>
                            <td>{o.product_title}</td>
                            <td style={{ fontWeight: 700 }}>₦{Number(o.total_price).toLocaleString()}</td>
                            <td><span className={`admin-status admin-status-${o.status}`}>{o.status}</span></td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => updateOrderStatus(o.id, "completed")}>✓</button>
                                <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => updateOrderStatus(o.id, "cancelled")}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {getUserOrders(selectedUser.user_id).length === 0 && <div className="admin-empty" style={{ padding: 30 }}>No orders</div>}
                  </div>

                  <div className="admin-card-list" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Orders ({getUserOrders(selectedUser.user_id).length})</div>
                    {getUserOrders(selectedUser.user_id).map((o) => (
                      <div className="admin-card-item" key={o.id}>
                        <div className="admin-card-item-row"><span className="admin-card-item-label">Product</span><span className="admin-card-item-value">{o.product_title}</span></div>
                        <div className="admin-card-item-row"><span className="admin-card-item-label">Amount</span><span className="admin-card-item-value">₦{Number(o.total_price).toLocaleString()}</span></div>
                        <div className="admin-card-item-row"><span className="admin-card-item-label">Status</span><span className={`admin-status admin-status-${o.status}`}>{o.status}</span></div>
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                          <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => updateOrderStatus(o.id, "completed")}>✓ Complete</button>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => updateOrderStatus(o.id, "cancelled")}>✕ Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="admin-table-wrap">
                    <div className="admin-table-header">
                      <div className="admin-table-title">Transactions ({getUserTransactions(selectedUser.user_id).length})</div>
                    </div>
                    <table className="admin-table">
                      <thead><tr><th>Type</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead>
                      <tbody>
                        {getUserTransactions(selectedUser.user_id).map((t) => (
                          <tr key={t.id}>
                            <td><span className={`admin-status ${t.type === "credit" ? "admin-status-active" : "admin-status-blocked"}`}>{t.type}</span></td>
                            <td style={{ fontWeight: 700 }}>₦{Number(t.amount).toLocaleString()}</td>
                            <td>{t.description}</td>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {getUserTransactions(selectedUser.user_id).length === 0 && <div className="admin-empty" style={{ padding: 30 }}>No transactions</div>}
                  </div>

                  <div className="admin-card-list">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Transactions ({getUserTransactions(selectedUser.user_id).length})</div>
                    {getUserTransactions(selectedUser.user_id).map((t) => (
                      <div className="admin-card-item" key={t.id}>
                        <div className="admin-card-item-row"><span className="admin-card-item-label">Type</span><span className={`admin-status ${t.type === "credit" ? "admin-status-active" : "admin-status-blocked"}`}>{t.type}</span></div>
                        <div className="admin-card-item-row"><span className="admin-card-item-label">Amount</span><span className="admin-card-item-value">₦{Number(t.amount).toLocaleString()}</span></div>
                        <div className="admin-card-item-row"><span className="admin-card-item-label">Description</span><span className="admin-card-item-value">{t.description}</span></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-table-wrap">
                    <div className="admin-table-header">
                      <div className="admin-table-title">All Users ({usersTotal.toLocaleString()}){usersLoading && <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 500, color: "hsl(220 10% 50%)" }}>Loading…</span>}</div>
                    </div>
                    {usersLoading && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, color: "hsl(220 10% 50%)" }}>
                        <div style={{ width: 24, height: 24, border: "3px solid hsl(220 20% 90%)", borderTopColor: "hsl(var(--admin-accent))", borderRadius: "50%", animation: "admin-spin 0.8s linear infinite" }} />
                        <span>Loading users…</span>
                      </div>
                    )}
                    {!usersLoading && (
                    <table className="admin-table">
                      <thead><tr><th>Username</th><th>Email</th><th>Balance</th><th>Orders</th><th>Status</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
                      <tbody>
                        {paginatedProfiles.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.username || "—"}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.email || "—"}</td>
                            <td style={{ fontWeight: 700 }}>₦{getDisplayBalance(p).toLocaleString()}</td>
                            <td>{getUserOrders(p.user_id).length}</td>
                            <td>{p.is_blocked ? <span className="admin-status admin-status-blocked">Blocked</span> : <span className="admin-status admin-status-active">Active</span>}</td>
                            <td>{isUserAdmin(p.user_id) ? <span className="admin-status admin-status-active">Admin</span> : <span className="admin-status">User</span>}</td>
                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setSelectedUser(p)}>View</button>
                                <button className={`admin-btn admin-btn-sm ${p.is_blocked ? "admin-btn-success" : "admin-btn-danger"}`} onClick={() => toggleBlockUser(p.user_id)}>
                                  {p.is_blocked ? "Unblock" : "Block"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    )}
                    {!usersLoading && filteredProfiles.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">👥</div>No users found</div>}
                    {!usersLoading && filteredProfiles.length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13 }}>
                        <span>
                          Page {currentUsersPage.toLocaleString()} of {totalUserPages.toLocaleString()}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="admin-btn admin-btn-sm"
                            onClick={() => fetchProfilesPage(currentUsersPage - 1, search)}
                            disabled={currentUsersPage === 1}
                          >
                            ← Prev
                          </button>
                          <button
                            className="admin-btn admin-btn-sm"
                            onClick={() => fetchProfilesPage(currentUsersPage + 1, search)}
                            disabled={currentUsersPage === totalUserPages}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="admin-card-list">
                    {usersLoading ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, color: "hsl(220 10% 50%)" }}>
                        <div style={{ width: 24, height: 24, border: "3px solid hsl(220 20% 90%)", borderTopColor: "hsl(var(--admin-accent))", borderRadius: "50%", animation: "admin-spin 0.8s linear infinite" }} />
                        <span>Loading users…</span>
                      </div>
                    ) : (
                      <>
                        {paginatedProfiles.map((p) => (
                          <div className="admin-card-item" key={p.id} onClick={() => setSelectedUser(p)} style={{ cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                              <div className="admin-user-avatar" style={{ width: 38, height: 38, fontSize: 14, borderRadius: 10 }}>
                                {(p.username || "U")[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.username || "—"}</div>
                                <div style={{ fontSize: 11, color: "hsl(220 10% 50%)" }}>{p.email || "—"}</div>
                                <div style={{ fontSize: 11, color: "hsl(220 10% 60%)" }}>{new Date(p.created_at).toLocaleDateString()}</div>
                              </div>
                              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                                {p.is_blocked && <span className="admin-status admin-status-blocked">Blocked</span>}
                                {isUserAdmin(p.user_id) && <span className="admin-status admin-status-active">Admin</span>}
                              </div>
                            </div>
                            <div className="admin-card-item-row">
                              <span className="admin-card-item-label">Balance</span>
                              <span className="admin-card-item-value">₦{getDisplayBalance(p).toLocaleString()}</span>
                            </div>
                            <div className="admin-card-item-row">
                              <span className="admin-card-item-label">Orders</span>
                              <span className="admin-card-item-value">{getUserOrders(p.user_id).length}</span>
                            </div>
                          </div>
                        ))}
                        {filteredProfiles.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">👥</div>No users found</div>}
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══ ORDERS ═══ */}
          {tab === "orders" && (
            <>
              <div className="admin-table-wrap">
                <div className="admin-table-header">
                  <div className="admin-table-title">All Orders ({filteredOrders.length})</div>
                </div>
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>User</th><th>Product</th><th>Platform</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {paginatedOrders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id.slice(0, 6)}</td>
                        <td style={{ cursor: "pointer", color: "hsl(230 65% 55%)", fontWeight: 600 }} onClick={() => {
                          const user = profiles.find((p) => p.user_id === o.user_id);
                          if (user) { setSelectedUser(user); setTab("users"); }
                        }}>{getUserName(o.user_id)}</td>
                        <td>{o.product_title}</td>
                        <td>{o.product_platform}</td>
                        <td style={{ fontWeight: 700 }}>₦{Number(o.total_price).toLocaleString()}</td>
                        <td><span className={`admin-status admin-status-${o.status}`}>{o.status}</span></td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => updateOrderStatus(o.id, "completed")}>✓</button>
                            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => updateOrderStatus(o.id, "cancelled")}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">📦</div>No orders found</div>}
              </div>

              <div className="admin-card-list">
                {paginatedOrders.map((o) => (
                  <div className="admin-card-item" key={o.id}>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">ID</span><span className="admin-card-item-value">#{o.id.slice(0, 6)}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">User</span><span className="admin-card-item-value" style={{ color: "hsl(230 65% 55%)", cursor: "pointer" }} onClick={() => {
                      const user = profiles.find((p) => p.user_id === o.user_id);
                      if (user) { setSelectedUser(user); setTab("users"); }
                    }}>{getUserName(o.user_id)}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Product</span><span className="admin-card-item-value">{o.product_title}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Amount</span><span className="admin-card-item-value" style={{ fontWeight: 700 }}>₦{Number(o.total_price).toLocaleString()}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Status</span><span className={`admin-status admin-status-${o.status}`}>{o.status}</span></div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => updateOrderStatus(o.id, "completed")}>✓ Complete</button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => updateOrderStatus(o.id, "cancelled")}>✕ Cancel</button>
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">📦</div>No orders</div>}
              </div>

              {filteredOrders.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13 }}>
                  <span>
                    Page {currentOrdersPage.toLocaleString()} of {totalOrderPages.toLocaleString()}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      disabled={currentOrdersPage === 1}
                    >
                      ← Prev
                    </button>
                    <button
                      className="admin-btn admin-btn-sm"
                      onClick={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))}
                      disabled={currentOrdersPage === totalOrderPages}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {tab === "products" && (
            <>
              <div className="admin-table-wrap">
                <div className="admin-table-header">
                  <div className="admin-table-title">All Products ({filteredProducts.length})</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      className="admin-form-input"
                      style={{ flex: "1 1 200px", minWidth: 160, maxWidth: 320 }}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                    />
                    <button className="admin-btn" style={{ background: "hsl(220 20% 92%)" }} onClick={() => setShowBulkUploadModal(true)}>📤 Bulk Upload (CSV/TXT)</button>
                    <button className="admin-btn admin-btn-primary" onClick={() => {
                      setEditProduct(null);
                      setProductForm({ title: "", description: "", price: 0, stock: 0, platform: "", category_id: "", currency: "NGN", image_url: "", sample_link: "" });
                      setShowProductModal(true);
                    }}>+ Add Product</button>
                  </div>
                </div>
                <table className="admin-table">
                  <thead><tr><th>Image</th><th>Title</th><th>Platform</th><th>Price</th><th>Stock</th><th>Logs</th><th>Active</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {getProductImageNode(p)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.title}</td>
                        <td>{p.platform}</td>
                        <td>₦{Number(p.price).toLocaleString()}</td>
                        <td>{p.stock}</td>
                        <td><span style={{ color: "hsl(220 70% 50%)", fontWeight: 700 }}>{getUnsoldLogsCount(p.id)}</span></td>
                        <td>{p.is_active ? <span className="admin-status admin-status-active">Active</span> : <span className="admin-status admin-status-blocked">Inactive</span>}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button className={`admin-btn admin-btn-sm ${p.is_active ? "admin-btn-danger" : "admin-btn-success"}`} onClick={() => toggleProductActive(p)} title={p.is_active ? "Disable product" : "Enable product"}>
                              {p.is_active ? "Disable" : "Enable"}
                            </button>
                            <button className="admin-btn admin-btn-sm" style={{ background: "hsl(220 20% 93%)" }} onClick={() => {
                              setEditProduct(p);
                              setProductForm({ title: p.title, description: p.description, price: p.price, stock: p.stock, platform: p.platform, category_id: p.category_id, currency: p.currency, image_url: p.image_url || "", sample_link: p.sample_link || "" });
                              setShowProductModal(true);
                            }}>✏️</button>
                            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteProduct(p.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">🛍️</div>No products found</div>}
              </div>

              <div className="admin-card-list">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Products ({filteredProducts.length})</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <input
                      className="admin-form-input"
                      style={{ flex: "1 1 200px", minWidth: 160, maxWidth: 320 }}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                    />
                    <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => {
                      setEditProduct(null);
                      setProductForm({ title: "", description: "", price: 0, stock: 0, platform: "", category_id: "", currency: "NGN", image_url: "", sample_link: "" });
                      setShowProductModal(true);
                    }}>+ Add</button>
                  </div>
                </div>
                {filteredProducts.map((p) => (
                  <div className="admin-card-item" key={p.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      {getProductImageNode(p)}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</span>
                    </div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Platform</span><span className="admin-card-item-value">{p.platform}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Price</span><span className="admin-card-item-value">₦{Number(p.price).toLocaleString()}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Stock</span><span className="admin-card-item-value">{p.stock}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Available Logs</span><span className="admin-card-item-value" style={{ color: "hsl(220 70% 50%)", fontWeight: 700 }}>{getUnsoldLogsCount(p.id)}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Status</span>{p.is_active ? <span className="admin-status admin-status-active">Active</span> : <span className="admin-status admin-status-blocked">Inactive</span>}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      <button className={`admin-btn admin-btn-sm ${p.is_active ? "admin-btn-danger" : "admin-btn-success"}`} onClick={() => toggleProductActive(p)}>
                        {p.is_active ? "Disable" : "Enable"}
                      </button>
                      <button className="admin-btn admin-btn-sm" style={{ background: "hsl(220 20% 93%)" }} onClick={() => {
                        setEditProduct(p);
                        setProductForm({ title: p.title, description: p.description, price: p.price, stock: p.stock, platform: p.platform, category_id: p.category_id, currency: p.currency, image_url: p.image_url || "", sample_link: p.sample_link || "" });
                        setShowProductModal(true);
                      }}>✏️ Edit</button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteProduct(p.id)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ ACCOUNT LOGS ═══ */}
          {tab === "logs" && (
            <>
              <div className="admin-table-wrap">
                <div className="admin-table-header" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div className="admin-table-title">
                    Account Logs ({sortedLogs.length.toLocaleString()}
                    {logStats.total > sortedLogs.length && ` of ${logStats.total.toLocaleString()}`}
                    {logStats.unsold > 0 && ` · ${logStats.unsold.toLocaleString()} unsold`})
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {selectedLogIds.length > 0 && (
                      <button type="button" className="admin-btn admin-btn-danger" onClick={deleteSelectedLogs}>
                        Delete selected ({selectedLogIds.length})
                      </button>
                    )}
                    <button type="button" className="admin-btn" style={{ background: "hsl(220 20% 93%)" }} onClick={() => setSelectedLogIds([])} disabled={selectedLogIds.length === 0}>
                      Clear selection
                    </button>
                    <button className="admin-btn admin-btn-primary" onClick={() => {
                      setLogForm({ product_id: "", login: "", password: "", description: "" });
                      setShowLogModal(true);
                    }}>+ Add Log</button>
                  </div>
                </div>
                {sortedLogs.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "hsl(var(--admin-muted))" }}>
                      Grouped by product title · Page {currentLogsPage} of {totalLogPages}
                    </span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" className="admin-btn admin-btn-sm" disabled={currentLogsPage === 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))}>← Prev</button>
                      <button type="button" className="admin-btn admin-btn-sm" disabled={currentLogsPage === totalLogPages} onClick={() => setLogsPage((p) => Math.min(totalLogPages, p + 1))}>Next →</button>
                    </div>
                  </div>
                )}
                <table className="admin-table admin-table-logs">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          title="Select all on this page"
                          checked={allPaginatedSelected}
                          onChange={toggleSelectAllPaginated}
                          disabled={paginatedLogIds.length === 0}
                        />
                      </th>
                      <th>Product</th>
                      <th>Log</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((l, idx) => {
                      const showGroup = idx === 0 || paginatedLogs[idx - 1].product_id !== l.product_id;
                      const groupLogs = paginatedLogs.filter((x) => x.product_id === l.product_id);
                      const groupIds = groupLogs.map((x) => x.id);
                      const groupAllSelected = groupIds.length > 0 && groupIds.every((id) => selectedLogIds.includes(id));
                      return (
                        <Fragment key={l.id}>
                          {showGroup && (
                            <tr className="admin-log-group-row">
                              <td style={{ verticalAlign: "middle" }}>
                                <input
                                  type="checkbox"
                                  title="Select this product’s logs on this page"
                                  checked={groupAllSelected}
                                  onChange={() => toggleSelectGroupOnPage(l.product_id)}
                                />
                              </td>
                              <td colSpan={5} className="admin-log-group-cell">
                                <span className="admin-log-group-title">{getProductTitle(l.product_id)}</span>
                                <span className="admin-log-group-meta">{groupLogs.length} on this page</span>
                              </td>
                            </tr>
                          )}
                          <tr key={l.id}>
                            <td>
                              <input type="checkbox" checked={selectedLogIds.includes(l.id)} onChange={() => toggleLogSelect(l.id)} />
                            </td>
                            <td style={{ color: "hsl(var(--admin-muted))", fontSize: 13 }}>—</td>
                            <td style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", maxWidth: 400 }}>{l.login}</td>
                            <td>{l.is_sold ? <span className="admin-status admin-status-blocked">Sold</span> : <span className="admin-status admin-status-active">Available</span>}</td>
                            <td>{new Date(l.created_at).toLocaleDateString()}</td>
                            <td>
                              <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteLog(l.id)}>🗑️</button>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {sortedLogs.length === 0 && (
                  <div className="admin-empty">
                    <div className="admin-empty-icon">🔑</div>
                    {accountLogs.length === 0 && !search.trim()
                      ? "No account logs yet"
                      : "No account logs match your search"}
                    <br />
                    <button className="admin-btn admin-btn-primary" style={{ marginTop: 12 }} onClick={() => setShowLogModal(true)}>Add Log</button>
                  </div>
                )}
              </div>

              <div className="admin-card-list admin-card-list-logs">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>By product (this page)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedLogIds.length > 0 && (
                      <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={deleteSelectedLogs}>Delete ({selectedLogIds.length})</button>
                    )}
                    <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => {
                      setLogForm({ product_id: "", login: "", password: "", description: "" });
                      setShowLogModal(true);
                    }}>+ Add</button>
                  </div>
                </div>
                {sortedLogs.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: "hsl(var(--admin-muted))" }}>Page {currentLogsPage} / {totalLogPages}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" className="admin-btn admin-btn-sm" disabled={currentLogsPage === 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))}>← Prev</button>
                      <button type="button" className="admin-btn admin-btn-sm" disabled={currentLogsPage === totalLogPages} onClick={() => setLogsPage((p) => Math.min(totalLogPages, p + 1))}>Next →</button>
                    </div>
                  </div>
                )}
                {logGroupsOnPage.map(([productId, logs]) => {
                  const gIds = logs.map((x) => x.id);
                  const gAll = gIds.length > 0 && gIds.every((id) => selectedLogIds.includes(id));
                  return (
                    <div className="admin-log-card-group" key={productId}>
                      <div className="admin-log-card-group-header">
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }}>
                          <input type="checkbox" checked={gAll} onChange={() => toggleSelectGroupOnPage(productId)} />
                          <span style={{ fontWeight: 700 }}>{getProductTitle(productId)}</span>
                          <span style={{ fontSize: 12, color: "hsl(var(--admin-muted))" }}>({logs.length})</span>
                        </label>
                      </div>
                      {logs.map((l) => (
                        <div className="admin-card-item" key={l.id}>
                          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, cursor: "pointer" }}>
                            <input type="checkbox" checked={selectedLogIds.includes(l.id)} onChange={() => toggleLogSelect(l.id)} style={{ marginTop: 4 }} />
                            <span style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", flex: 1 }}>{l.login}</span>
                          </label>
                          <div className="admin-card-item-row"><span className="admin-card-item-label">Status</span>{l.is_sold ? <span className="admin-status admin-status-blocked">Sold</span> : <span className="admin-status admin-status-active">Available</span>}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                            <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteLog(l.id)}>🗑️ Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {sortedLogs.length === 0 && (
                  <div className="admin-empty" style={{ padding: 24 }}>
                    {accountLogs.length === 0 && !search.trim() ? "No logs yet." : "No logs match your search."}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ CATEGORIES ═══ */}
          {tab === "categories" && (
            <>
              <div className="admin-table-wrap">
                <div className="admin-table-header">
                  <div className="admin-table-title">Categories ({categories.length})</div>
                  <button className="admin-btn admin-btn-primary" onClick={() => {
                    setEditCategory(null);
                    setCategoryForm({ name: "", slug: "", emoji: "", display_order: 0, image_url: "" });
                    setShowCategoryModal(true);
                  }}>+ Add Category</button>
                </div>
                <table className="admin-table">
                  <thead><tr><th>Emoji</th><th>Name</th><th>Slug</th><th>Order</th><th>Actions</th></tr></thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontSize: 20 }}>{c.emoji || "—"}</td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.slug}</td>
                        <td>{c.display_order}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="admin-btn admin-btn-sm" style={{ background: "hsl(220 20% 93%)" }} onClick={() => {
                              setEditCategory(c);
                              setCategoryForm({ name: c.name, slug: c.slug, emoji: c.emoji || "", display_order: c.display_order, image_url: c.image_url || "" });
                              setShowCategoryModal(true);
                            }}>✏️</button>
                            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteCategory(c.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {categories.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">📁</div>No categories yet</div>}
              </div>

              <div className="admin-card-list">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Categories ({categories.length})</div>
                  <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => {
                    setEditCategory(null);
                    setCategoryForm({ name: "", slug: "", emoji: "", display_order: 0, image_url: "" });
                    setShowCategoryModal(true);
                  }}>+ Add</button>
                </div>
                {categories.map((c) => (
                  <div className="admin-card-item" key={c.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{c.emoji || "📁"}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                    </div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Slug</span><span className="admin-card-item-value" style={{ fontFamily: "monospace", fontSize: 12 }}>{c.slug}</span></div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button className="admin-btn admin-btn-sm" style={{ background: "hsl(220 20% 93%)" }} onClick={() => {
                        setEditCategory(c);
                        setCategoryForm({ name: c.name, slug: c.slug, emoji: c.emoji || "", display_order: c.display_order, image_url: c.image_url || "" });
                        setShowCategoryModal(true);
                      }}>✏️ Edit</button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteCategory(c.id)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ TRANSACTIONS ═══ */}
          {tab === "transactions" && (
            <>
              <div className="admin-table-wrap">
                <div className="admin-table-header">
                  <div className="admin-table-title">All Transactions ({filteredTransactions.length})</div>
                </div>
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Type</th><th>Amount</th><th>Description</th><th>Reference</th><th>Date</th></tr></thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ cursor: "pointer", color: "hsl(230 65% 55%)", fontWeight: 600 }} onClick={() => {
                          const user = profiles.find((p) => p.user_id === t.user_id);
                          if (user) { setSelectedUser(user); setTab("users"); }
                        }}>{getUserName(t.user_id)}</td>
                        <td><span className={`admin-status ${t.type === "credit" ? "admin-status-active" : "admin-status-blocked"}`}>{t.type}</span></td>
                        <td style={{ fontWeight: 700 }}>₦{Number(t.amount).toLocaleString()}</td>
                        <td>{t.description}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>{t.reference || "—"}</td>
                        <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">💰</div>No transactions</div>}
              </div>

              <div className="admin-card-list">
                {filteredTransactions.map((t) => (
                  <div className="admin-card-item" key={t.id}>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">User</span><span className="admin-card-item-value" style={{ color: "hsl(230 65% 55%)", cursor: "pointer" }} onClick={() => {
                      const user = profiles.find((p) => p.user_id === t.user_id);
                      if (user) { setSelectedUser(user); setTab("users"); }
                    }}>{getUserName(t.user_id)}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Type</span><span className={`admin-status ${t.type === "credit" ? "admin-status-active" : "admin-status-blocked"}`}>{t.type}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Amount</span><span className="admin-card-item-value" style={{ fontWeight: 700 }}>₦{Number(t.amount).toLocaleString()}</span></div>
                    <div className="admin-card-item-row"><span className="admin-card-item-label">Description</span><span className="admin-card-item-value">{t.description}</span></div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && <div className="admin-empty"><div className="admin-empty-icon">💰</div>No transactions</div>}
              </div>
            </>
          )}

          {/* ═══ ADMINS ═══ */}
          {tab === "admins" && (
            <>
              <div className="admin-table-wrap">
                <div className="admin-table-header">
                  <div className="admin-table-title">Admin Users ({roles.filter((r) => r.role === "admin").length})</div>
                  <button className="admin-btn admin-btn-primary" onClick={() => setShowAdminModal(true)}>+ Add Admin</button>
                </div>
                <table className="admin-table">
                  <thead><tr><th>Username</th><th>User ID</th><th>Role</th><th>Added</th><th>Actions</th></tr></thead>
                  <tbody>
                    {roles.filter((r) => r.role === "admin").map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{getUserName(r.user_id)}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.user_id.slice(0, 12)}...</td>
                        <td><span className="admin-status admin-status-active">{r.role}</span></td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => removeAdmin(r.id)}>🗑️ Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-card-list">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Admins ({roles.filter((r) => r.role === "admin").length})</div>
                  <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setShowAdminModal(true)}>+ Add</button>
                </div>
                {roles.filter((r) => r.role === "admin").map((r) => (
                  <div className="admin-card-item" key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div className="admin-user-avatar" style={{ width: 36, height: 36, fontSize: 13, borderRadius: 10 }}>
                        {getUserName(r.user_id)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{getUserName(r.user_id)}</div>
                        <div style={{ fontSize: 11, color: "hsl(220 10% 50%)" }}>{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => removeAdmin(r.id)}>🗑️ Remove Admin</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* MESSAGES */}
          {tab === "messages" && (
            <div className="admin-messages-wrap">
              <h2 className="admin-section-title">💬 User Messages</h2>
              <div className="admin-messages-layout">
                <aside className={`admin-messages-sidebar ${selectedChatUser ? "admin-messages-sidebar--collapsed" : ""}`}>
                  <div className="admin-messages-sidebar-title">Conversations</div>
                  {getChatUsers().length === 0 ? (
                    <div className="admin-messages-empty-list">No conversations yet</div>
                  ) : (
                    <ul className="admin-messages-conv-list">
                      {getChatUsers().map(uid => {
                        const unread = allMessages.filter(m => m.sender_id === uid && !m.is_read).length;
                        return (
                          <li key={uid}>
                            <button
                              type="button"
                              className={`admin-messages-conv-btn ${selectedChatUser === uid ? "active" : ""}`}
                              onClick={() => setSelectedChatUser(uid)}
                            >
                              <span className="admin-messages-conv-avatar">{getMessageUserDisplay(uid).slice(0, 1).toUpperCase()}</span>
                              <span className="admin-messages-conv-name">{getMessageUserDisplay(uid)}</span>
                              {unread > 0 && <span className="admin-messages-conv-badge">{unread}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </aside>

                <div className="admin-messages-main">
                  {!selectedChatUser ? (
                    <div className="admin-messages-welcome">
                      <div className="admin-messages-welcome-icon"><i className="fa-regular fa-comments" /></div>
                      <p className="admin-messages-welcome-title">Select a conversation</p>
                      <p className="admin-messages-welcome-desc">Choose a user from the list to view and reply to messages</p>
                    </div>
                  ) : (
                    <>
                      <header className="admin-messages-header">
                        <button type="button" className="admin-messages-back" onClick={() => setSelectedChatUser(null)} aria-label="Back">
                          <i className="fa-solid fa-arrow-left" />
                        </button>
                        <div className="admin-messages-header-avatar">{getMessageUserDisplay(selectedChatUser).slice(0, 1).toUpperCase()}</div>
                        <div className="admin-messages-header-info">
                          <span className="admin-messages-header-name">{getMessageUserDisplay(selectedChatUser)}</span>
                          <span className="admin-messages-header-status">User conversation</span>
                        </div>
                      </header>

                      <div className="admin-messages-list">
                        {getChatMessages(selectedChatUser).map(msg => (
                          <div
                            key={msg.id}
                            className={`admin-messages-bubble ${msg.sender_id === adminUserId ? "admin-messages-bubble--sent" : "admin-messages-bubble--received"}`}
                          >
                            {msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="admin-messages-bubble-img-wrap">
                                <img src={msg.attachment_url} alt="Attachment" className="admin-messages-bubble-img" />
                              </a>
                            )}
                            {msg.content && <div className="admin-messages-bubble-text">{msg.content}</div>}
                            <div className="admin-messages-bubble-meta">
                              {new Date(msg.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="admin-messages-composer">
                        {adminPendingAttachmentUrl && (
                          <div className="admin-messages-attach-preview">
                            <img src={adminPendingAttachmentUrl} alt="Attach" />
                            <button type="button" className="admin-messages-attach-remove" onClick={() => setAdminPendingAttachmentUrl(null)} aria-label="Remove image">
                              <i className="fa-solid fa-times" />
                            </button>
                          </div>
                        )}
                        <div className="admin-messages-composer-row">
                          <input
                            ref={adminMessageFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="admin-messages-file-input"
                            onChange={handleAdminAttachmentChange}
                            aria-label="Upload image"
                          />
                          <button
                            type="button"
                            className="admin-messages-composer-btn admin-messages-composer-btn--attach"
                            onClick={() => adminMessageFileInputRef.current?.click()}
                            disabled={adminAttachmentUploading}
                            title="Attach image"
                          >
                            {adminAttachmentUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-image" />}
                          </button>
                          <input
                            type="text"
                            className="admin-messages-composer-input"
                            placeholder="Type a reply..."
                            value={adminMsgInput}
                            onChange={(e) => setAdminMsgInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendAdminMessage(); } }}
                          />
                          <button
                            type="button"
                            className="admin-messages-composer-btn admin-messages-composer-btn--send"
                            onClick={sendAdminMessage}
                            disabled={(!adminMsgInput.trim() && !adminPendingAttachmentUrl) || adminAttachmentUploading}
                          >
                            <i className="fa-solid fa-paper-plane" />
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BROADCASTS */}
          {tab === "broadcasts" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 className="admin-section-title">📢 Broadcast Messages</h2>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setEditBroadcast(null);
                    setBroadcastForm({ title: "", body: "", is_active: true });
                    setShowBroadcastModal(true);
                  }}
                >
                  + New broadcast
                </button>
              </div>
              <p style={{ fontSize: 13, color: "hsl(220 10% 50%)", marginBottom: 16 }}>
                Broadcasts pop up for users when they log in. Active messages are shown; users can dismiss them (per device).
              </p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {broadcasts.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "hsl(220 10% 55%)" }}>
                          No broadcast messages yet. Create one to show a popup to users on login.
                        </td>
                      </tr>
                    ) : (
                      broadcasts.map((b) => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.title}</td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: b.is_active ? "hsl(145 50% 92%)" : "hsl(220 15% 92%)",
                              color: b.is_active ? "hsl(145 50% 30%)" : "hsl(220 10% 50%)",
                            }}>
                              {b.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "hsl(220 10% 50%)" }}>{new Date(b.created_at).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="admin-btn admin-btn-sm"
                              style={{ marginRight: 6 }}
                              onClick={() => {
                                setEditBroadcast(b);
                                setBroadcastForm({ title: b.title, body: b.body, is_active: b.is_active });
                                setShowBroadcastModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-sm"
                              style={{ background: "hsl(0 70% 96%)", color: "hsl(0 60% 40%)" }}
                              onClick={() => deleteBroadcast(b.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Broadcast create/edit modal */}
              {showBroadcastModal && (
                <div className="admin-modal-overlay" onClick={() => { setShowBroadcastModal(false); setEditBroadcast(null); }}>
                  <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                    <h3 style={{ marginBottom: 16 }}>{editBroadcast ? "Edit broadcast" : "New broadcast"}</h3>
                    <div style={{ marginBottom: 12 }}>
                      <label className="admin-form-label">Title</label>
                      <input
                        className="admin-form-input"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Service maintenance"
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label className="admin-form-label">Message body</label>
                      <textarea
                        className="admin-form-input"
                        rows={4}
                        value={broadcastForm.body}
                        onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))}
                        placeholder="Message shown in the popup..."
                      />
                    </div>
                    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        id="broadcast-active"
                        checked={broadcastForm.is_active}
                        onChange={(e) => setBroadcastForm((f) => ({ ...f, is_active: e.target.checked }))}
                      />
                      <label htmlFor="broadcast-active" style={{ fontSize: 13 }}>Active (show to users on login)</label>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="admin-btn" onClick={() => { setShowBroadcastModal(false); setEditBroadcast(null); }}>Cancel</button>
                      <button className="admin-btn admin-btn-primary" onClick={saveBroadcast}>Save</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid hsl(210 20% 92%)', padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Site & Support Settings</h2>

              <div style={{ maxWidth: 600 }}>
                {[
                  { key: 'site_name', label: 'Site name', placeholder: 'e.g. Ace Log Store' },
                  { key: 'site_logo', label: 'Logo URL', placeholder: 'https://...' },
                  { key: 'telegram_group', label: 'Telegram group link', placeholder: 'Enter telegram group URL' },
                  { key: 'telegram_support', label: 'Telegram support link', placeholder: 'Enter telegram support URL' },
                  { key: 'whatsapp_channel', label: 'WhatsApp channel link', placeholder: 'Enter whatsapp channel URL' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="admin-form-group" style={{ marginBottom: 24 }}>
                    <label className="admin-form-label">{label}</label>
                    <div className="admin-form-group-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <input
                        className="admin-form-input"
                        style={{ flex: 1, minWidth: 0 }}
                        value={siteSettings.find(s => s.key === key)?.value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSiteSettings(prev => {
                            const exists = prev.find(s => s.key === key);
                            if (exists) return prev.map(s => s.key === key ? { ...s, value: val } : s);
                            return [...prev, { key, value: val }];
                          });
                        }}
                        placeholder={placeholder}
                      />
                    </div>
                  </div>
                ))}
                <div className="admin-form-actions" style={{ marginTop: 8 }}>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={async () => {
                      try {
                        await api("/admin/site-settings", {
                          method: "PUT",
                          body: JSON.stringify({ settings: siteSettings }),
                        });
                        toast.success("Settings saved!");
                      } catch {
                        toast.error("Failed to save settings");
                      }
                    }}
                  >
                    Save all settings
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
