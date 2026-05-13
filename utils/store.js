const STORAGE_KEY = "trade_record_items_v1";
const EXPORT_VERSION = 1;

const TYPE_LABELS = {
  mistake: "误操作",
  correct: "正确操作"
};

const MISTAKE_REASONS = ["追涨", "杀跌", "恐慌", "贪心", "犹豫", "无计划", "其他"];
const CORRECT_REASONS = ["按计划", "止损", "止盈", "耐心等待", "仓位控制", "其他"];

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(value) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeRecord(record) {
  const type = record.type === "correct" ? "correct" : "mistake";
  const percent = Number(record.percent);
  return {
    id: record.id || createId(),
    type,
    date: record.date || formatDate(new Date()),
    symbol: `${record.symbol || ""}`.trim(),
    action: `${record.action || ""}`.trim(),
    reason: `${record.reason || ""}`.trim(),
    percent: Number.isFinite(percent) ? Math.abs(percent) : 0,
    note: `${record.note || ""}`.trim(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function getRecords() {
  const records = wx.getStorageSync(STORAGE_KEY);
  if (!Array.isArray(records)) {
    return [];
  }
  return records.map(normalizeRecord).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function saveRecords(records) {
  wx.setStorageSync(STORAGE_KEY, records);
}

function addRecord(record) {
  const records = getRecords();
  const next = [normalizeRecord(record), ...records];
  saveRecords(next);
  return next;
}

function deleteRecord(id) {
  const next = getRecords().filter((item) => item.id !== id);
  saveRecords(next);
  return next;
}

function replaceRecords(records) {
  if (!Array.isArray(records)) {
    throw new Error("导入文件格式不正确");
  }
  const next = records.map(normalizeRecord);
  saveRecords(next);
  return getRecords();
}

function mergeRecords(records) {
  if (!Array.isArray(records)) {
    throw new Error("导入文件格式不正确");
  }
  const map = {};
  getRecords().forEach((item) => {
    map[item.id] = item;
  });
  records.map(normalizeRecord).forEach((item) => {
    map[item.id] = item;
  });
  saveRecords(Object.keys(map).map((key) => map[key]));
  return getRecords();
}

function getExportPayload() {
  return {
    app: "TradeRecord",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    records: getRecords()
  };
}

function getRecordsFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.records)) {
    return payload.records;
  }
  throw new Error("没有找到可导入的记录");
}

function summarize(records, days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - days + 1);

  const source = records.filter((item) => parseDate(item.date) >= start);
  const stat = {
    days,
    total: source.length,
    mistakeCount: 0,
    correctCount: 0,
    lossPercent: 0,
    gainPercent: 0,
    netPercent: 0
  };

  source.forEach((item) => {
    if (item.type === "mistake") {
      stat.mistakeCount += 1;
      stat.lossPercent += item.percent;
    } else {
      stat.correctCount += 1;
      stat.gainPercent += item.percent;
    }
  });
  stat.lossPercent = Number(stat.lossPercent.toFixed(2));
  stat.gainPercent = Number(stat.gainPercent.toFixed(2));
  stat.netPercent = Number((stat.gainPercent - stat.lossPercent).toFixed(2));
  return stat;
}

function getOverview(records) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = records.filter((item) => parseDate(item.date) >= monthStart);
  return {
    month: summarize(records, Math.max(1, now.getDate())),
    halfYear: summarize(records, 183),
    year: summarize(records, 365),
    monthRecords,
    recentRecords: records.slice(0, 5)
  };
}

module.exports = {
  TYPE_LABELS,
  MISTAKE_REASONS,
  CORRECT_REASONS,
  STORAGE_KEY,
  formatDate,
  addRecord,
  deleteRecord,
  getExportPayload,
  getOverview,
  getRecords,
  getRecordsFromPayload,
  mergeRecords,
  replaceRecords,
  summarize
};
