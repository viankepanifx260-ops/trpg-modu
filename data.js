// ==================== 数据管理层 V2 ====================

const DATA_KEY = 'trpg_modu_data_v2';

// 默认数据
function getDefaultData() {
  return {
    version: 2,
    categories: [
      { id: 'cat-1', name: 'COC（克苏鲁神话）' },
      { id: 'cat-2', name: 'DND（龙与地下城）' },
      { id: 'cat-3', name: 'CP（赛博朋克）' },
      { id: 'cat-4', name: '其他规则' }
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
        hostId: 'host-1',
        todayAvailable: true,
        createdAt: Date.now()
      },
      {
        id: '2',
        name: '疯狂山脉',
        intro: '一支南极科考队发现了超越人类认知的文明遗迹。跟随克苏鲁神话的脚步，探索宇宙的恐怖真相。',
        cover: '',
        categoryId: 'cat-1',
        hostId: 'host-2',
        todayAvailable: false,
        createdAt: Date.now()
      },
      {
        id: '3',
        name: '暗夜行',
        intro: '雨夜，一辆抛锚的巴士将乘客们困在了一家荒郊的汽车旅馆。平静的夜晚，暗流涌动。',
        cover: '',
        categoryId: 'cat-1',
        hostId: 'host-1',
        todayAvailable: true,
        createdAt: Date.now()
      }
    ],
    admins: [
      { id: 'admin-1', username: 'admin', password: 'admin123', role: 'super' }
    ],
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
    // 兼容旧版
    if (!d.version || d.version < 2) {
      const d2 = getDefaultData();
      // 保留旧模组数据
      if (d.modules) d2.modules = d.modules;
      saveAllData(d2);
      return d2;
    }
    return d;
  } catch (e) {
    return getDefaultData();
  }
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
  data.modules.forEach(m => { if (m.categoryId === id) m.categoryId = ''; });
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
  data.modules.forEach(m => { if (m.hostId === id) m.hostId = ''; });
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

// 获取某模组在某天是否可开（考虑主持人档期）
function isModuleAvailableOnDate(moduleId, dateStr) {
  const data = getAllData();
  const m = data.modules.find(x => x.id === moduleId);
  if (!m) return false;
  if (!m.hostId) return true; // 无主持人，默认可开
  return !isHostBooked(m.hostId, dateStr);
}

// 获取某模组的所有不可用日期（只考虑主持人档期，不含 todayAvailable）
function getModuleUnavailableDates(moduleId) {
  const data = getAllData();
  const m = data.modules.find(x => x.id === moduleId);
  if (!m || !m.hostId) return [];
  const host = data.hosts.find(h => h.id === m.hostId);
  if (!host) return [];
  return Object.keys(host.schedule).filter(d => host.schedule[d]);
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
    // 如果绑定了主持人，且今天被订走了，也不能开
    if (m.hostId && isHostBooked(m.hostId, today)) availableToday = false;
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

// ==================== 工具函数 ====================
function getCategoryName(catId) {
  const cat = getCategories().find(c => c.id === catId);
  return cat ? cat.name : '未分类';
}

function getHostName(hostId) {
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
