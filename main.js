// Basic LinOS web desktop implementation

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // INTRO / BOOT SCREEN
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    setTimeout(() => {
      bootScreen.classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
    }, 5000); // 5 seconds boot time
  }

  // LOGIN SYSTEM (fixed credentials LinOS / 2012)
  const loginScreen = $('#login-screen');
  const desktop = $('#desktop');
  const loginInput = $('#login-password');
  const loginUserInput = $('#login-username');
  const loginButton = $('#login-button');
  const loginError = $('#login-error');

  // Direct, synchronous credentials to avoid async/file issues
  const validCreds = { user: 'LinOS', pass: '2012' };

  function completeLogin() {
    if (!validCreds) {
      loginError.textContent = 'Invalid username or password (check users.txt).';
      loginError.classList.remove('hidden');
      return;
    }
    const u = (loginUserInput.value || '').trim();
    const p = (loginInput.value || '').trim();
    if (u === validCreds.user && p === validCreds.pass) {
      loginScreen.classList.add('hidden');
      desktop.classList.remove('hidden');
      loginError.classList.add('hidden');
    } else {
      loginError.textContent = 'Invalid username or password.';
      loginError.classList.remove('hidden');
    }
  }

  loginButton.addEventListener('click', completeLogin);
  [loginInput, loginUserInput].forEach((inp) => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') completeLogin();
    });
  });

  // POWER (log out)
  const powerButton = $('#power-button');
  powerButton.addEventListener('click', () => {
    desktop.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  // CLOCK
  const clockEl = $('#top-clock');
  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  updateClock();
  setInterval(updateClock, 30000);

  // WINDOW MANAGEMENT
  const windows = $$('.window');
  let zCounter = 10;

  function focusWindow(win) {
    zCounter += 1;
    win.style.zIndex = zCounter;
  }

  function initWindow(win) {
    win.addEventListener('mousedown', () => focusWindow(win));
    const titlebar = win.querySelector('.window-titlebar');
    if (titlebar) makeDraggable(win, titlebar);

    const closeBtn = win.querySelector('[data-window-close]');
    const minBtn = win.querySelector('[data-window-minimize]');
    const maxBtn = win.querySelector('[data-window-maximize]');

    if (closeBtn)
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        win.classList.add('hidden');
      });
    if (minBtn)
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        win.classList.add('minimized');
      });
    if (maxBtn) maxBtn.addEventListener('click', () => {
      if (win.dataset.maximized === '1') {
        win.style.top = win.dataset.prevTop;
        win.style.left = win.dataset.prevLeft;
        win.style.width = win.dataset.prevWidth;
        win.style.height = win.dataset.prevHeight;
        win.dataset.maximized = '0';
      } else {
        win.dataset.prevTop = win.style.top;
        win.dataset.prevLeft = win.style.left;
        win.dataset.prevWidth = win.style.width;
        win.dataset.prevHeight = win.style.height;
        win.style.top = '28px';
        win.style.left = '4px';
        win.style.width = 'calc(100% - 8px)';
        win.style.height = 'calc(100% - 40px)';
        win.dataset.maximized = '1';
      }
    });
  }

  windows.forEach(initWindow);

  function makeDraggable(win, handle) {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let dragging = false;

    handle.addEventListener('mousedown', (e) => {
      if (win.dataset.maximized === '1') return;
      dragging = true;
      focusWindow(win);
      startX = e.clientX;
      startY = e.clientY;
      const rect = win.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      win.style.left = startLeft + dx + 'px';
      win.style.top = startTop + dy + 'px';
    }

    function onUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
  }

  // APP LAUNCHING (dock, desktop icons, launcher tiles)
  function openApp(appId) {
    const win = document.querySelector(`[data-app-id="${appId}"]`);
    if (!win) return;
    win.classList.remove('hidden', 'minimized');
    focusWindow(win);
  }

  function attachOpeners(attr) {
    $$(`[${attr}]`).forEach((el) => {
      const appId = el.getAttribute(attr);
      el.addEventListener('click', () => openApp(appId));
    });
  }
  attachOpeners('data-open-app');

  // BROWSER IMPLEMENTATION (real web via iframe)
  const browserUrl = $('#browser-url');
  const browserFrame = document.getElementById('browser-frame');

  function normalizeUrl(value) {
    // If it looks like a bare domain or search term, prepend https:// or do a DuckDuckGo search
    if (!value) return '';

    // if contains spaces, treat as a search query
    if (/\s/.test(value)) {
      const q = encodeURIComponent(value);
      return `https://duckduckgo.com/?q=${q}`;
    }

    // if already has protocol, keep it
    if (/^https?:\/\//i.test(value)) return value;

    // simple heuristic: if it has a dot, assume domain, otherwise search
    if (value.includes('.')) {
      return `https://${value}`;
    }

    const q = encodeURIComponent(value);
    return `https://duckduckgo.com/?q=${q}`;
  }

  function navigate(urlInput) {
    const url = normalizeUrl(urlInput);
    if (!url || !browserFrame) return;
    browserFrame.src = url;
    browserUrl.value = url;
  }

  function handleBrowserInput() {
    const value = browserUrl.value.trim();
    if (!value) return;
    navigate(value);
  }

  // Initial URL matches iframe src (DuckDuckGo home)
  if (browserFrame) {
    browserUrl.value = browserFrame.src || 'https://duckduckgo.com';
  }

  $('#browser-go').addEventListener('click', handleBrowserInput);
  browserUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleBrowserInput();
  });

  $('#browser-home').addEventListener('click', () => {
    const home = 'https://duckduckgo.com';
    navigate(home);
  });

  // Note: because of iframe cross-origin restrictions we cannot reliably drive
  // the iframe's internal history, so back/forward just use the outer window.
  $('#browser-back').addEventListener('click', () => {
    window.history.back();
  });

  $('#browser-forward').addEventListener('click', () => {
    window.history.forward();
  });

  $('#browser-reload').addEventListener('click', () => {
    if (browserFrame && browserFrame.src) {
      browserFrame.src = browserFrame.src;
    }
  });

  // FILE SYSTEM (in-memory with localStorage persistence)
  const FS_KEY = 'linos-fs-v1';

  function defaultFS() {
    return {
      '/home': {
        type: 'dir',
        children: {
          'readme.txt': { type: 'file', content: 'Welcome to LinOS virtual file system.' },
        },
      },
      '/documents': {
        type: 'dir',
        children: {},
      },
      '/pictures': {
        type: 'dir',
        children: {},
      },
      '/apps': {
        type: 'dir',
        children: {},
      },
    };
  }

  let fsTree;
  try {
    fsTree = JSON.parse(localStorage.getItem(FS_KEY)) || defaultFS();
  } catch (e) {
    fsTree = defaultFS();
  }

  function saveFS() {
    localStorage.setItem(FS_KEY, JSON.stringify(fsTree));
  }

  function getDir(path) {
    return fsTree[path];
  }

  function createInDir(path, name, isFile) {
    const dir = getDir(path);
    if (!dir || dir.type !== 'dir') return;
    if (!dir.children[name]) {
      dir.children[name] = isFile ? { type: 'file', content: '' } : { type: 'dir', children: {} };
      saveFS();
    }
  }

  // FILES UI
  const filesNavItems = $$('.files-nav-item');
  const filesList = $('#files-list');
  const filesPathLabel = $('#files-path');
  let currentFsPath = '/home';

  function renderFiles(path) {
    const dir = getDir(path);
    if (!dir || dir.type !== 'dir') return;
    currentFsPath = path;
    filesPathLabel.textContent = path;
    filesList.innerHTML = '';
    const entries = Object.entries(dir.children);
    for (const [name, node] of entries) {
      const item = document.createElement('div');
      item.className = 'files-item';
      const icon = document.createElement('div');
      icon.className = 'files-item-icon';
      icon.textContent = node.type === 'dir' ? '📁' : '📄';
      const label = document.createElement('div');
      label.className = 'files-item-label';
      label.textContent = name;
      item.appendChild(icon);
      item.appendChild(label);

      // allow double-click to navigate into folders in Files app
      if (node.type === 'dir') {
        item.addEventListener('dblclick', () => {
          renderFiles(path + (path.endsWith('/') ? '' : '/') + name);
        });
      }

      filesList.appendChild(item);
    }
  }

  filesNavItems.forEach((el) => {
    el.addEventListener('click', () => {
      filesNavItems.forEach((i) => i.classList.remove('active'));
      el.classList.add('active');
      const path = el.getAttribute('data-path');
      renderFiles(path);
    });
  });

  $('#files-new-folder').addEventListener('click', () => {
    const name = prompt('Folder name:');
    if (!name) return;
    createInDir(currentFsPath, name, false);
    renderFiles(currentFsPath);
  });

  $('#files-new-file').addEventListener('click', () => {
    const name = prompt('File name:');
    if (!name) return;
    createInDir(currentFsPath, name, true);
    renderFiles(currentFsPath);
  });

  // SETTINGS
  const settingsItems = $$('.settings-item');
  const settingsPages = $$('.settings-page');
  const toggleDarkMode = $('#toggle-dark-mode');
  const toggleGlass = $('#toggle-glass');

  settingsItems.forEach((el) => {
    el.addEventListener('click', () => {
      const page = el.getAttribute('data-settings-page');
      settingsItems.forEach((i) => i.classList.remove('active'));
      el.classList.add('active');
      settingsPages.forEach((p) => {
        p.classList.toggle('hidden', p.getAttribute('data-settings-page') !== page);
      });
    });
  });

  // Load / apply preferences
  const PREF_KEY = 'linos-prefs-v1';
  let prefs = { dark: true, glass: true };
  try {
    prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)) || {});
  } catch (e) {}

  function applyPrefs() {
    document.body.classList.toggle('dark-mode', !!prefs.dark);
    $$('.glass').forEach((el) => {
      el.classList.toggle('no-glass', !prefs.glass);
    });
    toggleDarkMode.checked = !!prefs.dark;
    toggleGlass.checked = !!prefs.glass;
  }

  function savePrefs() {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }

  toggleDarkMode.addEventListener('change', () => {
    prefs.dark = !!toggleDarkMode.checked;
    applyPrefs();
    savePrefs();
  });

  toggleGlass.addEventListener('change', () => {
    prefs.glass = !!toggleGlass.checked;
    applyPrefs();
    savePrefs();
  });

  // System info
  $('#settings-browser-info').textContent = navigator.userAgent;
  $('#settings-platform-info').textContent = navigator.platform;

  // APP STORE
  const storeList = $('#store-list');
  const storeDetails = $('#store-details');

  const STORE_KEY = 'linos-store-v1';
  const defaultInstalled = { browser: true, files: true, settings: true, store: true, about: true };
  let installed;
  try {
    installed = Object.assign({}, defaultInstalled, JSON.parse(localStorage.getItem(STORE_KEY)) || {});
  } catch (e) {
    installed = Object.assign({}, defaultInstalled);
  }

  const storeApps = [
    {
      id: 'terminal',
      name: 'Terminus Shell',
      description: 'A fake Linux-style terminal that echoes your commands.',
      action: 'Open terminal app window.',
    },
    {
      id: 'notes',
      name: 'FeatherNotes',
      description: 'A simple notes app stored in localStorage. Try typing "egg" for a surprise.',
      action: 'Create a notes app window.',
    },
  ];

  function renderStore() {
    storeList.innerHTML = '';
    storeApps.forEach((app) => {
      const item = document.createElement('div');
      item.className = 'store-item';
      if (installed[app.id]) item.classList.add('installed');
      item.textContent = app.name;
      item.addEventListener('click', () => showStoreDetails(app));
      storeList.appendChild(item);
    });
  }

  function showStoreDetails(app) {
    const isInstalled = !!installed[app.id];
    storeDetails.innerHTML = '';
    const h = document.createElement('h2');
    h.textContent = app.name;
    const p = document.createElement('p');
    p.textContent = app.description;
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = isInstalled ? 'Open' : 'Install';
    btn.addEventListener('click', () => {
      if (isInstalled) {
        openApp(app.id);
      } else {
        installed[app.id] = true;
        localStorage.setItem(STORE_KEY, JSON.stringify(installed));
        ensureDynamicApp(app.id);
        renderStore();
        showStoreDetails(app);
      }
    });
    storeDetails.appendChild(h);
    storeDetails.appendChild(p);
    storeDetails.appendChild(btn);
  }

  // Create dynamic apps (terminal, notes) when installed
  function ensureDynamicApp(id) {
    if (document.querySelector(`[data-app-id="${id}"]`)) return;
    let win;
    if (id === 'terminal') {
      win = document.createElement('div');
      win.className = 'window hidden';
      win.id = 'app-terminal';
      win.dataset.appId = 'terminal';
      win.innerHTML = `
        <div class="window-titlebar">
          <div class="traffic-lights small">
            <span class="dot close" data-window-close></span>
            <span class="dot min" data-window-minimize></span>
            <span class="dot max" data-window-maximize></span>
          </div>
          <div class="window-title">Terminus Shell</div>
        </div>
        <div class="window-content" style="font-family: monospace; font-size: 12px;">
          <div id="terminal-output" style="height: 100%; overflow-y: auto; white-space: pre-wrap;"></div>
          <div>
            <span style="color:#22c55e;">linos@web-os:~$</span>
            <input id="terminal-input" style="width:80%; background:transparent; border:none; border-bottom:1px solid #4b5563; color:#e5e7eb;" autocomplete="off" />
          </div>
        </div>`;
      desktop.appendChild(win);
      initWindow(win);
      const out = win.querySelector('#terminal-output');
      const inp = win.querySelector('#terminal-input');
      out.textContent = 'Welcome to Terminus Shell (demo). Commands are echoed back.\n';
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = inp.value.trim();
          out.textContent += `\n$ ${cmd}\nYou typed: ${cmd}`;
          out.scrollTop = out.scrollHeight;
          inp.value = '';
        }
      });
    } else if (id === 'notes') {
      win = document.createElement('div');
      win.className = 'window hidden';
      win.id = 'app-notes';
      win.dataset.appId = 'notes';
      win.innerHTML = `
        <div class="window-titlebar">
          <div class="traffic-lights small">
            <span class="dot close" data-window-close></span>
            <span class="dot min" data-window-minimize></span>
            <span class="dot max" data-window-maximize></span>
          </div>
          <div class="window-title">FeatherNotes</div>
        </div>
        <div class="window-content">
          <div style="display:flex;flex-direction:column;height:100%;">
            <div style="display:flex;gap:6px;margin-bottom:6px;">
              <button id="notes-main-tab" class="btn xs primary">Main</button>
              <button id="notes-egg-tab" class="btn xs hidden">Easter Egg</button>
            </div>
            <div id="notes-main-pane" style="flex:1;">
              <textarea id="notes-text" style="width:100%;height:100%;background:#020617;color:#e5e7eb;border:1px solid #1f2937;border-radius:6px;padding:6px;font-size:13px;"></textarea>
            </div>
            <div id="notes-egg-pane" class="hidden" style="flex:1;display:flex;align-items:center;justify-content:center;font-size:40px;">🥚</div>
          </div>
        </div>`;
      desktop.appendChild(win);
      initWindow(win);
      const KEY = 'linos-notes-v1';
      const ta = win.querySelector('#notes-text');
      const mainTab = win.querySelector('#notes-main-tab');
      const eggTab = win.querySelector('#notes-egg-tab');
      const mainPane = win.querySelector('#notes-main-pane');
      const eggPane = win.querySelector('#notes-egg-pane');
      try {
        ta.value = localStorage.getItem(KEY) || '';
      } catch (e) {}
      function switchTab(showEgg) {
        if (showEgg) {
          mainPane.classList.add('hidden');
          eggPane.classList.remove('hidden');
          eggTab.classList.remove('hidden');
          mainTab.classList.remove('primary');
          eggTab.classList.add('primary');
        } else {
          mainPane.classList.remove('hidden');
          eggPane.classList.add('hidden');
          mainTab.classList.add('primary');
          eggTab.classList.remove('primary');
        }
      }
      mainTab.addEventListener('click', () => switchTab(false));
      eggTab.addEventListener('click', () => switchTab(true));
      ta.addEventListener('input', () => {
        localStorage.setItem(KEY, ta.value);
        if (/egg/i.test(ta.value)) {
          eggTab.classList.remove('hidden');
        }
      });
    }
  }

  // TEXT EDITOR (FeatherEdit) - integrates with virtual FS
  const editorTree = document.getElementById('editor-tree');
  const editorPathLabel = document.getElementById('editor-path');
  const editorText = document.getElementById('editor-text');
  const editorOpenFileLabel = document.getElementById('editor-open-file-label');
  const editorNewFolderBtn = document.getElementById('editor-new-folder');
  const editorNewFileBtn = document.getElementById('editor-new-file');
  const editorSaveBtn = document.getElementById('editor-save');

  let editorCurrentPath = '/home';
  let editorOpenFilePath = null; // e.g. /home/readme.txt

  function renderEditorTree(path) {
    if (!editorTree) return;
    const dir = getDir(path);
    if (!dir || dir.type !== 'dir') return;
    editorCurrentPath = path;
    editorPathLabel.textContent = path;
    editorTree.innerHTML = '';
    const entries = Object.entries(dir.children);
    entries.forEach(([name, node]) => {
      const row = document.createElement('div');
      row.className = 'files-item';
      const icon = document.createElement('div');
      icon.className = 'files-item-icon';
      icon.textContent = node.type === 'dir' ? '📁' : '📄';
      const label = document.createElement('div');
      label.className = 'files-item-label';
      label.textContent = name;
      row.appendChild(icon);
      row.appendChild(label);

      if (node.type === 'dir') {
        row.addEventListener('click', () => {
          renderEditorTree(path + (path.endsWith('/') ? '' : '/') + name);
        });
      } else {
        row.addEventListener('click', () => {
          const fullPath = path + (path.endsWith('/') ? '' : '/') + name;
          editorOpenFilePath = fullPath;
          if (editorOpenFileLabel) editorOpenFileLabel.textContent = fullPath;
          editorText.value = node.content || '';
        });
      }

      editorTree.appendChild(row);
    });
  }

  editorNewFolderBtn?.addEventListener('click', () => {
    const name = prompt('New folder name:');
    if (!name) return;
    createInDir(editorCurrentPath, name, false);
    renderEditorTree(editorCurrentPath);
  });

  editorNewFileBtn?.addEventListener('click', () => {
    const name = prompt('New file name:');
    if (!name) return;
    createInDir(editorCurrentPath, name, true);
    renderEditorTree(editorCurrentPath);
  });

  editorSaveBtn?.addEventListener('click', () => {
    if (!editorOpenFilePath) {
      alert('No file selected to save.');
      return;
    }
    // navigate down from /home to this file
    const parts = editorOpenFilePath.split('/').filter(Boolean);
    let cur = fsTree['/home'];
    for (let i = 1; i < parts.length; i++) {
      const name = parts[i];
      if (!cur.children[name]) {
        cur.children[name] = i === parts.length - 1
          ? { type: 'file', content: '' }
          : { type: 'dir', children: {} };
      }
      if (i === parts.length - 1) {
        cur.children[name].type = 'file';
        cur.children[name].content = editorText.value;
      } else {
        cur = cur.children[name];
      }
    }
    saveFS();
    renderFiles(currentFsPath);
    alert('File saved.');
  });

  // SYSTEM UTILITY / TASK MANAGER
  const taskmanList = document.getElementById('taskman-list');
  const crashScreen = document.getElementById('crash-screen');
  const crashExitBtn = document.getElementById('crash-exit');
  const crashResetBtn = document.getElementById('crash-reset');

  const tasks = [
    { name: 'LinOS-KN.exe', status: 'Running', critical: true },
    { name: 'FeatherEdit.exe', status: 'Idle', critical: false },
    { name: 'BrowserHost.exe', status: 'Running', critical: false },
  ];

  function renderTasks() {
    if (!taskmanList) return;
    taskmanList.innerHTML = '';
    tasks.forEach((t) => {
      const row = document.createElement('div');
      row.className = 'files-item';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '2fr 1fr auto';
      row.style.alignItems = 'center';

      const nameEl = document.createElement('div');
      nameEl.className = 'files-item-label';
      nameEl.textContent = t.name;

      const statusEl = document.createElement('div');
      statusEl.className = 'files-item-label';
      statusEl.textContent = t.status;

      const actionEl = document.createElement('div');
      const btn = document.createElement('button');
      btn.className = 'btn xs';
      btn.textContent = 'End task';
      btn.addEventListener('click', () => {
        if (t.critical) {
          crashScreen?.classList.remove('hidden');
        } else {
          t.status = 'Terminated';
          btn.disabled = true;
          statusEl.textContent = t.status;
        }
      });
      actionEl.appendChild(btn);

      row.appendChild(nameEl);
      row.appendChild(statusEl);
      row.appendChild(actionEl);
      taskmanList.appendChild(row);
    });
  }

  crashExitBtn?.addEventListener('click', () => {
    crashScreen?.classList.add('hidden');
    desktop.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  crashResetBtn?.addEventListener('click', () => {
    localStorage.removeItem(FS_KEY);
    localStorage.removeItem(PREF_KEY);
    crashScreen?.classList.add('hidden');
    location.reload();
  });

  // Pre-ensure default installed dynamic apps if any
  Object.keys(installed).forEach((id) => ensureDynamicApp(id));

  // Apply initial prefs / FS / store
  applyPrefs();
  renderFiles('/home');
  renderStore();
  if (editorTree) renderEditorTree('/home');
  if (taskmanList) renderTasks();
})();
