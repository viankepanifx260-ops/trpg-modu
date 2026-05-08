// ==================== 数据管理层 V3 ====================
// 重大更新：支持细分小分类 / 多主持人 / 公告系统

const DATA_KEY = 'trpg_modu_data_v3';

// 默认数据
function getDefaultData() {
  return {
    version: 3,
    categories: [
      { id: 'cat-1', name: 'COC（克苏鲁神话）', subCategories: [] },
      { id: 'cat-2', name: 'DND（龙与地下城）', subCategories: [] },
      { id: 'cat-3', name: 'CP（赛博朋克）', subCategories: [] },
      { id: 'cat-4', name: '其他规则', subCategories: [] }
    ],
    hosts: [
      { id: 'host-1', name: '主持人A', schedule: {} },
      { id: 'host-2', name: '主持人B', schedule: {} }
    ],
    modules: [
      {
        id: '1',
        name: '迷雾中的低语',
        intro: '一封来自远方的信件，将调查员们引向被浓雾笼罩的偏远渔村。在那里，古老而可怕的存在正在苏醒……',
        cover: '',
        categoryId: 'cat-1',
        subCategoryId: '',
        hostIds: ['host-1'],
        todayAvailable: true,
        createdAt: Date.now()
      },
      {
        id: '2',
        name: '疯狂山脉',
        intro: '一支南极科考队发现了超越人类认知的文明遗迹。跟随克苏鲁神话的脚步，探索宇宙的恐怖真相。',
        cover: '',
        categoryId: 'cat-1',
        subCategoryId: '',
        hostIds: ['host-2'],
        todayAvailable: false,
        createdAt: Date.now()
      },
      {
        id: '3',
        name: '暗夜行',
        intro: '雨夜，一辆抛锚的巴士将乘客们困在了一家荒郊的汽车旅馆。平静的夜晚，暗流涌动。',
        cover: '',
        categoryId: 'cat-1',
        subCategoryId: '',
        hostIds: ['host-1'],
        todayAvailable: true,
        createdAt: Date.now()
      }
    ],
    admins: [
      { id: 'admin-1', username: 'admin', password: 'admin123', role: 'super' }
    ],
    announcements: [],
    currentAdmin: null
  };
}

// 读取全部数据
function getAllData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) {
      const d = getDefaultData();
      saveAllData(d);
      return d;
    }
    const d = JSON.parse(raw);
    // 旧版数据迁移
    if (!d.version || d.version < 2) {
      // v1 → v2
      const d2 = getDefaultData();
      if (d.modules) d2.modules = d.modules;
      saveAllData(d2);
      return migrateV2toV3(d2);
    }
    if (d.version === 2) {
      return migrateV2toV3(d);
    }
    return d;
  } catch (e) {
    return getDefaultData();
  }
}

// v2 → v3 迁移
function migrateV2toV3(d) {
  d.version = 3;
  d.announcements = d.announcements || [];
  // categories 补 subCategories
  d.categories.forEach(c => { if (!c.subCategories) c.subCategories = []; });
  // modules: hostId → hostIds 数组
  d.modules.forEach(m => {
    if (m.hostIds === undefined) {
      m.hostIds = m.hostId ? [m.hostId] : [];
    }
    if (m.subCategoryId === undefined) m.subCategoryId = '';
  });
  saveAllData(d);
  return d;
}

// 保存全部数据
function saveAllData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// ==================== 分类 ====================
function getCategories() {
  return getAllData().categories;
}

function addCategory(name) {
  const data = getAllData();
  const cat = { id: 'cat-' + Date.now(), name: name.trim() };
  data.categories.push(cat);
  saveAllData(data);
  return cat;
}

function deleteCategory(id) {
  const data = getAllData();
  data.categories = data.categories.filter(c => c.id !== id);
  // 解除模组绑定
  data.modules.forEach(m => {
    if (m.categoryId === id) m.categoryId = '';
    if (m.subCategoryId && m.subCategoryId.startsWith(id)) m.subCategoryId = '';
  });
  saveAllData(data);
}

// ==================== 主持人 ====================
function getHosts() {
  return getAllData().hosts;
}

