import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, Clock, AlertCircle, Circle,
  Edit3, Trash2, User, Calendar, Tag, History
} from 'lucide-react';

const STATUS_CONFIG = {
  todo: { label: 'To Do', icon: Circle, color: 'text-surface-400', bg: 'bg-surface-400/10' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  review: { label: 'Review', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  done: { label: 'Done', icon: CheckCircle, color: 'text-brand-400', bg: 'bg-brand-400/10' },
};

const PRIORITY_COLORS = { low: '#71717a', medium: '#60a5fa', high: '#fb923c', urgent: '#f87171' };

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`/tasks/${id}`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${id}`),
    onSuccess: () => { toast.success('Task deleted'); navigate('/tasks'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Access denied'),
  });

  const quickStatus = useMutation({
    mutationFn: (status) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries(['task', id]); toast.success('Status updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Access denied'),
  });

  if (isLoading) return (
    <div className="p-8 flex justify-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="p-8 text-surface-400">Task not found</div>;

  const { task, auditLogs } = data;
  const sc = STATUS_CONFIG[task.status];
  const StatusIcon = sc.icon;

  const canEdit = user?.role === 'admin' || task.created_by === user?.id;

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <button onClick={() => navigate('/tasks')} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft size={14} /> Back to Tasks
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-xl font-extrabold leading-snug">{task.title}</h1>
              {canEdit && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/tasks?edit=${id}`)}
                    className="p-2 text-surface-500 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => confirm('Delete this task?') && deleteMutation.mutate()}
                    className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {task.description ? (
              <p className="text-surface-300 text-sm leading-relaxed">{task.description}</p>
            ) : (
              <p className="text-surface-500 text-sm italic">No description</p>
            )}

            {task.tags?.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {task.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-surface-800 text-surface-400 px-2 py-1 rounded-md">
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick status change */}
          {canEdit && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Quick Status</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                  const Ic = v.icon;
                  return (
                    <button
                      key={k}
                      onClick={() => quickStatus.mutate(k)}
                      disabled={task.status === k}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        task.status === k
                          ? `${v.bg} ${v.color} cursor-default`
                          : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white'
                      }`}
                    >
                      <Ic size={12} /> {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audit log */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-surface-800 flex items-center gap-2">
              <History size={15} className="text-brand-400" />
              <h3 className="font-bold">Activity Log</h3>
              <span className="ml-auto text-xs text-surface-500">{auditLogs.length} events</span>
            </div>
            <div className="divide-y divide-surface-800 max-h-72 overflow-y-auto">
              {auditLogs.length === 0 && (
                <p className="p-4 text-sm text-surface-500">No activity yet</p>
              )}
              {auditLogs.map(log => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface-800 text-surface-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {log.user_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{log.user_name || 'Unknown'}</span>
                      {' '}
                      <span className="text-surface-400">{log.action} this task</span>
                    </p>
                    {log.changes && Object.keys(log.changes).length > 0 && log.action === 'updated' && (
                      <div className="mt-1 text-xs text-surface-500 font-mono space-y-0.5">
                        {Object.entries(log.changes).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-surface-400">{k}:</span>{' '}
                            <span className="line-through text-red-400/60">{String(v.from)}</span>{' → '}
                            <span className="text-brand-400">{String(v.to)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-surface-500 flex-shrink-0 font-mono">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <p className="label">Status</p>
              <span className={`badge ${sc.bg} ${sc.color}`}>
                <StatusIcon size={11} />
                {sc.label}
              </span>
            </div>
            <div>
              <p className="label">Priority</p>
              <span className="badge" style={{ background: PRIORITY_COLORS[task.priority] + '20', color: PRIORITY_COLORS[task.priority] }}>
                {task.priority}
              </span>
            </div>
            <div>
              <p className="label flex items-center gap-1"><User size={10} /> Creator</p>
              <p className="text-sm text-surface-300">{task.creator?.name}</p>
              <p className="text-xs text-surface-500 font-mono">{task.creator?.email}</p>
            </div>
            {task.assignee && (
              <div>
                <p className="label flex items-center gap-1"><User size={10} /> Assigned to</p>
                <p className="text-sm text-surface-300">{task.assignee.name}</p>
                <p className="text-xs text-surface-500 font-mono">{task.assignee.email}</p>
              </div>
            )}
            {task.due_date && (
              <div>
                <p className="label flex items-center gap-1"><Calendar size={10} /> Due date</p>
                <p className="text-sm text-surface-300 font-mono">
                  {new Date(task.due_date).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="label">Created</p>
              <p className="text-xs text-surface-500 font-mono">{new Date(task.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="label">Last updated</p>
              <p className="text-xs text-surface-500 font-mono">{new Date(task.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
