'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  X,
  Zap,
  Globe,
  Link2,
} from 'lucide-react';
import type { LaunchIssue, LaunchTask, QuickLink } from '@/types/launch';
import { ISSUE_SEVERITIES, ISSUE_STATUSES, TASK_PRIORITIES } from '@/types/launch';

interface LaunchDayDashboardProps {
  collectionId: string;
}

function useLocalStorage<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);

  return [state, setState];
}

export function LaunchDayDashboard({ collectionId }: LaunchDayDashboardProps) {
  const storageKey = (sub: string) => `olawave_launch_${collectionId}_${sub}`;

  const [issues, setIssues] = useLocalStorage<LaunchIssue[]>(storageKey('issues'), []);
  const [tasks, setTasks] = useLocalStorage<LaunchTask[]>(storageKey('tasks'), []);
  const [links, setLinks] = useLocalStorage<QuickLink[]>(storageKey('links'), []);

  // Modals
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  // ── Issue Form ──
  const [issueTitle, setIssueTitle] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<LaunchIssue['severity']>('medium');
  const [issueDesc, setIssueDesc] = useState('');

  const addIssue = useCallback(() => {
    if (!issueTitle.trim()) return;
    const issue: LaunchIssue = {
      id: crypto.randomUUID(),
      title: issueTitle.trim(),
      severity: issueSeverity,
      status: 'open',
      description: issueDesc.trim(),
      created_at: new Date().toISOString(),
    };
    setIssues((prev) => [issue, ...prev]);
    setIssueTitle(''); setIssueDesc(''); setIssueSeverity('medium'); setShowIssueForm(false);
  }, [issueTitle, issueSeverity, issueDesc, setIssues]);

  const updateIssueStatus = useCallback((id: string, status: LaunchIssue['status']) => {
    setIssues((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }, [setIssues]);

  const deleteIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
  }, [setIssues]);

  // ── Task Form ──
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<LaunchTask['priority']>('medium');

  const addTask = useCallback(() => {
    if (!taskTitle.trim()) return;
    const task: LaunchTask = {
      id: crypto.randomUUID(),
      title: taskTitle.trim(),
      assignee: taskAssignee.trim() || 'Unassigned',
      status: 'pending',
      priority: taskPriority,
    };
    setTasks((prev) => [task, ...prev]);
    setTaskTitle(''); setTaskAssignee(''); setTaskPriority('medium'); setShowTaskForm(false);
  }, [taskTitle, taskAssignee, taskPriority, setTasks]);

  const cycleTaskStatus = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const next: Record<LaunchTask['status'], LaunchTask['status']> = {
        pending: 'in_progress', in_progress: 'done', done: 'pending',
      };
      return { ...t, status: next[t.status] };
    }));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setTasks]);

  // ── Link Form ──
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPlatform, setLinkPlatform] = useState('');

  const addLink = useCallback(() => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    const link: QuickLink = {
      id: crypto.randomUUID(),
      label: linkLabel.trim(),
      url: linkUrl.trim(),
      platform: linkPlatform.trim() || 'Other',
    };
    setLinks((prev) => [...prev, link]);
    setLinkLabel(''); setLinkUrl(''); setLinkPlatform(''); setShowLinkForm(false);
  }, [linkLabel, linkUrl, linkPlatform, setLinks]);

  const deleteLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, [setLinks]);

  // Summaries
  const openIssues = issues.filter((i) => i.status !== 'resolved').length;
  const criticalIssues = issues.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <Zap className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
          <p className="text-xs text-gray-500">Total Issues</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
          <p className="text-2xl font-bold text-red-600">{criticalIssues}</p>
          <p className="text-xs text-gray-500">Critical Open</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{openIssues}</p>
          <p className="text-xs text-gray-500">Open Issues</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{doneTasks}/{tasks.length}</p>
          <p className="text-xs text-gray-500">Tasks Done</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Quick Links</h3>
          </div>
          <button
            onClick={() => setShowLinkForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-3 w-3" /> Add Link
          </button>
        </div>
        {links.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Add quick links to your website, social profiles, email tool, etc.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {links.map((link) => (
              <div key={link.id} className="group flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors">
                <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-blue-600 truncate flex-1"
                >
                  {link.label}
                </a>
                <ExternalLink className="h-3 w-3 text-gray-300" />
                <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Link Form */}
        {showLinkForm && (
          <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <input value={linkPlatform} onChange={(e) => setLinkPlatform(e.target.value)} placeholder="Platform" className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowLinkForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button onClick={addLink} className="text-xs font-medium bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Issue Log */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-gray-900">Issue Log</h3>
            <span className="text-xs text-gray-400">Registro de incidencias</span>
          </div>
          <button
            onClick={() => setShowIssueForm(true)}
            className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-100"
          >
            <Plus className="h-3 w-3" /> Report Issue
          </button>
        </div>

        {/* Issue form */}
        {showIssueForm && (
          <div className="bg-red-50/50 rounded-xl p-4 mb-4 space-y-3 border border-red-100">
            <input
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="Issue title..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="flex gap-2">
              <select
                value={issueSeverity}
                onChange={(e) => setIssueSeverity(e.target.value as LaunchIssue['severity'])}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                {ISSUE_SEVERITIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <textarea
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="Description (optional)..."
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowIssueForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button onClick={addIssue} disabled={!issueTitle.trim()} className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-40">Report</button>
            </div>
          </div>
        )}

        {/* Issues list */}
        {issues.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No issues reported yet. Good sign!</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => {
              const sevConfig = ISSUE_SEVERITIES.find((s) => s.id === issue.severity);
              const statusConfig = ISSUE_STATUSES.find((s) => s.id === issue.status);
              return (
                <div key={issue.id} className="group flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: sevConfig?.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${issue.status === 'resolved' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {issue.title}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase"
                        style={{ backgroundColor: sevConfig?.color + '20', color: sevConfig?.color }}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    {issue.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{issue.description}</p>
                    )}
                  </div>
                  <select
                    value={issue.status}
                    onChange={(e) => updateIssueStatus(issue.id, e.target.value as LaunchIssue['status'])}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                    style={{ color: statusConfig?.color }}
                  >
                    {ISSUE_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <button onClick={() => deleteIssue(issue.id)} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Assignments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Team Tasks</h3>
            <span className="text-xs text-gray-400">Tareas del equipo</span>
          </div>
          <button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-100"
          >
            <Plus className="h-3 w-3" /> Add Task
          </button>
        </div>

        {/* Task form */}
        {showTaskForm && (
          <div className="bg-blue-50/50 rounded-xl p-4 mb-4 space-y-3 border border-blue-100">
            <div className="grid grid-cols-3 gap-2">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="col-span-2 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                placeholder="Assignee..."
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex items-center gap-2 justify-between">
              <div className="flex gap-1">
                {TASK_PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTaskPriority(p.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      taskPriority === p.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowTaskForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
                <button onClick={addTask} disabled={!taskTitle.trim()} className="text-xs font-medium bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-40">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks list */}
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No tasks added yet. Assign launch day tasks to your team.</p>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const prioConfig = TASK_PRIORITIES.find((p) => p.id === task.priority);
              return (
                <div key={task.id} className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <button onClick={() => cycleTaskStatus(task.id)} className="flex-shrink-0">
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : task.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{task.assignee}</span>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: prioConfig?.color }}
                    title={prioConfig?.label}
                  />
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
