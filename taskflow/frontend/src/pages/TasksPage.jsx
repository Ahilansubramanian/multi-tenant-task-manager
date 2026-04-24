import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, CheckCircle, Clock, AlertCircle,
  Circle, Trash2, Edit3, ChevronLeft, ChevronRight
} from 'lucide-react';

const STATUS_CONFIG = {
  todo: { label: 'To Do', icon: Circle, color: 'text-surface-400', bg: 'bg-surface-400/10' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  review: { label: 'Review', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  done: { label: 'Done', icon: CheckCircle, color: 'text-brand-400', bg: 'bg-brand-400/10' },
};

const PRIORITY_COLORS = { low: '#71717a', medium: '#60a5fa', high: '#fb923c', urgent: '#f87171' };

function TaskModal({ task, members, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    tags: task?.tags?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    const payload = {
      ...form,
      assigned_to: form.assigned_to || undefined,
      due_date: form.due_date || undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg animate-slide-in">
        <div className="p-5 border-b border-surface-800 flex items-center justify-between">
          <h3 className="font-bold">{task ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="text-surface-500 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Task title" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none h-20" value={form.description} onChange={set('description')} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={set('priority')}>
                {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div>
              <label className="label">Assign to</label>
              <select className="input" value={form.assigned_to} onChange={set('assigned_to')}>
                <option value="">Unassigned</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={form.due_date} onChange={set('due_date')} />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input" value={form.tags} onChange={set('tags')} placeholder="frontend, bug, v2" />
          </div>
        </div>
        <div className="p-5 border-t border-surface-800 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : task ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [filters, setFilters] = useState({ status: '', priority: '', search: '', page: 1 });
  const [modal, setModal] = useState(null); // null | 'create' | task-object

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => {
      const p = new URLSearchParams({ page: filters.page, limit: 15 });
      if (filters.status) p.set('status', filters.status);
      if (filters.priority) p.set('priority', filters.priority);
      if (filters.search) p.set('search', filters.search);
      return api.get(`/tasks?${p}`).then(r => r.data);
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tasks', payload),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['stats']); setModal(null); toast.success('Task created'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/tasks/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['stats']); setModal(null); toast.success('Task updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['stats']); toast.success('Task deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Access denied'),
  });

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) deleteMutation.mutate(id);
  };

  const setFilter = k => v => setFilters(p => ({ ...p, [k]: v, page: 1 }));

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Tasks</h1>
          <p className="text-surface-400 text-sm mt-1">
            {data?.pagination?.total ?? '–'} tasks total
          </p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={15} />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            className="input pl-8"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={e => setFilter('search')(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={filters.status} onChange={e => setFilter('status')(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input w-auto" value={filters.priority} onChange={e => setFilter('priority')(e.target.value)}>
          <option value="">All priorities</option>
          {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tasks table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.tasks?.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={32} className="text-surface-700 mx-auto mb-3" />
            <p className="text-surface-400 font-medium">No tasks found</p>
            <p className="text-surface-500 text-sm mt-1">Try adjusting your filters or create a new task</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  {['Task', 'Status', 'Priority', 'Assignee', 'Due', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {data.tasks.map(task => {
                  const sc = STATUS_CONFIG[task.status];
                  const Icon = sc.icon;
                  return (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="hover:bg-surface-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-medium truncate group-hover:text-brand-400 transition-colors">{task.title}</p>
                        {task.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {task.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs bg-surface-800 text-surface-400 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${sc.bg} ${sc.color}`}>
                          <Icon size={10} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge text-xs font-semibold" style={{
                          background: PRIORITY_COLORS[task.priority] + '20',
                          color: PRIORITY_COLORS[task.priority],
                        }}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-400">
                        {task.assignee?.name || <span className="text-surface-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-400 font-mono text-xs">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : <span className="text-surface-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setModal(task); }}
                            className="p-1.5 text-surface-500 hover:text-white hover:bg-surface-700 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={e => handleDelete(e, task.id)}
                            className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {data.pagination.pages > 1 && (
              <div className="p-4 border-t border-surface-800 flex items-center justify-between">
                <span className="text-xs text-surface-500">
                  Page {data.pagination.page} of {data.pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                    disabled={filters.page === 1}
                    className="btn-ghost py-1.5 px-2 disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                    disabled={filters.page === data.pagination.pages}
                    className="btn-ghost py-1.5 px-2 disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          members={membersData?.members || []}
          onClose={() => setModal(null)}
          onSave={async (payload) => {
            if (modal === 'create') await createMutation.mutateAsync(payload);
            else await updateMutation.mutateAsync({ id: modal.id, ...payload });
          }}
        />
      )}
    </div>
  );
}
