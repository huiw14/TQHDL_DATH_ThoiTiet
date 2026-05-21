// Biến toàn cục để tái sử dụng
let svg7, x7, y7, xAxisGroup7, yAxisGroup7;
let width7, height7;
const margin7 = { top: 30, right: 30, bottom: 40, left: 100 };
let tooltip7;

// 1. Lắng nghe dữ liệu
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data;
    const regionName = event.detail.region;
    
    console.log("Task 7 đang nhận vùng:", regionName, "- Data:", regionData);
    
    if (!regionData) {
        alert("Lỗi: Không tìm thấy dữ liệu cho vùng " + regionName);
        return;
    }
    updateTask7Chart(regionData);
});

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

    xAxisGroup7 = svg7.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height7})`);
    yAxisGroup7 = svg7.append("g").attr("class", "y-axis");

    // Tạo Tooltip
    tooltip7 = d3.select("body").select(".tooltip");
    if (tooltip7.empty()) {
        tooltip7 = d3.select("body").append("div").attr("class", "tooltip");
    }
}

// 3. Hàm gán sự kiện 
function bindBarEvents(selection) {
    selection
        .on("mouseover", function (event, d) {
            d3.select(this).attr("fill", "#f28e2b"); // Màu cam
            tooltip7.style("opacity", 1)
                   .html(`<strong>${d.condition}</strong><br>Số ngày: ${d.count}`);
        })
        .on("mousemove", function (event) {
            tooltip7.style("left", event.pageX + 12 + "px")
                   .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
            if (!d3.select(this).classed("selected")) {
                d3.select(this).attr("fill", "steelblue");
            }
            tooltip7.style("opacity", 0);
        })
        .on("click", function (event, d) {
            // Click highlight
            svg7.selectAll(".bar").classed("selected", false).attr("fill", "steelblue");
            d3.select(this).classed("selected", true).attr("fill", "crimson"); // Màu đỏ
            
            // Xóa nhãn cũ, in nhãn mới
            svg7.selectAll(".value-label").remove();
            svg7.append("text")
                .attr("class", "value-label")
                .attr("x", x7(d.count) + 5)
                .attr("y", y7(d.condition) + y7.bandwidth() / 2 + 4)
                .style("font-size", "12px")
                .style("font-weight", "bold")
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
    conditionCounts.sort((a, b) => d3.descending(a.count, b.count));

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
        .attr("fill", "steelblue");

    // Gắn sự kiện 
    bindBarEvents(barsEnter);

    // Cập nhật kích thước (Merge + Transition) chạy mượt mà
    barsEnter.merge(bars)
        .transition().duration(600)
        .attr("y", d => y7(d.condition))
        .attr("height", y7.bandwidth())
        .attr("width", d => x7(d.count))
        .attr("fill", function() {
            // Giữ lại màu nếu đang được click
            return d3.select(this).classed("selected") ? "crimson" : "steelblue";
        });

    // Cập nhật trục UI trượt theo
    xAxisGroup7.transition().duration(600).call(d3.axisBottom(x7));
    yAxisGroup7.transition().duration(600).call(d3.axisLeft(y7));
    
    // Dọn dẹp nhãn (chỉ hiện khi click)
    svg7.selectAll(".value-label").remove();
}