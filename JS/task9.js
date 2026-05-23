// Task 9: Xem tỷ lệ mưa/nắng giữa các vùng 
// Pie Chart (Tỷ lệ ngày đo của 3 miền) -> Click -> Bar Chart (Chi tiết thời tiết miền đó)

// Mapping vùng địa lý sang 3 miền chính 
const regionGroupMap = {
    'dong bang song hong': 'Bắc',
    'trung du va mien nui phia bac': 'Bắc',
    'trung du va mien nui bac bo': 'Bắc',
    'bac trung bo va duyen hai mien trung': 'Trung',
    'tay nguyen': 'Trung',
    'dong nam bo': 'Nam',
    'dong bang song cuu long': 'Nam'
};

let pieSvg, barSvg, x9, y9, xAxis9, yAxis9;
let colorScale;
let task9Tooltip;

const task9ThemeFallback = {
    regionPalette: {
        'Bắc': '#2563eb',
        'Trung': '#f97316',
        'Nam': '#16a34a'
    }
};

function normalizeRegionName(name) {
    return String(name || "")
        .replace(/\s*\[\*\]\s*/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
    .replace(/[^\w ]+/g, " ")
    .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}

function getMainRegionFromRegionName(regionName) {
    return regionGroupMap[normalizeRegionName(regionName)] || null;
}

function buildProvinceToMainRegionMap() {
    const map = new Map();
    const source = window.globalWeatherData || {};
    Object.entries(source).forEach(([regionName, records]) => {
        const mainRegion = getMainRegionFromRegionName(regionName);
        if (!mainRegion || !Array.isArray(records)) return;
        records.forEach(rec => {
            const key = normalizeRegionName(rec && rec.province);
            if (key) map.set(key, mainRegion);
        });
    });
    return map;
}

function ensureTask9Tooltip() {
    if (window.ensureChartTooltip) {
        return window.ensureChartTooltip("task9-tooltip");
    }

    let tooltip = d3.select("#task9-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "task9-tooltip")
            .attr("class", "chart-tooltip")
            .style("position", "fixed")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("transform", "translateY(4px)");
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

function initTask9(records) {
    const fallback = (() => {
        if (Array.isArray(window.globalWeatherRecords) && window.globalWeatherRecords.length) return window.globalWeatherRecords;
        if (window.globalWeatherData && Object.keys(window.globalWeatherData).length) return Object.values(window.globalWeatherData).flat();
        return [];
    })();

    const source = Array.isArray(records) && records.length ? records : fallback;
    const provinceToMainRegion = buildProvinceToMainRegionMap();

    // 1. Tiền xử lý: Gom dữ liệu về 3 miền chính
    const processedData = { "Bắc": [], "Trung": [], "Nam": [] };

    source.forEach(record => {
        const fromRegionField = getMainRegionFromRegionName(record && record.region);
        const fromProvince = provinceToMainRegion.get(normalizeRegionName(record && record.province));
        const mainRegion = fromRegionField || fromProvince;
        if (mainRegion) processedData[mainRegion].push(record);
    });

    // Tính tổng số ngày đo của mỗi miền cho Pie Chart
    const pieData = Object.entries(processedData).map(([region, records]) => ({
        region: region,
        count: records.length,
        details: records // Lưu lại để dùng cho Bar chart khi click
    }));

    const regionPalette = (window.dashboardChartTheme && window.dashboardChartTheme.regionPalette)
        || task9ThemeFallback.regionPalette;

    colorScale = d3.scaleOrdinal()
        .domain(["Bắc", "Trung", "Nam"])
        .range([
            regionPalette["Bắc"],
            regionPalette["Trung"],
            regionPalette["Nam"]
        ]);
    task9Tooltip = ensureTask9Tooltip();

    const nonEmptyPieData = pieData.filter(d => d.count > 0);
    if (!nonEmptyPieData.length) {
        const pieContainer = d3.select("#pie-task9");
        pieContainer.selectAll("*").remove();
        pieContainer.append("div")
            .attr("class", "chart-empty")
            .style("padding", "24px 12px")
            .style("color", "#64748b")
            .style("text-align", "center")
            .text("Không có dữ liệu miền để vẽ pie chart");
        d3.select("#bar-task9").selectAll("*").remove();
        return;
    }

    // --- VẼ PIE CHART ---
    drawPieChart(nonEmptyPieData);

    // --- KHỞI TẠO BAR CHART (Mặc định miền Bắc) ---
    drawBarChart(nonEmptyPieData[0].details, nonEmptyPieData[0].region);
}

function drawPieChart(pieData) {
    const container = d3.select("#pie-task9");
    const width = Math.max(container.node().clientWidth || 300, 240);
    const height = Math.max(320, 180);
    const radius = Math.min(width, height - 56) / 2 - 18;

    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    window.appendChartHeader(svg, {
        title: "Tỷ trọng 3 miền",
        subtitle: "Bấm vào một lát cắt để xem phân phối trạng thái thời tiết",
        x: 18,
        y: 24,
        anchor: "start"
    });

    pieSvg = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 + 10})`);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(0).outerRadius(radius + 10);

    const slices = pieSvg.selectAll(".slice")
        .data(pie(pieData))
        .enter()
        .append("path")
        .attr("class", "slice") // Đã có CSS lo stroke, cursor, opacity
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.region));

    // Hiệu ứng click để liên kết (Link Interaction)
    slices
        .on("mouseover", function(event, d) {
            task9Tooltip.style("opacity", 1).style("transform", "translateY(0)")
                .html(buildTask9TooltipHtml(
                    `Miền ${d.data.region}`,
                    [
                        { label: "Số ngày", value: d.data.count },
                        { label: "Tỷ trọng", value: `${window.safeFixed((d.data.count / d3.sum(pieData, x => x.count)) * 100, 1, '0')}%` }
                    ],
                    "Click để xem trạng thái chi tiết"
                ));
        })
        .on("mousemove", function(event) {
            task9Tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", function() {
            task9Tooltip.style("opacity", 0).style("transform", "translateY(4px)");
        })
        .on("click", function(event, d) {
        // Highlight lát cắt
        slices.transition().duration(300).attr("d", arc).style("opacity", 0.7);
        d3.select(this).transition().duration(300).attr("d", arcHover).style("opacity", 1);

        // Cập nhật Bar Chart bên cạnh
        updateBarChartTask9(d.data.details, d.data.region);
    });

    // --- Create a compact legend to the right of the pie (always readable)
    const totalCount = d3.sum(pieData, d => d.count);
    const legendX = width - 140;
    const legendY = 40;

    const legendGroup = svg.append('g')
        .attr('class', 'pie-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

    const legendItems = legendGroup.selectAll('.legend-item')
        .data(pieData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 22})`);

    legendItems.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', d => colorScale(d.region));

    legendItems.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('font-size', '12px')
        .text(d => `${d.region} — ${window.safeFixed((d.count / totalCount) * 100, 1, '0')}%`);
}

