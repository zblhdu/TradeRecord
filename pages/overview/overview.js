const store = require("../../utils/store");

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shortDateKey(date) {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shortMonthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function monthKey(year, month) {
  return `${year}-${pad(month + 1)}`;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMistakes() {
  return store.getRecords().filter((item) => item.type === "mistake");
}

function getActualLoss(item) {
  return Number((item.lossPercent || item.percent || 0).toFixed(2));
}

function groupByDate(records) {
  return records.reduce((map, item) => {
    if (!map[item.date]) {
      map[item.date] = { count: 0, loss: 0, records: [] };
    }
    map[item.date].count += 1;
    map[item.date].loss = Number((map[item.date].loss + getActualLoss(item)).toFixed(2));
    map[item.date].records.push(item);
    return map;
  }, {});
}

function summarize(records, startDate) {
  const source = records.filter((item) => parseDate(item.date) >= startDate);
  return {
    count: source.length,
    loss: Number(source.reduce((sum, item) => sum + getActualLoss(item), 0).toFixed(2))
  };
}

function summarizeRange(records, startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
  const source = filterRange(records, start, end);
  return {
    count: source.length,
    loss: Number(source.reduce((sum, item) => sum + getActualLoss(item), 0).toFixed(2))
  };
}

function filterRange(records, startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
  return records.filter((item) => {
    const date = parseDate(item.date);
    return date >= start && date <= end;
  });
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(1, Math.floor((end - start) / 86400000) + 1);
}

function formatLoss(value) {
  const loss = Number(value || 0);
  return loss === 0 ? "0%" : `-${loss}%`;
}

function withLossText(summary) {
  return {
    ...summary,
    lossText: formatLoss(summary.loss)
  };
}

function summarizeReasons(records) {
  const map = {};
  records.forEach((item) => {
    const reason = item.reason || "未填写";
    if (!map[reason]) {
      map[reason] = { reason, count: 0, loss: 0 };
    }
    map[reason].count += 1;
    map[reason].loss = Number((map[reason].loss + getActualLoss(item)).toFixed(2));
  });
  return Object.keys(map)
    .map((key) => ({
      ...map[key],
      lossText: formatLoss(map[key].loss)
    }))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 8);
}

function buildTrendBuckets(startDate, endDate, bucketDays, records) {
  const buckets = [];
  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);

  while (cursor <= rangeEnd) {
    const start = new Date(cursor);
    const end = addDays(start, bucketDays - 1);
    const bucketEnd = end > rangeEnd ? rangeEnd : new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
    const bucketRecords = filterRange(records, start, bucketEnd);
    const loss = Number(bucketRecords.reduce((sum, item) => sum + getActualLoss(item), 0).toFixed(2));
    buckets.push({
      start: dateKey(start),
      end: dateKey(bucketEnd),
      count: bucketRecords.length,
      loss,
      lossText: formatLoss(loss),
      records: bucketRecords.map((item) => ({
        ...item,
        lossText: formatLoss(getActualLoss(item)),
        detailText: `亏损 ${item.percent}% × 仓位 ${item.positionPercent}%`
      }))
    });
    cursor = addDays(start, bucketDays);
  }
  return buckets;
}

