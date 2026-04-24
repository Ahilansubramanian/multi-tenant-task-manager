import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Shield, User, Trash2, RefreshCw } from 'lucide-react';

function InviteModal({ onClose, onInvite }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleInvite = async () => {
    if (!form.email || !form.name) { toast.error('Name and email required'); return; }
    setLoading(true);
    try {
      const res = await onInvite(form);
      setResult(res);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-md animate-slide-in">
        <div className="p-5 border-b border-surface-800 flex items-center justify-between">
          <h3 className="font-bold">Invite Member</h3>
          <button onClick={onClose} className="text-surface-500 hover:text-white">✕</button>
        </div>
        {result ? (
          <div className="p-5">
            <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4 mb-4">
              <p className="text-brand-400 font-semibold text-sm mb-1">Member invited!</p>
              <p className="text-surface-300 text-sm">Share these credentials securely:</p>
              <div className="mt-3 bg-surface-800 rounded-lg p-3 font-mono text-sm space-y-1">
                <div><span className="text-surface-500">Email: </span><span className="text-white">{result.member.email}</span></div>
                <div><span className="text-surface-500">Temp password: </span><span className="text-brand-400">{result.tempPassword}</span></div>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-surface-800 flex gap-3 justify-end">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={handleInvite} disabled={loading} className="btn-primary">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Invite'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);

  if (user?.role !== 'admin') {
    navigate('/dashboard');
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload) => api.post('/users/invite', payload),
    onSuccess: () => qc.invalidateQueries(['members']),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries(['members']); toast.success('Role updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['members']); toast.success('Member removed'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Members</h1>
          <p className="text-surface-400 text-sm mt-1">{data?.members?.length ?? '–'} members in {user?.org_name}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary">
          <UserPlus size={15} />
          Invite Member
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                {['Member', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {data?.members?.map(member => (
                <tr key={member.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {member.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.name}
                          {member.id === user.id && <span className="ml-2 text-xs text-surface-500">(you)</span>}
                        </p>
                        <p className="text-xs text-surface-500 font-mono">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.id === user.id ? (
                      <span className="badge bg-brand-500/10 text-brand-400">
                        <Shield size={10} />
                        {member.role}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={e => roleMutation.mutate({ id: member.id, role: e.target.value })}
                        className="text-xs bg-surface-800 border border-surface-700 text-surface-300 rounded-md px-2 py-1 focus:outline-none focus:border-brand-500"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${member.is_active ? 'bg-brand-500/10 text-brand-400' : 'bg-red-500/10 text-red-400'}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-500 font-mono">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {member.id !== user.id && (
                      <button
                        onClick={() => confirm('Remove this member?') && removeMutation.mutate(member.id)}
                        className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={async (payload) => {
            const res = await inviteMutation.mutateAsync(payload);
            return res.data;
          }}
        />
      )}
    </div>
  );
}
