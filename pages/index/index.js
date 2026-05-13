const store = require("../../utils/store");

Page({
  data: {
    overview: {
      month: {},
      halfYear: {},
      year: {},
      recentRecords: []
    },
    periods: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const records = store.getRecords().map((item) => ({
      ...item,
      typeText: store.TYPE_LABELS[item.type]
    }));
    const overview = store.getOverview(records);
    const periods = [
      { label: "近 1 月", ...overview.month },
      { label: "近半年", ...overview.halfYear },
      { label: "近一年", ...overview.year }
    ];
    this.setData({ overview, periods }, () => this.drawChart());
  },

  drawChart() {
    const stat = this.data.overview.month || {};
    const query = wx.createSelectorQuery();
    query.select("#monthChart").boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (!rect) return;
      const ctx = wx.createCanvasContext("monthChart", this);
      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.34;
      const total = Math.max(1, (stat.mistakeCount || 0) + (stat.correctCount || 0));
      const mistakeRatio = (stat.mistakeCount || 0) / total;

      ctx.clearRect(0, 0, width, height);
      ctx.setLineWidth(18);
      ctx.setLineCap("round");
      ctx.setStrokeStyle("#dfe5d9");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (stat.total > 0) {
        ctx.setStrokeStyle("#c85c4a");
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * mistakeRatio);
        ctx.stroke();
        ctx.setStrokeStyle("#2f7d58");
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2 + Math.PI * 2 * mistakeRatio, Math.PI * 1.5);
        ctx.stroke();
      }

      ctx.setFillStyle("#1f2d28");
      ctx.setFontSize(24);
      ctx.setTextAlign("center");
      ctx.fillText(`${stat.total || 0}`, cx, cy - 2);
      ctx.setFillStyle("#7c857a");
      ctx.setFontSize(12);
      ctx.fillText("本月记录", cx, cy + 24);
      ctx.draw();
    });
  },

  goRecord() {
    wx.switchTab({ url: "/pages/record/record" });
  },

  goHistory() {
    wx.switchTab({ url: "/pages/history/history" });
  }
});
