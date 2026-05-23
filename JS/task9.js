// File: JS/task9.js
// Purpose: Cơ cấu phân bổ thời tiết giữa các miền (100% stacked bar)
// Comment conventions: single-line comments and clear section headings.

let chart9Svg, chart9Root, chart9X, chart9Y, chart9XAxis, chart9YAxis;
let task9Tooltip;

const regionGroupMap = {
    'dong bang song hong': 'Bắc',
    'trung du va mien nui phia bac': 'Bắc',
    'trung du va mien nui bac bo': 'Bắc',
    'bac trung bo va duyen hai mien trung': 'Trung',
    'tay nguyen': 'Trung',
    'dong nam bo': 'Nam',
    'dong bang song cuu long': 'Nam'
};

const task9ThemeFallback = {
    regionPalette: {
        'Bắc': '#2563eb',
        'Trung': '#f97316',
        'Nam': '#16a34a'
    }
};

function normalizeRegionName(name) {
    return String(name || '')
        .replace(/\s*\[\*\]\s*/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();
}

function getMainRegionFromRegionName(regionName) {
    return regionGroupMap[normalizeRegionName(regionName)] || null;
}

function ensureTask9Tooltip() {
    if (window.ensureChartTooltip) {
        return window.ensureChartTooltip('task9-tooltip');
    }

    let tooltip = d3.select('#task9-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('id', 'task9-tooltip')
            .attr('class', 'chart-tooltip')
            .style('position', 'fixed')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('transform', 'translateY(4px)');
    }
    return tooltip;
}

function buildTask9TooltipHtml(title, rows, footer) {
    if (window.buildChartTooltipHtml) {
        return window.buildChartTooltipHtml(title, rows, footer);
    }

    let html = `<div class="tt-title"><strong>${title}</strong></div>`;
    if (Array.isArray(rows) && rows.length) {
        html += '<div class="tt-rows">';
        rows.forEach(row => {
            html += `<div class="tt-row"><span class="tt-label">${row.label}</span>: <span class="tt-value">${row.value}</span></div>`;
        });
        html += '</div>';
    }
    if (footer) html += `<div class="tt-footer">${footer}</div>`;
    return html;
}

function getTask9SourceData(detail) {
    // Prefer the filtered set provided by the dispatcher (`detail.data`),
    // then fall back to `detail.fullData`, then global aliases.
    if (detail && Array.isArray(detail.data) && detail.data.length) {
        return detail.data;
    }
    if (detail && Array.isArray(detail.fullData) && detail.fullData.length) {
        return detail.fullData;
    }

    if (Array.isArray(window.globalWeatherRecords) && window.globalWeatherRecords.length) {
        return window.globalWeatherRecords;
    }

    if (window.globalWeatherData && Object.keys(window.globalWeatherData).length) {
        return Object.values(window.globalWeatherData).flat();
    }

    return [];
}

function buildComparisonData(source) {
    const regions = ['Bắc', 'Trung', 'Nam'];
    const conditionOrder = Array.isArray(window.conditionOrder) && window.conditionOrder.length
        ? window.conditionOrder
        : ['Mưa', 'Nhiều Mây', 'Nắng', 'Dông Bão', 'Sương Mù'];

    const regionBuckets = new Map(regions.map(region => [region, []]));

    source.forEach(record => {
        const mainRegion = getMainRegionFromRegionName(record && record.region);
        if (mainRegion && regionBuckets.has(mainRegion)) {
            regionBuckets.get(mainRegion).push(record);
        }
    });

    return regions.map(region => {
        const records = regionBuckets.get(region) || [];
        const countMap = new Map();
        conditionOrder.forEach(condition => countMap.set(condition, 0));

        records.forEach(record => {
            const condition = record && record.condition;
            if (!condition) return;
            if (!countMap.has(condition)) {
                countMap.set(condition, 0);
            }
            countMap.set(condition, countMap.get(condition) + 1);
        });

        const total = records.length || 1;
        const segments = conditionOrder.map(condition => {
            const count = countMap.get(condition) || 0;
            return {
                region,
                condition,
                count,
                percent: (count / total) * 100
            };
        }).filter(segment => segment.count > 0);

        return {
            region,
            total,
            segments
        };
    }).filter(region => region.total > 0);
}

function renderTask9Chart(source) {
    const container = d3.select('#bar-task9');
    const width = container.node().clientWidth || 400;
    const height = 300;
    const margin = { top: 12, right: 18, bottom: 44, left: 52 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.selectAll('*').remove();

    if (!source.length) {
        container.append('div')
            .attr('class', 'chart-empty')
            .style('padding', '24px 12px')
            .style('color', '#64748b')
            .style('text-align', 'center')
            .text('Không có dữ liệu để so sánh');
        return;
    }

    const comparisonData = buildComparisonData(source);
    if (!comparisonData.length) {
        container.append('div')
            .attr('class', 'chart-empty')
            .style('padding', '24px 12px')
            .style('color', '#64748b')
            .style('text-align', 'center')
            .text('Không đủ dữ liệu để so sánh giữa các vùng');
        return;
    }

    const conditionOrder = Array.isArray(window.conditionOrder) && window.conditionOrder.length
        ? window.conditionOrder
        : ['Mưa', 'Nhiều Mây', 'Nắng', 'Dông Bão', 'Sương Mù'];

    const regionPalette = (window.dashboardChartTheme && window.dashboardChartTheme.regionPalette)
        || task9ThemeFallback.regionPalette;

    task9Tooltip = ensureTask9Tooltip();

    const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    chart9Svg = svg;
    chart9Root = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    chart9X = d3.scaleBand()
        .domain(comparisonData.map(d => d.region))
        .range([0, innerWidth])
        .padding(0.28);

    chart9Y = d3.scaleLinear()
        .domain([0, 100])
        .nice()
        .range([innerHeight, 0]);

    chart9XAxis = chart9Root.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`);

    chart9YAxis = chart9Root.append('g')
        .attr('class', 'y-axis');

    chart9XAxis.call(d3.axisBottom(chart9X));
    chart9XAxis.selectAll('text')
        .attr('transform', null)
        .style('text-anchor', 'middle')
        .style('fill', '#334155')
        .style('font-size', '11px');

    chart9YAxis.call(d3.axisLeft(chart9Y).ticks(5).tickFormat(d => `${d}%`));
    chart9YAxis.selectAll('text')
        .style('fill', '#334155')
        .style('font-size', '11px');

    // Y axis label: rotated and centered on left to avoid overlap with 100% tick
    chart9Root.append('text')
        .attr('class', 'chart-axis-label')
        .attr('transform', `translate(-36, ${innerHeight/2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .text('Tỷ lệ (%)');

    const stackInput = comparisonData.map(regionData => {
        const row = { region: regionData.region };
        conditionOrder.forEach(condition => {
            const segment = regionData.segments.find(item => item.condition === condition);
            row[condition] = segment ? segment.percent : 0;
        });
        return row;
    });

    const stackSeries = d3.stack().keys(conditionOrder)(stackInput);

    const series = chart9Root.selectAll('.stack-series')
        .data(stackSeries)
        .enter()
        .append('g')
        .attr('class', 'stack-series')
        .attr('fill', d => window.getConditionColor(d.key));

    series.selectAll('rect')
        .data(d => d.map((segment, index) => ({
            key: d.key,
            region: comparisonData[index].region,
            start: segment[0],
            end: segment[1],
            original: comparisonData[index].segments.find(item => item.condition === d.key) || { count: 0, percent: 0 }
        })))
        .enter()
        .append('rect')
        .attr('x', d => chart9X(d.region))
        .attr('y', d => chart9Y(d.end))
        .attr('width', chart9X.bandwidth())
        .attr('height', d => Math.max(0, chart9Y(d.start) - chart9Y(d.end)))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('opacity', 0.9)
        .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 1);
            task9Tooltip.style('opacity', 1).style('transform', 'translateY(0)')
                .html(buildTask9TooltipHtml(
                    d.region,
                    [
                        { label: 'Trạng thái', value: d.key },
                        { label: 'Số ngày', value: d.original.count },
                        { label: 'Tỷ lệ trong vùng', value: `${window.safeFixed(d.original.percent, 1, '0')}%` }
                    ],
                    'So sánh cơ cấu thời tiết giữa các vùng'
                ));
        })
        .on('mousemove', function (event) {
            task9Tooltip.style('left', `${event.pageX + 12}px`)
                .style('top', `${event.pageY + 12}px`);
        })
        .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.9);
            task9Tooltip.style('opacity', 0).style('transform', 'translateY(4px)');
        });

    const legend = container.append('div')
        .attr('class', 'task9-condition-legend')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('gap', '10px 14px')
        .style('justify-content', 'center')
        .style('margin-top', '8px')
        .style('font-size', '12px')
        .style('color', '#334155');

    const legendItems = legend.selectAll('.legend-item')
        .data(conditionOrder)
        .enter()
        .append('div')
        .attr('class', 'legend-item')
        .style('display', 'inline-flex')
        .style('align-items', 'center')
        .style('gap', '6px');

    legendItems.append('span')
        .style('width', '10px')
        .style('height', '10px')
        .style('border-radius', '999px')
        .style('display', 'inline-block')
        .style('background', d => window.getConditionColor(d));

    legendItems.append('span')
        .text(d => d);
}

document.addEventListener('dataChanged', function (event) {
    const detail = event.detail || {};
    const source = getTask9SourceData(detail);
    // debug log removed
    renderTask9Chart(source);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    renderTask9Chart(window.globalWeatherRecords);
}