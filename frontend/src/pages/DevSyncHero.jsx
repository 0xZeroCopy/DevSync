
import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  GitBranch,
  Layers,
  Lock,
  Menu,
  Moon,
  Play,
  Sun,
  Users,
  Zap,
  Terminal,
  ShieldCheck,
  Workflow,
  MessageSquare,
  X,
  MousePointer2,
  RefreshCw,
  FolderKanban,
} from "lucide-react";

import "../styles/DevSyncHero.css";

const rotatingWords = [
  "together.",
  "in real time.",
  "without friction.",
  "as one team.",
];

const features = [
  {
    icon: Users,
    title: "Real-time collaboration",
    description:
      "Collaborate with teammates in the same development environment and see code changes as they happen.",
    tag: "TEAMWORK",
  },
  {
    icon: RefreshCw,
    title: "Instant synchronization",
    description:
      "Keep every collaborator's workspace updated through fast, reliable real-time synchronization.",
    tag: "LIVE SYNC",
  },
  {
    icon: Lock,
    title: "Symbol-level locking",
    description:
      "Coordinate simultaneous edits with intelligent locking to reduce conflicting code changes.",
    tag: "CONCURRENCY",
  },
  {
    icon: Code2,
    title: "Integrated code editor",
    description:
      "Write, explore, and manage project files inside one unified development workspace.",
    tag: "EDITOR",
  },
  {
    icon: FolderKanban,
    title: "Project management",
    description:
      "Create projects, organize files, manage invitations, and keep your team's work structured.",
    tag: "WORKFLOW",
  },
  {
    icon: Workflow,
    title: "Smart handovers",
    description:
      "Coordinate ownership and hand over work clearly so teammates know what is happening next.",
    tag: "COORDINATION",
  },
  {
    icon: Terminal,
    title: "Integrated execution",
    description:
      "Run and test code from your development workspace without constantly switching tools.",
    tag: "EXECUTION",
  },
  {
    icon: MessageSquare,
    title: "Team communication",
    description:
      "Keep collaboration and development activity connected in a shared working environment.",
    tag: "COMMUNICATION",
  },
];

const steps = [
  {
    number: "01",
    icon: Users,
    title: "Create a workspace",
    description:
      "Sign up, create your project, and invite the developers you want to work with.",
  },
  {
    number: "02",
    icon: Code2,
    title: "Collaborate on code",
    description:
      "Open the shared editor, explore project files, and make changes together in real time.",
  },
  {
    number: "03",
    icon: GitBranch,
    title: "Coordinate and build",
    description:
      "Use smart locking, synchronization, and handovers to keep development moving smoothly.",
  },
];

function DevSyncLogo() {
  return (
    <div className="ds-brand">
      <div className="ds-logo-mark">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 15L24 6L41 15L24 24L7 15Z"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M7 23L24 32L41 23"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 31L24 40L41 31"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span>DevSync</span>
    </div>
  );
}

