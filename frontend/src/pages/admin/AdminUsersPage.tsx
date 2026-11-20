import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../lib/api';
import { changeAdminUserRole, listAdminUsers } from '../../lib/adminApi';
import type { AdminUser } from '../../types/admin';
import type { UserRole } from '../../types/auth';
import { formatDateTime } from '../../utils/format';

const ROLES: UserRole[] = ['APPLICANT', 'REVIEWER', 'ADMIN'];

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listAdminUsers({
          q: search || undefined,
          role: roleFilter || undefined,
        });
        if (!cancelled) setUsers(response.data.users);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load users');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [search, roleFilter]);

  async function onRoleChange(userId: string, role: UserRole) {
    setBusyId(userId);
    setError(null);
    setMessage(null);
    try {
      const response = await changeAdminUserRole(userId, role);
      setUsers((current) =>
        current.map((item) => (item.id === userId ? { ...item, ...response.data.user } : item)),
      );
      setMessage(`Updated role for ${response.data.user.email} to ${role}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to change role');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="panel__eyebrow">Administration</p>
          <h2>Users</h2>
          <p>Search registered accounts and assign roles. Passwords are never shown.</p>
        </div>
        <Link className="btn btn--secondary" to="/admin/dashboard">
          Dashboard
        </Link>
      </div>

      <form
        className="filter-bar"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setSearch(q.trim());
        }}
      >
        <div className="form-field">
          <label htmlFor="user-search">Search</label>
          <input
            id="user-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Name or email"
          />
        </div>
        <div className="form-field">
          <label htmlFor="role-filter">Role</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as '' | UserRole)}
          >
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {message ? (
        <div className="alert alert--success" role="status">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="muted">Loading users…</p> : null}

      {!loading && users.length === 0 ? (
        <div className="empty-state">
          <h3>No users found</h3>
          <p>Try a different search term or role filter.</p>
        </div>
      ) : null}

      {!loading && users.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Created</th>
                <th scope="col">Change role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = currentUser?.id === user.id;
                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>
                      <select
                        aria-label={`Change role for ${user.email}`}
                        value={user.role}
                        disabled={isSelf || busyId === user.id}
                        onChange={(event) =>
                          void onRoleChange(user.id, event.target.value as UserRole)
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      {isSelf ? <div className="field-hint">Own role locked</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
