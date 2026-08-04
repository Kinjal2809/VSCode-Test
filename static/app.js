// API Configuration
const API_BASE = '/api/v1';
let ideEditor = null;
let sqlEditor = null;
let currentFilePath = null;
let currentWorkspace = '.'; // Represents the root of the project
let currentWorkspaceName = 'backend';

// State for project scoping
let envVars = JSON.parse(localStorage.getItem('ide_env_vars')) || {};
let projectRunConfigs = JSON.parse(localStorage.getItem('ide_run_configs_project')) || {};
// Note: Transitioning to project-scoped run configs, but keeping fallback for demo purposes

// Initialize Editors when Monaco is ready
require(['vs/editor/editor.main'], function () {
    // IDE Editor
    ideEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: '// Select a file from the explorer to start editing\n',
        language: 'javascript',
        theme: 'vs-dark', // PyCharm like dark theme
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace"
    });

    // SQL Editor
    sqlEditor = monaco.editor.create(document.getElementById('sql-editor'), {
        value: 'SELECT * FROM sqlite_master;',
        language: 'sql',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace"
    });
});

// View Navigation Logic (Left Activity Bar)
document.querySelectorAll('.activity-bar:not(#right-activity-bar) .nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return; // Settings or other buttons

        // Update active state
        document.querySelectorAll('.activity-bar:not(#right-activity-bar) .nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle Views
        document.querySelectorAll('.view-section:not(#ai-view)').forEach(section => {
            section.style.display = section.id === targetId ? 'block' : 'none';
        });

        // Recalculate layout for terminal and editor
        if (ideEditor) ideEditor.layout();
        if (sqlEditor) sqlEditor.layout();
        if (term) term.fit();

        // Fetch view-specific data
        if (targetId === 'git-view') fetchGitStatus();
        if (targetId === 'env-view') renderEnvVars();
    });
});

// View Navigation Logic (Right Activity Bar)
document.querySelectorAll('#right-activity-bar .nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return;

        const targetSection = document.getElementById(targetId);

        // Toggle the section
        if (targetSection.style.display === 'none') {
            targetSection.style.display = 'block';
            btn.classList.add('active');
        } else {
            targetSection.style.display = 'none';
            btn.classList.remove('active');
        }
    });
});

// Bottom Panel Tabs
document.querySelectorAll('.bottom-panel-header .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.bottom-panel-header .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const panelId = tab.getAttribute('data-panel');
        document.querySelectorAll('.bottom-panel-content').forEach(panel => {
            panel.style.display = panel.id === panelId ? 'block' : 'none';
        });

        if (panelId === 'interactive-term-tab' && term) {
            term.fit();
        }
    });
});

// ==========================================
// DYNAMIC PROJECT MANAGEMENT & MAIN MENU
// ==========================================
const updateProjectName = (path) => {
    currentWorkspace = path;
    const parts = path === '.' ? ['Test'] : path.split('/').filter(Boolean);
    currentWorkspaceName = parts.pop() || 'Project';
    document.getElementById('current-project-name').innerText = currentWorkspaceName;
    document.getElementById('open-project-name').innerText = currentWorkspaceName;
    document.getElementById('open-project-path').innerText = currentWorkspace === '.' ? '~/Test' : currentWorkspace;
    document.title = `${currentWorkspaceName} - NexGen Web IDE`;
};
updateProjectName('.'); // Initial setup

// Main Menu Dropdown (Hamburger)
const mainMenuBtn = document.getElementById('main-menu-btn');
const mainMenuDropdown = document.getElementById('main-menu-dropdown');
mainMenuBtn.addEventListener('click', () => {
    mainMenuDropdown.style.display = mainMenuDropdown.style.display === 'none' ? 'block' : 'none';
});

const projectBtn = document.getElementById('project-title-dropdown');
const projectMenu = document.getElementById('project-menu');
projectBtn.addEventListener('click', () => {
    projectMenu.style.display = projectMenu.style.display === 'none' ? 'block' : 'none';
});

const branchBtn = document.getElementById('branch-title-dropdown');
const branchMenu = document.getElementById('branch-menu');
if (branchBtn) {
    branchBtn.addEventListener('click', () => {
        branchMenu.style.display = branchMenu.style.display === 'none' ? 'block' : 'none';
    });
}

