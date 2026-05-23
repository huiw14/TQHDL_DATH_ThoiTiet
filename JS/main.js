// Biến toàn cục để các file task khác có thể truy cập
window.globalWeatherData = {};
window.dashboardChartTheme = window.dashboardChartTheme || {
    palette: [
        '#4f46e5',
        '#06b6d4',
        '#f97316',
        '#84cc16',
        '#ec4899',
        '#f59e0b'
    ],
    regionPalette: {
        'Bắc': '#2563eb',
        'Trung': '#f97316',
        'Nam': '#16a34a'
    }
};

const kpiFormatters = {
    temp: d3.format('.1f'),
    rain: d3.format('.1f'),
    wind: d3.format('.1f'),
    humidity: d3.format('d'),
    uv: d3.format('.1f')
};

function normalizeName(s) {
    if (!s) return '';
    const str = s.toString().toLowerCase().trim();
    const noDiacritics = str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return noDiacritics.replace(/đ/g, 'd').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// 1. Tải dữ liệu JSON duy nhất cho dashboard
d3.json("Data/weather_dataset_final.json").then(function (data) {
    // Enrich records with their source region to keep cross-region charts (e.g. Task 9 pie) working.
    const enrichedData = {};
    Object.entries(data || {}).forEach(([regionName, records]) => {
        enrichedData[regionName] = (Array.isArray(records) ? records : []).map(rec => ({
            ...rec,
            region: rec && rec.region ? rec.region : regionName
        }));
    });

    window.globalWeatherData = enrichedData;

    // Create a flattened records array alias for older task modules
    try {
        window.globalWeatherRecords = Object.values(window.globalWeatherData).flat();
    } catch (e) {
        window.globalWeatherRecords = [];
    }

    // Derive a simple UV-quality flag per record to surface suspicious values.
    // Rule: if UV >= 8 and condition is not 'Nắng', mark as 'suspicious'.
    try {
        Object.values(window.globalWeatherData).forEach(arr => {
            if (!Array.isArray(arr)) return;
            arr.forEach(rec => {
                const uv = Number(rec && rec.uv);
                const cond = (rec && rec.condition) || '';
                if (Number.isFinite(uv) && uv >= 8 && String(cond).trim() !== 'Nắng') {
                    rec.uv_flag = 'suspicious';
                } else {
                    rec.uv_flag = 'ok';
                }
            });
        });
    } catch (e) {
        console.warn('Failed to derive uv_flag for records', e);
    }

    // 2. Lấy danh sách các Vùng để đổ vào Dropdown
    const regions = Object.keys(data);
    const select = d3.select("#regionSelect");

    select.html(""); // Xóa option "Đang tải..."
    select.append("option").text("Tất cả vùng").attr("value", "all");

    regions.forEach(region => {
        select.append("option").text(region).attr("value", region);
    });

    // 3. Khởi tạo biểu đồ lần đầu với dữ liệu toàn bộ vùng
    const initialRegion = 'all';
    select.property('value', initialRegion);
    dispatchDataUpdate(initialRegion);

    // 4. Lắng nghe sự kiện người dùng đổi Filter
    select.on("change", function () {
        let selectedRegion = d3.select(this).property("value");
        dispatchDataUpdate(selectedRegion);
    });

}).catch(error => {
    console.error("Lỗi tải dữ liệu JSON:", error);
    const select = d3.select("#regionSelect");
    select.text("Lỗi tải dữ liệu");
    select.property("disabled", true);
});

// Hàm điều phối chung (Gọi các hàm update của từng Task)
function dispatchDataUpdate(regionName, provinceName) {
    const allData = Object.values(window.globalWeatherData).flat();
    let regionData;
    let eventDetail = { region: regionName, fullData: allData };

    if (regionName === 'all') {
        regionData = allData;
        eventDetail.region = 'Tất cả vùng';
        eventDetail.filterType = 'all';
    } else {
        regionData = window.globalWeatherData[regionName] || [];
        eventDetail.region = regionName;
        eventDetail.filterType = 'region';
    }

    eventDetail.data = regionData;
    eventDetail.mapData = regionData;

    if (provinceName) {
        const normalizedProvince = normalizeName(provinceName);
        const provinceRecords = regionData.filter(record => normalizeName(record.province) === normalizedProvince);
        if (provinceRecords.length > 0) {
            eventDetail.data = provinceRecords;
            eventDetail.mapData = allData;
            eventDetail.province = provinceName;
            eventDetail.filterType = 'province';
        }
    }

    document.body.classList.add('is-updating');

    const event = new CustomEvent("dataChanged", { detail: eventDetail });
    document.dispatchEvent(event);

    setTimeout(() => {
        document.body.classList.remove('is-updating');
    }, 350);
}

window.dispatchDataUpdate = dispatchDataUpdate;

// ==========================================
// THỰC THI TASK 3: KPI CARDS
// ==========================================
document.addEventListener("dataChanged", function (event) {
    const regionName = event.detail && event.detail.region;
    const provinceName = event.detail && event.detail.province;
    const regionData = event.detail && event.detail.data;
    const filterType = event.detail && event.detail.filterType;
    renderKPICards(regionName, provinceName, filterType, Array.isArray(regionData) ? regionData : []);
});

function renderKPICards(regionName, provinceName, filterType, regionData) {
    if (!Array.isArray(regionData) || regionData.length === 0) return;

    const stats = calculateRegionStats(regionData);
    const regionLabel = regionName === 'all' ? 'Tất cả vùng' : (regionName || 'Chưa chọn');
    const provinceLabel = provinceName || 'Chưa chọn';
    const conditionLabel = filterType === 'all' ? '' : (stats.commonCondition || "--");

    d3.select("#detail-region").text(regionLabel);
    d3.select("#detail-province").text(provinceLabel);
    d3.select("#kpi-condition").text(conditionLabel);

    animateKPIValue("#kpi-temp", stats.avgTemp, kpiFormatters.temp);
    animateKPIValue("#kpi-rain", stats.avgRain, kpiFormatters.rain);
    animateKPIValue("#kpi-wind", stats.avgWind, kpiFormatters.wind);
    animateKPIValue("#kpi-humidity", stats.avgHumidity, kpiFormatters.humidity);
    animateKPIValue("#kpi-uv", stats.avgUv, kpiFormatters.uv);

    // Show proportion of suspicious UV readings (if any) next to UV KPI
    try {
        const uvFlagEl = d3.select('#kpi-uv-flag');
        if (!uvFlagEl.empty()) {
            const total = regionData.length;
            const suspicious = regionData.filter(r => r && r.uv_flag === 'suspicious').length;
            if (suspicious > 0 && total > 0) {
                const pct = Math.round((suspicious / total) * 100);
                uvFlagEl.style('display', null).text(`Bất thường UV: ${pct}%`);
            } else {
                uvFlagEl.style('display', 'none');
            }
        }
    } catch (e) {
        // non-fatal
    }
}

function calculateRegionStats(regionData) {
    const filtered = regionData.filter(record => record && Number.isFinite(+record.temp));
    const count = filtered.length || 1;
    const totals = filtered.reduce((acc, record) => {
        acc.temp += +record.temp || 0;
        acc.rain += +record.rain || 0;
        acc.wind += +record.wind || 0;
        acc.humidity += +record.humidity || 0;
        acc.uv += +record.uv || 0;
        return acc;
    }, { temp: 0, rain: 0, wind: 0, humidity: 0, uv: 0 });

    const conditionCounts = filtered.reduce((acc, record) => {
        const condition = record.condition || 'Không rõ';
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});

    const commonCondition = Object.entries(conditionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0])[0] || '--';

    return {
        avgTemp: totals.temp / count,
        avgRain: totals.rain / count,
        avgWind: totals.wind / count,
        avgHumidity: totals.humidity / count,
        avgUv: totals.uv / count,
        commonCondition
    };
}

