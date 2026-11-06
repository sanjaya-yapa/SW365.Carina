(() => {
  const destinations = [
    { label: 'Home', href: '/', icon: 'house-door', pages: ['/', '/index.html'] },
    { label: 'Dashboard', href: '/pages/dashboard.html', icon: 'bar-chart' },
    {
      label: 'Accounts',
      href: '/pages/accounts.html',
      icon: 'credit-card',
      pages: ['/pages/accounts.html', '/pages/add-account.html', '/pages/edit-account.html'],
    },
    {
      label: 'Categories',
      href: '/pages/categories.html',
      icon: 'tags',
      pages: ['/pages/categories.html', '/pages/add-category.html', '/pages/edit-category.html'],
    },
    { label: 'Owners', href: '/pages/transaction-owners.html', icon: 'people' },
    { label: 'Budgets', href: '/pages/budgets.html', icon: 'calculator' },
    {
      label: 'Transactions',
      href: '/pages/transactions.html',
      icon: 'arrow-left-right',
      pages: [
        '/pages/transactions.html',
        '/pages/edit-transaction.html',
        '/pages/edit-bank-import.html',
      ],
    },
    { label: 'Payments', href: '/pages/payments.html', icon: 'calendar-check' },
    {
      label: 'Reports',
      href: '/pages/reports.html',
      icon: 'file-earmark-text',
      pages: [
        '/pages/reports.html',
        '/pages/daily-expenses.html',
        '/pages/monthly-expense-analysis.html',
        '/pages/owner-expenses.html',
      ],
    },
  ];
  const links = destinations
    .map(({ label, href, icon, pages = [href] }) => {
      const active = pages.includes(window.location.pathname);
      return `<li class="nav-item">
        <a class="nav-link${active ? ' active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>
          <i class="bi bi-${icon} me-2" aria-hidden="true"></i>${label}
        </a>
      </li>`;
    })
    .join('');

  document.getElementById('appNavigation').innerHTML = `
    <a class="app-skip-link" href="#mainContent">Skip to main content</a>
    <header class="app-mobile-header d-lg-none bg-dark text-white">
      <a class="app-brand" href="/">
        <i class="bi bi-wallet2 me-2" aria-hidden="true"></i>Personal Finance
      </a>
      <button id="navigationToggle" class="btn btn-outline-light" type="button"
        data-bs-toggle="offcanvas" data-bs-target="#appSidebar"
        aria-controls="appSidebar" aria-expanded="false" aria-label="Open navigation">
        <i class="bi bi-list" aria-hidden="true"></i><span class="ms-1">Menu</span>
      </button>
    </header>
    <aside id="appSidebar" class="app-sidebar offcanvas-lg offcanvas-start text-bg-dark"
      tabindex="-1" aria-labelledby="sidebarTitle">
      <div class="offcanvas-header">
        <a id="sidebarTitle" class="app-brand" href="/">
          <i class="bi bi-wallet2 me-2" aria-hidden="true"></i>Personal Finance
        </a>
        <button class="btn-close btn-close-white d-lg-none" type="button"
          data-bs-dismiss="offcanvas" data-bs-target="#appSidebar" aria-label="Close navigation"></button>
      </div>
      <div class="offcanvas-body">
        <nav aria-label="Primary navigation">
          <ul class="nav flex-column gap-1">${links}</ul>
        </nav>
      </div>
    </aside>`;

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('appSidebar');
    const toggle = document.getElementById('navigationToggle');
    const mobileHeader = document.querySelector('.app-mobile-header');
    const skipLink = document.querySelector('.app-skip-link');
    const desktop = window.matchMedia('(min-width: 992px)');
    let background = [];

    function restoreBackground() {
      for (const element of background) element.inert = false;
      background = [];
      mobileHeader.inert = false;
      skipLink.inert = false;
      toggle.setAttribute('aria-expanded', 'false');
    }

    sidebar.addEventListener('show.bs.offcanvas', () => {
      toggle.setAttribute('aria-expanded', 'true');
    });
    sidebar.addEventListener('shown.bs.offcanvas', () => {
      if (desktop.matches) return;
      background = Array.from(document.body.children).filter(
        (element) =>
          element.id !== 'appNavigation' &&
          element.tagName !== 'SCRIPT' &&
          !element.classList.contains('offcanvas-backdrop') &&
          !element.inert
      );
      for (const element of background) element.inert = true;
      mobileHeader.inert = true;
      skipLink.inert = true;
    });
    sidebar.addEventListener('hidden.bs.offcanvas', () => {
      restoreBackground();
      if (!desktop.matches) toggle.focus();
    });
    desktop.addEventListener('change', () => {
      if (desktop.matches) {
        bootstrap.Offcanvas.getInstance(sidebar)?.hide();
        restoreBackground();
      }
    });
  });
})();
