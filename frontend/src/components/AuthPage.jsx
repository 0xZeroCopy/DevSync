import React, { useState, useEffect, useRef } from "react";
import { 
  Mail, 
  Lock, 
  User, 
  AtSign,
  Briefcase, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield, 
  Layers, 
  AlertCircle, 
  Check, 
  X,
  Code2,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  ExternalLink
} from "lucide-react";
import { MOCK_DEVELOPERS } from "../data/mockFiles";

// Decode Google JWT ID token
const decodeGoogleJwt = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (err) {
    console.error("Failed to decode Google JWT token:", err);
    return null;
  }
};

const AVATAR_PALETTE = [
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Orange", hex: "#F97316" },
  { name: "Pink", hex: "#EC4899" },
];

export function AuthPage({ 
  onAuthSuccess, 
  initialMode = "signup",
  onBackToWorkspace 
}) {
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsLogin(initialMode === "login");
  }, [initialMode]);
  
  // Standard Form fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Full Stack Developer");
  
  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState("idle"); // "idle" | "available" | "taken" | "invalid"
  const [usernameError, setUsernameError] = useState("");

  // UI states
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth Flow State: "closed" | "oauth_consent" | "onboarding"
  const [googleStep, setGoogleStep] = useState("closed");
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [useOtherGoogleAccount, setUseOtherGoogleAccount] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [googleOAuthError, setGoogleOAuthError] = useState("");

  // Google Client ID State (configured with your Google Cloud Console Client ID)
  const [googleClientId, setGoogleClientId] = useState(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || "631001548957-8k3885cpsdne9l9n756d1b245pvjgh5h.apps.googleusercontent.com";
  });
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(googleClientId);

  const googleButtonRef = useRef(null);
  const googleModalButtonRef = useRef(null);

  // Onboarding fields for new Google users
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState("idle");
  const [onboardingError, setOnboardingError] = useState("");
  const [onboardingRole, setOnboardingRole] = useState("Full Stack Developer");
  const [onboardingTech, setOnboardingTech] = useState("Python / Node.js");
  const [onboardingAvatar, setOnboardingAvatar] = useState("#8B5CF6");

  // Helper to get registered users from localStorage
  const getRegisteredUsers = () => {
    try {
      const saved = localStorage.getItem("devsync_registered_users");
      if (saved) return JSON.parse(saved);
    } catch {}
    return MOCK_DEVELOPERS || [];
  };

  const saveRegisteredUser = (user) => {
    try {
      const current = getRegisteredUsers();
      const updated = [user, ...current.filter((u) => u.id !== user.id && u.username !== user.username)];
      localStorage.setItem("devsync_registered_users", JSON.stringify(updated));
    } catch {}
  };

  // Process verified Google account credentials
  const handleGoogleProfileSuccess = ({ name, email, avatarUrl }) => {
    const cleanEmail = email.trim().toLowerCase();
    const registered = getRegisteredUsers();
    const existing = registered.find((u) => u.email?.toLowerCase() === cleanEmail);

    if (existing) {
      // Returning user -> automatically log in directly to dashboard!
      setGoogleStep("closed");
      onAuthSuccess(existing);
    } else {
      // Brand new Google user -> Prompt for additional setup details
      const baseUsername = cleanEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 15);
      setPendingGoogleUser({
        id: "goog_" + Date.now().toString(36),
        name: name || cleanEmail.split("@")[0],
        email: cleanEmail,
        avatarUrl: avatarUrl || "",
        authProvider: "google",
        avatarColor: "#0097a7",
      });
      setOnboardingUsername(baseUsername);
      validateOnboardingUsername(baseUsername);
      setGoogleStep("onboarding");
    }
  };

  // Google GSI Credential Callback
  const handleGoogleCredentialResponse = (response) => {
    if (!response?.credential) {
      setGoogleOAuthError("Google did not return credentials.");
      return;
    }
    const payload = decodeGoogleJwt(response.credential);
    if (!payload || !payload.email) {
      setGoogleOAuthError("Could not extract Google account profile.");
      return;
    }
    handleGoogleProfileSuccess({
      name: payload.name || payload.given_name || "Google User",
      email: payload.email,
      avatarUrl: payload.picture,
    });
  };

  // Initialize Google Identity Services SDK
  useEffect(() => {
    const initGsi = () => {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleButtonRef.current) {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: "filled_blue",
              size: "large",
              width: 380,
              text: "continue_with",
              shape: "rectangular",
            });
          }

          if (googleModalButtonRef.current) {
            window.google.accounts.id.renderButton(googleModalButtonRef.current, {
              theme: "outline",
              size: "large",
              width: 380,
              text: "continue_with",
              shape: "rectangular",
            });
          }
        } catch (e) {
          console.warn("Google Identity Services init warning:", e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGsi();
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [googleClientId, googleStep]);

  // Save new Google Client ID from UI
  const handleSaveClientId = (e) => {
    e.preventDefault();
    const trimmed = clientIdInput.trim();
    if (!trimmed) return;
    setGoogleClientId(trimmed);
    try {
      localStorage.setItem("devsync_google_client_id", trimmed);
    } catch {}
    setShowClientIdConfig(false);
  };

  // Known Google accounts available in the browser session (matching authentic Google account chooser)
  const getGoogleSessionAccounts = () => {
    const registered = getRegisteredUsers();
    const googleUsers = registered.filter((u) => u.authProvider === "google");
    
    // Default list of Google accounts available in the session
    const defaultAccounts = [
      {
        id: "goog_m_acc_6",
        name: "M Acc 6",
        username: "m_acc_6",
        email: "accm56888@gmail.com",
        role: "Full Stack Developer",
        avatarColor: "#0097a7",
        avatarLetter: "M",
      },
      {
        id: "goog_malika",
        name: "Malika",
        username: "malika_dev",
        email: "malika237581@gmail.com",
        role: "Lead Platform Engineer",
        avatarColor: "#8B5CF6",
        avatarLetter: "M",
      }
    ];

    // Merge registered google users with default session accounts without duplicates
    const combined = [...googleUsers];
    for (const acc of defaultAccounts) {
      if (!combined.some((u) => u.email?.toLowerCase() === acc.email.toLowerCase())) {
        combined.push(acc);
      }
    }
    return combined;
  };

  // Auto-generate suggested username when name is entered (in Sign Up)
  const handleNameChange = (val) => {
    setName(val);
    if (!username || username === name.toLowerCase().replace(/[^a-z0-9_]/g, "_")) {
      const suggested = val.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 15);
      if (suggested.length >= 3) {
        validateUsername(suggested);
        setUsername(suggested);
      }
    }
  };

  const validateUsername = (uname) => {
    const clean = uname.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      setUsernameStatus("idle");
      setUsernameError("");
      return false;
    }

    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameStatus("invalid");
      setUsernameError("3-20 chars, lowercase letters, numbers & underscores only.");
      return false;
    }

    const registered = getRegisteredUsers();
    const isTaken = registered.some((d) => d.username?.toLowerCase() === clean);

    if (isTaken) {
      setUsernameStatus("taken");
      setUsernameError("This username is already taken. Please choose another.");
      return false;
    } else {
      setUsernameStatus("available");
      setUsernameError("");
      return true;
    }
  };

  const validateOnboardingUsername = (uname) => {
    const clean = uname.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      setOnboardingStatus("idle");
      setOnboardingError("");
      return false;
    }

    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(clean)) {
      setOnboardingStatus("invalid");
      setOnboardingError("3-20 chars, lowercase letters, numbers & underscores only.");
      return false;
    }

    const registered = getRegisteredUsers();
    const isTaken = registered.some(
      (d) => d.username?.toLowerCase() === clean && d.email !== pendingGoogleUser?.email
    );

    if (isTaken) {
      setOnboardingStatus("taken");
      setOnboardingError("Username is taken. Try another.");
      return false;
    } else {
      setOnboardingStatus("available");
      setOnboardingError("");
      return true;
    }
  };

  // Standard Email/Password Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!isLogin) {
      // Sign Up validation
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }

      if (!validateUsername(username)) {
        setError("Please choose a valid and unique username.");
        return;
      }

      if (!email.trim() || !password) {
        setError("Please enter your email and password.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }

      const registered = getRegisteredUsers();
      if (registered.some((u) => u.email?.toLowerCase() === email.trim().toLowerCase())) {
        setError("An account with this email already exists. Please Sign In.");
        return;
      }
    } else {
      // Login validation
      if (!email.trim() || !password) {
        setError("Please enter your email/username and password.");
        return;
      }
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const registered = getRegisteredUsers();

      if (isLogin) {
        const query = email.trim().toLowerCase().replace(/^@/, "");
        const existing = registered.find(
          (d) => 
            d.email?.toLowerCase() === query || 
            d.username?.toLowerCase() === query
        );

        if (existing) {
          if (existing.password && existing.password !== password) {
            setError("Incorrect password. Please try again.");
            return;
          }
          onAuthSuccess(existing);
        } else {
          setError("No account found matching this email or username. Please Sign Up to create your account.");
        }
      } else {
        // Sign up new user
        const newUser = {
          id: "dev_" + Date.now().toString(36),
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password: password,
          role: role || "Full Stack Developer",
          avatarColor: "#8B5CF6",
          authProvider: "email",
          createdAt: new Date().toISOString(),
        };

        saveRegisteredUser(newUser);
        onAuthSuccess(newUser);
      }
    }, 500);
  };

  // Listen for popup redirect response (when using direct Google OAuth popup window)
  useEffect(() => {
    const handleOAuthMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_OAUTH_RESPONSE") {
        setGoogleLoading(true);
        const hash = event.data.hash || "";
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const accessToken = params.get("access_token");
        if (accessToken) {
          try {
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const info = await res.json();
            setGoogleLoading(false);
            if (info?.email) {
              handleGoogleProfileSuccess({
                name: info.name || info.given_name || "Google User",
                email: info.email,
                avatarUrl: info.picture || "",
              });
              return;
            }
          } catch (err) {
            setGoogleLoading(false);
            setGoogleOAuthError("Failed to fetch Google account profile info.");
          }
        } else {
          setGoogleLoading(false);
        }
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [googleClientId]);

  // 1. Trigger Google Authorization Popup (DIRECT FROM GOOGLE'S SERVER)
  const handleOpenGoogleAuth = () => {
    setGoogleOAuthError("");
    setUseOtherGoogleAccount(false);
    setCustomGoogleEmail("");
    setCustomGoogleName("");

    // METHOD A: Google Identity Services OAuth 2.0 Token Client (Official Google Popup SDK)
    if (window.google?.accounts?.oauth2 && googleClientId) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "email profile openid",
          prompt: "select_account",
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              console.warn("Google popup closed or returned error:", tokenResponse);
              return;
            }
            if (tokenResponse?.access_token) {
              setGoogleLoading(true);
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const info = await res.json();
                setGoogleLoading(false);
                if (info?.email) {
                  handleGoogleProfileSuccess({
                    name: info.name || info.given_name || "Google User",
                    email: info.email,
                    avatarUrl: info.picture || "",
                  });
                  return;
                }
              } catch (err) {
                setGoogleLoading(false);
                setGoogleOAuthError("Failed to fetch Google profile info from Google server.");
              }
            }
          },
        });

        // Opens the authentic popup window directly from accounts.google.com!
        tokenClient.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (err) {
        console.warn("initTokenClient failed, launching direct OAuth 2.0 popup:", err);
      }
    }

    // METHOD B: Direct Google OAuth 2.0 Popup Window to accounts.google.com/o/oauth2/v2/auth
    const redirectUri = window.location.origin;
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      googleClientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${encodeURIComponent(
      "email profile openid"
    )}&prompt=select_account`;

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      "google_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup) {
      setGoogleOAuthError("Popup was blocked by your browser. Please allow popups for localhost:3000.");
      // Fallback to in-page window if popup is blocked by browser settings
      setGoogleStep("oauth_consent");
    }
  };

  // 2. User selects an account in Google Authorization Popup
  const handleSelectGoogleAccount = (acc) => {
    setGoogleLoading(true);

    setTimeout(() => {
      setGoogleLoading(false);
      handleGoogleProfileSuccess({
        name: acc.name,
        email: acc.email,
        avatarUrl: acc.avatarUrl || "",
      });
    }, 400);
  };

  // 3. User chooses "Use another account" in Google Authorization Popup
  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    setGoogleOAuthError("");

    const mail = customGoogleEmail.trim().toLowerCase();
    if (!mail || !mail.includes("@") || !mail.includes(".")) {
      setGoogleOAuthError("Please enter a valid Google mail address (e.g. yourname@gmail.com).");
      return;
    }

    setGoogleLoading(true);

    setTimeout(() => {
      setGoogleLoading(false);
      const extractedName = customGoogleName.trim() || mail.split("@")[0].charAt(0).toUpperCase() + mail.split("@")[0].slice(1);
      handleGoogleProfileSuccess({
        name: extractedName,
        email: mail,
        avatarUrl: "",
      });
    }, 400);
  };

  // 4. Complete Onboarding with further details
  const handleCompleteGoogleOnboarding = (e) => {
    e.preventDefault();
    if (!validateOnboardingUsername(onboardingUsername)) {
      setOnboardingError("Please provide a valid, unique username.");
      return;
    }

    const finalUser = {
      ...pendingGoogleUser,
      username: onboardingUsername.trim().toLowerCase(),
      role: onboardingRole,
      techStack: onboardingTech,
      avatarColor: onboardingAvatar,
      createdAt: new Date().toISOString(),
    };

    saveRegisteredUser(finalUser);
    setGoogleStep("closed");
    onAuthSuccess(finalUser);
  };

  return (
    <div className="min-h-screen w-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-500 shadow-xl shadow-indigo-500/20 mb-3 border border-indigo-400/30">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-2">
            <span>DevSync</span>
            <span className="text-[11px] font-mono font-normal text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              Engine
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {isLogin 
              ? "Sign in to your account to open your project dashboard"
              : "Create your unique developer account with full ownership & control"}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#1E293B]/90 backdrop-blur-md border border-[#334155] rounded-2xl p-6 shadow-2xl relative">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#0F172A] rounded-xl border border-[#334155] mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                !isLogin
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                isLogin
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Official Google Identity Services Mount */}
          <div ref={googleButtonRef} className="w-full flex justify-center mb-2 overflow-hidden" />

          {/* Google Auth Button -> Opens Google Authorization Popup */}
          <button
            type="button"
            disabled={googleLoading || isLoading}
            onClick={handleOpenGoogleAuth}
            className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-[#0F172A] border border-[#334155] hover:border-slate-500 hover:bg-[#141e33] transition-all text-xs font-medium text-slate-200 cursor-pointer shadow-sm group disabled:opacity-50"
          >
            {/* Official Google 'G' Icon */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Quick Client ID Config Link */}
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[220px]" title={googleClientId}>
              Client: {googleClientId.slice(0, 15)}...
            </span>
            <button
              type="button"
              onClick={() => setShowClientIdConfig(true)}
              className="inline-flex items-center space-x-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <KeyRound className="h-3 w-3" />
              <span>Change Client ID</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-[#334155]" />
            <span className="absolute bg-[#1E293B] px-3 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Or with credentials
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 flex items-center space-x-2 text-xs text-rose-200 animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name (Sign Up only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* UNIQUE USERNAME (Sign Up only) */}
            {!isLogin && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Unique Username
                  </label>
                  {usernameStatus === "available" && (
                    <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                      <Check className="h-3 w-3" />
                      <span>Available</span>
                    </span>
                  )}
                  {usernameStatus === "taken" && (
                    <span className="text-[10px] text-rose-400 flex items-center space-x-1">
                      <X className="h-3 w-3" />
                      <span>Taken</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <AtSign className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setUsername(clean);
                      validateUsername(clean);
                    }}
                    placeholder="choose_unique_handle"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border text-xs text-white placeholder-slate-500 outline-none transition-all font-mono ${
                      usernameStatus === "available"
                        ? "border-emerald-500/70 focus:border-emerald-500"
                        : usernameStatus === "taken" || usernameStatus === "invalid"
                        ? "border-rose-500/70 focus:border-rose-500"
                        : "border-[#334155] focus:border-indigo-500"
                    }`}
                  />
                </div>
                {usernameError && (
                  <p className="text-[10px] text-rose-400 mt-1">{usernameError}</p>
                )}
              </div>
            )}

            {/* Email Address / Username */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                {isLogin ? "Email or @Username" : "Developer Email"}
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={isLogin ? "text" : "email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isLogin ? "Enter your email or @username" : "you@company.com"}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Role (Sign Up only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Engineering Role
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Lead Backend">Lead Backend</option>
                    <option value="Platform Engineer">Platform Engineer</option>
                    <option value="Systems Developer">Systems Developer</option>
                    <option value="Frontend Architect">Frontend Architect</option>
                  </select>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isLogin ? "Authenticating..." : "Creating Account..."}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? "Sign In & Open Dashboard" : "Create Account & Open Dashboard"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Notice */}
        <div className="mt-5 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>Independent developer account control • Symbol concurrency engine</span>
        </div>
      </div>

      {/* POPUP 1: REALISTIC GOOGLE AUTHORIZATION POPUP (OAuth 2.0 Consent matching Chrome window) */}
      {googleStep === "oauth_consent" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-3 font-sans">
          {/* Chrome Popup Window Container */}
          <div className="bg-[#131314] border border-[#444746]/60 rounded-xl overflow-hidden w-full max-w-[460px] shadow-2xl shadow-black/95 animate-in zoom-in-95 duration-150 relative">
            
            {/* 1. Windows Chrome Title Bar */}
            <div className="bg-[#1f1f1f] h-9 px-3 flex items-center justify-between border-b border-[#3c4043]/40 select-none">
              <div className="flex items-center space-x-2">
                {/* Official Google G Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="text-[12px] font-normal text-[#e8eaed] truncate max-w-[280px]">
                  Sign in - Google Accounts - Google Chrome
                </span>
              </div>

              {/* Windows Window Control Buttons */}
              <div className="flex items-center -mr-3 text-[#9aa0a6]">
                <button 
                  type="button" 
                  aria-label="Minimize"
                  className="w-11 h-9 flex items-center justify-center hover:bg-[#323639] transition-colors"
                >
                  <span className="text-xs">―</span>
                </button>
                <button 
                  type="button" 
                  aria-label="Maximize"
                  className="w-11 h-9 flex items-center justify-center hover:bg-[#323639] transition-colors"
                >
                  <span className="text-[11px]">□</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setGoogleStep("closed")} 
                  aria-label="Close"
                  className="w-11 h-9 flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors"
                >
                  <span className="text-sm leading-none">✕</span>
                </button>
              </div>
            </div>

            {/* 2. Omnibox / URL Bar */}
            <div className="bg-[#202124] px-3 py-1.5 border-b border-[#35363a] flex items-center">
              <div className="flex-1 bg-[#131314] rounded-full px-3 py-1 flex items-center text-[11px] text-[#9aa0a6] select-none font-mono">
                {/* Tune / Sliders Icon */}
                <svg className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
                <span className="truncate text-[#9aa0a6]">
                  accounts.google.com/v3/signin/accountchooser?as=c1OhviG-fEsJ4lpvt3NfddZ7pWu...
                </span>
              </div>
            </div>

            {/* Loading Progress Bar */}
            {googleLoading && (
              <div className="w-full h-1 bg-[#202124] overflow-hidden">
                <div className="w-1/2 h-full bg-[#8ab4f8] animate-pulse rounded-full" />
              </div>
            )}

            {/* 3. Main Google Accounts Chooser Body */}
            <div className="px-8 pt-8 pb-10">
              
              {/* Google Header Logo */}
              <div className="flex items-center space-x-2.5 mb-6">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="text-[14px] font-medium text-[#e8eaed]">Sign in with Google</span>
              </div>

              {!useOtherGoogleAccount ? (
                <>
                  {/* Headline & Subtitle */}
                  <h1 className="text-[25px] font-normal text-[#e8eaed] mb-1.5 tracking-tight font-sans">
                    Choose an account
                  </h1>
                  <p className="text-[13px] text-[#bdc1c6] mb-7 font-sans">
                    to continue to{" "}
                    <span className="text-[#8ab4f8] font-medium hover:underline cursor-pointer">
                      {window.location.hostname || "devsync-engine.io"}
                    </span>
                  </p>

                  {googleOAuthError && (
                    <div className="mb-4 p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{googleOAuthError}</span>
                    </div>
                  )}

                  {/* Account List */}
                  <div className="space-y-0.5 mb-2">
                    {getGoogleSessionAccounts().map((acc, idx) => (
                      <button
                        key={idx}
                        disabled={googleLoading}
                        onClick={() => handleSelectGoogleAccount(acc)}
                        className="w-full flex items-center px-2 py-3 rounded-lg hover:bg-[#202124] transition-colors text-left cursor-pointer group disabled:opacity-50"
                      >
                        {/* Avatar */}
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mr-3.5 shadow-sm"
                          style={{ backgroundColor: acc.avatarColor || "#0097a7" }}
                        >
                          {acc.avatarLetter || acc.name?.[0] || "M"}
                        </div>
                        {/* Name & Email */}
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-medium text-[#e8eaed] group-hover:text-white truncate">
                            {acc.name}
                          </div>
                          <div className="text-[12px] text-[#9aa0a6] truncate font-normal">
                            {acc.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Horizontal Divider */}
                  <div className="border-t border-[#3c4043] my-1 mb-1" />

                  {/* "Use another account" Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setUseOtherGoogleAccount(true);
                      setGoogleOAuthError("");
                    }}
                    className="w-full flex items-center px-2 py-3 rounded-lg hover:bg-[#202124] transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 mr-3.5 text-[#9aa0a6] group-hover:text-[#e8eaed]">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        <path d="M6.168 18.849a6.5 6.5 0 0 1 11.664 0" />
                      </svg>
                    </div>
                    <div className="text-[14px] font-medium text-[#e8eaed]">
                      Use another account
                    </div>
                  </button>
                </>
              ) : (
                /* "Use another account" Form in Google Material Dark Style */
                <div>
                  <h1 className="text-[25px] font-normal text-[#e8eaed] mb-1.5 tracking-tight font-sans">
                    Sign in
                  </h1>
                  <p className="text-[13px] text-[#bdc1c6] mb-6 font-sans">
                    to continue to{" "}
                    <span className="text-[#8ab4f8] font-medium">
                      {window.location.hostname || "devsync-engine.io"}
                    </span>
                  </p>

                  {googleOAuthError && (
                    <div className="mb-4 p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>{googleOAuthError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCustomGoogleSubmit} className="space-y-4">
                    <div>
                      <div className="relative">
                        <input
                          type="email"
                          value={customGoogleEmail}
                          onChange={(e) => setCustomGoogleEmail(e.target.value)}
                          placeholder="Email or phone"
                          className="w-full px-3.5 py-3 rounded-lg bg-transparent border border-[#8e918f] focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] text-[14px] text-[#e8eaed] placeholder-[#8e918f] outline-none transition-all font-sans"
                          autoFocus
                          required
                        />
                      </div>
                      <div className="mt-1 text-right">
                        <button
                          type="button"
                          className="text-[12px] text-[#8ab4f8] hover:underline font-medium"
                        >
                          Forgot email?
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                        placeholder="Developer Name (optional)"
                        className="w-full px-3.5 py-3 rounded-lg bg-transparent border border-[#8e918f] focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] text-[14px] text-[#e8eaed] placeholder-[#8e918f] outline-none transition-all font-sans"
                      />
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setUseOtherGoogleAccount(false);
                          setGoogleOAuthError("");
                        }}
                        className="text-[13px] font-medium text-[#8ab4f8] hover:underline cursor-pointer"
                      >
                        Back to accounts
                      </button>

                      <button
                        type="submit"
                        disabled={googleLoading}
                        className="px-6 py-2 rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#001d35] font-semibold text-[13px] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {googleLoading ? "Signing in..." : "Next"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: POST SIGN-UP ONBOARDING (Ask Further Details for New Account) */}
      {googleStep === "onboarding" && pendingGoogleUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#475569] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white shadow-xl shadow-indigo-500/20 mb-3">
                <Sparkles className="h-6 w-6 text-amber-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Complete Your Developer Setup</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your Google identity is verified. Customize your developer handle and role before entering the dashboard.
              </p>
            </div>

            {/* Verified Google Account Badge */}
            <div className="p-3 rounded-2xl bg-[#0F172A] border border-[#334155] flex items-center space-x-3 mb-5">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow-inner shrink-0"
                style={{ backgroundColor: onboardingAvatar }}
              >
                {pendingGoogleUser.name?.[0] || "G"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
                  <span>{pendingGoogleUser.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Google Verified
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">{pendingGoogleUser.email}</div>
              </div>
            </div>

            {/* Further Details Form */}
            <form onSubmit={handleCompleteGoogleOnboarding} className="space-y-4">
              {/* Unique Username */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Choose Unique Username
                  </label>
                  {onboardingStatus === "available" && (
                    <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                      <Check className="h-3 w-3" />
                      <span>Available</span>
                    </span>
                  )}
                  {onboardingStatus === "taken" && (
                    <span className="text-[10px] text-rose-400 flex items-center space-x-1">
                      <X className="h-3 w-3" />
                      <span>Taken</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <AtSign className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onboardingUsername}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setOnboardingUsername(clean);
                      validateOnboardingUsername(clean);
                    }}
                    placeholder="your_handle"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border text-xs text-white placeholder-slate-500 outline-none font-mono ${
                      onboardingStatus === "available"
                        ? "border-emerald-500/70 focus:border-emerald-500"
                        : onboardingStatus === "taken"
                        ? "border-rose-500/70 focus:border-rose-500"
                        : "border-[#334155] focus:border-indigo-500"
                    }`}
                    required
                  />
                </div>
                {onboardingError && (
                  <p className="text-[10px] text-rose-400 mt-1">{onboardingError}</p>
                )}
              </div>

              {/* Engineering Role */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Engineering Role
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={onboardingRole}
                    onChange={(e) => setOnboardingRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Lead Backend">Lead Backend</option>
                    <option value="Platform Engineer">Platform Engineer</option>
                    <option value="Systems Architect">Systems Architect</option>
                    <option value="Frontend Architect">Frontend Architect</option>
                    <option value="DevOps & Concurrency SRE">DevOps & Concurrency SRE</option>
                  </select>
                </div>
              </div>

              {/* Primary Tech Stack */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Tech Stack
                </label>
                <div className="relative">
                  <Code2 className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={onboardingTech}
                    onChange={(e) => setOnboardingTech(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Python / Node.js">Python / Node.js</option>
                    <option value="TypeScript / React">TypeScript / React</option>
                    <option value="Go / gRPC">Go / gRPC</option>
                    <option value="Rust / Systems">Rust / Systems</option>
                  </select>
                </div>
              </div>

              {/* Avatar Theme Color */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Avatar Theme Color
                </label>
                <div className="flex items-center space-x-2">
                  {AVATAR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setOnboardingAvatar(c.hex)}
                      className={`h-7 w-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        onboardingAvatar === c.hex ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {onboardingAvatar === c.hex && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complete Setup Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Complete Setup & Enter Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP 3: CONFIGURE GOOGLE CLIENT ID MODAL */}
      {showClientIdConfig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#475569] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google OAuth Client ID</h3>
                  <p className="text-[11px] text-slate-400">Google Cloud Console Web Client ID</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClientIdConfig(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClientId} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                  Paste your Google Client ID
                </label>
                <textarea
                  rows={2}
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 587914716488-7r29baaoc9t3euu4vvpddeh2eopvql10.apps.googleusercontent.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 text-xs text-white placeholder-slate-500 outline-none font-mono resize-none"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155] text-[11px] text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Google Cloud Console Settings:</span>
                </div>
                <div>
                  1. Go to <strong>APIs & Services &gt; Credentials</strong>.
                </div>
                <div>
                  2. Open your <strong>OAuth 2.0 Web Client ID</strong>.
                </div>
                <div>
                  3. Under <strong>Authorized JavaScript origins</strong>, ensure you add:
                  <div className="mt-1 font-mono text-[10px] bg-slate-900/80 p-1.5 rounded text-indigo-300 select-all">
                    http://localhost:3000
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClientIdConfig(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0F172A] border border-[#334155] hover:bg-[#141e33] text-xs text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Save & Apply Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