document.addEventListener('click', (e) => {
    if (!projectBtn.contains(e.target) && !projectMenu.contains(e.target)) {
        projectMenu.style.display = 'none';
    }
    if (branchBtn && !branchBtn.contains(e.target) && !branchMenu.contains(e.target)) {
        branchMenu.style.display = 'none';
    }
    if (!mainMenuBtn.contains(e.target) && !mainMenuDropdown.contains(e.target)) {
        mainMenuDropdown.style.display = 'none';
    }

    const mainSettingsBtn = document.getElementById('main-settings-btn');
    const mainSettingsMenu = document.getElementById('main-settings-menu');
    if (mainSettingsBtn && !mainSettingsBtn.contains(e.target) && !mainSettingsMenu.contains(e.target)) {
        mainSettingsMenu.style.display = 'none';
    }

    const projSettingsBtn = document.getElementById('project-settings-btn');
    const projSettingsMenu = document.getElementById('project-settings-menu');
    if (projSettingsBtn && !projSettingsBtn.contains(e.target) && !projSettingsMenu.contains(e.target)) {
        projSettingsMenu.style.display = 'none';
    }
});

const mainSettingsBtn = document.getElementById('main-settings-btn');
if (mainSettingsBtn) {
    mainSettingsBtn.addEventListener('click', () => {
        const menu = document.getElementById('main-settings-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
}

const projSettingsBtn = document.getElementById('project-settings-btn');
if (projSettingsBtn) {
    projSettingsBtn.addEventListener('click', () => {
        const menu = document.getElementById('project-settings-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
}

const newFileIconBtn = document.getElementById('new-file-icon-btn');
const newFileMenu = document.getElementById('new-file-menu');
if (newFileIconBtn) {
    newFileIconBtn.addEventListener('click', () => {
        newFileMenu.style.display = newFileMenu.style.display === 'none' ? 'block' : 'none';
    });
}
document.addEventListener('click', (e) => {
    if (newFileIconBtn && !newFileIconBtn.contains(e.target) && !newFileMenu.contains(e.target)) {
        newFileMenu.style.display = 'none';
    }
});

window.createNewFile = async (type) => {
    newFileMenu.style.display = 'none';
    const fileName = prompt(`Enter name for new ${type}:`);
    if (fileName) {
        let finalName = fileName;
        // Auto-append extensions based on type if not present
        if (type === 'Python File' && !finalName.endsWith('.py')) finalName += '.py';
        if (type === 'Jupyter Notebook' && !finalName.endsWith('.ipynb')) finalName += '.ipynb';
        if (type === 'JavaScript File' && !finalName.endsWith('.js')) finalName += '.js';
        if (type === 'TypeScript File' && !finalName.endsWith('.ts')) finalName += '.ts';
        if (type === 'HTML File' && !finalName.endsWith('.html')) finalName += '.html';
        if (type === 'Stylesheet' && !finalName.endsWith('.css')) finalName += '.css';
        if (type === 'Directory' && !finalName.endsWith('/')) finalName += '/';
        if (type === 'Python Package' && !finalName.endsWith('/')) finalName += '/';

        try {
            if (type === 'Python Package') {
                await fetch(`${API_BASE}/git/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: `mkdir -p "${finalName.replace(/"/g, '\\"')}" && touch "${finalName.replace(/"/g, '\\"')}/__init__.py"`, cwd: currentWorkspace })
                });
            } else if (finalName.endsWith('/')) {
                // It's a directory
                await fetch(`${API_BASE}/git/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: `mkdir -p "${finalName.replace(/"/g, '\\"')}"`, cwd: currentWorkspace })
                });
            } else {
                // It's a file
                await fetch(`${API_BASE}/fs/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: currentWorkspace + '/' + finalName, content: '' })
                });
            }
            fetchDirectory(currentWorkspace);
        } catch (err) {
            alert('Error creating file/directory: ' + err.message);
        }
    }
};

// Load global AI extensions state
const installedAiExts = JSON.parse(localStorage.getItem('ide_ai_extensions') || '{}');
const updateAiToolbar = () => {
    const toolbar = document.getElementById('ai-toolbar-icons');
    if (toolbar) {
        if (Object.keys(installedAiExts).length > 0) {
            toolbar.style.display = 'flex';
        } else {
            toolbar.style.display = 'none';
        }
    }
};
updateAiToolbar();

document.querySelectorAll('.install-ext-btn').forEach(btn => {
    const extName = btn.previousElementSibling.innerText; // Get extension name from UI
    if (installedAiExts[extName]) {
        btn.innerText = 'Installed';
        btn.disabled = true;
        btn.style.borderColor = 'var(--success)';
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
    }

    btn.addEventListener('click', () => {
        btn.innerText = 'Installing...';
        btn.disabled = true;
        setTimeout(() => {
            btn.innerText = 'Installed';
            btn.style.borderColor = 'var(--success)';
            btn.style.background = 'rgba(34, 197, 94, 0.1)';
            installedAiExts[extName] = true;
            localStorage.setItem('ide_ai_extensions', JSON.stringify(installedAiExts));
            updateAiToolbar();
        }, 1500);
    });
});

document.querySelectorAll('.dropdown-action').forEach(el => {
    if (!el.hasAttribute('onclick') && !el.classList.contains('has-submenu')) {
        el.addEventListener('click', function () {
            // Check if it's a toggleable option
            if (this.innerText.includes('Group Tabs') || this.innerText.includes('Preview Tab') || this.innerText.includes('Single Click') || this.innerText.includes('Opened File') || this.innerText.includes('Excluded Files') || this.innerText.includes('Scratches and Consoles')) {
                if (this.innerHTML.includes('✓')) {
                    this.innerHTML = this.innerHTML.replace('<span style="color:var(--accent-color); margin-right: 4px;">✓</span> ', '');
                } else {
                    this.innerHTML = '<span style="color:var(--accent-color); margin-right: 4px;">✓</span> ' + this.innerHTML;
                }
            } else {
                alert('Action triggered: ' + this.innerText.trim().replace(/>$/, '').trim());
            }
        });
    }
});
document.getElementById('open-local-btn').addEventListener('click', () => {
    projectMenu.style.display = 'none';
    const newPath = prompt("Enter the absolute path to the local directory:");
    if (newPath) {
        document.getElementById('fs-path').value = newPath;
        fetchDirectory(newPath);
    }
});
document.getElementById('clone-repo-btn').addEventListener('click', async () => {
    projectMenu.style.display = 'none';
    const url = prompt("Enter GitHub Repository URL:");
    if (!url) return;
    const targetDir = prompt("Enter target directory name (leave blank for current dir):", "");

    appendTerminal(`> Cloning repository ${url} into ${targetDir || '.'}...\n`);
    document.querySelector('[data-target="ide-view"]').click();
    document.querySelector('[data-panel="run-console-tab"]').click();

    try {
        const response = await fetch(`${API_BASE}/git/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: url, target_dir: targetDir || '.' })
        });
        const data = await response.json();
        if (data.stdout) appendTerminal(data.stdout);
        if (data.stderr) appendTerminal(data.stderr, data.status === 'error');
        if (data.status === 'success') {
            appendTerminal(`\n> Clone successful!`);
            fetchDirectory(targetDir || '.');
        }
    } catch (e) {
        appendTerminal(`\n[Error] ${e.message}`, true);
    }
});


