import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, ArrowRight, Shield, Zap, Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import "../styles/auth.css";

type AuthView = "login" | "signup" | "forgot";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const [siteName, setSiteName] = useState("Ace Log Store");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<AuthView>("signup");
  const [signupStep, setSignupStep] = useState(1);
  const [forgotStep, setForgotStep] = useState<"A" | "D">("A");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginEmailErr, setLoginEmailErr] = useState(false);
  const [loginPwErr, setLoginPwErr] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [suFname, setSuFname] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suEmailErr, setSuEmailErr] = useState(false);
  const [suPw, setSuPw] = useState("");
  const [suPwErr, setSuPwErr] = useState(false);
  const [suConfirmPw, setSuConfirmPw] = useState("");
  const [suConfirmPwErr, setSuConfirmPwErr] = useState(false);
  const [showSuPw, setShowSuPw] = useState(false);
  const [showSuConfirmPw, setShowSuConfirmPw] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);
  const [showPwStrength, setShowPwStrength] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailErr, setForgotEmailErr] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });
  const toastTimer = useRef<number>();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api<Record<string, string>>("/site-settings").then((ss) => {
      if (ss?.site_name) setSiteName(ss.site_name);
      if (ss?.site_logo) setSiteLogo(ss.site_logo);
    }).catch(() => {});
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast({ show: false, msg: "" }), 3200);
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const checkStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const showPage = (page: AuthView) => {
    setCurrentPage(page);
    if (page === "signup") setSignupStep(1);
    if (page === "forgot") setForgotStep("A");
  };

  const handleLogin = async () => {
    let valid = true;
    if (!validateEmail(loginEmail)) { setLoginEmailErr(true); valid = false; }
    if (loginPassword.length < 6) { setLoginPwErr(true); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      const data = await api<{ user: { id: string; email: string; name: string }; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        token: null,
      });
      setSession(data.user, data.token);
      showToast("✅ Welcome back! Redirecting...");
    } catch (e: unknown) {
      showToast(`❌ ${(e as { message?: string }).message || "Login failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    if (!suFname.trim()) { showToast("Please enter a username"); return; }
    if (!validateEmail(suEmail)) { setSuEmailErr(true); return; }
    if (suPw.length < 6) { setSuPwErr(true); return; }
    if (suPw !== suConfirmPw) { setSuConfirmPwErr(true); showToast("❌ Passwords do not match"); return; }
    if (!termsChecked) { showToast("Please accept the terms to continue"); return; }

    setLoading(true);
    try {
      const data = await api<{ user: { id: string; email: string; name: string }; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: suFname,
          email: suEmail,
          password: suPw,
          password_confirmation: suConfirmPw,
        }),
        token: null,
      });
      setSession(data.user, data.token);
      showToast("✅ Account created! Redirecting...");
    } catch (e: unknown) {
      showToast(`❌ ${(e as { message?: string }).message || "Sign up failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const sendResetLink = async () => {
    if (!validateEmail(forgotEmail)) { setForgotEmailErr(true); return; }

    setLoading(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
        token: null,
      });
      setForgotStep("D");
      showToast("✅ If an account exists, we sent a reset link to your email.");
    } catch {
      setForgotStep("D");
      showToast("✅ If an account exists, we sent a reset link to your email.");
    } finally {
      setLoading(false);
    }
  };

  const strengthLevels = ["", "weak", "fair", "good", "strong"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const BackButton = ({ onClick, label = "Back" }: { onClick: () => void; label?: string }) => (
    <button className="auth-back-btn" onClick={onClick}>
      <ArrowLeft size={16} />
      {label}
    </button>
  );

  const PasswordStrengthBars = ({ score }: { score: number }) => (
    <div className="pw-strength show">
      <div className="pw-bars">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pw-bar${i < score ? ` ${strengthLevels[score]}` : ""}`} />
        ))}
      </div>
      <div className="pw-label">{score ? `${strengthLabels[score]} password` : ""}</div>
    </div>
  );

  return (
    <div className="auth-wrapper">
      <div className={`auth-toast${toast.show ? " show" : ""}`}>
        <Zap size={16} className="toast-icon" />
        <span>{toast.msg}</span>
      </div>

      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
          <div className="auth-left-inner">
            <Link to="/" className="auth-logo">
              {siteLogo && <img src={siteLogo} alt="" className="auth-logo-img" />}
              {!siteLogo && <div className="auth-logo-dot" />}
              {siteName.split(" ").length > 1 ? (
                <><span>{siteName.split(" ")[0]} </span><strong>{siteName.split(" ").slice(1).join(" ")}</strong></>
              ) : (
                <span>{siteName}</span>
              )}
            </Link>

            <div className="auth-left-content">
              <div className="auth-badge">
                <Shield size={12} />
                Trusted Platform
              </div>
              <h1 className="auth-headline">
                Premium accounts.<br />
                <span className="auth-headline-accent">Instant access.</span>
              </h1>
              <p className="auth-description">
                Sign in or create an account to browse verified accounts, checkout securely, and get credentials in minutes.
              </p>
            </div>

            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature-icon"><Zap size={18} /></div>
                <div>
                  <div className="auth-feature-title">Instant Delivery</div>
                  <div className="auth-feature-desc">Get your accounts within seconds</div>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><Shield size={18} /></div>
                <div>
                  <div className="auth-feature-title">Fully Verified</div>
                  <div className="auth-feature-desc">Every account is quality checked</div>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><Star size={18} /></div>
                <div>
                  <div className="auth-feature-title">24/7 Support</div>
                  <div className="auth-feature-desc">We're here whenever you need us</div>
                </div>
              </div>
            </div>

            <div className="auth-stats">
              <div className="auth-stat">
                <div className="auth-stat-num">10K+</div>
                <div className="auth-stat-label">Accounts Sold</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-num">98%</div>
                <div className="auth-stat-label">Satisfaction</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-num">4.9★</div>
                <div className="auth-stat-label">Rating</div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-theme-wrap">
            <ThemeToggle size="sm" />
          </div>
          <div className="auth-card">
            {/* LOGIN */}
            <div className={`auth-view${currentPage === "login" ? " active" : ""}`}>
              <div className="auth-form-header">
                <h2 className="auth-form-title">Welcome back</h2>
                <p className="auth-form-sub">
                  Don't have an account?{" "}
                  <a onClick={() => showPage("signup")}>Sign up</a>
                </p>
              </div>


              <div className="auth-field">
                <label>Email</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    className={loginEmailErr ? "error" : ""}
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginEmailErr(false); }}
                    placeholder="name@example.com"
                  />
                </div>
                {loginEmailErr && <span className="auth-field-error">Please enter a valid email</span>}
              </div>

              <div className="auth-field">
                <div className="auth-field-header">
                  <label>Password</label>
                  <button className="auth-forgot-link" onClick={() => showPage("forgot")}>Forgot?</button>
                </div>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showLoginPw ? "text" : "password"}
                    className={loginPwErr ? "error" : ""}
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginPwErr(false); }}
                    placeholder="Enter your password"
                  />
                  <button className="auth-eye" onClick={() => setShowLoginPw(!showLoginPw)}>
                    {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginPwErr && <span className="auth-field-error">Password must be at least 6 characters</span>}
              </div>

              <label className="auth-checkbox">
                <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="auth-checkmark" />
                Remember me for 30 days
              </label>

              <button className={`auth-submit${loading ? " loading" : ""}`} onClick={handleLogin} disabled={loading}>
                <span className="auth-submit-text">Sign In</span>
                <ArrowRight size={16} className="auth-submit-arrow" />
              </button>
            </div>

            {/* SIGNUP */}
            <div className={`auth-view${currentPage === "signup" ? " active" : ""}`}>

              {signupStep === 1 && (
                <div>
                  <div className="auth-form-header">
                    <h2 className="auth-form-title">Create account</h2>
                    <p className="auth-form-sub">
                      Already have an account?{" "}
                      <a onClick={() => showPage("login")}>Sign in</a>
                    </p>
                  </div>



                  <div className="auth-field">
                    <label>Username</label>
                    <div className="auth-input-wrap">
                      <User size={16} className="auth-input-icon" />
                      <input type="text" value={suFname} onChange={(e) => setSuFname(e.target.value)} placeholder="johndoe" />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label>Email</label>
                    <div className="auth-input-wrap">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        className={suEmailErr ? "error" : ""}
                        value={suEmail}
                        onChange={(e) => { setSuEmail(e.target.value); setSuEmailErr(false); }}
                        placeholder="name@example.com"
                      />
                    </div>
                    {suEmailErr && <span className="auth-field-error">Please enter a valid email</span>}
                  </div>

                  <div className="auth-field">
                    <label>Password</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showSuPw ? "text" : "password"}
                        value={suPw}
                        onChange={(e) => {
                          setSuPw(e.target.value);
                          setPwStrength(checkStrength(e.target.value));
                          setShowPwStrength(true);
                          setSuPwErr(false);
                        }}
                        placeholder="Min. 6 characters"
                      />
                      <button className="auth-eye" onClick={() => setShowSuPw(!showSuPw)}>
                        {showSuPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {showPwStrength && <PasswordStrengthBars score={pwStrength} />}
                  </div>

                  <div className="auth-field">
                    <label>Confirm Password</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showSuConfirmPw ? "text" : "password"}
                        className={suConfirmPwErr ? "error" : ""}
                        value={suConfirmPw}
                        onChange={(e) => { setSuConfirmPw(e.target.value); setSuConfirmPwErr(false); }}
                        placeholder="Re-enter your password"
                      />
                      <button className="auth-eye" onClick={() => setShowSuConfirmPw(!showSuConfirmPw)}>
                        {showSuConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {suConfirmPwErr && <span className="auth-field-error">Passwords do not match</span>}
                  </div>

                  <label className="auth-checkbox">
                    <input type="checkbox" checked={termsChecked} onChange={() => setTermsChecked(!termsChecked)} />
                    <span className="auth-checkmark" />
                    I agree to the <a>Terms</a> and <a>Privacy Policy</a>
                  </label>

                  <button className={`auth-submit${loading ? " loading" : ""}`} onClick={handleSignupSubmit} disabled={loading}>
                    <span className="auth-submit-text">Create Account</span>
                    <ArrowRight size={16} className="auth-submit-arrow" />
                  </button>
                </div>
              )}
            </div>

            {/* FORGOT */}
            <div className={`auth-view${currentPage === "forgot" ? " active" : ""}`}>
              {forgotStep === "A" && (
                <div>
                  <BackButton onClick={() => showPage("login")} />
                  <div className="auth-form-header">
                    <h2 className="auth-form-title">Reset password</h2>
                    <p className="auth-form-sub">Enter your email and we'll send a reset link</p>
                  </div>

                  <div className="auth-field">
                    <label>Email</label>
                    <div className="auth-input-wrap">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        className={forgotEmailErr ? "error" : ""}
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setForgotEmailErr(false); }}
                        placeholder="name@example.com"
                      />
                    </div>
                    {forgotEmailErr && <span className="auth-field-error">Please enter a valid email</span>}
                  </div>

                  <button className={`auth-submit${loading ? " loading" : ""}`} onClick={sendResetLink} disabled={loading}>
                    <span className="auth-submit-text">Send reset link</span>
                    <ArrowRight size={16} className="auth-submit-arrow" />
                  </button>
                </div>
              )}

              {forgotStep === "D" && (
                <div className="auth-success-view">
                  <div className="auth-success-icon" style={{ background: 'hsl(140 80% 55% / 0.1)', color: 'hsl(140 80% 55%)' }}>
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="auth-form-title">Check your email</h2>
                  <p className="auth-form-sub">
                    If an account exists for that email, we sent a password reset link. Use it to set a new password.
                  </p>
                  <Link to="/reset-password" className="auth-form-sub" style={{ display: 'block', marginBottom: 16 }}>Or open reset page</Link>
                  <button className="auth-submit" onClick={() => showPage("login")}>
                    <span className="auth-submit-text">Back to Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
