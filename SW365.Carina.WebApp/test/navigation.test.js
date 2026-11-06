const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../src/app');
const db = require('../src/config/db');
after(() => db.end());

const publicRoot = path.join(__dirname, '..', 'public');
const source = fs.readFileSync(path.join(publicRoot, 'js', 'navigation.js'), 'utf8');
const pages = {
  'index.html': 'Home',
  'pages/dashboard.html': 'Dashboard',
  'pages/accounts.html': 'Accounts',
  'pages/add-account.html': 'Accounts',
  'pages/edit-account.html': 'Accounts',
  'pages/categories.html': 'Categories',
  'pages/add-category.html': 'Categories',
  'pages/edit-category.html': 'Categories',
  'pages/transaction-owners.html': 'Owners',
  'pages/budgets.html': 'Budgets',
  'pages/transactions.html': 'Transactions',
  'pages/edit-transaction.html': 'Transactions',
  'pages/edit-bank-import.html': 'Transactions',
  'pages/payments.html': 'Payments',
  'pages/reports.html': 'Reports',
  'pages/daily-expenses.html': 'Reports',
  'pages/monthly-expense-analysis.html': 'Reports',
  'pages/owner-expenses.html': 'Reports',
};

function harness(pathname, desktopMatches = false) {
  function element(id, tagName = 'DIV', inert = false) {
    return {
      id,
      tagName,
      inert,
      listeners: {},
      attributes: {},
      classList: { contains: () => false },
      addEventListener(name, listener) {
        this.listeners[name] = listener;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      focus() {
        this.focused = true;
      },
    };
  }
  const navigation = element('appNavigation');
  const sidebar = element('appSidebar');
  const toggle = element('navigationToggle', 'BUTTON');
  const header = element('mobileHeader', 'HEADER');
  const skip = element('skipLink', 'A');
  const main = element('mainContent', 'MAIN');
  const modal = element('modal');
  const alreadyInert = element('alreadyInert', 'DIV', true);
  const script = element('script', 'SCRIPT');
  const desktop = element('media');
  desktop.matches = desktopMatches;
  const documentListeners = {};
  let hides = 0;
  const context = vm.createContext({
    window: {
      location: { pathname },
      matchMedia(query) {
        assert.equal(query, '(min-width: 992px)');
        return desktop;
      },
    },
    document: {
      body: { children: [navigation, main, modal, alreadyInert, script] },
      getElementById(id) {
        return { appNavigation: navigation, appSidebar: sidebar, navigationToggle: toggle }[id];
      },
      querySelector(selector) {
        return { '.app-mobile-header': header, '.app-skip-link': skip }[selector];
      },
      addEventListener(name, listener) {
        documentListeners[name] = listener;
      },
    },
    bootstrap: {
      Offcanvas: {
        getInstance(target) {
          assert.equal(target, sidebar);
          return { hide: () => hides++ };
        },
      },
    },
  });
  vm.runInContext(source, context);
  return {
    navigation,
    sidebar,
    toggle,
    header,
    skip,
    main,
    modal,
    alreadyInert,
    script,
    desktop,
    initialize: () => documentListeners.DOMContentLoaded(),
    hides: () => hides,
  };
}

test('all pages use one synchronous navigation shell and preserve a focusable main landmark', () => {
  const actualPages = [
    'index.html',
    ...fs
      .readdirSync(path.join(publicRoot, 'pages'))
      .filter((name) => name.endsWith('.html'))
      .map((name) => `pages/${name}`),
  ];
  assert.deepEqual(actualPages.sort(), Object.keys(pages).sort());
  for (const file of actualPages) {
    const html = fs.readFileSync(path.join(publicRoot, file), 'utf8');
    assert.equal((html.match(/id="appNavigation"/g) || []).length, 1, file);
    assert.equal((html.match(/src="\/js\/navigation.js"/g) || []).length, 1, file);
    assert.match(html, /<body[^>]*class="app-shell"/, file);
    assert.match(html, /<main id="mainContent" tabindex="-1"/, file);
    assert.equal((html.match(/<main\b/g) || []).length, 1, file);
    assert.equal((html.match(/<\/main>/g) || []).length, 1, file);
    assert.ok(html.indexOf('/js/navigation.js') < html.indexOf('/js/main.js'), file);
    assert.ok(html.indexOf('/vendor/bootstrap.bundle.min.js') < html.indexOf('/js/main.js'), file);
    assert.match(html, /href="\/vendor\/bootstrap.min.css"/, file);
    assert.match(html, /bootstrap-icons/, file);
    assert.doesNotMatch(html, /navbarNav|navbar-expand|data-bs-toggle="collapse"/, file);
  }
});

test('navigation has consistent destinations and exactly one correct active parent on every page', () => {
  let expectedLinks;
  for (const [file, activeLabel] of [...Object.entries(pages), ['', 'Home']]) {
    const { navigation } = harness(`/${file}`);
    const links = [
      ...navigation.innerHTML.matchAll(/<a class="nav-link[^"]*" href="([^"]+)"/g),
    ].map((match) => match[1]);
    expectedLinks ??= links;
    assert.deepEqual(links, expectedLinks, file);
    assert.equal(links.length, 9);
    for (const href of links) {
      assert.ok(fs.existsSync(path.join(publicRoot, href === '/' ? 'index.html' : href.slice(1))));
    }
    const active = [
      ...navigation.innerHTML.matchAll(
        /<a class="nav-link active"[^>]*aria-current="page">\s*<i[^>]*><\/i>([^<]+)/g
      ),
    ];
    assert.equal(active.length, 1, file);
    assert.equal(active[0][1].trim(), activeLabel, file);
    assert.match(navigation.innerHTML, /nav aria-label="Primary navigation"/);
    assert.match(navigation.innerHTML, /href="#mainContent">Skip to main content/);
    assert.match(navigation.innerHTML, /aria-expanded="false" aria-label="Open navigation"/);
    assert.match(navigation.innerHTML, /aria-label="Close navigation"/);
  }
});

test('mobile drawer makes background inert and restores focus without changing existing inert state', () => {
  const h = harness('/pages/transactions.html');
  h.initialize();
  h.sidebar.listeners['show.bs.offcanvas']();
  assert.equal(h.toggle.attributes['aria-expanded'], 'true');
  h.sidebar.listeners['shown.bs.offcanvas']();
  for (const item of [h.main, h.modal, h.header, h.skip]) assert.equal(item.inert, true);
  assert.equal(h.script.inert, false);
  h.sidebar.listeners['hidden.bs.offcanvas']();
  for (const item of [h.main, h.modal, h.header, h.skip]) assert.equal(item.inert, false);
  assert.equal(h.alreadyInert.inert, true);
  assert.equal(h.toggle.attributes['aria-expanded'], 'false');
  assert.equal(h.toggle.focused, true);
});

test('resizing an open drawer to desktop restores background and closes the modal without hidden-button focus', () => {
  const h = harness('/pages/dashboard.html');
  h.initialize();
  h.sidebar.listeners['show.bs.offcanvas']();
  h.sidebar.listeners['shown.bs.offcanvas']();
  h.desktop.matches = true;
  h.desktop.listeners.change();
  assert.equal(h.hides(), 1);
  assert.equal(h.main.inert, false);
  assert.equal(h.toggle.attributes['aria-expanded'], 'false');
  h.sidebar.listeners['hidden.bs.offcanvas']();
  assert.equal(h.toggle.focused, undefined);
  h.desktop.matches = false;
  h.desktop.listeners.change();
  assert.equal(h.hides(), 1);
  h.sidebar.listeners['show.bs.offcanvas']();
  h.sidebar.listeners['shown.bs.offcanvas']();
  assert.equal(h.main.inert, true);
  h.sidebar.listeners['hidden.bs.offcanvas']();
  assert.equal(h.main.inert, false);
});

test('desktop never makes the page inert when a drawer shown event finishes after a resize', () => {
  const h = harness('/pages/reports.html', true);
  h.initialize();
  h.sidebar.listeners['shown.bs.offcanvas']();
  assert.equal(h.main.inert, false);
});

test('all page routes and local Bootstrap assets are served without querying the database', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    for (const route of [
      ...Object.keys(pages),
      'js/navigation.js',
      'vendor/bootstrap.min.css',
      'vendor/bootstrap.bundle.min.js',
    ]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/${route}`);
      assert.equal(response.status, 200, route);
      assert.ok((await response.text()).length > 0, route);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