// ==========================================
// FILE SYSTEM (IDE) LOGIC
// ==========================================

const fetchDirectory = async (path = '.') => {
    try {
        const response = await fetch(`${API_BASE}/fs/list?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error('Failed to fetch directory');
        const data = await response.json();
        renderFileTree(data.items, path);
        updateProjectName(path);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

const renderFileTree = (items, basePath) => {
    const tree = document.getElementById('file-tree');
    tree.innerHTML = '';

    const emptyState = document.getElementById('file-tree-empty');
    if (emptyState) {
        emptyState.style.display = items.length === 0 && basePath === '.' ? 'flex' : 'none';
    }

    if (basePath !== '.') {
        const upLi = document.createElement('li');
        upLi.className = 'tree-item is-dir';
        upLi.innerHTML = `📁 ..`;
        upLi.onclick = () => {
            const parts = basePath.split('/');
            parts.pop();
            const newPath = parts.length > 0 ? parts.join('/') : '.';
            document.getElementById('fs-path').value = newPath;
            fetchDirectory(newPath);
        };
        tree.appendChild(upLi);
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = `tree-item ${item.is_dir ? 'is-dir' : 'is-file'}`;
        li.innerHTML = `${item.is_dir ? '📁' : '📝'} ${item.name}`;

        li.onclick = () => {
            if (item.is_dir) {
                document.getElementById('fs-path').value = item.path;
                fetchDirectory(item.path);
            } else {
                openFile(item.path);
            }
        };
        tree.appendChild(li);
    });
};

const openFile = async (path) => {
    try {
        const response = await fetch(`${API_BASE}/fs/read?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error('Failed to read file');
        const data = await response.json();

        currentFilePath = path;
        const filename = path.split('/').pop();
        document.getElementById('current-file-tab').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>${filename}`;

        const ext = path.split('.').pop();
        let lang = 'plaintext';
        if (ext === 'js') lang = 'javascript';
        else if (ext === 'py') lang = 'python';
        else if (ext === 'html') lang = 'html';
        else if (ext === 'css') lang = 'css';
        else if (ext === 'json') lang = 'json';
        else if (ext === 'md') lang = 'markdown';

        if (ideEditor) {
            monaco.editor.setModelLanguage(ideEditor.getModel(), lang);
            ideEditor.setValue(data.content);
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

document.getElementById('save-file-btn').addEventListener('click', async () => {
    if (!currentFilePath) return alert('No file opened');

    try {
        const content = ideEditor.getValue();
        const response = await fetch(`${API_BASE}/fs/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentFilePath, content })
        });

        if (!response.ok) throw new Error('Failed to save file');

        const btn = document.getElementById('save-file-btn');
        btn.innerText = 'Saved!';
        setTimeout(() => { btn.innerText = 'Save File'; }, 2000);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});