function addHost(name) {
  const data = getAllData();
  const host = { id: 'host-' + Date.now(), name: name.trim(), schedule: {} };
  data.hosts.push(host);
  saveAllData(data);
  return host;
}

function deleteHost(id) {
  const data = getAllData();
  data.hosts = data.hosts.filter(h => h.id !== id);
  // 从所有模组的 hostIds 中移除
  data.modules.forEach(m => {
    if (m.hostIds && Array.isArray(m.hostIds)) {
      m.hostIds = m.hostIds.filter(hid => hid !== id);
    } else if (m.hostId === id) {
      // 旧格式兼容
      m.hostIds = [];
      delete m.hostId;
    }
  });
  saveAllData(data);
}

// 设置主持人某天是否被订走（true=被订走=模组不可开）
function setHostSchedule(hostId, dateStr, booked) {
  const data = getAllData();
  const host = data.hosts.find(h => h.id === hostId);
  if (!host) return;
  if (booked) {
    host.schedule[dateStr] = true;
  } else {
    delete host.schedule[dateStr];
  }
  saveAllData(data);
}

// 获取某主持人某天是否可接（false=可接，true=被订走）
function isHostBooked(hostId, dateStr) {
  const data = getAllData();
  const host = data.hosts.find(h => h.id === hostId);
  if (!host) return false;
  return !!host.schedule[dateStr];
}

// 获取某模组在某天是否可开（所有主持人都被订走 = 不可开）
function isModuleAvailableOnDate(moduleId, dateStr) {
  const data = getAllData();
  const m = data.modules.find(x => x.id === moduleId);
  if (!m) return false;
  const hostIds = m.hostIds || [];
  if (!hostIds.length) return true; // 无主持人，默认可开
  // 所有人都被订走 → 不可开
  return !hostIds.every(hid => isHostBooked(hid, dateStr));
}

// 获取某模组的所有不可用日期（只考虑主持人档期，不含 todayAvailable）
function getModuleUnavailableDates(moduleId) {
  const data = getAllData();
  const m = data.modules.find(x => x.id === moduleId);
  if (!m) return [];
  const hostIds = m.hostIds || [];
  if (!hostIds.length) return [];
  const hostIds_set = new Set(hostIds);
  const hostSchedules = {};
  hostIds.forEach(hid => {
    const host = data.hosts.find(h => h.id === hid);
    if (host) hostSchedules[hid] = host.schedule;
  });
  // 找出所有主持人均有档期的日期
  const allDates = new Set();
  Object.values(hostSchedules).forEach(sch => {
    Object.keys(sch).filter(d => sch[d]).forEach(d => allDates.add(d));
  });
  return [...allDates].sort();
}

// ==================== 模组 ====================
function getModules() {
  return getAllData().modules;
}

function getModuleById(id) {
  return getAllData().modules.find(m => m.id === id) || null;
}

function addModule(module) {
  const data = getAllData();
  module.id = 'mod-' + Date.now();
  module.createdAt = Date.now();
  data.modules.push(module);
  saveAllData(data);
  return module;
}

function updateModule(id, updates) {
  const data = getAllData();
  const idx = data.modules.findIndex(m => m.id === id);
  if (idx === -1) return null;
  data.modules[idx] = { ...data.modules[idx], ...updates, id };
  saveAllData(data);
  return data.modules[idx];
}

function deleteModule(id) {
  const data = getAllData();
  data.modules = data.modules.filter(m => m.id !== id);
  saveAllData(data);
}

// 今日可开（综合：todayAvailable + 主持人档期）
function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getModulesForPlayer() {
  // 返回模组 + 今日是否可开（玩家视角）
  const data = getAllData();
  const today = getTodayStr();
  return data.modules.map(m => {
    let availableToday = m.todayAvailable;
    // 如果绑定了主持人，且所有主持人都被订走了，也不能开
    const hostIds = m.hostIds || [];
    if (hostIds.length && hostIds.every(hid => isHostBooked(hid, today))) {
      availableToday = false;
    }
    return { ...m, _availableToday: availableToday };
  });
}

// ==================== 管理员 ====================
function getAdmins() {
  return getAllData().admins;
}

function addAdmin(username, password, role) {
  const data = getAllData();
  if (data.admins.find(a => a.username === username)) return null;
  const admin = { id: 'admin-' + Date.now(), username, password, role: role || 'normal' };
  data.admins.push(admin);
  saveAllData(data);
  return admin;
}

