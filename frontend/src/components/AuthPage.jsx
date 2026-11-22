import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { MOCK_DEVELOPERS } from "../data/mockFiles";

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
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Full Stack Developer");
  
  // UI states
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Pre-configured Google mock accounts for instant 1-click test login
  const googleAccounts = [
    {
      name: "Malika",
      email: "malika237581@gmail.com",
      role: "Full Stack Developer",
      avatarColor: "#8B5CF6",
      avatarLetter: "M",
    },
    {
      name: "Tanmay",
      email: "tanmay.ratnawat@devsync.io",
      role: "Platform Engineer",
      avatarColor: "#22C55E",
      avatarLetter: "T",
    },
    {
      name: "Trisha",
      email: "trisha.lead@devsync.io",
      role: "Lead Backend",
      avatarColor: "#6366F1",
      avatarLetter: "T",
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setError("Please enter your display name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    // Simulate authentication latency
    setTimeout(() => {
      setIsLoading(false);

      if (isLogin) {
        // Check if matches one of the known mock developers or existing users
        const existing = MOCK_DEVELOPERS.find(
          (d) => d.email?.toLowerCase() === email.toLowerCase() || d.name.toLowerCase() === email.split("@")[0].toLowerCase()
        );

        if (existing) {
          onAuthSuccess(existing);
        } else {
          // Dynamic authenticated user
          const authenticatedUser = {
            id: "dev_" + Math.random().toString(36).substring(2, 10),
            name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
            email,
            role: "Developer",
            avatarColor: "#6366F1",
            authProvider: "email",
            createdAt: new Date().toISOString(),
          };
          onAuthSuccess(authenticatedUser);
        }
      } else {
        // Sign up
        const newUser = {
          id: "dev_" + Math.random().toString(36).substring(2, 10),
          name: name.trim(),
          email: email.trim(),
          role: role || "Developer",
          avatarColor: "#8B5CF6",
          authProvider: "email",
          createdAt: new Date().toISOString(),
        };
        onAuthSuccess(newUser);
      }
    }, 700);
  };

  const handleGoogleLogin = (acc) => {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      setShowGoogleModal(false);

      const googleUser = {
        id: "goog_" + Math.random().toString(36).substring(2, 10),
        name: acc.name,
        email: acc.email,
        role: acc.role,
        avatarColor: acc.avatarColor,
        authProvider: "google",
        createdAt: new Date().toISOString(),
      };
      onAuthSuccess(googleUser);
    }, 600);
  };

  const handleQuickFill = (dev) => {
    setEmail(`${dev.name.toLowerCase()}@devsync.io`);
    setPassword("password123");
    setName(dev.name);
    setRole(dev.role);
    setError("");
  };

  return (
    <div className="min-h-screen w-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Grid and Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to workspace shortcut if navigating from header */}
      {onBackToWorkspace && (
        <button
          onClick={onBackToWorkspace}
          className="absolute top-6 left-6 inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#1E293B]/70 border border-[#334155] hover:border-slate-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Workspace</span>
        </button>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-500 shadow-xl shadow-indigo-500/20 mb-3 border border-indigo-400/30">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-2">
            <span>DevSync</span>
            <span className="text-[11px] font-mono font-normal text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              Auth v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {isLogin 
              ? "Sign in to acquire symbol locks and coordinate changes in real-time"
              : "Create a developer profile to join the concurrency control mesh"}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#1E293B]/90 backdrop-blur-md border border-[#334155] rounded-2xl p-6 shadow-2xl relative">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#0F172A] rounded-xl border border-[#334155] mb-5 text-xs font-semibold">
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
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            disabled={googleLoading || isLoading}
            onClick={() => setShowGoogleModal(true)}
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

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-[#334155]" />
            <span className="absolute bg-[#1E293B] px-3 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Or with email
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 flex items-center space-x-2 text-xs text-rose-200 animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Display Name (Only in Signup mode) */}
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
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Malika"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Developer Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="malika@devsync.io"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-[#334155] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Role (Only in Signup mode) */}
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
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setError("Password reset is currently linked to your Git provider.")}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                )}
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
                  <span>{isLogin ? "Sign In to DevSync" : "Complete Registration"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-click Demo Fill */}
          <div className="mt-5 pt-4 border-t border-[#334155]">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
              <span className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Quick Fill Demo Developer:</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_DEVELOPERS.map((dev) => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => handleQuickFill(dev)}
                  className="px-2 py-1 rounded bg-[#0F172A] border border-[#334155] hover:border-indigo-500 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <span 
                    className="h-2 w-2 rounded-full inline-block"
                    style={{ backgroundColor: dev.avatarColor }}
                  />
                  <span>{dev.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="mt-5 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>Secured by lease-managed ephemeral token handshake</span>
        </div>
      </div>

      {/* Google Sign-In Simulation Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#475569] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
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
              <div>
                <h3 className="text-sm font-semibold text-white">Choose a Google Account</h3>
                <p className="text-[11px] text-slate-400">to continue to DevSync Engine</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {googleAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGoogleLogin(acc)}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl bg-[#0F172A] border border-[#334155] hover:border-indigo-500 hover:bg-[#141e33] transition-all text-left cursor-pointer group"
                >
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-inner"
                    style={{ backgroundColor: acc.avatarColor }}
                  >
                    {acc.avatarLetter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{acc.email}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-white rounded-lg bg-[#0F172A] border border-[#334155] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