// Removed old fs-refresh listener

fetchDirectory('.');


// ==========================================
// ENVIRONMENT VARIABLES LOGIC
// ==========================================
const renderEnvVars = () => {
    const list = document.getElementById('env-vars-list');
    list.innerHTML = '';

    const projectVars = envVars[currentWorkspace] || {};

    if (!window.currentEnvArray) {
        window.currentEnvArray = Object.keys(projectVars).map(k => ({ key: k, value: projectVars[k] }));
    }

    window.currentEnvArray.forEach((item, index) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.innerHTML = `
            <input type="text" value="${item.key}" class="env-key" placeholder="Key" style="flex: 1;">
            <input type="text" value="${item.value}" class="env-val" placeholder="Value" style="flex: 2;">
            <button class="primary-btn outline delete-env-btn">Delete</button>
        `;

        const saveToStorage = () => {
            const newDict = {};
            window.currentEnvArray.forEach(pair => {
                if (pair.key.trim() !== '') {
                    newDict[pair.key.trim()] = pair.value;
                }
            });
            envVars[currentWorkspace] = newDict;
            localStorage.setItem('ide_env_vars', JSON.stringify(envVars));
        };

        div.querySelector('.env-key').addEventListener('input', (e) => {
            item.key = e.target.value;
            saveToStorage();
        });

        div.querySelector('.env-val').addEventListener('input', (e) => {
            item.value = e.target.value;
            saveToStorage();
        });

        div.querySelector('.delete-env-btn').addEventListener('click', () => {
            window.currentEnvArray.splice(index, 1);
            saveToStorage();
            renderEnvVars();
        });

        list.appendChild(div);
    });
};

document.getElementById('add-env-var-btn').addEventListener('click', () => {
    if (!window.currentEnvArray) window.currentEnvArray = [];
    window.currentEnvArray.push({ key: '', value: '' });
    renderEnvVars();
});

// Exports
const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
document.getElementById('export-env-json').addEventListener('click', () => {
    const vars = envVars[currentWorkspace] || {};
    downloadBlob(JSON.stringify(vars, null, 4), 'env.json', 'application/json');
});
document.getElementById('export-env-csv').addEventListener('click', () => {
    const vars = envVars[currentWorkspace] || {};
    let csv = "Key,Value\n";
    Object.keys(vars).forEach(k => { csv += `${k},${vars[k]}\n`; });
    downloadBlob(csv, 'env.csv', 'text/csv');
});
document.getElementById('export-env-txt').addEventListener('click', () => {
    const vars = envVars[currentWorkspace] || {};
    let txt = "";
    Object.keys(vars).forEach(k => { txt += `${k}=${vars[k]}\n`; });
    downloadBlob(txt, '.env', 'text/plain');
});


