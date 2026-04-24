import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, Clock, AlertCircle, Circle, TrendingUp, Users, Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const STATUS_ICONS = {
  todo: <Circle size={14} className="text-surface-400" />,
  in_progress: <Clock size={14} className="text-blue-400" />,
  review: <AlertCircle size={14} className="text-yellow-400" />,
  done: <CheckCircle size={14} className="text-brand-400" />,
};

const STATUS_COLORS = { todo: '#71717a', in_progress: '#60a5fa', review: '#facc15', done: '#4ade80' };
const PRIORITY_COLORS = { low: '#71717a', medium: '#60a5fa', high: '#fb923c', urgent: '#f87171' };

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/tasks/stats').then(r => r.data),
  });

  const { data: recentTasks } = useQuery({
    queryKey: ['tasks', 'recent'],
    queryFn: () => api.get('/tasks?limit=5').then(r => r.data),
  });

  const statusData = stats?.byStatus?.map(s => ({
    name: s.status.replace('_', ' '),
    count: parseInt(s.count),
    color: STATUS_COLORS[s.status],
  })) || [];

  const total = statusData.reduce((s, d) => s + d.count, 0);
  const done = statusData.find(d => d.name === 'done')?.count || 0;

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">
            {user?.org_name} · {user?.role === 'admin' ? 'Admin' : 'Member'}
          </p>
        </div>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          <Plus size={15} />
          New Task
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tasks', value: total, icon: TrendingUp, color: 'text-white' },
          { label: 'In Progress', value: stats?.byStatus?.find(s => s.status === 'in_progress')?.count || 0, icon: Clock, color: 'text-blue-400' },
          { label: 'In Review', value: stats?.byStatus?.find(s => s.status === 'review')?.count || 0, icon: AlertCircle, color: 'text-yellow-400' },
          { label: 'Completed', value: done, icon: CheckCircle, color: 'text-brand-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <div className="text-3xl font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Status chart */}
        <div className="card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-brand-400" />
            Tasks by Status
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusData} barSize={32}>
              <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'Syne' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontFamily: 'Syne', fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top members */}
        {user?.role === 'admin' && (
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users size={15} className="text-brand-400" />
              Top Assignees
            </h3>
            <div className="space-y-3">
              {stats?.topMembers?.length === 0 && (
                <p className="text-surface-500 text-sm">No data yet</p>
              )}
              {stats?.topMembers?.map((m, i) => (
                <div key={m.email} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{m.name}</span>
                      <span className="text-sm font-bold text-brand-400 ml-2">{m.task_count}</span>
                    </div>
                    <div className="w-full bg-surface-800 rounded-full h-1 mt-1">
                      <div
                        className="bg-brand-500 h-1 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (m.task_count / (stats.topMembers[0]?.task_count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent tasks */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-surface-800 flex items-center justify-between">
          <h3 className="font-bold">Recent Tasks</h3>
          <button onClick={() => navigate('/tasks')} className="text-xs text-brand-400 hover:text-brand-300 font-medium">
            View all →
          </button>
        </div>
        <div className="divide-y divide-surface-800">
          {recentTasks?.tasks?.length === 0 && (
            <p className="p-5 text-surface-500 text-sm">No tasks yet. Create your first one!</p>
          )}
          {recentTasks?.tasks?.map(task => (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="flex items-center gap-4 p-4 hover:bg-surface-800/50 cursor-pointer transition-colors group"
            >
              <span>{STATUS_ICONS[task.status]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-brand-400 transition-colors">{task.title}</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {task.creator?.name} · {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`badge text-xs`} style={{
                background: PRIORITY_COLORS[task.priority] + '20',
                color: PRIORITY_COLORS[task.priority],
              }}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
