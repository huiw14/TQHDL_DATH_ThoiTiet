// Biến toàn cục để tái sử dụng
let svg7, x7, y7, xAxisGroup7, yAxisGroup7;
let width7, height7;
const margin7 = { top: 30, right: 30, bottom: 40, left: 100 };
let tooltip7;
let colorScale7;

// 1. Lắng nghe dữ liệu
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data;
    const regionName = event.detail.region;
    
    // debug log removed
    
    if (!regionData) {
        alert("Lỗi: Không tìm thấy dữ liệu cho vùng " + regionName);
        return;
    }
    updateTask7Chart(regionData);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    updateTask7Chart(window.globalWeatherRecords);
}

// 2. Hàm Setup khung SVG (Tự động đo kích thước thật)
function initTask7Chart() {
    const container = d3.select("#chart-task7");
    
    // ĐO KÍCH THƯỚC THẬT CỦA KHUNG (Khắc phục lỗi tràn viền)
    const totalWidth = container.node().clientWidth || 400;
    const totalHeight = container.node().clientHeight || 300;

    width7 = totalWidth - margin7.left - margin7.right;
    height7 = totalHeight - margin7.top - margin7.bottom;

    // Xóa rác cũ (nếu có)
    container.selectAll("*").remove();

    svg7 = container.append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight)
        .append("g")
        .attr("transform", `translate(${margin7.left},${margin7.top})`);

    // Khởi tạo Trục (Scales)
    x7 = d3.scaleLinear().range([0, width7]);
    y7 = d3.scaleBand().range([0, height7]).padding(0.25);
    colorScale7 = d3.scaleOrdinal()
        .domain(window.conditionOrder || [])
        .range((window.conditionOrder || []).map(d => window.getConditionColor(d)));

    xAxisGroup7 = svg7.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height7})`);
    yAxisGroup7 = svg7.append("g").attr("class", "y-axis");

    // Tạo Tooltip
    tooltip7 = window.ensureChartTooltip("task7-tooltip");
}

// 3. Hàm gán sự kiện 
function bindBarEvents(selection) {
    selection
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.9);
            tooltip7.style("opacity", 1).style("transform", "translateY(0)")
                   .html(window.buildChartTooltipHtml(
                       d.condition,
                       [
                           { label: "Số ngày", value: d.count },
                           { label: "Tỷ trọng", value: `${d3.format(".1f")(d.percent)}%` }
                       ],
                       "Hover để xem chi tiết, click để ghim trạng thái"
                   ));
        })
        .on("mousemove", function (event) {
            tooltip7.style("left", event.pageX + 12 + "px")
                   .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
            if (!d3.select(this).classed("selected")) {
                d3.select(this).attr("opacity", 1);
            }
            tooltip7.style("opacity", 0).style("transform", "translateY(4px)");
        })
        .on("click", function (event, d) {
            // Click highlight
            svg7.selectAll(".bar").classed("selected", false).attr("opacity", 1);
            d3.select(this).classed("selected", true).attr("opacity", 0.95);
            
            // Xóa nhãn cũ, in nhãn mới
            svg7.selectAll(".value-label").remove();
            svg7.append("text")
                .attr("class", "value-label")
                .attr("x", x7(d.count) + 5)
                .attr("y", y7(d.condition) + y7.bandwidth() / 2 + 4)
                .attr("fill", "var(--text-main)")
                .text(d.count);
        });
}

// 4. Hàm Update Dữ Liệu
function updateTask7Chart(data) {
    if (!data || data.length === 0) return;

    // Kích hoạt Setup nếu là lần chạy đầu tiên
    if (!svg7) {
        initTask7Chart();
    }

    // Tiền xử lý dữ liệu (Khắc phục lỗi tĩnh)
    let validData = data.filter(d => d && d.condition);
    let rawCounts = d3.rollups(validData, v => v.length, d => d.condition);
    
    let conditionCounts = rawCounts.map(([condition, count]) => ({ condition, count }));
    // Prefer canonical ordering if provided, otherwise sort by frequency
    if (Array.isArray(window.conditionOrder) && window.conditionOrder.length) {
        const order = window.conditionOrder;
        conditionCounts.sort((a, b) => {
            const ia = order.indexOf(a.condition);
            const ib = order.indexOf(b.condition);
            const ra = ia === -1 ? Number.POSITIVE_INFINITY : ia;
            const rb = ib === -1 ? Number.POSITIVE_INFINITY : ib;
            if (ra !== rb) return ra - rb;
            return d3.descending(a.count, b.count);
        });
    } else {
        conditionCounts.sort((a, b) => d3.descending(a.count, b.count));
    }
    const totalCount = d3.sum(conditionCounts, d => d.count) || 1;

    conditionCounts.forEach(d => {
        d.percent = (d.count / totalCount) * 100;
    });

    // Cập nhật Domain cho trục
    x7.domain([0, d3.max(conditionCounts, d => d.count)]).nice();
    y7.domain(conditionCounts.map(d => d.condition));

    // Update Data vào các thanh Bar (bắt theo tên thời tiết)
    const bars = svg7.selectAll(".bar").data(conditionCounts, d => d.condition);

    // Xóa thanh thừa (Exit)
    bars.exit()
        .transition().duration(400)
        .attr("width", 0)
        .remove();

    // Thêm thanh mới (Enter)
    const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y7(d.condition))
        .attr("x", 0)
        .attr("height", y7.bandwidth())
        .attr("width", 0)
        .attr("fill", d => colorScale7(d.condition))
        .attr("rx", 6)
        .attr("ry", 6);

    // Gắn sự kiện 
    bindBarEvents(barsEnter);

    // Cập nhật kích thước (Merge + Transition) chạy mượt mà
    barsEnter.merge(bars)
        .attr("y", d => y7(d.condition))
        .attr("height", y7.bandwidth())
        .attr("width", d => x7(d.count))
        .attr("fill", function() {
            return colorScale7(d3.select(this).datum().condition);
        });

    // Ensure color scale domain
    colorScale7.domain(conditionCounts.map(d => d.condition));

    // Cập nhật trục UI trượt theo — định dạng tick rõ ràng và giới hạn số tick
    xAxisGroup7.transition().duration(600)
        .call(d3.axisBottom(x7).ticks(5).tickFormat(d3.format('~s')));

    // Style x-axis tick text to avoid overlapping concatenation
    xAxisGroup7.selectAll('text')
        .attr('transform', null)
        .style('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '11px');

    yAxisGroup7.transition().duration(600).call(d3.axisLeft(y7));
    
    // Dọn dẹp nhãn (chỉ hiện khi click)
    svg7.selectAll(".value-label").remove();

    // Add axis labels (consistent with Task8)
    // X label: center bottom
    svg7.append('text')
        .attr('class', 'chart-axis-label')
        .attr('x', width7 / 2)
        .attr('y', height7 + margin7.bottom - 6)
        .attr('text-anchor', 'middle')
        .text('Số ngày');

    // Y label: rotated left center
    svg7.append('text')
        .attr('class', 'chart-axis-label')
        .attr('transform', `translate(${-margin7.left + 12}, ${height7/2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .text('Trạng thái thời tiết');
}