import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/auth';
import { ApiError } from '../lib/api';

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  {
    to: '/applications',
    label: 'Applications',
    roles: ['APPLICANT', 'REVIEWER', 'ADMIN'],
  },
  {
    to: '/documents',
    label: 'Documents',
    roles: ['APPLICANT', 'REVIEWER', 'ADMIN'],
  },
  {
    to: '/reviews',
    label: 'Reviews',
    roles: ['REVIEWER', 'ADMIN'],
  },
  {
    to: '/settings',
    label: 'Administration',
    roles: ['ADMIN'],
  },
];

function pageTitle(pathname: string, items: NavItem[]): string {
  const match = items.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  return match?.label ?? 'DocVerify AI';
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const visibleNav = useMemo(() => {
    if (!user) {
      return [];
    }

    return navItems.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user]);

  const closeSidebar = () => setSidebarOpen(false);

  async function handleLogout() {
    setLogoutError(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error instanceof ApiError ? error.message : 'Logout failed');
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen ? (
        <button
          type="button"
          className="backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      ) : null}

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`} aria-label="Primary">
        <div className="brand">
          <p className="brand__name">DocVerify AI</p>
          <p className="brand__tagline">Academic document verification</p>
        </div>

        <nav className="nav" aria-label="Main">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'nav__link nav__link--active' : 'nav__link'
              }
              onClick={closeSidebar}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          {user ? (
            <div className="sidebar-user">
              <strong>{user.name}</strong>
              <span>
                {user.role} · {user.email}
              </span>
              <button type="button" className="btn btn--ghost" onClick={() => void handleLogout()}>
                Sign out
              </button>
              {logoutError ? <span className="sidebar-error">{logoutError}</span> : null}
            </div>
          ) : (
            <span>MIT 5.2 · Phase 2 Core Platform</span>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            Menu
          </button>
          <h1 className="topbar__title">{pageTitle(location.pathname, visibleNav)}</h1>
          <span className="topbar__meta">{user?.role ?? ''}</span>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