function deleteAdmin(id) {
  const data = getAllData();
  // 至少保留一个超级管理员
  const superCount = data.admins.filter(a => a.role === 'super').length;
  const target = data.admins.find(a => a.id === id);
  if (target && target.role === 'super' && superCount <= 1) return false;
  data.admins = data.admins.filter(a => a.id !== id);
  saveAllData(data);
  return true;
}

function verifyAdmin(username, password) {
  const data = getAllData();
  return data.admins.find(a => a.username === username && a.password === password) || null;
}

function setCurrentAdmin(admin) {
  const data = getAllData();
  data.currentAdmin = admin ? { id: admin.id, username: admin.username, role: admin.role } : null;
  saveAllData(data);
}

function getCurrentAdmin() {
  return getAllData().currentAdmin || null;
}

// ==================== 小分类 ====================
function getSubCategories(catId) {
  const cats = getCategories();
  const cat = cats.find(c => c.id === catId);
  return cat ? (cat.subCategories || []) : [];
}

function addSubCategory(catId, name) {
  const data = getAllData();
  const cat = data.categories.find(c => c.id === catId);
  if (!cat) return null;
  if (!cat.subCategories) cat.subCategories = [];
  const sub = { id: 'sub-' + Date.now(), name: name.trim() };
  cat.subCategories.push(sub);
  saveAllData(data);
  return sub;
}

function deleteSubCategory(catId, subCatId) {
  const data = getAllData();
  const cat = data.categories.find(c => c.id === catId);
  if (!cat || !cat.subCategories) return;
  cat.subCategories = cat.subCategories.filter(s => s.id !== subCatId);
  // 解除模组绑定
  data.modules.forEach(m => {
    if (m.subCategoryId === subCatId) m.subCategoryId = '';
  });
  saveAllData(data);
}

function getSubCategoryName(subCatId) {
  if (!subCatId) return '';
  const data = getAllData();
  for (const cat of data.categories) {
    const sub = (cat.subCategories || []).find(s => s.id === subCatId);
    if (sub) return sub.name;
  }
  return '';
}

// ==================== 主持人（多选） ====================
function getHostNames(hostIds) {
  if (!hostIds || !hostIds.length) return '未绑定';
  const hosts = getHosts();
  const names = hostIds.map(id => {
    const h = hosts.find(x => x.id === id);
    return h ? h.name : '';
  }).filter(Boolean);
  return names.length ? names.join('、') : '未绑定';
}

function getHostNamesShort(hostIds) {
  return getHostNames(hostIds);
}

// ==================== 公告 ====================
function getAnnouncements() {
  return getAllData().announcements || [];
}

function getEnabledAnnouncements() {
  return getAnnouncements().filter(a => a.enabled);
}

function addAnnouncement(text) {
  const data = getAllData();
  if (!data.announcements) data.announcements = [];
  const ann = { id: 'ann-' + Date.now(), text: text.trim(), enabled: true };
  data.announcements.push(ann);
  saveAllData(data);
  return ann;
}

function updateAnnouncement(id, text, enabled) {
  const data = getAllData();
  const ann = data.announcements.find(a => a.id === id);
  if (!ann) return null;
  ann.text = text.trim();
  ann.enabled = !!enabled;
  saveAllData(data);
  return ann;
}

function deleteAnnouncement(id) {
  const data = getAllData();
  data.announcements = data.announcements.filter(a => a.id !== id);
  saveAllData(data);
}

// ==================== 工具函数 ====================
function getCategoryName(catId) {
  const cat = getCategories().find(c => c.id === catId);
  return cat ? cat.name : '未分类';
}

function getHostName(hostId) {
  // 兼容旧接口
  const host = getHosts().find(h => h.id === hostId);
  return host ? host.name : '未绑定';
}

// 格式化日期 YYYY-MM-DD
function formatDate(y, m, d) {
  return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
}

// 获取当月所有日期字符串
function getMonthDates(y, m) {
  const days = new Date(y, m, 0).getDate();
  const res = [];
  for (let i = 1; i <= days; i++) res.push(formatDate(y, m, i));
  return res;
}