// ==========================================
// GIT INTEGRATION
// ==========================================
window.runGitCommand = async (command) => {
    const statusText = document.getElementById('git-status-text');
    statusText.innerText = `Running: ${command}...`;
    try {
        const response = await fetch(`${API_BASE}/git/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, cwd: currentWorkspace })
        });
        const data = await response.json();
        if (data.status === 'success') {
            statusText.innerText = data.stdout || "Command completed successfully.";
        } else {
            statusText.innerText = data.stderr || "Git error.";
        }
        setTimeout(fetchGitStatus, 2000);
    } catch (e) {
        statusText.innerText = `Error: ${e.message}`;
    }
};

const fetchGitStatus = async () => {
    try {
        const response = await fetch(`${API_BASE}/git/status?cwd=${encodeURIComponent(currentWorkspace)}`);
        const data = await response.json();
        if (data.is_git_repo) {
            document.getElementById('git-status-text').innerText = data.git_status || "Working tree clean.";
            document.getElementById('footer-git-branch').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg> ${data.branch}`;

            const branchTopBtn = document.getElementById('branch-title-dropdown');
            if (branchTopBtn) {
                branchTopBtn.style.display = 'flex';
                document.getElementById('current-branch-name-top').innerText = data.branch;
            }
            
            // Populate changed files list
            const changedFilesContainer = document.getElementById('git-changed-files');
            const changesCount = document.getElementById('git-changes-count');
            if (changedFilesContainer && data.git_status) {
                changedFilesContainer.innerHTML = '';
                const lines = data.git_status.split('\n').filter(l => l.trim().length > 0);
                changesCount.innerText = `${lines.length} files`;
                
                lines.forEach(line => {
                    const status = line.substring(0, 2);
                    const file = line.substring(3);
                    let color = 'var(--text-main)';
                    if (status.includes('M')) color = '#60a5fa'; // Modified
                    else if (status.includes('A') || status.includes('?')) color = '#4ade80'; // Added/Untracked
                    else if (status.includes('D')) color = '#ef4444'; // Deleted
                    
                    changedFilesContainer.innerHTML += `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" checked style="accent-color: #60a5fa; cursor: pointer;">
                            <span style="color: ${color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;" title="${file}">${file}</span>
                            <span style="color: var(--text-muted); font-size: 0.7rem; margin-left: auto;">${status.trim()}</span>
                        </div>
                    `;
                });
            } else if (changedFilesContainer) {
                changedFilesContainer.innerHTML = '<div style="color: var(--text-muted); padding: 4px;">No changes</div>';
                changesCount.innerText = `0 files`;
            }
            
            // Fetch branch list for the pull dropdown
            try {
                const branchRes = await fetch(`${API_BASE}/git/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: 'git branch --format="%(refname:short)"', cwd: currentWorkspace })
                });
                const branchData = await branchRes.json();
                if (branchData.status === 'success' && branchData.stdout) {
                    const branches = branchData.stdout.split('\n').filter(b => b.trim().length > 0);
                    const selectEl = document.getElementById('git-pull-branch');
                    if (selectEl) {
                        selectEl.innerHTML = '<option value="">Branch (optional)</option>';
                        branches.forEach(b => {
                            selectEl.innerHTML += `<option value="${b}">${b}</option>`;
                        });
                    }
                }
            } catch(e) {}
            
        } else {
            document.getElementById('git-status-text').innerText = "Not a git repository.";
            document.getElementById('footer-git-branch').innerHTML = "No Git";

            const branchTopBtn = document.getElementById('branch-title-dropdown');
            if (branchTopBtn) branchTopBtn.style.display = 'none';
            
            const changedFilesContainer = document.getElementById('git-changed-files');
            if (changedFilesContainer) {
                changedFilesContainer.innerHTML = '<div style="color: var(--text-muted); padding: 4px;">Not a git repository</div>';
            }
        }
    } catch (e) {
        console.error(e);
    }
};


// ==========================================
// RUN/DEBUG CONFIGURATIONS LOGIC
// ==========================================
let runConfigs = JSON.parse(localStorage.getItem('ide_run_configs')) || [];
let activeConfigId = 'current_file'; // 'current_file' or index of runConfigs
let modalSelectedConfigIdx = -1;

const dropdownMenu = document.getElementById('run-config-menu');
const dropdownBtn = document.getElementById('run-config-dropdown');
const activeConfigNameEl = document.getElementById('active-config-name');
const configList = document.getElementById('config-list');
const modalConfigList = document.getElementById('modal-config-list');
const configModal = document.getElementById('run-config-modal');

const saveConfigs = () => {
    localStorage.setItem('ide_run_configs', JSON.stringify(runConfigs));
};

const renderDropdown = () => {
    configList.innerHTML = `
        <li class="config-item ${activeConfigId === 'current_file' ? 'active' : ''}" data-id="current_file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Current File
        </li>
    `;

    runConfigs.forEach((cfg, idx) => {
        const li = document.createElement('li');
        li.className = `config-item ${activeConfigId === idx.toString() ? 'active' : ''}`;
        li.setAttribute('data-id', idx);
        li.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> ${cfg.name}`;
        configList.appendChild(li);
    });

    document.querySelectorAll('.config-item').forEach(item => {
        item.addEventListener('click', () => {
            activeConfigId = item.getAttribute('data-id');
            activeConfigNameEl.innerText = activeConfigId === 'current_file' ? 'Current File' : runConfigs[activeConfigId].name;
            dropdownMenu.style.display = 'none';
            renderDropdown();
        });
    });
};

const renderModalSidebar = () => {
    modalConfigList.innerHTML = '';
    runConfigs.forEach((cfg, idx) => {
        const li = document.createElement('li');
        li.className = `tree-item is-file ${modalSelectedConfigIdx === idx ? 'active' : ''}`;
        li.innerText = `🐍 ${cfg.name}`;
        if (modalSelectedConfigIdx === idx) {
            li.style.background = 'rgba(255,255,255,0.1)';
        }
        li.onclick = () => {
            modalSelectedConfigIdx = idx;
            renderModalSidebar();
            loadForm(idx);
        };
        modalConfigList.appendChild(li);
    });
};

const loadForm = (idx) => {
    if (idx < 0) {
        document.getElementById('no-config-selected').style.display = 'block';
        document.getElementById('config-form').style.display = 'none';
        return;
    }
    document.getElementById('no-config-selected').style.display = 'none';
    document.getElementById('config-form').style.display = 'flex';

    const cfg = runConfigs[idx];
    document.getElementById('config-name-input').value = cfg.name;
    document.getElementById('config-command-input').value = cfg.command;
    document.getElementById('config-cwd-input').value = cfg.cwd || '.';
    document.getElementById('config-env-input').value = cfg.env_str || '';
};

dropdownBtn.addEventListener('click', () => {
    dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
    }
});

document.getElementById('edit-configs-btn').addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
    modalSelectedConfigIdx = runConfigs.length > 0 ? 0 : -1;
    renderModalSidebar();
    loadForm(modalSelectedConfigIdx);
    configModal.showModal();
});

