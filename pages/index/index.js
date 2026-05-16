const store = require("../../utils/store");

function defaultForm() {
  return {
    type: "mistake",
    date: store.formatDate(new Date()),
    symbol: "",
    action: "",
    percent: "",
    reason: "",
    note: ""
  };
}

Page({
  data: {
    form: defaultForm(),
    reasons: store.MISTAKE_REASONS,
    reasonIndex: 0
  },

  changeDate(event) {
    this.setData({ form: { ...this.data.form, date: event.detail.value } });
  },

  inputSymbol(event) {
    this.setData({ form: { ...this.data.form, symbol: event.detail.value } });
  },

  inputAction(event) {
    this.setData({ form: { ...this.data.form, action: event.detail.value } });
  },

  inputPercent(event) {
    this.setData({ form: { ...this.data.form, percent: event.detail.value } });
  },

  changeReason(event) {
    const index = Number(event.detail.value);
    this.setData({
      reasonIndex: index,
      form: { ...this.data.form, reason: this.data.reasons[index] }
    });
  },

  inputNote(event) {
    this.setData({ form: { ...this.data.form, note: event.detail.value } });
  },

  save() {
    const percent = Number(this.data.form.percent);
    if (!this.data.form.date) {
      wx.showToast({ title: "请选择日期", icon: "none" });
      return;
    }
    if (!Number.isFinite(percent) || percent <= 0) {
      wx.showToast({ title: "请填写亏损比例", icon: "none" });
      return;
    }

    store.addRecord({ ...this.data.form, type: "mistake", percent });
    wx.showToast({ title: "已保存", icon: "success" });
    this.reset();
  },

  reset() {
    this.setData({
      form: defaultForm(),
      reasonIndex: 0
    });
  }
});
