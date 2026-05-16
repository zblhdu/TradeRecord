const store = require("../../utils/store");

function defaultForm() {
  return {
    type: "mistake",
    date: store.formatDate(new Date()),
    symbol: "",
    action: "",
    percent: "",
    positionPercent: "100",
    reason: "",
    note: ""
  };
}

Page({
  data: {
    form: defaultForm(),
    reasons: store.MISTAKE_REASONS,
    reasonIndex: 0,
    showCustomReason: false,
    reasonLabel: "选择类型"
  },

  changeDate(event) {
    this.setData({ form: { ...this.data.form, date: event.detail.value } });
  },

  inputSymbol(event) {
    this.setData({ form: { ...this.data.form, symbol: event.detail.value } });
  },

  inputPercent(event) {
    this.setData({ form: { ...this.data.form, percent: event.detail.value } });
  },

  inputPosition(event) {
    this.setData({ form: { ...this.data.form, positionPercent: event.detail.value } });
  },

  focusPosition() {
    if (`${this.data.form.positionPercent}` === "100") {
      this.setData({ form: { ...this.data.form, positionPercent: "" } });
    }
  },

  changeReason(event) {
    const index = Number(event.detail.value);
    const reason = this.data.reasons[index];
    const isCustom = reason === "自定义";
    this.setData({
      reasonIndex: index,
      showCustomReason: isCustom,
      reasonLabel: isCustom ? "自定义" : reason,
      form: { ...this.data.form, reason: isCustom ? "" : reason }
    });
  },

  inputReason(event) {
    this.setData({ form: { ...this.data.form, reason: event.detail.value } });
  },

  inputNote(event) {
    this.setData({ form: { ...this.data.form, note: event.detail.value } });
  },

  save() {
    const percent = Number(this.data.form.percent);
    const positionPercent = Number(this.data.form.positionPercent);
    if (!this.data.form.date) {
      wx.showToast({ title: "请选择日期", icon: "none" });
      return;
    }
    if (!Number.isFinite(percent) || percent <= 0) {
      wx.showToast({ title: "请填写亏损比例", icon: "none" });
      return;
    }
    if (!Number.isFinite(positionPercent) || positionPercent <= 0 || positionPercent > 100) {
      wx.showToast({ title: "请填写 1-100 的仓位", icon: "none" });
      return;
    }

    store.addRecord({ ...this.data.form, type: "mistake", action: "", percent, positionPercent });
    wx.showToast({ title: "已保存", icon: "success" });
    this.reset();
  },

  reset() {
    this.setData({
      form: defaultForm(),
      reasonIndex: 0,
      showCustomReason: false,
      reasonLabel: "选择类型"
    });
  }
});
