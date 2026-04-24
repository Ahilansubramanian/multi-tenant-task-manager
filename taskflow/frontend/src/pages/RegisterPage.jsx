import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.orgName);
      toast.success('Organization created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg">TaskFlow</span>
        </div>

        <h2 className="text-3xl font-extrabold mb-2">Create workspace</h2>
        <p className="text-surface-400 mb-8">You'll be the admin of your new organization</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Organization name</label>
            <input className="input" placeholder="Acme Corp" value={form.orgName} onChange={set('orgName')} required />
          </div>
          <div>
            <label className="label">Your name</label>
            <input className="input" placeholder="Alice Smith" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="alice@acme.com" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Create workspace'
            }
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