document.getElementById('close-modal-btn').addEventListener('click', () => configModal.close());
document.getElementById('cancel-config-btn').addEventListener('click', () => configModal.close());

document.getElementById('add-config-btn').addEventListener('click', () => {
    runConfigs.push({
        name: `Unnamed-${runConfigs.length + 1}`,
        command: '',
        cwd: currentWorkspace,
        env_str: ''
    });
    modalSelectedConfigIdx = runConfigs.length - 1;
    renderModalSidebar();
    loadForm(modalSelectedConfigIdx);
});

// Update config as user types
document.getElementById('config-form').addEventListener('input', (e) => {
    if (modalSelectedConfigIdx >= 0) {
        runConfigs[modalSelectedConfigIdx] = {
            name: document.getElementById('config-name-input').value,
            command: document.getElementById('config-command-input').value,
            cwd: document.getElementById('config-cwd-input').value,
            env_str: document.getElementById('config-env-input').value
        };
        renderModalSidebar();
    }
});

document.getElementById('save-config-btn').addEventListener('click', () => {
    saveConfigs();
    renderDropdown();
    // Auto select newly edited/selected config
    if (modalSelectedConfigIdx >= 0) {
        activeConfigId = modalSelectedConfigIdx.toString();
        activeConfigNameEl.innerText = runConfigs[activeConfigId].name;
        renderDropdown();
    }
    configModal.close();
});

renderDropdown();

// ==========================================
// CODE EXECUTION LOGIC (Run Button)
// ==========================================
const terminalOutput = document.getElementById('terminal-output');

const appendTerminal = (text, isError = false) => {
    if (!text) return;
    const span = document.createElement('span');
    if (isError) span.className = 'terminal-error';
    span.innerText = text;
    terminalOutput.appendChild(span);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
};

document.getElementById('run-file-btn').addEventListener('click', async () => {
    // Switch to Output Tab
    document.querySelector('[data-panel="run-console-tab"]').click();
    document.querySelector('[data-target="ide-view"]').click();
    terminalOutput.innerHTML = '';

    if (activeConfigId === 'current_file') {
        if (!currentFilePath) return alert('No file opened to run');
        if (!currentFilePath.endsWith('.py')) return alert('Can only run .py files directly');

        try {
            await fetch(`${API_BASE}/fs/write`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentFilePath, content: ideEditor.getValue() })
            });
        } catch (e) {
            console.error("Failed to auto-save", e);
        }

        const relPath = currentFilePath.startsWith(currentWorkspace) ? './' + currentFilePath.slice(currentWorkspace.length).replace(/^\//, '') : currentFilePath;
        appendTerminal(`> Running ${relPath}...\n\n`);

        try {
            const response = await fetch(`${API_BASE}/exec/run_command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: `python ${currentFilePath}`,
                    cwd: currentWorkspace,
                    env: envVars[currentWorkspace] || {} // Inject scoped env vars
                })
            });

            const data = await response.json();
            if (data.stdout) appendTerminal(data.stdout);
            if (data.stderr) appendTerminal(data.stderr, true);

            if (!response.ok) appendTerminal(`\n[Execution Failed] ${data.detail}`, true);
            else appendTerminal(`\n> Process finished with exit code ${data.exit_code}`);
        } catch (err) {
            appendTerminal(`\n[Error] ${err.message}`, true);
        }
    } else {
        const cfg = runConfigs[parseInt(activeConfigId)];
        if (!cfg) return;

        appendTerminal(`> Running Configuration: ${cfg.name}\n`);
        appendTerminal(`> Command: ${cfg.command}\n\n`);

        // Combine specific config env vars with project scoped env vars
        const envDict = { ...(envVars[currentWorkspace] || {}) };
        if (cfg.env_str) {
            cfg.env_str.split(';').forEach(pair => {
                const parts = pair.split('=');
                if (parts.length === 2) envDict[parts[0].trim()] = parts[1].trim();
            });
        }

        try {
            const response = await fetch(`${API_BASE}/exec/run_command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: cfg.command,
                    cwd: cfg.cwd || currentWorkspace,
                    env: envDict
                })
            });

            const data = await response.json();
            if (data.stdout) appendTerminal(data.stdout);
            if (data.stderr) appendTerminal(data.stderr, true);

            if (!response.ok) appendTerminal(`\n[Execution Failed] ${data.detail}`, true);
            else appendTerminal(`\n> Process finished with exit code ${data.exit_code}`);
        } catch (err) {
            appendTerminal(`\n[Error] ${err.message}`, true);
        }
    }
});


