'use client';
import { useCallback, useEffect, useState } from 'react';

const blank = { product: '', plan: 'standard', customer_name: '', customer_email: '', max_activations: 1, expires_at: '', notes: '' };

export default function Admin() {
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(blank);
  const [note, setNote] = useState(null);
  const [q, setQ] = useState('');

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(path, {
      ...opts,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || r.statusText);
    return data;
  }, [token]);

  const load = useCallback(async () => {
    try { setRows((await api('/api/admin/licenses')).licenses); }
    catch (e) { setNote({ err: true, text: e.message }); setRows(null); }
  }, [api]);

  useEffect(() => { try { setToken(sessionStorage.getItem('admin_token') || ''); } catch {} }, []);
  useEffect(() => { if (token) load(); }, [token, load]);

  const signIn = (e) => {
    e.preventDefault();
    try { sessionStorage.setItem('admin_token', input); } catch {}
    setToken(input);
  };
  const signOut = () => { try { sessionStorage.removeItem('admin_token'); } catch {} setToken(''); setRows(null); };

  const create = async (e) => {
    e.preventDefault();
    try {
      const { license } = await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify(form) });
      setNote({ text: `License created: ${license.key}` });
      setForm({ ...blank, product: form.product });
      load();
    } catch (err) { setNote({ err: true, text: err.message }); }
  };

  const act = async (id, action, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    try { await api(`/api/admin/licenses/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) }); load(); }
    catch (err) { setNote({ err: true, text: err.message }); }
  };
  const remove = async (id) => {
    if (!confirm('Delete this license and its activations? This cannot be undone.')) return;
    try { await api(`/api/admin/licenses/${id}`, { method: 'DELETE' }); load(); }
    catch (err) { setNote({ err: true, text: err.message }); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const state = (l) => l.status === 'revoked' ? 'revoked' : (l.expires_at && new Date(l.expires_at) < new Date()) ? 'expired' : 'active';
  const shown = (rows || []).filter((l) =>
    [l.key, l.product, l.customer_name, l.customer_email].join(' ').toLowerCase().includes(q.toLowerCase()));

  if (!token) {
    return (
      <main style={{ maxWidth: 420 }}>
        <h1>License registry</h1>
        <p className="sub">Sign in with the admin token.</p>
        {note && <div className="note err">{note.text}</div>}
        <form className="panel" onSubmit={signIn}>
          <label>Admin token
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoFocus required />
          </label>
          <div className="row"><button type="submit">Sign in</button></div>
        </form>
      </main>
    );
  }

  return (
    <main>
      <div className="toolbar">
        <div><h1>License registry</h1><p className="sub" style={{ margin: 0 }}>Issue, revoke and monitor licenses for all your products.</p></div>
        <button className="ghost" onClick={signOut}>Sign out</button>
      </div>

      {note && <div className={`note ${note.err ? 'err' : ''}`}>{note.text}</div>}

      <form className="panel" onSubmit={create}>
        <h2>Issue a license</h2>
        <div className="grid">
          <label>Product ID<input value={form.product} onChange={set('product')} placeholder="my-app" required /></label>
          <label>Plan<input value={form.plan} onChange={set('plan')} /></label>
          <label>Customer name<input value={form.customer_name} onChange={set('customer_name')} /></label>
          <label>Customer email<input type="email" value={form.customer_email} onChange={set('customer_email')} /></label>
          <label>Max devices<input type="number" min="1" value={form.max_activations} onChange={set('max_activations')} /></label>
          <label>Expires on (blank = never)<input type="date" value={form.expires_at} onChange={set('expires_at')} /></label>
        </div>
        <div className="row"><button type="submit">Create license</button></div>
      </form>

      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Licenses{rows ? ` (${shown.length})` : ''}</h2>
          <input placeholder="Search key, product or customer" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Key</th><th>Product</th><th>Customer</th><th>Devices</th><th>Expires</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows === null && <tr><td colSpan="7">Loading…</td></tr>}
              {rows && !shown.length && <tr><td colSpan="7">No licenses yet. Issue one above.</td></tr>}
              {shown.map((l) => (
                <tr key={l.id}>
                  <td className="key">{l.key}</td>
                  <td>{l.product}</td>
                  <td>{l.customer_name || l.customer_email || '—'}</td>
                  <td>{l.activations} / {l.max_activations}</td>
                  <td>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'Never'}</td>
                  <td><span className={`tag ${state(l)}`}>{state(l)}</span></td>
                  <td>
                    <div className="actions">
                      <button className="ghost" onClick={() => navigator.clipboard?.writeText(l.key)}>Copy key</button>
                      <button className="ghost" onClick={() => act(l.id, 'reset_activations', 'Free all devices for this license?')}>Reset devices</button>
                      {l.status === 'active'
                        ? <button className="danger" onClick={() => act(l.id, 'revoke', 'Revoke this license? Clients will be blocked on their next check.')}>Revoke</button>
                        : <button className="ghost" onClick={() => act(l.id, 'restore')}>Restore</button>}
                      <button className="danger" onClick={() => remove(l.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
