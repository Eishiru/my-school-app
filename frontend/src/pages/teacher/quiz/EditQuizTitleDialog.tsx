import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

export default function EditQuizTitleDialog({ quiz, onClose, onSaved }: {
  quiz: { id: number; title: string }; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [title, setTitle] = useState(quiz.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !title.trim()) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const stored = localStorage.getItem('user');
      const token = stored ? JSON.parse(stored).token : null;
      if (!token) throw new Error('Please sign in again.');
      const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
      const api = base.endsWith('/api') ? base : `${base}/api`;
      const response = await fetch(`${api}/teacher/quizzes/${quiz.id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || (data ? JSON.stringify(data) : `Unable to save (${response.status}).`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the title.');
      busy.current = false; setSaving(false);
      return;
    }
    busy.current = false;
    onSaved();
    onClose();
  }
  return <dialog ref={dialog} aria-labelledby="edit-title-heading" onCancel={event => {
    event.preventDefault(); if (!busy.current) onClose();
  }} className="m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-900/40">
    <form onSubmit={save} className="space-y-4">
      <h2 id="edit-title-heading" className="text-lg font-bold text-slate-900">Edit activity title</h2>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <label className="block text-sm font-semibold">Title
        <input autoFocus required maxLength={255} value={title} disabled={saving}
          onChange={event => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border px-3 py-2 disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={saving || !title.trim() || title.trim() === quiz.title}
          className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save title'}</button>
      </div>
    </form>
  </dialog>;
}
