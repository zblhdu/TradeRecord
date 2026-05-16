const store = require("../../utils/store");

Page({
  data: {
    filter: "all",
    records: []
  },

  onShow() {
    this.refresh();
  },

  changeFilter(event) {
    this.setData({ filter: event.currentTarget.dataset.filter }, () => this.refresh());
  },

  refresh() {
    const filter = this.data.filter;
    const records = store.getRecords()
      .filter((item) => filter === "all" || item.type === filter)
      .map((item) => ({
        ...item,
        typeText: store.TYPE_LABELS[item.type],
        percentText: item.type === "mistake" ? `-${item.percent}%` : `${item.percent}%`
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
