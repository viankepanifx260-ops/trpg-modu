// ==================== 管理后台逻辑 V2 ====================

let pendingCover = '';
let editingId = null;
let editPendingCover = '';
let calYear, calMonth, calHostId = null;
let confirmCallback = null;

// ========== 登录 ==========
function checkLogin() {
  const admin = getCurrentAdmin();
  if (admin) {
    showAdminUI(admin);
  }
}

function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const admin = verifyAdmin(u, p);
  if (!admin) {
    const err = document.getElementById('login-error');
    err.style.display = 'block';
    return;
  }
  setCurrentAdmin(admin);
  showAdminUI(admin);
  showToast('✅ 登录成功，欢迎 ' + admin.username);
}

function doLogout() {
  setCurrentAdmin(null);
  document.getElementById('admin-main').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-error').style.display = 'none';
}

function showAdminUI(admin) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-main').style.display = 'block';
  document.getElementById('current-admin-name').textContent = admin.username + (admin.role === 'super' ? '（超管）' : '（管理员）');
  renderAllTabs();
}

// ========== Tab ==========
function switchTab(name) {
  document.querySelectorAll('#main-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const el = document.getElementById('tab-' + name);
  if (el) el.classList.add('active');

  if (name === 'today')    renderSelectList();
  if (name === 'category') renderCategoryManage();
  if (name === 'host')     renderHostManage();
  if (name === 'admin')    renderAdminManage();
  if (name === 'manage')   renderModuleList();
  if (name === 'add')      refreshAddFormSelects();
}

function renderAllTabs() {
  refreshAddFormSelects();
  renderSelectList();
}

// ========== 今日可开 ==========
function renderSelectList() {
  const modules = getModules();
  const list = document.getElementById('select-list');
  if (!modules.length) {
    list.innerHTML = '<div style="text-align:center; color:var(--text2); padding:30px; font-size:14px;">还没有添加任何模组</div>';
    return;
  }
  list.innerHTML = modules.map(m => {
    const coverHtml = m.cover ? '<img src="' + m.cover + '" alt="">' : '🎲';
    const hostName = m.hostId ? getHostName(m.hostId) : '无主持人';
    return '<div class="module-select-item ' + (m.todayAvailable ? 'selected' : '') + '" onclick="toggleSelect(\'' + m.id + '\')">' +
      '<div class="select-thumb">' + coverHtml + '</div>' +
      '<div class="select-info">' +
        '<div class="select-name">' + escH(m.name) + '</div>' +
        '<div class="select-host">🎤 ' + escH(hostName) + '</div>' +
      '</div>' +
      '<div class="check-circle">✓</div>' +
      '</div>';
  }).join('');
}

function toggleSelect(id) {
  const data = getAllData();
  const m = data.modules.find(x => x.id === id);
  if (!m) return;
  m.todayAvailable = !m.todayAvailable;
  saveAllData(data);
  renderSelectList();
}

function saveTodayAndNotify() {
  const modules = getModules();
  const count = modules.filter(m => m.todayAvailable).length;
  showToast('✅ 已保存，今日 ' + count + ' 个模组可开');
}

// ========== 添加模组 ==========
function refreshAddFormSelects() {
  // 分类下拉
  const catSelect = document.getElementById('input-category');
  if (catSelect) {
    const cats = getCategories();
    catSelect.innerHTML = '<option value="">未分类</option>' +
      cats.map(c => '<option value="' + c.id + '">' + escH(c.name) + '</option>').join('');
  }
  // 主持人下拉
  const hostSelect = document.getElementById('input-host');
  if (hostSelect) {
    const hosts = getHosts();
    hostSelect.innerHTML = '<option value="">不绑定主持人</option>' +
      hosts.map(h => '<option value="' + h.id + '">' + escH(h.name) + '</option>').join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const introEl = document.getElementById('input-intro');
  if (introEl) {
    introEl.addEventListener('input', () => {
      const c = document.getElementById('intro-count');
      if (c) c.textContent = introEl.value.length;
    });
  }
});

function handleCoverUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('请上传图片文件'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    pendingCover = e.target.result;
    document.getElementById('cover-upload-area').style.display = 'none';
    document.getElementById('cover-preview').style.display = 'block';
    document.getElementById('preview-img').src = pendingCover;
  };
  reader.readAsDataURL(file);
}

