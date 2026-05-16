const store = require("../../utils/store");

Page({
  data: {
    count: 0
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    this.setData({ count: store.getRecords().length });
  },

  exportData() {
    const payload = store.getExportPayload();
    const filePath = `${wx.env.USER_DATA_PATH}/stock-mistake-review-${Date.now()}.json`;
    wx.getFileSystemManager().writeFile({
      filePath,
      data: JSON.stringify(payload, null, 2),
      encoding: "utf8",
      success: () => {
        wx.shareFileMessage({
          filePath,
          fileName: "股票失误反省录备份.json",
          fail: () => {
            wx.showModal({
              title: "已导出",
              content: `文件已保存到小程序本地路径：${filePath}`,
              showCancel: false
            });
          }
        });
      },
      fail: () => wx.showToast({ title: "导出失败", icon: "none" })
    });
  },

  importMerge() {
    this.importData("merge");
  },

  importReplace() {
    wx.showModal({
      title: "覆盖导入",
      content: "当前本地记录会被导入文件替换，确认继续吗？",
      confirmColor: "#9b2f2f",
      success: (res) => {
        if (res.confirm) {
          this.importData("replace");
        }
      }
    });
  },

  importData(mode) {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["json"],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: "utf8",
          success: (readRes) => {
            try {
              const payload = JSON.parse(readRes.data);
              const records = store.getRecordsFromPayload(payload);
              if (mode === "replace") {
                store.replaceRecords(records);
              } else {
                store.mergeRecords(records);
              }
              this.refresh();
              wx.showToast({ title: "导入完成", icon: "success" });
            } catch (error) {
              wx.showModal({
                title: "导入失败",
                content: error.message || "文件内容不是有效的 JSON 备份",
                showCancel: false
              });
            }
          },
          fail: () => wx.showToast({ title: "读取失败", icon: "none" })
        });
      }
    });
  }
});