function drawBarChart(records, regionName) {
    const container = d3.select("#bar-task9"); 
    
    //  Tăng margin bottom từ 40 lên 80 để chữ xoay nghiêng không bị cắt đuôi ---
    const margin = { top: 58, right: 30, bottom: 80, left: 64 }; 
    const width = container.node().clientWidth || 400;
    const height = 320;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    window.appendChartHeader(svg, {
        title: `Thời tiết miền ${regionName}`,
        subtitle: "Số ngày theo từng trạng thái trong miền đang chọn",
        x: margin.left,
        y: 24,
        anchor: "start"
    });

    barSvg = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    x9 = d3.scaleBand().range([0, innerWidth]).padding(0.3);
    y9 = d3.scaleLinear().range([innerHeight, 0]);

    // GẮN THÊM CLASS "x-axis-task9" CHO TRỤC X
    xAxis9 = barSvg.append("g")
        .attr("class", "x-axis-task9") 
        .attr("transform", `translate(0, ${innerHeight})`);
    yAxis9 = barSvg.append("g");

    updateBarChartTask9(records, regionName);
}

function updateBarChartTask9(records, regionName) {
    // Thống kê trạng thái thời tiết của vùng được chọn
    let conditionCounts = d3.rollups(records, v => v.length, d => d.condition)
        .map(([condition, count]) => ({ condition, count }));

    // Prefer canonical condition order when available, otherwise fallback to frequency
    if (Array.isArray(window.conditionOrder) && window.conditionOrder.length) {
        const order = window.conditionOrder;
        const byName = new Map(conditionCounts.map(d => [d.condition, d]));
        const ordered = [];
        order.forEach(name => {
            if (byName.has(name)) ordered.push(byName.get(name));
        });
        // then append any other conditions sorted by frequency
        const remaining = conditionCounts.filter(d => !order.includes(d.condition)).sort((a, b) => d3.descending(a.count, b.count));
        conditionCounts = ordered.concat(remaining);
    } else {
        conditionCounts = conditionCounts.sort((a, b) => d3.descending(a.count, b.count));
    }

    // Cập nhật scale
    x9.domain(conditionCounts.map(d => d.condition));
    const maxCount = d3.max(conditionCounts, d => d.count) || 1;
    const meanCount = d3.mean(conditionCounts, d => d.count) || 1;
    // If data is extremely skewed, use a sqrt scale to compress large bars
    if (maxCount > meanCount * 8) {
        y9 = d3.scalePow().exponent(0.5).range([y9.range()[0], y9.range()[1]]).domain([0, maxCount]);
    } else {
        y9 = d3.scaleLinear().range(y9.range()).domain([0, maxCount]).nice();
    }

    // --- VẼ TRỤC X VÀ XOAY CHỮ NGHIÊNG -45 ĐỘ ---
    xAxis9.transition().duration(600).call(d3.axisBottom(x9));
    
    xAxis9.selectAll("text")
        .attr("transform", "translate(-10, 5) rotate(-45)");
    yAxis9.transition().duration(600).call(d3.axisLeft(y9).ticks(5));

    // --- VẼ BAR VÀ GẮN TOOLTIP ---
    const bars = barSvg.selectAll(".bar-detail").data(conditionCounts, d => d.condition);

    bars.exit().transition().duration(300).attr("y", y9(0)).attr("height", 0).remove();

    const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar-detail")
        .attr("x", d => x9(d.condition))
        .attr("y", y9(0))
        .attr("width", x9.bandwidth())
        .attr("height", 0)
        .attr("fill", colorScale(regionName))
        .attr("rx", 6)
        .attr("ry", 6);

    // Gộp thanh cũ & mới, gắn sự kiện Hover rồi mới chạy hiệu ứng vươn lên
    barsEnter.merge(bars)
        .on("mouseover", function(event, d) {
            // Hover làm thanh sáng lên 1 chút
            d3.select(this).transition().duration(150).attr("opacity", 0.85);
            
            // Hiện Tooltip
            task9Tooltip.style("opacity", 1).style("transform", "translateY(0)")
                .html(buildTask9TooltipHtml(
                    d.condition,
                    [
                        { label: "Số ngày", value: d.count },
                        { label: "Miền", value: regionName }
                    ],
                    "Biểu đồ chi tiết theo miền"
                ));
        })
        .on("mousemove", function(event) {
             // Cho tooltip chạy theo con trỏ chuột
             task9Tooltip.style("left", (event.pageX + 12) + "px")
                 .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", function() {
            // Rời chuột thì trả về màu gốc và giấu tooltip
            d3.select(this).transition().duration(150).attr("opacity", 1);
            task9Tooltip.style("opacity", 0).style("transform", "translateY(4px)");
        })
        .transition().duration(600) // Hiệu ứng trượt mượt mà
        .attr("x", d => x9(d.condition))
        .attr("y", d => y9(d.count))
        .attr("width", x9.bandwidth())
        .attr("height", d => (y9(0) - y9(d.count)))
        .attr("fill", colorScale(regionName));
}

document.addEventListener("dataChanged", function (event) {
    const detail = event.detail || {};
    const preferred = Array.isArray(detail.data) && detail.data.length
        ? detail.data
        : (detail.fullData || []);
    initTask9(preferred);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    initTask9(window.globalWeatherRecords);
}