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

function normalizeRegionName(name) {
    return String(name || "")
        .replace(/\s*\[\*\]\s*/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w ]+/g, " ")
    .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}

function initTask9(records) {
    const source = Array.isArray(records) && records.length
        ? records
        : (window.globalWeatherRecords || []);

    // 1. Tiền xử lý: Gom dữ liệu về 3 miền chính
    const processedData = { "Bắc": [], "Trung": [], "Nam": [] };

    source.forEach(record => {
        const mainRegion = regionGroupMap[normalizeRegionName(record.region)];
        if (mainRegion) processedData[mainRegion].push(record);
    });

    // Tính tổng số ngày đo của mỗi miền cho Pie Chart
    const pieData = Object.entries(processedData).map(([region, records]) => ({
        region: region,
        count: records.length,
        details: records // Lưu lại để dùng cho Bar chart khi click
    }));

    colorScale = d3.scaleOrdinal()
        .domain(["Bắc", "Trung", "Nam"])
        .range([
            window.dashboardChartTheme.regionPalette["Bắc"],
            window.dashboardChartTheme.regionPalette["Trung"],
            window.dashboardChartTheme.regionPalette["Nam"]
        ]);
    task9Tooltip = window.ensureChartTooltip("task9-tooltip");

    const nonEmptyPieData = pieData.filter(d => d.count > 0);
    if (!nonEmptyPieData.length) {
        d3.select("#pie-task9").selectAll("*").remove();
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
    const width = container.node().clientWidth || 300;
    const height = 320;
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
                .html(window.buildChartTooltipHtml(
                    `Miền ${d.data.region}`,
                    [
                        { label: "Số ngày", value: d.data.count },
                        { label: "Tỷ trọng", value: `${((d.data.count / d3.sum(pieData, x => x.count)) * 100).toFixed(1)}%` }
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

    // --- THÊM TEXT LABEL CÓ PHẦN TRĂM
    const totalCount = d3.sum(pieData, d => d.count);

    const labels = pieSvg.selectAll("text")
        .data(pie(pieData))
        .enter()
        .append("text")
        .attr("class", "pie-label") // Gắn class CSS vào đây
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle");

    // Dòng 1: Tên miền
    labels.append("tspan")
        .attr("x", 0)
        .attr("y", "-0.2em")
        .text(d => d.data.region);

    // Dòng 2: Tính phần trăm
    labels.append("tspan")
        .attr("class", "pie-percent")
        .attr("x", 0)
        .attr("y", "1.2em")
        .text(d => {
            const percent = (d.data.count / totalCount * 100).toFixed(1);
            return `${percent}%`;
        });
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
    const conditionCounts = d3.rollups(records, v => v.length, d => d.condition)
        .map(([condition, count]) => ({ condition, count }))
        .sort((a, b) => d3.descending(a.count, b.count));

    // Cập nhật scale
    x9.domain(conditionCounts.map(d => d.condition));
    y9.domain([0, d3.max(conditionCounts, d => d.count)]).nice();

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
                .html(window.buildChartTooltipHtml(
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
             tooltip.style("left", (event.clientX + 10) + "px")
                 .style("top", (event.clientY - 20) + "px");
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
    initTask9(event.detail.data || []);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    initTask9(window.globalWeatherRecords);
}