// ==========================================
// INTERACTIVE TERMINAL (XTERM.JS & WS)
// ==========================================
let term = null;
let termWs = null;

const initTerminal = () => {
    term = new Terminal({
        theme: {
            background: '#2b2d30',
            foreground: '#dfe1e5',
            cursor: '#dfe1e5',
            selection: 'rgba(255, 255, 255, 0.3)'
        },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        cursorBlink: true
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('xterm-container'));
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(document.getElementById('xterm-container'));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/exec/ws`;

    termWs = new WebSocket(wsUrl);
    termWs.onopen = () => { term.writeln('\x1b[32mSuccessfully connected to local terminal shell.\x1b[0m'); };
    termWs.onmessage = (event) => { term.write(event.data); };
    termWs.onerror = () => { term.writeln('\x1b[31mTerminal WebSocket error.\x1b[0m'); };
    termWs.onclose = () => { term.writeln('\x1b[31mTerminal disconnected.\x1b[0m'); };

    term.onData(data => {
        if (termWs.readyState === WebSocket.OPEN) {
            termWs.send(data);
        }
    });
};
setTimeout(initTerminal, 500);

// ==========================================
// FOOTER INIT
// ==========================================
const initFooter = async () => {
    try {
        const response = await fetch(`${API_BASE}/exec/info`);
        const data = await response.json();
        if (data.status === 'success') {
            document.getElementById('footer-python-version').innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                ${data.python_version.split('\n')[0]} (venv)
            `;
        }
    } catch (e) {
        console.error("Failed to load python info", e);
    }
};
initFooter();


// ==========================================
// PYPI SEARCH & LIBRARIES LOGIC
// ==========================================
// ... (Keeping library search exactly as before)
let currentPyPIPackage = null;
const fetchLibraries = async () => {
    const tbody = document.getElementById('lib-body');
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Loading libraries...</td></tr>';
    try {
        const response = await fetch(`${API_BASE}/exec/libraries`);
        if (!response.ok) throw new Error('Failed to fetch libraries');
        const data = await response.json();
        tbody.innerHTML = '';
        data.packages.forEach(pkg => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${pkg.name}</strong></td><td>${pkg.version}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--danger);">${err.message}</td></tr>`;
    }
};

let searchTimeout = null;
const searchInput = document.getElementById('pypi-search-input');
const resultsContainer = document.getElementById('pypi-results');

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
        resultsContainer.style.display = 'none';
        currentPyPIPackage = null;
        return;
    }
    searchTimeout = setTimeout(async () => {
        try {
            document.getElementById('pypi-pkg-name').innerText = query;
            document.getElementById('pypi-pkg-version').innerText = '...';
            document.getElementById('pypi-pkg-desc').innerText = 'Fetching package details from PyPI...';
            document.getElementById('install-searched-pkg-btn').style.display = 'none';
            resultsContainer.style.display = 'block';

            const response = await fetch(`https://pypi.org/pypi/${query}/json`);
            if (!response.ok) return document.getElementById('pypi-pkg-desc').innerText = 'Package not found or PyPI error.';
            const data = await response.json();
            currentPyPIPackage = data.info.name;

            document.getElementById('pypi-pkg-name').innerText = data.info.name;
            document.getElementById('pypi-pkg-version').innerText = data.info.version;
            document.getElementById('pypi-pkg-desc').innerText = data.info.summary || 'No description provided.';
            document.getElementById('install-searched-pkg-btn').style.display = 'block';
        } catch (err) {
            document.getElementById('pypi-pkg-desc').innerText = 'Network error reaching PyPI.';
        }
    }, 600);
});