function animateKPIValue(selector, value, formatter) {
    const targetValue = Number(value);
    const selection = d3.select(selector);

    if (selection.empty()) return;

    if (!Number.isFinite(targetValue)) {
        selection.text("--");
        return;
    }

    const startValue = Number.parseFloat(selection.text());
    const initialValue = Number.isFinite(startValue) ? startValue : 0;

    selection.text(formatter(initialValue));

    selection
        .interrupt()
        .transition()
        .duration(1000)
        .tween("text", function () {
            const interpolateValue = d3.interpolateNumber(initialValue, targetValue);
            return function (t) {
                this.textContent = formatter(interpolateValue(t));
            };
        });
}

// --- Small UI helpers for charts (tooltip and headers) ---
window.ensureChartTooltip = function(id) {
    try {
        let sel = d3.select('#' + id);
        if (sel.empty()) {
            sel = d3.select('body').append('div')
                .attr('id', id)
                .attr('class', 'chart-tooltip')
                .style('position', 'absolute')
                .style('pointer-events', 'none')
                .style('opacity', 0)
                .style('transform', 'translateY(4px)')
                .style('transition', 'opacity 120ms, transform 120ms');
        }
        return sel;
    } catch (e) {
        return { style: () => { /* noop */ }, html: () => { /* noop */ } };
    }
};

