const store = require("../../utils/store");

function isPresetReason(reason) {
  return store.MISTAKE_REASONS.includes(reason) && reason !== "自定义";
}

Page({
  data: {
    id: "",
    form: null,
    reasons: store.MISTAKE_REASONS,
    reasonIndex: 0,
    showCustomReason: false,
    reasonLabel: "选择原因"
  },

  onLoad(options) {
    const id = options.id || "";
    const record = store.getRecordById(id);
    if (!record) {
      wx.showToast({ title: "记录不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }

    const reasonIndex = isPresetReason(record.reason) ? store.MISTAKE_REASONS.indexOf(record.reason) : store.MISTAKE_REASONS.indexOf("自定义");
    const showCustomReason = !!record.reason && !isPresetReason(record.reason);
    this.setData({
      id,
      form: {
        ...record,
        percent: `${record.percent}`,
        positionPercent: `${record.positionPercent}`
      },
      reasonIndex: reasonIndex >= 0 ? reasonIndex : 0,
      showCustomReason,
      reasonLabel: showCustomReason ? "自定义" : (record.reason || "选择原因")
    });
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

    store.updateRecord(this.data.id, {
      ...this.data.form,
      type: "mistake",
      action: "",
      percent,
      positionPercent
    });
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => wx.navigateBack(), 500);
  }
});
