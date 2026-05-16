const store = require("../../utils/store");

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

Page({
  data: {
    startDate: "",
    endDate: "",
    records: []
  },

  onLoad() {
    const today = new Date();
    this.setData({
      startDate: store.formatDate(addDays(today, -364)),
      endDate: store.formatDate(today)
    });
  },

  onShow() {
    this.refresh();
  },

  changeStartDate(event) {
    const startDate = event.detail.value;
    const endDate = parseDate(startDate) > parseDate(this.data.endDate) ? startDate : this.data.endDate;
    this.setData({ startDate, endDate }, () => this.refresh());
  },

  changeEndDate(event) {
    const endDate = event.detail.value;
    const startDate = parseDate(endDate) < parseDate(this.data.startDate) ? endDate : this.data.startDate;
    this.setData({ startDate, endDate }, () => this.refresh());
  },

  refresh() {
    const start = parseDate(this.data.startDate);
    const end = new Date(`${this.data.endDate}T23:59:59`);
    const records = store.getRecords()
      .filter((item) => item.type === "mistake")
      .filter((item) => {
        const date = parseDate(item.date);
        return date >= start && date <= end;
      })
      .map((item) => ({
        ...item,
        typeText: store.TYPE_LABELS[item.type],
        percentText: item.type === "mistake" ? `-${item.lossPercent}%` : `${item.percent}%`,
        detailText: item.type === "mistake" ? `亏损 ${item.percent}% × 仓位 ${item.positionPercent}%` : ""
      }));
    this.setData({ records });
  },

  deleteItem(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除记录",
      content: "删除后无法恢复，确认删除这条复盘吗？",
      confirmColor: "#9b2f2f",
      success: (res) => {
        if (res.confirm) {
          store.deleteRecord(id);
          this.refresh();
          wx.showToast({ title: "已删除", icon: "none" });
        }
      }
    });
  }
});
