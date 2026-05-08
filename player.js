// ==================== 玩家端逻辑 V2 ====================

let currentCategory = 'all';
let currentDate = getTodayStr();

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  renderCategoryBar();
  renderDatePicker();
  renderModules();
});

// ========== 分类栏 ==========
function renderCategoryBar() {
  const bar = document.getElementById('category-bar');
  const cats = getCategories();
  let html = '<button class="cat-chip ' + (currentCategory === 'all' ? 'active' : '') + '" onclick="selectCategory(\'all\')">全部</button>';
  cats.forEach(c => {
    html += '<button class="cat-chip ' + (currentCategory === c.id ? 'active' : '') + '" onclick="selectCategory(\'' + c.id + '\')">' + escHtml(c.name) + '</button>';
  });
  bar.innerHTML = html;
}

function selectCategory(catId) {
  currentCategory = catId;
  renderCategoryBar();
  renderModules();
}

// ========== 日期选择 ==========
function renderDatePicker() {
  const bar = document.getElementById('date-picker-bar');
  const today = getTodayStr();
  // 显示今天 + 今天起7天
  let html = '<span class="date-label">📅 查看日期：</span>';
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    const ds = y + '-' + m + '-' + day;
    const isToday = (ds === today);
    const label = isToday ? '今' : String(d.getMonth()+1) + '/' + d.getDate();
    const active = ds === currentDate ? ' active' : '';
    const todayClass = isToday ? ' today' : '';
    html += '<button class="date-btn' + active + todayClass + '" onclick="selectDate(\'' + ds + '\')">' + label + '</button>';
  }
  bar.innerHTML = html;
}

function selectDate(ds) {
  currentDate = ds;
  renderDatePicker();
  renderModules();
}

// ========== 渲染模组 ==========
function renderModules() {
  const grid = document.getElementById('module-grid');
  const statEl = document.getElementById('stat-today');
  const statDot = document.getElementById('stat-dot');

  let modules = getModules();

  // 分类筛选
  if (currentCategory !== 'all') {
    modules = modules.filter(m => m.categoryId === currentCategory);
  }

  // 统计：当前选中日期可开的模组数
  const availableCount = modules.filter(m => isModuleAvailableOnDate(m.id, currentDate)).length;
  statDot.style.background = availableCount > 0 ? 'var(--green)' : 'var(--accent2)';
  statEl.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + (availableCount>0?'var(--green)':'var(--accent2)') + ';"></span>' +
    '查看日期 ' + currentDate + '：可开 <strong style="color:var(--green);">' + availableCount + '</strong> / ' + modules.length + ' 个模组';

  if (!modules.length) {
    grid.innerHTML = '<div class="empty-state">' +
      '<div class="icon">🎲</div>' +
      '<h3>暂无模组</h3>' +
      '<p>该分类下还没有添加模组，<br>试试其他分类吧。</p>' +
      '</div>';
    return;
  }

  grid.innerHTML = modules.map(m => {
    const available = isModuleAvailableOnDate(m.id, currentDate);
    const catName = getCategoryName(m.categoryId);
    const icon = getModuleIcon(m);
    const coverHtml = m.cover
      ? '<img src="' + m.cover + '" alt="' + escHtml(m.name) + '" loading="lazy">'
      : '<span class="cover-placeholder">' + icon + '</span>';

    const statusClass = available ? 'available' : 'unavailable';
    const statusText = available ? '✅ 当日可开' : '❌ 当日不可开';
    const cardClass = available ? '' : 'unavailable-selected';

    // 不可用日期列表（只有不可用时才查）
    let unavailableHtml = '';
    if (!available) {
      const dates = getModuleUnavailableDates(m.id);
      if (dates.length) {
        const showDates = dates.slice(0, 5);
        unavailableHtml = '<div class="unavailable-dates">📅 不可开日期：' + showDates.map(d => d).join('、') + (dates.length>5 ? '…' : '') + '</div>';
      }
    }

    const tagsHtml = (m.tags || []).slice(0, 3).map(t => '<span class="tag">' + escHtml(t) + '</span>').join('');

    return '<div class="module-card ' + cardClass + '" onclick="openDetail(\'' + m.id + '\')">' +
      '<div class="card-cover">' + coverHtml +
      '<div class="status-badge ' + statusClass + '">' + statusText + '</div>' +
      '</div>' +
      '<div class="card-body">' +
      '<div class="card-name">' + escHtml(m.name) + '</div>' +
      '<div class="card-intro">' + escHtml(m.intro) + '</div>' +
      '<div class="card-tags">' + tagsHtml + '</div>' +
      '</div>' +
      unavailableHtml +
      '</div>';
  }).join('');
}

// ========== 模组详情弹窗 ==========
function openDetail(id) {
  const m = getModuleById(id);
  if (!m) return;

  const catName = getCategoryName(m.categoryId);
  const icon = getModuleIcon(m);

  // 封面
  const coverEl = document.getElementById('detail-cover');
  const placeholder = document.getElementById('detail-cover-placeholder');
  coverEl.innerHTML = m.cover
    ? '<img src="' + m.cover + '" alt="' + escHtml(m.name) + '">'
    : '<span class="cover-placeholder" id="detail-cover-placeholder">' + icon + '</span>';

  document.getElementById('detail-name').textContent = m.name;

  // 标签
  const tags = (m.tags || []).map(t => '<span class="tag">' + escHtml(t) + '</span>').join('');
  document.getElementById('detail-meta').innerHTML = '<span style="color:var(--accent2); font-size:12px;">' + escHtml(catName) + '</span>' + (tags ? '　' + tags : '');

  document.getElementById('detail-intro').textContent = m.intro;

  // 不可用日期
  const unavailEl = document.getElementById('detail-unavailable');
  const allDates = getModuleUnavailableDates(m.id);
  if (allDates.length) {
    unavailEl.style.display = 'block';
    unavailEl.innerHTML = '<h4>📅 以下日期该模组不可开</h4>' + allDates.map(d => '<span class="date-tag">' + d + '</span>').join('');
  } else {
    unavailEl.style.display = 'none';
  }

  document.getElementById('detail-modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('show');
  document.body.style.overflow = '';
}

// 点击遮罩关闭
document && document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDetail();
    });
  }
});

// ========== 工具 ==========
function getModuleIcon(m) {
  const tag = (m.tags || []).join('');
  if (tag.includes('COC') || tag.includes('恐怖') || tag.includes('克苏鲁')) return '🦑';
  if (tag.includes('DND') || tag.includes('DnD') || tag.includes('地下城')) return '⚔️';
  if (tag.includes('推理') || tag.includes('悬疑')) return '🔍';
  if (tag.includes('赛博')) return '🌃';
  return '🎲';
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