function DevSyncHero({ onGetStarted, onSignIn }) {
  const [activeWord, setActiveWord] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("devsync-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((current) => (current + 1) % rotatingWords.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("devsync-theme", darkMode ? "dark" : "light");
    } catch {
      // Theme still works for the current session.
    }
  }, [darkMode]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <main
      className="devsync-landing"
      data-theme={darkMode ? "dark" : "light"}
      id="home"
    >
      {/* BACKGROUND DECORATION */}
      <div className="ds-background-grid" aria-hidden="true" />
      <div className="ds-background-glow ds-glow-one" aria-hidden="true" />
      <div className="ds-background-glow ds-glow-two" aria-hidden="true" />
      <div className="ds-background-beam ds-beam-one" aria-hidden="true" />
      <div className="ds-background-beam ds-beam-two" aria-hidden="true" />

      {/* NAVBAR */}
      <header className="ds-navbar">
        <a href="#home" className="ds-logo-link" onClick={closeMenu}>
          <DevSyncLogo />
        </a>

        <nav className={`ds-nav-links ${mobileMenuOpen ? "is-open" : ""}`}>
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#about" onClick={closeMenu}>About</a>
        </nav>

        <div className="ds-nav-actions">
          <button
            className="ds-theme-toggle"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button className="ds-signin-btn" onClick={onSignIn}>
            Sign in
          </button>

          <button className="ds-nav-cta" onClick={onGetStarted}>
            Get Started <ArrowUpRight size={16} />
          </button>

          <button
            className="ds-mobile-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="ds-hero">
        <div className="ds-hero-copy">
          <div className="ds-eyebrow">
            <span className="ds-eyebrow-dot" />
            THE COLLABORATIVE CLOUD IDE
          </div>

          <h1>
            Great code happens
            <br />
            <span className="ds-rotating-line">
              <span key={activeWord} className="ds-rotating-word">
                {rotatingWords[activeWord]}
              </span>
            </span>
          </h1>

          <p className="ds-hero-description">
            A unified development workspace where developers can
            code, collaborate, and coordinate their work in real time.
            Bring your entire team's workflow into one place.
          </p>

          <div className="ds-hero-actions">
            <button className="ds-primary-btn" onClick={onGetStarted}>
              Get Started <ArrowRight size={17} />
            </button>

            <a href="#how-it-works" className="ds-text-link">
              <span className="ds-play-icon"><Play size={13} /></span>
              See how it works
            </a>
          </div>

          <div className="ds-hero-proof">
            <span><Check size={14} /> Real-time editing</span>
            <span><Check size={14} /> Shared workspace</span>
            <span><Check size={14} /> Smart coordination</span>
          </div>
        </div>

        {/* EDITOR PREVIEW */}
        <div className="ds-visual">
          <div className="ds-editor-window">
            <div className="ds-editor-topbar">
              <div className="ds-window-controls">
                <i />
                <i />
                <i />
              </div>
              <div className="ds-editor-heading">
                <Code2 size={14} /> DevSync Workspace
              </div>
              <div className="ds-live-label">
                <span /> LIVE
              </div>
            </div>

            <div className="ds-editor-main">
              <aside className="ds-editor-sidebar">
                <p>EXPLORER</p>
                <div className="ds-editor-file active"><Code2 size={13} /> App.jsx</div>
                <div className="ds-editor-file"><Code2 size={13} /> Dashboard.jsx</div>
                <div className="ds-editor-file"><Code2 size={13} /> styles.css</div>
                <div className="ds-editor-file"><Terminal size={13} /> terminal</div>
              </aside>

              <div className="ds-editor-code">
                <div className="ds-code-tab">
                  <Code2 size={13} /> App.jsx <span>×</span>
                </div>
                <div className="ds-code-lines">
                  <div><em>01</em> <b>import</b> React <b>from</b> <strong>"react"</strong>;</div>
                  <div><em>02</em></div>
                  <div><em>03</em> <b>function</b> <mark>DevSync</mark>() {"{"}</div>
                  <div><em>04</em> &nbsp; <b>return</b> (</div>
                  <div><em>05</em> &nbsp;&nbsp; <i>{"<div>"}</i></div>
                  <div><em>06</em> &nbsp;&nbsp;&nbsp; Build together</div>
                  <div><em>07</em> &nbsp;&nbsp; <i>{"</div>"}</i></div>
                  <div><em>08</em> &nbsp; );</div>
                  <div><em>09</em> {"}"}</div>
                  <div><em>10</em></div>
                  <div><em>11</em> <b>export default</b> DevSync;</div>
                </div>

                <div className="ds-cursor ds-cursor-one">
                  <MousePointer2 size={12} /> Tanmay
                </div>
                <div className="ds-cursor ds-cursor-two">
                  <MousePointer2 size={12} /> Trisha
                </div>
              </div>
            </div>

            <div className="ds-editor-status">
              <span><i /> Connected</span>
              <span>main * &nbsp; UTF-8</span>
            </div>
          </div>

          <div className="ds-float-card ds-float-team">
            <div className="ds-float-icon"><Users size={17} /></div>
            <div>
              <strong>Team connected</strong>
              <small>Working together</small>
            </div>
            <div className="ds-avatar-stack">
              <span>T</span><span>M</span><span>S</span>
            </div>
          </div>

          <div className="ds-float-card ds-float-sync">
            <div className="ds-float-icon"><ShieldCheck size={18} /></div>
            <div>
              <strong>Changes synchronized</strong>
              <small>Workspace is up to date</small>
            </div>
            <Check size={17} className="ds-float-check" />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="ds-marquee" aria-label="DevSync capabilities">
        <div className="ds-marquee-track">
          {[0, 1].map((copy) => (
            <div className="ds-marquee-group" key={copy} aria-hidden={copy === 1}>
              <span>REAL-TIME COLLABORATION</span><i />
              <span>SMART CODE LOCKING</span><i />
              <span>INSTANT SYNCHRONIZATION</span><i />
              <span>SHARED DEVELOPMENT</span><i />
              <span>ONE CONNECTED WORKSPACE</span><i />
            </div>
          ))}
        </div>
      </section>

      {/* INTRO */}
      <section className="ds-intro" id="about">
        <span className="ds-section-kicker">A BETTER WAY TO BUILD</span>
        <h2>
          Your team's ideas deserve
          <br />
          <span>one shared space.</span>
        </h2>
        <p>
          DevSync connects your code, collaborators, and development
          workflow. Spend less time coordinating separate tools and
          more time creating together.
        </p>
      </section>

      {/* FEATURES */}
      <section className="ds-section ds-features" id="features">
        <div className="ds-section-heading">
          <div>
            <span className="ds-section-kicker">MADE FOR COLLABORATION</span>
            <h2>
              Everything you need.
              <br />
              <span>Nothing in your way.</span>
            </h2>
          </div>
          <p>
            A connected set of tools designed to make collaborative
            development clearer, smoother, and more productive.
          </p>
        </div>

        <div className="ds-feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article className="ds-feature-card" key={feature.title}>
                <div className="ds-feature-card-top">
                  <div className="ds-feature-icon"><Icon size={21} /></div>
                  <span>{feature.tag}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="ds-section ds-how" id="how-it-works">
        <div className="ds-section-heading">
          <div>
            <span className="ds-section-kicker">YOUR WORKFLOW, SIMPLIFIED</span>
            <h2>
              How DevSync
              <br />
              <span>works.</span>
            </h2>
          </div>
          <p>
            Get your team into one workspace and move from setup
            to collaborative development in three simple steps.
          </p>
        </div>

        <div className="ds-steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="ds-step-card" key={step.number}>
                <div className="ds-step-top">
                  <span className="ds-step-number">{step.number}</span>
                  <div className="ds-step-icon"><Icon size={23} /></div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="ds-step-connector">
                    <ArrowRight size={17} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* COLLABORATION CALLOUT */}
      <section className="ds-cta-section">
        <div className="ds-cta-copy">
          <span className="ds-section-kicker">BUILD SOMETHING TOGETHER</span>
          <h2>
            Your next great project
            <br />
            starts <span>with your team.</span>
          </h2>
          <p>
            Bring your developers together in one shared workspace.
            Create your account and start building with DevSync.
          </p>
          <button className="ds-primary-btn" onClick={onGetStarted}>
            Get Started <ArrowRight size={17} />
          </button>
        </div>
        <div className="ds-cta-art" aria-hidden="true">
          <div className="ds-cta-orbit ds-orbit-one" />
          <div className="ds-cta-orbit ds-orbit-two" />
          <div className="ds-cta-logo"><Layers size={43} /></div>
          <div className="ds-cta-mini ds-mini-one"><Code2 size={19} /></div>
          <div className="ds-cta-mini ds-mini-two"><Users size={19} /></div>
          <div className="ds-cta-mini ds-mini-three"><GitBranch size={19} /></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ds-footer">
        <div className="ds-footer-main">
          <div>
            <DevSyncLogo />
            <p>
              One workspace for developers to connect,
              collaborate, and create together.
            </p>
          </div>

          <div className="ds-footer-column">
            <strong>EXPLORE</strong>
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </div>

          <div className="ds-footer-column">
            <strong>GET STARTED</strong>
            <button onClick={onGetStarted}>Create an account</button>
            <button onClick={onSignIn}>Sign in</button>
          </div>
        </div>

        <div className="ds-footer-bottom">
          <span>© {new Date().getFullYear()} DevSync. All rights reserved.</span>
          <span>Code together. Build better.</span>
        </div>
      </footer>
    </main>
  );
}

export default DevSyncHero;
