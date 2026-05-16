const STORAGE_KEY = "trade_record_items_v1";
const EXPORT_VERSION = 1;

const TYPE_LABELS = {
  mistake: "误操作"
};

const MISTAKE_REASONS = ["追涨买入", "恐慌割肉", "卖飞", "频繁交易", "重仓赌单票", "没按计划止损", "没按计划止盈", "犹豫错过", "其他", "自定义"];

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeRecord(record) {
  const percent = Number(record.percent);
  const positionPercent = Number(record.positionPercent);
  const normalizedPercent = Number.isFinite(percent) ? Math.abs(percent) : 0;
  const normalizedPosition = Number.isFinite(positionPercent) ? Math.abs(positionPercent) : 100;
  return {
    id: record.id || createId(),
    type: "mistake",
    date: record.date || formatDate(new Date()),
    symbol: `${record.symbol || ""}`.trim(),
    action: `${record.action || ""}`.trim(),
    reason: `${record.reason || ""}`.trim(),
    percent: normalizedPercent,
    positionPercent: normalizedPosition,
    lossPercent: Number((normalizedPercent * normalizedPosition / 100).toFixed(2)),
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

function getRecordById(id) {
  return getRecords().find((item) => item.id === id) || null;
}

function updateRecord(id, patch) {
  const records = getRecords();
  const next = records.map((item) => {
    if (item.id !== id) {
      return item;
    }
    return normalizeRecord({
      ...item,
      ...patch,
      id,
      createdAt: item.createdAt,
      updatedAt: new Date().toISOString()
    });
  });
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
    app: "股票失误反省录",
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

module.exports = {
  TYPE_LABELS,
  MISTAKE_REASONS,
  STORAGE_KEY,
  formatDate,
  addRecord,
  deleteRecord,
  getRecordById,
  getExportPayload,
  getRecords,
  getRecordsFromPayload,
  mergeRecords,
  replaceRecords,
  updateRecord
};