document.getElementById('install-searched-pkg-btn').addEventListener('click', async () => {
    if (!currentPyPIPackage) return;
    const btn = document.getElementById('install-searched-pkg-btn');
    btn.innerText = 'Installing...';
    btn.disabled = true;
    try {
        const response = await fetch(`${API_BASE}/exec/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_name: currentPyPIPackage })
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            alert(`Successfully installed ${currentPyPIPackage}`);
            searchInput.value = '';
            resultsContainer.style.display = 'none';
            fetchLibraries();
        } else alert(`Failed to install ${currentPyPIPackage}\n\nError: ${data.stderr || data.detail}`);
    } catch (err) { alert(`Error: ${err.message}`); }
    finally { btn.innerText = 'Install Package'; btn.disabled = false; }
});
document.querySelector('[data-target="lib-view"]').addEventListener('click', () => fetchLibraries());


// ==========================================
// DATABASE CLIENT LOGIC
// ==========================================
// Project scoped DB urls
let dbUrls = JSON.parse(localStorage.getItem('ide_db_urls')) || {};

const renderSchemaTree = (schemaData) => {
    const tree = document.getElementById('schema-tree');
    tree.innerHTML = '';
    Object.keys(schemaData).forEach(tableName => {
        const tableLi = document.createElement('li');
        tableLi.className = 'tree-item is-dir';
        tableLi.innerHTML = `🗄️ ${tableName}`;
        tree.appendChild(tableLi);
        const columns = schemaData[tableName];
        columns.forEach(col => {
            const colLi = document.createElement('li');
            colLi.className = 'tree-item is-file';
            colLi.style.paddingLeft = '24px';
            colLi.style.fontSize = '0.8rem';
            let keyStr = col.primary_key ? '🔑 ' : '📄 ';
            colLi.innerHTML = `${keyStr}${col.name} <span style="color:#64748b;margin-left:4px;">${col.type}</span>`;
            tree.appendChild(colLi);
        });
    });
};

document.getElementById('connect-db-btn').addEventListener('click', async () => {
    const dbUrl = document.getElementById('db-url').value;
    const btn = document.getElementById('connect-db-btn');

    // Save DB connection scoped to current project
    dbUrls[currentWorkspace] = dbUrl;
    localStorage.setItem('ide_db_urls', JSON.stringify(dbUrls));

    btn.innerText = 'Connecting...';
    try {
        const response = await fetch(`${API_BASE}/db/schema`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ db_url: dbUrl })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to connect');
        renderSchemaTree(data.schema);
        btn.innerText = 'Connected!';
        setTimeout(() => { btn.innerText = 'Connect'; }, 2000);
    } catch (err) {
        alert(err.message);
        btn.innerText = 'Connect';
    }
});

document.querySelector('[data-target="db-view"]').addEventListener('click', () => {
    if (dbUrls[currentWorkspace]) {
        document.getElementById('db-url').value = dbUrls[currentWorkspace];
    }
});

document.getElementById('run-query-btn').addEventListener('click', async () => {
    const dbUrl = document.getElementById('db-url').value;
    let query = sqlEditor.getModel().getValueInRange(sqlEditor.getSelection());
    if (!query || query.trim() === '') query = sqlEditor.getValue();
    const meta = document.getElementById('result-meta');
    meta.innerText = 'Executing...';
    meta.style.color = 'var(--text-muted)';
    try {
        const response = await fetch(`${API_BASE}/db/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ db_url: dbUrl, query })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Execution failed');
        if (data.rows) {
            renderTable(data.rows);
            meta.innerText = `Success: ${data.count} rows returned.`;
            meta.style.color = 'var(--success)';
        } else {
            renderTable([]);
            meta.innerText = `Success: ${data.message} (${data.rows_affected} rows affected).`;
            meta.style.color = 'var(--success)';
        }
    } catch (err) {
        meta.innerText = `Error: ${err.message}`;
        meta.style.color = 'var(--danger)';
    }
});

const renderTable = (rows) => {
    const thead = document.getElementById('results-header');
    const tbody = document.getElementById('results-body');
    thead.innerHTML = ''; tbody.innerHTML = '';
    if (!rows || rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    columns.forEach(col => {
        const th = document.createElement('th');
        th.innerText = col;
        thead.appendChild(th);
    });
    rows.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            let val = row[col];
            if (val === null) val = 'NULL';
            else if (typeof val === 'object') val = JSON.stringify(val);
            td.innerText = val;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
};