window.buildChartTooltipHtml = function(title, rows, footer) {
    let html = `<div class="tt-title"><strong>${title}</strong></div>`;
    if (Array.isArray(rows) && rows.length) {
        html += '<div class="tt-rows">';
        rows.forEach(r => {
            html += `<div class="tt-row"><span class="tt-label">${r.label}</span>: <span class="tt-value">${r.value}</span></div>`;
        });
        html += '</div>';
    }
    if (footer) html += `<div class="tt-footer">${footer}</div>`;
    return html;
};

window.appendChartHeader = function(svg, opts) {
    try {
        const x = opts.x || 12;
        const y = opts.y || 18;
        const anchor = opts.anchor || 'start';
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', x)
            .attr('y', y)
            .attr('text-anchor', anchor)
            .text(opts.title || '');
        if (opts.subtitle) {
            svg.append('text')
                .attr('class', 'chart-subtitle')
                .attr('x', x)
                .attr('y', y + 16)
                .attr('text-anchor', anchor)
                .text(opts.subtitle);
        }
    } catch (e) {
        // ignore
    }
};

// Standard condition ordering used across charts (fallback if charts want fixed order)
window.conditionOrder = ['Mưa', 'Nhiều Mây', 'Nắng', 'Dông Bão', 'Sương Mù'];
window.conditionColors = {
    'Mưa': '#4f46e5',
    'Nhiều Mây': '#06b6d4',
    'Nắng': '#f97316',
    'Dông Bão': '#84cc16',
    'Sương Mù': '#ec4899'
};

window.getConditionColor = function(condition) {
    return window.conditionColors && window.conditionColors[condition]
        ? window.conditionColors[condition]
        : '#64748b';
};

// Safe formatter to avoid calling toFixed on null/undefined/non-numeric values
window.safeFixed = function(val, digits = 1, fallback = '--') {
    const n = Number(val);
    return Number.isFinite(n) ? n.toFixed(digits) : fallback;
};

// Apply a consistent axis style across all charts to match Task 8 visuals.
window.applyStandardAxes = function() {
    try {
        // X axis ticks: default to horizontal (parallel to axis)
        d3.selectAll('.x-axis').selectAll('text')
            .attr('transform', null)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('fill', 'var(--text-muted)')
            .style('font-size', '11px')
            .style('font-family', 'Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif');

        // Exception: Task8 keeps tilted labels (-30°)
        d3.selectAll('#chart-task8 .x-axis').selectAll('text')
            .attr('transform', 'rotate(-30)')
            .attr('text-anchor', 'end')
            .attr('dy', '0.35em');

        // Y axis ticks: consistent color/size
        d3.selectAll('.y-axis').selectAll('text')
            .style('fill', 'var(--text-muted)')
            .style('font-size', '11px')
            .style('font-family', 'Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif');

        // Axis lines and grid colors
        d3.selectAll('.x-axis path, .x-axis line, .y-axis path, .y-axis line')
            .style('stroke', 'var(--border-color)')
            .style('stroke-width', '1');

        // Chart axis labels (titles) unify style
        d3.selectAll('.chart-axis-label')
            .style('fill', 'var(--text-muted)')
            .style('font-size', '11px')
            .style('font-family', 'Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif');
    } catch (e) {
        console.warn('applyStandardAxes failed', e);
    }
};

// Backwards-compatibility: normalize older 'axis-label' class used in some charts
d3.selectAll('.axis-label').each(function() {
    try {
        const el = d3.select(this);
        el.classed('chart-axis-label', true);
        el.classed('axis-label', false);
    } catch (e) { /* ignore */ }
});

// Ensure task11 / task1 axis tick styles are also normalized if they were rendered before scripts updated
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        try {
            d3.selectAll('#chart-task11 g[transform*="translate(0,"] text').attr('transform', null).style('text-anchor', 'middle').attr('dy', '0.35em');
            d3.selectAll('#chart-task1 g[transform*="translate(0,"] text').attr('transform', null).style('text-anchor', 'middle').attr('dy', '0.35em');
            // Ensure Task8 remains tilted
            d3.selectAll('#chart-task8 g[transform*="translate(0,"] text').attr('transform', 'rotate(-30)').style('text-anchor', 'end').attr('dy', '0.35em');
            d3.selectAll('#chart-task11 .chart-axis-label, #chart-task1 .chart-axis-label').style('font-size', '11px').style('fill', 'var(--text-muted)');
        } catch (e) { console.warn('post-dom axis normalize failed', e); }
    }, 300);
});

// Ensure axis styles are applied after charts update
document.addEventListener('dataChanged', function () {
    // defer slightly to allow charts to finish rendering/transitions
    setTimeout(() => {
        if (window.applyStandardAxes) window.applyStandardAxes();
    }, 260);
});