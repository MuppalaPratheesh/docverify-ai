import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/applications', label: 'Applications' },
  { to: '/documents', label: 'Documents' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/settings', label: 'Settings' },
];

function pageTitle(pathname: string): string {
  const match = navItems.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  return match?.label ?? 'DocVerify AI';
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

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
          {navItems.map((item) => (
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

        <div className="sidebar__footer">MIT 5.2 · Phase 2 Core Platform</div>
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
          <h1 className="topbar__title">{pageTitle(location.pathname)}</h1>
          <span aria-hidden="true" />
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
