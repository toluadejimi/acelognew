import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import "../styles/landing.css";

const LandingPage = () => {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [siteName, setSiteName] = useState("Ace Log Store");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    api<Record<string, string>>("/site-settings").then((ss) => {
      if (ss?.site_name) setSiteName(ss.site_name);
      if (ss?.site_logo) setSiteLogo(ss.site_logo);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = () => { if (window.innerWidth > 860 && mobileNavOpen) setMobileNavOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [mobileNavOpen]);

  const closeNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleFaq = (idx: number) => setOpenFaq(openFaq === idx ? -1 : idx);

  const faqItems = [
    { q: "Are these accounts legitimate and safe to use?", a: "Yes. Every account is vetted for authenticity, real followers, and genuine engagement. Safe to use on their platforms." },
    { q: "How long does the account transfer take?", a: "Most transfers happen within minutes. You receive credentials via secure delivery. Automated system for fast access." },
    { q: "What if I'm not satisfied with my purchase?", a: "Replacement or full refund within 48 hours — no questions asked. We stand behind every account." },
    { q: "What payment methods do you accept?", a: "We accept cards and secure online payment. All transactions are encrypted." },
    { q: "Can I verify account stats before buying?", a: "Yes. Listings include detailed analytics. What you see is what you get — full transparency." },
  ];

  const tickerItems = ["INSTANT DELIVERY", "VERIFIED ACCOUNTS", "REAL FOLLOWERS", "SECURE PAYMENT", "24/7 SUPPORT", "MONEY BACK GUARANTEE"];

  return (
    <div className="landing-page">
      <nav className={`landing-nav${navScrolled ? " scrolled" : ""}`}>
        <Link to="/" className="nav-logo">
          {siteLogo && <img src={siteLogo} alt="" className="nav-logo-img" />}
          {siteName.split(" ").length > 1 ? <>{siteName.split(" ")[0]}<span> {siteName.split(" ").slice(1).join(" ")}</span></> : siteName}
        </Link>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#testimonials">Reviews</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="nav-right-wrap">
          <ThemeToggle size="sm" />
          <Link to="/auth" className="nav-cta nav-cta-desktop">Sign In</Link>
        </div>
        <button className={`nav-hamburger${mobileNavOpen ? " open" : ""}`} onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </nav>

      <div className={`nav-drawer${mobileNavOpen ? " open" : ""}`} style={{ display: mobileNavOpen ? "flex" : "none" }}>
        <a href="#about" onClick={closeNav}>About</a>
        <a href="#features" onClick={closeNav}>Features</a>
        <a href="#how" onClick={closeNav}>How it works</a>
        <a href="#testimonials" onClick={closeNav}>Reviews</a>
        <a href="#faq" onClick={closeNav}>FAQ</a>
        <Link to="/auth" className="drawer-cta" onClick={closeNav}>Get Started →</Link>
      </div>

      {/* HERO — minimal, one message */}
      <section className="hero-v2" id="home">
        <div className="hero-v2-bg" />
        <div className="hero-v2-content">
          <p className="hero-v2-label">{siteName}</p>
          <h1 className="hero-v2-title">
            Premium accounts.<br />
            <span className="hero-v2-accent">Instant access.</span>
          </h1>
          <p className="hero-v2-desc">
            Verified accounts for every major platform. Real followers, real engagement. Secure checkout and delivery in minutes.
          </p>
          <div className="hero-v2-btns">
            <Link to="/auth" className="btn-hero-primary">Browse catalog</Link>
            <a href="#how" className="btn-hero-ghost">How it works</a>
          </div>
          <div className="hero-v2-stats">
            <div className="hero-stat"><span className="hero-stat-num">50K+</span><span className="hero-stat-label">Transactions</span></div>
            <div className="hero-stat"><span className="hero-stat-num">24h</span><span className="hero-stat-label">Support</span></div>
            <div className="hero-stat"><span className="hero-stat-num">100%</span><span className="hero-stat-label">Secure</span></div>
          </div>
        </div>
      </section>

      {/* TICKER — neon strip */}
      <div className="ticker-v2" role="marquee">
        <div className="ticker-v2-inner">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span className="ticker-v2-item" key={i}>{item}</span>
          ))}
        </div>
      </div>

      {/* ABOUT — no orbit, clean grid */}
      <section className="about-v2 landing-section" id="about">
        <div className="about-v2-inner">
          <p className="section-tag-v2">Who we are</p>
          <h2 className="about-v2-title">
            Verified accounts for <span>every platform.</span>
          </h2>
          <p className="about-v2-sub">
            {siteName} delivers established accounts with real engagement. Browse by platform, pay securely, get credentials instantly.
          </p>
          <div className="platform-row">
            {["Instagram", "Twitter/X", "TikTok", "YouTube", "Facebook", "LinkedIn"].map((name) => (
              <span className="platform-pill" key={name}>{name}</span>
            ))}
          </div>
          <div className="about-v2-metrics">
            <div className="about-metric"><span className="about-metric-num">10K+</span><span className="about-metric-label">Accounts sold</span></div>
            <div className="about-metric"><span className="about-metric-num">5★</span><span className="about-metric-label">Rating</span></div>
            <div className="about-metric"><span className="about-metric-num">24/7</span><span className="about-metric-label">Support</span></div>
            <div className="about-metric"><span className="about-metric-num">98%</span><span className="about-metric-label">Satisfaction</span></div>
          </div>
        </div>
      </section>

      {/* FEATURES — bento grid */}
      <section className="features-v2 landing-section" id="features">
        <p className="section-tag-v2">Features</p>
        <h2 className="features-v2-title">Built for <span>speed and trust</span></h2>
        <div className="bento">
          <div className="bento-card bento-main reveal">
            <div className="bento-icon"><i className="fa-solid fa-shield-halved" /></div>
            <h3>Verified accounts</h3>
            <p>Every account is authentic with real followers and engagement. Vetted before listing.</p>
          </div>
          <div className="bento-card bento-sm reveal reveal-delay-1">
            <div className="bento-icon"><i className="fa-solid fa-bolt" /></div>
            <h3>Instant delivery</h3>
            <p>Credentials delivered within minutes.</p>
          </div>
          <div className="bento-card bento-sm reveal reveal-delay-1">
            <div className="bento-icon"><i className="fa-solid fa-lock" /></div>
            <h3>Secure payment</h3>
            <p>Encrypted checkout.</p>
          </div>
          <div className="bento-card bento-sm reveal reveal-delay-1">
            <div className="bento-icon"><i className="fa-solid fa-headset" /></div>
            <h3>24/7 support</h3>
            <p>Help when you need it.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-v2 landing-section" id="how">
        <p className="section-tag-v2">Process</p>
        <h2 className="how-v2-title">Three steps to your account</h2>
        <div className="steps-v2">
          <div className="step-v2 reveal">
            <span className="step-v2-num">1</span>
            <h3>Browse & select</h3>
            <p>Choose platform and account. See stats and pricing.</p>
          </div>
          <div className="step-v2-line" aria-hidden="true" />
          <div className="step-v2 reveal reveal-delay-1">
            <span className="step-v2-num">2</span>
            <h3>Check out</h3>
            <p>Pay securely. Multiple options.</p>
          </div>
          <div className="step-v2-line" aria-hidden="true" />
          <div className="step-v2 reveal reveal-delay-2">
            <span className="step-v2-num">3</span>
            <h3>Get access</h3>
            <p>Receive credentials instantly. Start using.</p>
          </div>
        </div>
        <div className="how-v2-cta reveal">
          <Link to="/auth" className="btn-hero-primary">Get started</Link>
        </div>
      </section>

      {/* TESTIMONIALS — 2x2 */}
      <section className="testimonials-v2 landing-section" id="testimonials">
        <p className="section-tag-v2">Reviews</p>
        <h2 className="testimonials-v2-title">What customers say</h2>
        <div className="testimonials-v2-grid">
          {[
            { name: "Sarah J.", role: "Creator", text: "Account was exactly as described. Transfer was seamless. Best investment for my business.", platform: "Instagram" },
            { name: "Michael C.", role: "Marketer", text: "Jumpstarted my presence. Real engagement, authentic followers. Support was amazing.", platform: "TikTok" },
            { name: "Emily R.", role: "Business", text: "Exceeded expectations. Instant delivery, secure payment, metrics 100% accurate.", platform: "YouTube" },
            { name: "David K.", role: "Influencer", text: "Quality unmatched. Real followers, great engagement. Worth every penny.", platform: "Twitter" },
          ].map((t, i) => (
            <div className={`testimonial-v2-card reveal${i > 0 ? ` reveal-delay-${i}` : ""}`} key={t.name}>
              <div className="testimonial-v2-stars">★★★★★</div>
              <p className="testimonial-v2-text">"{t.text}"</p>
              <div className="testimonial-v2-meta">
                <span className="testimonial-v2-name">{t.name}</span>
                <span className="testimonial-v2-role">{t.role} · {t.platform}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-v2 landing-section" id="faq">
        <div className="faq-v2-inner">
          <div className="faq-v2-head reveal">
            <p className="section-tag-v2">FAQ</p>
            <h2>Common questions</h2>
          </div>
          <div className="faq-v2-list reveal reveal-delay-1">
            {faqItems.map((faq, i) => (
              <div className={`faq-v2-item${openFaq === i ? " open" : ""}`} key={i}>
                <button className="faq-v2-q" onClick={() => toggleFaq(i)}>
                  {faq.q}
                  <span className="faq-v2-icon">{openFaq === i ? "−" : "+"}</span>
                </button>
                <div className="faq-v2-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-v2">
        <h2 className="cta-v2-title">Ready to start?</h2>
        <p className="cta-v2-sub">Join thousands who use {siteName} for verified accounts.</p>
        <Link to="/auth" className="btn-hero-primary btn-cta-large">Browse catalog</Link>
      </section>

      {/* FOOTER */}
      <footer className="footer-v2">
        <div className="footer-v2-top">
          <div className="footer-v2-brand">
            {siteLogo && <img src={siteLogo} alt="" className="footer-v2-logo-img" />}
            <span className="footer-v2-name">{siteName}</span>
          </div>
          <div className="footer-v2-links">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
            <Link to="/auth">Sign In</Link>
          </div>
        </div>
        <div className="footer-v2-bottom">
          <span>© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
