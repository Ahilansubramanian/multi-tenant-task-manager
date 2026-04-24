import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, Chrome } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email) => setForm({ email, password: 'password123' });

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-surface-900 via-surface-950 to-brand-900/20 flex-col justify-between p-12 border-r border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight">TaskFlow</span>
        </div>

        <div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            Multi-tenant<br />
            <span className="text-brand-400">task management</span><br />
            done right.
          </h1>
          <p className="text-surface-400 text-lg leading-relaxed">
            Role-based access control. Strict tenant isolation.<br />
            Full audit trails. Built for teams.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Demo Accounts</p>
          {[
            { label: 'Acme Corp — Admin', email: 'admin@acme.com' },
            { label: 'Acme Corp — Member', email: 'bob@acme.com' },
            { label: 'Globex Inc — Admin', email: 'admin@globex.com' },
          ].map(({ label, email }) => (
            <button
              key={email}
              onClick={() => fillDemo(email)}
              className="w-full text-left px-4 py-3 bg-surface-800/50 hover:bg-surface-800 border border-surface-700 hover:border-brand-500/50 rounded-lg text-sm transition-all group"
            >
              <span className="text-surface-300 group-hover:text-white font-medium">{label}</span>
              <span className="text-surface-500 group-hover:text-surface-400 block text-xs font-mono mt-0.5">{email} / password123</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg">TaskFlow</span>
          </div>

          <h2 className="text-3xl font-extrabold mb-2">Sign in</h2>
          <p className="text-surface-400 mb-8">Access your organization's workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-950 px-3 text-xs text-surface-500">or continue with</span>
            </div>
          </div>

          <a
            href="/api/auth/google"
            className="btn-ghost w-full justify-center border border-surface-700 hover:border-surface-600 py-2.5"
          >
            <Chrome size={16} />
            Google
          </a>

          <p className="mt-6 text-center text-sm text-surface-400">
            No account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
