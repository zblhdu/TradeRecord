const store = require("../../utils/store");

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function groupByDate(records) {
  return records.reduce((map, item) => {
    if (!map[item.date]) {
      map[item.date] = { count: 0, loss: 0, records: [] };
    }
    map[item.date].count += 1;
    map[item.date].loss = Number((map[item.date].loss + item.percent).toFixed(2));
    map[item.date].records.push(item);
    return map;
  }, {});
}

function summarize(records, startDate) {
  const source = records.filter((item) => parseDate(item.date) >= startDate);
  return {
    count: source.length,
    loss: Number(source.reduce((sum, item) => sum + item.percent, 0).toFixed(2))
  };
}

function summarizeRange(records, startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
  const source = records.filter((item) => {
    const date = parseDate(item.date);
    return date >= start && date <= end;
  });
  return {
    count: source.length,
    loss: Number(source.reduce((sum, item) => sum + item.percent, 0).toFixed(2))
  };
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
    summary30: { count: 0, loss: 0, lossText: "0%" },
    summary180: { count: 0, loss: 0, lossText: "0%" },
    summary365: { count: 0, loss: 0, lossText: "0%" },
    customStart: "",
    customEnd: "",
    customSummary: { count: 0, loss: 0, lossText: "0%" },
    customBucketLabel: "按天"
  },

  onLoad() {
    const today = new Date();
    const start = addDays(today, -89);
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
      .map((item) => ({ ...item, lossText: formatLoss(item.percent) }));
    const now = new Date();
    const start30 = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -29);
    const start180 = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -182);
    const start365 = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -364);
    const customStart = parseDate(this.data.customStart);
    const customEnd = parseDate(this.data.customEnd);
    const customBucketDays = this.getBucketDays(customStart, customEnd);

    this.setData({
      calendarDays,
      selectedRecords,
      monthTitle: `${this.data.currentYear}年${this.data.currentMonth + 1}月`,
      monthPickerValue: monthKey(this.data.currentYear, this.data.currentMonth),
      monthSummary: withLossText(this.getMonthSummary(records)),
      summary30: withLossText(summarize(records, start30)),
      summary180: withLossText(summarize(records, start180)),
      summary365: withLossText(summarize(records, start365)),
      customSummary: withLossText(summarizeRange(records, customStart, customEnd)),
      customBucketLabel: this.getBucketLabel(customBucketDays)
    }, () => {
      this.drawTrendRange("trend30", start30, now, 1, records, "30天");
      this.drawTrendRange("trend180", start180, now, 7, records, "26周");
      this.drawTrendRange("trend365", start365, now, 7, records, "52周");
      this.drawTrendRange("trendCustom", customStart, customEnd, customBucketDays, records, this.data.customBucketLabel);
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
      loss: Number(source.reduce((sum, item) => sum + item.percent, 0).toFixed(2))
    };
  },

  selectDay(event) {
    this.setData({ selectedDate: event.currentTarget.dataset.date }, () => this.refresh());
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
    if (bucketDays === 1) return "按天";
    if (bucketDays === 7) return "按周";
    return "按30天";
  },

  drawTrendRange(canvasId, startDate, endDate, bucketDays, records, label) {
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
      const top = 18;
      const bottom = 28;
      const plotW = width - left - right;
      const plotH = height - top - bottom;
      const buckets = [];
      let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);

      while (cursor <= rangeEnd) {
        const start = new Date(cursor);
        const end = addDays(start, bucketDays - 1);
        const bucketEnd = end > rangeEnd ? rangeEnd : new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
        const loss = records
          .filter((item) => {
            const date = parseDate(item.date);
            return date >= start && date <= bucketEnd;
          })
          .reduce((sum, item) => sum + item.percent, 0);
        buckets.push(Number(loss.toFixed(2)));
        cursor = addDays(start, bucketDays);
      }

      const max = Math.max(1, ...buckets);
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
      buckets.forEach((value, index) => {
        const barH = value / max * plotH;
        const barW = Math.max(3, gap * 0.56);
        const x = left + index * gap + (gap - barW) / 2;
        const y = top + plotH - barH;
        ctx.fillRect(x, y, barW, Math.max(1, barH));
      });

      ctx.setFillStyle("#7c857a");
      ctx.setFontSize(10);
      ctx.setTextAlign("left");
      ctx.fillText(formatLoss(max), 4, top + 5);
      ctx.fillText("0", 16, top + plotH + 3);
      ctx.setTextAlign("center");
      ctx.fillText(label, left + plotW / 2, height - 6);
      ctx.draw();
    });
  }
});