function removeCover() {
  pendingCover = '';
  const fi = document.getElementById('cover-input');
  if (fi) fi.value = '';
  const area = document.getElementById('cover-upload-area');
  if (area) area.style.display = 'flex';
  const prev = document.getElementById('cover-preview');
  if (prev) prev.style.display = 'none';
}

function submitAddModule() {
  const name = document.getElementById('input-name').value.trim();
  const intro = document.getElementById('input-intro').value.trim();
  const tagsRaw = document.getElementById('input-tags').value.trim();
  const catId = document.getElementById('input-category').value;
  const hostId = document.getElementById('input-host').value;
  if (!name) { showToast('请输入模组名称'); return; }
  if (!intro) { showToast('请输入模组简介'); return; }
  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
  addModule({
    name, intro, cover: pendingCover,
    categoryId: catId, hostId: hostId || '',
    todayAvailable: true
  });
  // 重置
  document.getElementById('input-name').value = '';
  document.getElementById('input-intro').value = '';
  document.getElementById('input-tags').value = '';
  document.getElementById('input-category').value = '';
  document.getElementById('input-host').value = '';
  const ic = document.getElementById('intro-count');
  if (ic) ic.textContent = '0';
  removeCover();
  showToast('✅ 模组添加成功');
  setTimeout(() => switchTab('manage'), 800);
}

// ========== 分类管理 ==========
function renderCategoryManage() {
  const cats = getCategories();
  const list = document.getElementById('category-list');
  list.innerHTML = cats.map(c =>
    '<div class="cat-manage-item">' +
      '<div style="display:flex; align-items:center;">' +
        '<div class="cat-color" style="background:var(--accent);"></div>' +
        '<span style="font-size:14px; font-weight:600;">' + escH(c.name) + '</span>' +
      '</div>' +
      '<button class="icon-btn danger" onclick="confirmDeleteCategory(\'' + c.id + '\',\'' + escH(c.name) + '\')">🗑️</button>' +
    '</div>'
  ).join('');
}

function submitAddCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) { showToast('请输入分类名称'); return; }
  addCategory(name);
  document.getElementById('new-cat-name').value = '';
  renderCategoryManage();
  showToast('✅ 分类已添加');
}

function confirmDeleteCategory(id, name) {
  showConfirm('删除分类', '确定删除分类「' + name + '」？\n该分类下的模组将变为"未分类"。', () => {
    deleteCategory(id);
    renderCategoryManage();
    showToast('🗑️ 已删除');
  });
}