Page({
  data: {
    weekdays: WEEKDAYS,
    currentYear: 0,
    currentMonth: 0,
    monthTitle: "",
    monthPickerValue: "",
    calendarDays: [],
    selectedDate: "",
    selectedRecords: [],
    monthSummary: { count: 0, loss: 0, lossText: "0%" },
    summary90: { count: 0, loss: 0, lossText: "0%" },
    customStart: "",
    customEnd: "",
    customSummary: { count: 0, loss: 0, lossText: "0%" },
    customBucketLabel: "按天",
    reasonStats90: [],
    reasonStatsCustom: [],
    trend90Buckets: [],
    trendCustomBuckets: [],
    selectedTrendBucket: null,
    showTrendModal: false
  },

  onLoad() {
    const today = new Date();
    const start = addDays(today, -364);
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth(),
      selectedDate: dateKey(today),
      customStart: dateKey(start),
      customEnd: dateKey(today)
    });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const records = getMistakes();
    const grouped = groupByDate(records);
    const calendarDays = this.buildCalendar(grouped);
    const selectedRecords = ((grouped[this.data.selectedDate] && grouped[this.data.selectedDate].records) || [])
      .map((item) => ({
        ...item,
        lossText: formatLoss(getActualLoss(item)),
        detailText: `亏损 ${item.percent}% × 仓位 ${item.positionPercent}%`
    }));
    const now = new Date();
    const start90 = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -89);
    const customStart = parseDate(this.data.customStart);
    const customEnd = parseDate(this.data.customEnd);
    const customBucketDays = this.getBucketDays(customStart, customEnd);
    const records90 = filterRange(records, start90, now);
    const recordsCustom = filterRange(records, customStart, customEnd);
    const trend90Buckets = buildTrendBuckets(start90, now, 7, records);
    const trendCustomBuckets = buildTrendBuckets(customStart, customEnd, customBucketDays, records);

    this.setData({
      calendarDays,
      selectedRecords,
      monthTitle: `${this.data.currentYear}年${this.data.currentMonth + 1}月`,
      monthPickerValue: monthKey(this.data.currentYear, this.data.currentMonth),
      monthSummary: withLossText(this.getMonthSummary(records)),
      summary90: withLossText(summarize(records, start90)),
      customSummary: withLossText(summarizeRange(records, customStart, customEnd)),
      customBucketLabel: this.getBucketLabel(customBucketDays),
      reasonStats90: summarizeReasons(records90),
      reasonStatsCustom: summarizeReasons(recordsCustom),
      trend90Buckets,
      trendCustomBuckets,
      selectedTrendBucket: null,
      showTrendModal: false
    }, () => {
      this.drawTrendBuckets("trend90", trend90Buckets, this.getAxisLabels(start90, now, 7));
      this.drawTrendBuckets("trendCustom", trendCustomBuckets, this.getAxisLabels(customStart, customEnd, customBucketDays));
    });
  },

  buildCalendar(grouped) {
    const { currentYear, currentMonth } = this.data;
    const first = new Date(currentYear, currentMonth, 1);
    const start = addDays(first, -first.getDay());
    const days = [];
    for (let i = 0; i < 42; i += 1) {
      const date = addDays(start, i);
      const key = dateKey(date);
      const stat = grouped[key] || { count: 0, loss: 0 };
      days.push({
        date: key,
        day: date.getDate(),
        inMonth: date.getMonth() === currentMonth,
        count: stat.count,
        loss: stat.loss,
        lossText: formatLoss(stat.loss)
      });
    }
    return days;
  },

  getMonthSummary(records) {
    const { currentYear, currentMonth } = this.data;
    const source = records.filter((item) => {
      const date = parseDate(item.date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });
    return {
      count: source.length,
      loss: Number(source.reduce((sum, item) => sum + getActualLoss(item), 0).toFixed(2))
    };
  },

  selectDay(event) {
    this.setData({ selectedDate: event.currentTarget.dataset.date }, () => this.refresh());
  },

  editRecord(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/edit/edit?id=${id}` });
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除记录",
      content: "删除后无法恢复，确认删除这条误操作记录吗？",
      confirmColor: "#9b2f2f",
      success: (res) => {
        if (res.confirm) {
          store.deleteRecord(id);
          this.refresh();
          wx.showToast({ title: "已删除", icon: "none" });
        }
      }
    });
  },

  prevMonth() {
    const date = new Date(this.data.currentYear, this.data.currentMonth - 1, 1);
    this.setData({
      currentYear: date.getFullYear(),
      currentMonth: date.getMonth(),
      selectedDate: dateKey(date)
    }, () => this.refresh());
  },

  nextMonth() {
    const date = new Date(this.data.currentYear, this.data.currentMonth + 1, 1);
    this.setData({
      currentYear: date.getFullYear(),
      currentMonth: date.getMonth(),
      selectedDate: dateKey(date)
    }, () => this.refresh());
  },

  changeMonth(event) {
    const parts = event.detail.value.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const date = new Date(year, month, 1);
    this.setData({
      currentYear: date.getFullYear(),
      currentMonth: date.getMonth(),
      selectedDate: dateKey(date)
    }, () => this.refresh());
  },

  changeCustomStart(event) {
    const nextStart = event.detail.value;
    const nextEnd = parseDate(nextStart) > parseDate(this.data.customEnd) ? nextStart : this.data.customEnd;
    this.setData({
      customStart: nextStart,
      customEnd: nextEnd
    }, () => this.refresh());
  },

  changeCustomEnd(event) {
    const nextEnd = event.detail.value;
    const nextStart = parseDate(nextEnd) < parseDate(this.data.customStart) ? nextEnd : this.data.customStart;
    this.setData({
      customStart: nextStart,
      customEnd: nextEnd
    }, () => this.refresh());
  },

  getBucketDays(startDate, endDate) {
    const days = daysBetween(startDate, endDate);
    if (days <= 60) return 1;
    if (days <= 420) return 7;
    return 30;
  },

  getBucketLabel(bucketDays) {
    if (bucketDays === 1) return "每柱代表 1 天";
    if (bucketDays === 7) return "每柱代表 1 周";
    return "每柱代表 30 天";
  },

  getAxisLabels(startDate, endDate, bucketDays) {
    const middle = addDays(startDate, Math.floor((daysBetween(startDate, endDate) - 1) / 2));
    const formatter = bucketDays === 1 ? shortDateKey : shortMonthKey;
    return {
      start: formatter(startDate),
      middle: formatter(middle),
      end: formatter(endDate)
    };
  },

  selectTrendBucket(event) {
    const trend = event.currentTarget.dataset.trend;
    const buckets = trend === "custom" ? this.data.trendCustomBuckets : this.data.trend90Buckets;
    if (!buckets.length) return;

    const query = wx.createSelectorQuery();
    query.select(`#${event.currentTarget.id}`).boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (!rect) return;
      const left = 34;
      const right = 14;
      const rawX = event.detail && typeof event.detail.x === "number" ? event.detail.x : 0;
      const x = rawX > rect.width ? rawX - rect.left : rawX;
      const plotW = rect.width - left - right;
      const gap = plotW / buckets.length;
      const index = Math.round((x - left - gap / 2) / gap);
      if (index < 0 || index >= buckets.length) return;
      this.setData({
        selectedTrendBucket: buckets[index],
        showTrendModal: true
      });
    });
  },

  closeTrendModal() {
    this.setData({
      showTrendModal: false,
      selectedTrendBucket: null
    });
  },

  noop() {},

  drawTrendBuckets(canvasId, buckets, axisLabels) {
    const query = wx.createSelectorQuery();
    query.select(`#${canvasId}`).boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      if (!rect) return;
      const ctx = wx.createCanvasContext(canvasId, this);
      const width = rect.width;
      const height = rect.height;
      const left = 34;
      const right = 14;
      const top = 34;
      const bottom = 28;
      const plotW = width - left - right;
      const plotH = height - top - bottom;
      const values = buckets.map((item) => item.loss);

      const max = Math.max(1, ...values);
      ctx.clearRect(0, 0, width, height);
      ctx.setStrokeStyle("#dce3d7");
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, top + plotH);
      ctx.lineTo(left + plotW, top + plotH);
      ctx.stroke();

      ctx.setFillStyle("#c85c4a");
      const gap = plotW / buckets.length;
      const labelEvery = gap >= 28 ? 1 : Math.ceil(28 / gap);
      values.forEach((value, index) => {
        const barH = value / max * plotH;
        const barW = Math.max(3, gap * 0.56);
        const x = left + index * gap + (gap - barW) / 2;
        const y = top + plotH - barH;
        ctx.fillRect(x, y, barW, Math.max(1, barH));
        const shouldShowLabel = buckets.length <= 16 || index % labelEvery === 0 || value === max;
        if (value > 0 && shouldShowLabel) {
          ctx.setFillStyle("#b44a3b");
          ctx.setFontSize(9);
          ctx.setTextAlign("center");
          ctx.fillText(formatLoss(value), x + barW / 2, Math.max(10, y - 5));
          ctx.setFillStyle("#c85c4a");
        }
      });

      ctx.setFillStyle("#7c857a");
      ctx.setFontSize(10);
      ctx.setTextAlign("left");
      ctx.fillText(formatLoss(max), 4, top + 5);
      ctx.fillText("0", 16, top + plotH + 3);
      ctx.setTextAlign("left");
      ctx.fillText(axisLabels.start, left, height - 6);
      ctx.setTextAlign("center");
      ctx.fillText(axisLabels.middle, left + plotW / 2, height - 6);
      ctx.setTextAlign("right");
      ctx.fillText(axisLabels.end, left + plotW, height - 6);
      ctx.draw();
    });
  }
});
