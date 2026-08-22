import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';
import { Card } from '../ui/Card.js';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { Logo } from '../shared/Logo.js';
import { showToast } from '../ui/Toast.js';
import {
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  UserCheck,
  Building2,
  BadgeCheck
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, verifyEmail, theme, toggleTheme } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up state
  const [signupEmployeeId, setSignupEmployeeId] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<'employee' | 'admin'>('employee');
  const [signupDept, setSignupDept] = useState('Engineering');
  const [signupTitle, setSignupTitle] = useState('Software Engineer');

  // Verification modal state
  const [verificationPending, setVerificationPending] = useState<{
    email: string;
    token: string;
  } | null>(null);
  const [manualToken, setManualToken] = useState('');

  // Password strength calculations
  const hasLength = signupPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(signupPassword);
  const hasNumber = /[0-9]/.test(signupPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(signupPassword);
  const passScore = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Missing credentials', 'warning', 'Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signIn({ email, password });
      showToast('Welcome back', 'success', 'Signed in successfully to Dayflow.');
    } catch (err: any) {
      if (err.message?.includes('Email verification required')) {
        showToast('Verification Required', 'warning', 'Please verify your email address to log in.');
      } else {
        showToast('Authentication Failed', 'error', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasLength || !hasUpper || !hasNumber || !hasSpecial) {
      showToast('Weak Password', 'error', 'Please fulfill all four password security requirements.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp({
        employee_id: signupEmployeeId,
        full_name: signupFullName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
        department: signupDept,
        job_title: signupTitle
      });

      setVerificationPending({
        email: res.email,
        token: res.verificationToken
      });
      setManualToken(res.verificationToken);
      showToast('Account Created', 'success', 'Please verify your email address.');
    } catch (err: any) {
      showToast('Sign Up Failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!manualToken) return;
    setLoading(true);
    try {
      await verifyEmail(manualToken);
      showToast('Email Verified', 'success', 'Your email is now verified! You can sign in.');
      setEmail(verificationPending?.email || signupEmail);
      setPassword(signupPassword);
      setVerificationPending(null);
      setTab('signin');
    } catch (err: any) {
      showToast('Verification Failed', 'error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (role: 'admin' | 'employee_alex' | 'employee_sarah') => {
    setTab('signin');
    if (role === 'admin') {
      setEmail('admin@dayflow.internal');
      setPassword('Admin@12345');
      showToast('HR Admin Credentials Set', 'info', 'Elena Rostova (Head of People)');
    } else if (role === 'employee_alex') {
      setEmail('alex.rivers@dayflow.internal');
      setPassword('Employee@12345');
      showToast('Employee Credentials Set', 'info', 'Alex Rivers (Engineering)');
    } else {
      setEmail('sarah.chen@dayflow.internal');
      setPassword('Employee@12345');
      showToast('Employee Credentials Set', 'info', 'Sarah Chen (Product)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10 object-contain shrink-0" />
            <div>
              <span className="font-display font-semibold text-slate-900 dark:text-white tracking-tight text-xl">
                Dayflow
              </span>
              <span className="stamp ml-2 align-middle bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-400/60" style={{ ['--stamp-tilt' as any]: '0.8deg' }}>
                Ledger v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Context Pitch */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="stamp bg-emerald-50 dark:bg-emerald-950/50 border-emerald-700/60 text-emerald-800 dark:text-emerald-300" style={{ ['--stamp-tilt' as any]: '-1.4deg' }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Every hour, on the record</span>
            </div>

            <h1 className="font-display text-4xl sm:text-[2.75rem] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.08]">
              A single ledger for<br />
              every workday<span className="text-emerald-700 dark:text-emerald-400">.</span>
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
              One line per shift, one stamp per decision. Dayflow keeps attendance, leave, and payroll in a single running record — separate portals for employees and HR, synced the moment anything changes.
            </p>

            {/* Quick Demo Credentials Panel */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                  Index — Demo Sign-ins
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Pre-seeded
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('admin')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Elena Rostova <span className="font-normal text-slate-400">— HR Admin</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Approvals · Analytics · Payroll
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickDemo('employee_alex')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Alex Rivers <span className="font-normal text-slate-400">— Employee</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Attendance · Leave · Payslip
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-md">
              {/* Segmented Tab Switcher */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => setTab('signin')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    tab === 'signin'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    tab === 'signup'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email Verification Banner if just registered */}
              {verificationPending && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-left space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                    <Mail className="w-4 h-4" />
                    <span>Email Verification Token Generated</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    A mock verification link was dispatched for <strong>{verificationPending.email}</strong>. In production, this goes to SMTP.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Token"
                      className="text-xs px-2.5 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-mono flex-1 text-slate-800 dark:text-slate-200"
                    />
                    <Button size="sm" variant="primary" onClick={handleVerifyEmail} isLoading={loading}>
                      Verify & Activate
                    </Button>
                  </div>
                </div>
              )}

              {/* SIGN IN FORM */}
              {tab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4 text-left">
                  <Input
                    label="Corporate Email"
                    type="email"
                    placeholder="name@dayflow.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                      <span>Remember this session (7 days)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => showToast('Password Reset', 'info', 'Please contact Elena Rostova in HR Operations to reset credentials.')}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    isLoading={loading}
                  >
                    Sign In to Portal
                  </Button>
                </form>
              ) : (
                /* SIGN UP FORM */
                <form onSubmit={handleSignUp} className="space-y-4 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Employee ID"
                      placeholder="e.g. EMP042"
                      value={signupEmployeeId}
                      onChange={(e) => setSignupEmployeeId(e.target.value)}
                      leftIcon={<BadgeCheck className="w-4 h-4" />}
                      required
                    />

                    <Input
                      label="Full Legal Name"
                      placeholder="e.g. Jordan Hayes"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      leftIcon={<UserCheck className="w-4 h-4" />}
                      required
                    />
                  </div>

                  <Input
                    label="Corporate Email Address"
                    type="email"
                    placeholder="jordan.hayes@dayflow.internal"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Department
                      </label>
                      <select
                        value={signupDept}
                        onChange={(e) => setSignupDept(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Design">Design</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Operations">Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Portal Role
                      </label>
                      <select
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      >
                        <option value="employee">Employee (Self-Service)</option>
                        <option value="admin">HR Admin (Management & Approvals)</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Password"
                    type="password"
                    placeholder="Create a strong password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />

                  {/* Live Password Strength Meter */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-600 dark:text-slate-400">Password Strength:</span>
                      <span
                        className={
                          passScore === 4
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : passScore >= 2
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {passScore === 4 ? 'Strong' : passScore >= 2 ? 'Moderate' : 'Too Weak'}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            passScore >= step
                              ? passScore === 4
                                ? 'bg-emerald-500'
                                : passScore >= 2
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Rule checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {hasLength ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                        <span>Min. 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {hasUpper ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                        <span>1 uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {hasNumber ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                        <span>1 number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {hasSpecial ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                        <span>1 special char (!@#$)</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    isLoading={loading}
                  >
                    Register Employee Account
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
