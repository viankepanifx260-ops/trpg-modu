// ==================== 管理后台逻辑 V3 ====================
// 支持：小分类 / 多主持人 / 公告

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
  if (name === 'subcat')   renderSubCatManage();
  if (name === 'host')     renderHostManage();
  if (name === 'ann')      renderAnnManage();
  if (name === 'admin')    renderAdminManage();
  if (name === 'manage')   renderModuleList();
  if (name === 'add') {
    refreshAddFormSelects();
    renderHostCheckList('input');
  }
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
    const hostNames = getHostNames(m.hostIds || []);
    return '<div class="module-select-item ' + (m.todayAvailable ? 'selected' : '') + '" onclick="toggleSelect(\'' + m.id + '\')">' +
      '<div class="select-thumb">' + coverHtml + '</div>' +
      '<div class="select-info">' +
        '<div class="select-name">' + escH(m.name) + '</div>' +
        '<div class="select-host">🎤 ' + escH(hostNames) + '</div>' +
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
    onCategoryChange('input');
  }
  // 主持人多选
  renderHostCheckList('input');
}

// 分类变更 → 更新小分类下拉
function onCategoryChange(prefix) {
  const catId = document.getElementById(prefix + '-category').value;
  const subGroup = document.getElementById(prefix + '-subcat-group');
  const subSelect = document.getElementById(prefix + '-subcategory');
  if (!subGroup || !subSelect) return;
  if (catId) {
    subGroup.style.display = 'block';
    const subs = getSubCategories(catId);
    subSelect.innerHTML = '<option value="">全部</option>' +
      subs.map(s => '<option value="' + s.id + '">' + escH(s.name) + '</option>').join('');
  } else {
    subGroup.style.display = 'none';
    subSelect.innerHTML = '<option value="">全部</option>';
  }
}

// 渲染主持人多选列表
function renderHostCheckList(prefix) {
  const container = document.getElementById(prefix + '-host-list');
  if (!container) return;
  const hosts = getHosts();
  container.innerHTML = hosts.map(h =>
    '<div class="host-check-item" id="' + prefix + '-host-' + h.id + '" onclick="toggleHostCheck(\'' + prefix + '\',\'' + h.id + '\')">' +
      '<input type="checkbox" id="' + prefix + '-host-cb-' + h.id + '" style="pointer-events:none;">' +
      '<span class="host-check-label">' + escH(h.name) + '</span>' +
    '</div>'
  ).join('');
}

function toggleHostCheck(prefix, hostId) {
  const cb = document.getElementById(prefix + '-host-cb-' + hostId);
  const item = document.getElementById(prefix + '-host-' + hostId);
  if (!cb || !item) return;
  cb.checked = !cb.checked;
  item.classList.toggle('selected', cb.checked);
}

function getSelectedHostIds(prefix) {
  const hosts = getHosts();
  return hosts.filter(h => {
    const cb = document.getElementById(prefix + '-host-cb-' + h.id);
    return cb && cb.checked;
  }).map(h => h.id);
}