// ========== 主持人管理 ==========
function renderHostManage() {
  const hosts = getHosts();
  const list = document.getElementById('host-list');
  list.innerHTML = hosts.map(h => {
    const bookedCount = Object.keys(h.schedule).filter(d => h.schedule[d]).length;
    return '<div class="list-item" onclick="openHostCalendar(\'' + h.id + '\')" style="cursor:pointer;">' +
      '<div class="list-item-thumb" style="font-size:22px;">🎤</div>' +
      '<div class="list-item-info">' +
        '<div class="list-item-name">' + escH(h.name) + '</div>' +
        '<div class="list-item-meta">已标记 ' + bookedCount + ' 个不可用日期</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button class="icon-btn danger" onclick="event.stopPropagation(); confirmDeleteHost(\'' + h.id + '\',\'' + escH(h.name) + '\')">🗑️</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function submitAddHost() {
  const name = document.getElementById('new-host-name').value.trim();
  if (!name) { showToast('请输入主持人名称'); return; }
  addHost(name);
  document.getElementById('new-host-name').value = '';
  renderHostManage();
  showToast('✅ 主持人已添加');
}

function confirmDeleteHost(id, name) {
  showConfirm('删除主持人', '确定删除主持人「' + name + '」？\n该主持人的模组将变为未绑定状态。', () => {
    deleteHost(id);
    if (calHostId === id) { calHostId = null; document.getElementById('host-calendar-area').style.display = 'none'; }
    renderHostManage();
    showToast('🗑️ 已删除');
  });
}

function openHostCalendar(hostId) {
  calHostId = hostId;
  const hosts = getHosts();
  const h = hosts.find(x => x.id === hostId);
  if (!h) return;
  document.getElementById('host-calendar-area').style.display = 'block';
  document.getElementById('calendar-host-name').textContent = h.name;
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth() + 1;
  renderCalendar();
}

function changeCalendarMonth(delta) {
  calMonth += delta;
  if (calMonth > 12) { calMonth = 1; calYear++; }
  if (calMonth < 1) { calMonth = 12; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const label = document.getElementById('calendar-month-label');
  label.textContent = calYear + '年' + calMonth + '月';

  const grid = document.getElementById('calendar-grid');
  const dayNames = ['日','一','二','三','四','五','六'];
  let html = dayNames.map(d => '<div class="day-name">' + d + '</div>').join('');

  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const todayStr = getTodayStr();

  // 空白填充
  for (let i = 0; i < firstDay; i++) html += '<div class="day-cell empty"></div>';

  const hosts = getHosts();
  const h = hosts.find(x => x.id === calHostId);

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = calYear + '-' + String(calMonth).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const isToday = ds === todayStr;
    const isBooked = h && h.schedule[ds];
    let cls = 'day-cell';
    if (isToday) cls += ' today';
    if (isBooked) cls += ' booked';
    html += '<div class="' + cls + '" onclick="toggleBooked(\'' + ds + '\')">' + d + '</div>';
  }

  grid.innerHTML = html;
}

function toggleBooked(dateStr) {
  const hosts = getHosts();
  const h = hosts.find(x => x.id === calHostId);
  if (!h) return;
  const data = getAllData();
  const hostData = data.hosts.find(x => x.id === calHostId);
  if (!hostData) return;
  if (hostData.schedule[dateStr]) {
    delete hostData.schedule[dateStr];
  } else {
    hostData.schedule[dateStr] = true;
  }
  saveAllData(data);
  renderCalendar();
}

// ========== 管理员管理 ==========
function renderAdminManage() {
  const admins = getAdmins();
  const list = document.getElementById('admin-list');
  const current = getCurrentAdmin();
  list.innerHTML = admins.map(a => {
    const isSelf = current && a.id === current.id;
    return '<div class="admin-item">' +
      '<div class="admin-info">' +
        '<span style="font-size:14px; font-weight:600;">' + escH(a.username) + '</span>' +
        '<span class="admin-role ' + a.role + '">' + (a.role === 'super' ? '超管' : '普通') + '</span>' +
        (isSelf ? '<span style="font-size:11px; color:var(--text2);">（当前）</span>' : '') +
      '</div>' +
      '<div>' +
        (a.role !== 'super' || getAdmins().filter(x => x.role === 'super').length > 1
          ? '<button class="icon-btn danger" onclick="confirmDeleteAdmin(\'' + a.id + '\',\'' + escH(a.username) + '\')">🗑️</button>'
          : '<span style="font-size:11px; color:var(--text2);">不可删除</span>') +
      '</div>' +
      '</div>';
  }).join('');
}

function submitAddAdmin() {
  const u = document.getElementById('new-admin-user').value.trim();
  const p = document.getElementById('new-admin-pass').value;
  const r = document.getElementById('new-admin-role').value;
  if (!u) { showToast('请输入用户名'); return; }
  if (!p) { showToast('请输入密码'); return; }
  const res = addAdmin(u, p, r);
  if (!res) { showToast('用户名已存在'); return; }
  document.getElementById('new-admin-user').value = '';
  document.getElementById('new-admin-pass').value = '';
  renderAdminManage();
  showToast('✅ 管理员已添加');
}

function confirmDeleteAdmin(id, username) {
  showConfirm('删除管理员', '确定删除管理员「' + username + '」？', () => {
    const ok = deleteAdmin(id);
    if (!ok) { showToast('至少保留一个超级管理员'); return; }
    renderAdminManage();
    showToast('🗑️ 已删除');
  });
}

// ========== 模组列表 ==========
function renderModuleList() {
  const modules = getModules();
  document.getElementById('total-count').textContent = modules.length;
  const list = document.getElementById('module-list');
  if (!modules.length) {
    list.innerHTML = '<div style="text-align:center; color:var(--text2); padding:30px; font-size:14px;">还没有添加任何模组</div>';
    return;
  }
  list.innerHTML = modules.map(m => {
    const coverHtml = m.cover ? '<img src="' + m.cover + '" alt="">' : '🎲';
    const catName = getCategoryName(m.categoryId);
    const hostName = m.hostId ? getHostName(m.hostId) : '未绑定';
    const avail = m.todayAvailable ? '✅ 今日可开' : '❌ 今日不可开';
    const availColor = m.todayAvailable ? 'var(--green)' : 'var(--text2)';
    return '<div class="module-list-item">' +
      '<div class="module-list-thumb">' + coverHtml + '</div>' +
      '<div class="module-list-info">' +
        '<div class="module-list-name">' + escH(m.name) + '</div>' +
        '<div class="module-list-meta">' +
          '<span style="color:' + availColor + '; font-size:11px;">' + avail + '</span>' +
          '<span style="margin-left:6px; color:var(--text2);">· ' + escH(catName) + '</span>' +
          '<span class="list-item-host">🎤 ' + escH(hostName) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button class="icon-btn" onclick="openEditModal(\'' + m.id + '\')">✏️</button>' +
        '<button class="icon-btn danger" onclick="confirmDeleteModule(\'' + m.id + '\',\'' + escH(m.name) + '\')">🗑️</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

// ========== 编辑模组 ==========
function openEditModal(id) {
  const m = getModuleById(id);
  if (!m) return;
  editingId = id;

  // 刷新下拉
  const catSelect = document.getElementById('edit-category');
  const cats = getCategories();
  catSelect.innerHTML = '<option value="">未分类</option>' +
    cats.map(c => '<option value="' + c.id + '"' + (m.categoryId === c.id ? ' selected' : '') + '>' + escH(c.name) + '</option>').join('');

  const hostSelect = document.getElementById('edit-host');
  const hosts = getHosts();
  hostSelect.innerHTML = '<option value="">不绑定主持人</option>' +
    hosts.map(h => '<option value="' + h.id + '"' + (m.hostId === h.id ? ' selected' : '') + '>' + escH(h.name) + '</option>').join('');

  document.getElementById('edit-name').value = m.name;
  document.getElementById('edit-intro').value = m.intro;
  document.getElementById('edit-tags').value = (m.tags || []).join(', ');
  editPendingCover = m.cover || '';

  if (m.cover) {
    document.getElementById('edit-cover-upload-area').style.display = 'none';
    document.getElementById('edit-cover-preview').style.display = 'block';
    document.getElementById('edit-preview-img').src = m.cover;
  } else {
    document.getElementById('edit-cover-upload-area').style.display = 'flex';
    document.getElementById('edit-cover-preview').style.display = 'none';
  }

  document.getElementById('edit-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
  editingId = null;
  editPendingCover = '';
}

function handleEditCoverUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    editPendingCover = e.target.result;
    document.getElementById('edit-cover-upload-area').style.display = 'none';
    document.getElementById('edit-cover-preview').style.display = 'block';
    document.getElementById('edit-preview-img').src = editPendingCover;
  };
  reader.readAsDataURL(file);
}

function removeEditCover() {
  editPendingCover = '';
  document.getElementById('edit-cover-input').value = '';
  document.getElementById('edit-cover-upload-area').style.display = 'flex';
  document.getElementById('edit-cover-preview').style.display = 'none';
}

function submitEditModule() {
  if (!editingId) return;
  const name = document.getElementById('edit-name').value.trim();
  const intro = document.getElementById('edit-intro').value.trim();
  const tagsRaw = document.getElementById('edit-tags').value.trim();
  const catId = document.getElementById('edit-category').value;
  const hostId = document.getElementById('edit-host').value;
  if (!name) { showToast('请输入模组名称'); return; }
  if (!intro) { showToast('请输入模组简介'); return; }
  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
  updateModule(editingId, {
    name, intro, tags,
    cover: editPendingCover,
    categoryId: catId,
    hostId: hostId || ''
  });
  closeEditModal();
  renderModuleList();
  showToast('✅ 修改已保存');
}

function confirmDeleteModule(id, name) {
  showConfirm('删除模组', '确定删除「' + name + '」？此操作不可恢复。', () => {
    deleteModule(id);
    renderModuleList();
    showToast('🗑️ 已删除');
  });
}

// ========== 确认弹窗 ==========
function showConfirm(title, msg, onOk) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = onOk;
  document.getElementById('confirm-overlay').classList.add('show');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('show');
  confirmCallback = null;
}

document.addEventListener('DOMContentLoaded', () => {
  const okBtn = document.getElementById('confirm-ok');
  if (okBtn) okBtn.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });
  // 登录回车
  const passInput = document.getElementById('login-pass');
  if (passInput) passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
  const userInput = document.getElementById('login-user');
  if (userInput) userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-pass').focus();
  });
});

// ========== 工具 ==========
function escH(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
});