function setHostCheckList(prefix, hostIds) {
  const hosts = getHosts();
  hosts.forEach(h => {
    const cb = document.getElementById(prefix + '-host-cb-' + h.id);
    const item = document.getElementById(prefix + '-host-' + h.id);
    if (!cb || !item) return;
    const checked = hostIds && hostIds.includes(h.id);
    cb.checked = checked;
    item.classList.toggle('selected', checked);
  });
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
  const subCatId = document.getElementById('input-subcategory') ? document.getElementById('input-subcategory').value : '';
  const hostIds = getSelectedHostIds('input');
  if (!name) { showToast('请输入模组名称'); return; }
  if (!intro) { showToast('请输入模组简介'); return; }
  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
  addModule({
    name, intro, cover: pendingCover,
    categoryId: catId, subCategoryId: subCatId,
    hostIds: hostIds,
    todayAvailable: true
  });
  // 重置
  document.getElementById('input-name').value = '';
  document.getElementById('input-intro').value = '';
  document.getElementById('input-tags').value = '';
  document.getElementById('input-category').value = '';
  if (document.getElementById('input-subcategory')) document.getElementById('input-subcategory').value = '';
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
    const subCatName = getSubCategoryName(m.subCategoryId);
    const hostNames = getHostNames(m.hostIds || []);
    const avail = m.todayAvailable ? '✅ 今日可开' : '❌ 今日不可开';
    const availColor = m.todayAvailable ? 'var(--green)' : 'var(--text2)';
    return '<div class="module-list-item">' +
      '<div class="module-list-thumb">' + coverHtml + '</div>' +
      '<div class="module-list-info">' +
        '<div class="module-list-name">' + escH(m.name) + '</div>' +
        '<div class="module-list-meta">' +
          '<span style="color:' + availColor + '; font-size:11px;">' + avail + '</span>' +
          '<span style="margin-left:6px; color:var(--text2);">· ' + escH(catName) + (subCatName ? ' / ' + escH(subCatName) : '') + '</span>' +
          (hostNames !== '未绑定' ? '<span class="list-item-host">🎤 ' + escH(hostNames) + '</span>' : '') +
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
  onCategoryChange('edit');
  // 设置小分类
  setTimeout(() => {
    const subSelect = document.getElementById('edit-subcategory');
    if (subSelect) subSelect.value = m.subCategoryId || '';
  }, 0);

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

  // 主持人多选
  renderHostCheckList('edit');
  setHostCheckList('edit', m.hostIds || []);

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
  const subCatId = document.getElementById('edit-subcategory') ? document.getElementById('edit-subcategory').value : '';
  const hostIds = getSelectedHostIds('edit');
  if (!name) { showToast('请输入模组名称'); return; }
  if (!intro) { showToast('请输入模组简介'); return; }
  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
  updateModule(editingId, {
    name, intro, tags,
    cover: editPendingCover,
    categoryId: catId,
    subCategoryId: subCatId,
    hostIds: hostIds
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

// ========== 小分类管理 ==========
let openSubCatCatId = null;

function renderSubCatManage() {
  const cats = getCategories();
  const list = document.getElementById('subcat-list');
  list.innerHTML = cats.map(c => {
    const subs = c.subCategories || [];
    const isOpen = openSubCatCatId === c.id;
    return '<div class="cat-with-sub">' +
      '<div class="cat-with-sub-header" onclick="toggleSubCatPanel(\'' + c.id + '\')">' +
        '<div class="cat-with-sub-header-left">' +
          '<span class="cat-with-sub-name">' + escH(c.name) + '</span>' +
          '<span class="cat-with-sub-count">' + subs.length + ' 个小分类</span>' +
        '</div>' +
        '<span style="color:var(--text2); font-size:18px; transition:transform 0.2s; display:inline-block;' +
          (isOpen ? 'transform:rotate(180deg);' : '') + '" id="subcat-arrow-' + c.id + '">▾</span>' +
      '</div>' +
      '<div class="cat-with-sub-body' + (isOpen ? ' open' : '') + '" id="subcat-body-' + c.id + '">' +
        subs.map(s =>
          '<div class="subcat-item">' +
            '<span class="subcat-item-name">' + escH(s.name) + '</span>' +
            '<button class="icon-btn danger" onclick="event.stopPropagation(); confirmDeleteSubCat(\'' + c.id + '\',\'' + s.id + '\',\'' + escH(s.name) + '\')">🗑️</button>' +
          '</div>'
        ).join('') +
        (subs.length === 0 ? '<div style="font-size:12px; color:var(--text2); padding:4px 0;">暂无小分类</div>' : '') +
        '<div class="subcat-add-row">' +
          '<input type="text" id="new-subcat-' + c.id + '" class="form-input" placeholder="新小分类名称" style="flex:1; font-size:13px; padding:8px 12px;">' +
          '<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); submitAddSubCat(\'' + c.id + '\')">添加</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleSubCatPanel(catId) {
  openSubCatCatId = openSubCatCatId === catId ? null : catId;
  // 关闭其他展开项
  document.querySelectorAll('.cat-with-sub-body').forEach(el => {
    const id = el.id.replace('subcat-body-', '');
    if (id !== openSubCatCatId) el.classList.remove('open');
  });
  document.querySelectorAll('.cat-with-sub-body').forEach(el => el.classList.remove('open'));
  if (openSubCatCatId) {
    const body = document.getElementById('subcat-body-' + openSubCatCatId);
    if (body) body.classList.add('open');
  }
  // 更新箭头
  document.querySelectorAll('.cat-with-sub-header span:last-child').forEach(el => {
    el.style.transform = '';
  });
  const arrow = document.getElementById('subcat-arrow-' + catId);
  if (arrow) arrow.style.transform = openSubCatCatId === catId ? 'rotate(180deg)' : '';
  // 如果是新展开，重新渲染确保箭头状态正确
  if (openSubCatCatId === catId) renderSubCatManage_openOnly(catId);
}

function renderSubCatManage_openOnly(catId) {
  // 只更新展开状态，不重绘整个列表
  const cats = getCategories();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  const subs = cat.subCategories || [];
  const body = document.getElementById('subcat-body-' + catId);
  if (!body) return;
  body.classList.add('open');
  const arrow = document.getElementById('subcat-arrow-' + catId);
  if (arrow) arrow.style.transform = 'rotate(180deg)';
  body.innerHTML =
    subs.map(s =>
      '<div class="subcat-item">' +
        '<span class="subcat-item-name">' + escH(s.name) + '</span>' +
        '<button class="icon-btn danger" onclick="event.stopPropagation(); confirmDeleteSubCat(\'' + catId + '\',\'' + s.id + '\',\'' + escH(s.name) + '\')">🗑️</button>' +
      '</div>'
    ).join('') +
    (subs.length === 0 ? '<div style="font-size:12px; color:var(--text2); padding:4px 0;">暂无小分类</div>' : '') +
    '<div class="subcat-add-row">' +
      '<input type="text" id="new-subcat-' + catId + '" class="form-input" placeholder="新小分类名称" style="flex:1; font-size:13px; padding:8px 12px;">' +
      '<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); submitAddSubCat(\'' + catId + '\')">添加</button>' +
    '</div>';
}

function submitAddSubCat(catId) {
  const input = document.getElementById('new-subcat-' + catId);
  if (!input) return;
  const name = input.value.trim();
  if (!name) { showToast('请输入小分类名称'); return; }
  addSubCategory(catId, name);
  renderSubCatManage_openOnly(catId);
  showToast('✅ 小分类已添加');
}

function confirmDeleteSubCat(catId, subCatId, name) {
  showConfirm('删除小分类', '确定删除小分类「' + name + '」？\n相关模组将解除该小分类绑定。', () => {
    deleteSubCategory(catId, subCatId);
    renderSubCatManage_openOnly(catId);
    showToast('🗑️ 已删除');
  });
}

// ========== 公告管理 ==========
function renderAnnManage() {
  const anns = getAnnouncements();
  const list = document.getElementById('ann-list');
  if (!anns.length) {
    list.innerHTML = '<div style="text-align:center; color:var(--text2); padding:20px; font-size:13px;">暂无公告</div>';
    return;
  }
  list.innerHTML = anns.map(a =>
    '<div class="ann-item">' +
      '<div class="ann-item-header">' +
        '<div style="display:flex; align-items:center; gap:10px;">' +
          '<div class="ann-toggle ' + (a.enabled ? 'on' : '') + '" id="ann-toggle-' + a.id + '" onclick="toggleAnn(\'' + a.id + '\')"></div>' +
          '<span style="font-size:12px; color:' + (a.enabled ? 'var(--green)' : 'var(--text2)') + '; font-weight:600;">' + (a.enabled ? '已启用' : '已禁用') + '</span>' +
        '</div>' +
        '<button class="icon-btn danger" onclick="confirmDeleteAnn(\'' + a.id + '\',\'' + escH(a.text.substring(0, 20)) + '\')">🗑️</button>' +
      '</div>' +
      '<div class="ann-item-text">' + escH(a.text) + '</div>' +
    '</div>'
  ).join('');
}

function toggleAnn(id) {
  const anns = getAnnouncements();
  const ann = anns.find(a => a.id === id);
  if (!ann) return;
  updateAnnouncement(id, ann.text, !ann.enabled);
  renderAnnManage();
}

function confirmDeleteAnn(id, preview) {
  showConfirm('删除公告', '确定删除该公告？', () => {
    deleteAnnouncement(id);
    renderAnnManage();
    showToast('🗑️ 已删除');
  });
}

function submitAddAnnouncement() {
  const text = document.getElementById('new-ann-text').value.trim();
  if (!text) { showToast('请输入公告内容'); return; }
  addAnnouncement(text);
  document.getElementById('new-ann-text').value = '';
  document.getElementById('ann-count').textContent = '0';
  renderAnnManage();
  showToast('✅ 公告已发布');
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
  // 简介字数统计
  const introEl = document.getElementById('input-intro');
  if (introEl) {
    introEl.addEventListener('input', () => {
      const c = document.getElementById('intro-count');
      if (c) c.textContent = introEl.value.length;
    });
  }
  // 公告字数统计
  const annEl = document.getElementById('new-ann-text');
  if (annEl) {
    annEl.addEventListener('input', () => {
      const c = document.getElementById('ann-count');
      if (c) c.textContent = annEl.value.length;
    });
  }
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
