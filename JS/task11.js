// File: JS/task11.js
// Purpose: Chu kỳ thay đổi độ dài ban ngày (line chart with hover interaction)
// Comment conventions: keep comments succinct and sectioned.
// Lắng nghe sự kiện đổi vùng dữ liệu từ main.js
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data; // Mảng dữ liệu thời tiết của vùng được chọn
    
    // Gọi hàm vẽ/cập nhật biểu đồ đường
    drawTask11_LineChart(regionData);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    drawTask11_LineChart(window.globalWeatherRecords);
}

function ensureTask11Tooltip() {
    let tooltip = d3.select('#task11-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('id', 'task11-tooltip')
            .attr('class', 'tooltip')
            .style('display', 'none');
    }
    return tooltip;
}

function drawTask11_LineChart(data) {
    // 1. Chọn thẻ SVG từ index.html và xóa nội dung cũ để vẽ lại khi đổi vùng
    const svg = d3.select("#chart-task11");
    svg.selectAll("*").remove();

    // 2. Lấy kích thước thực tế của SVG từ DOM (vì CSS để width="33%")
    const svgNode = svg.node();
    const totalWidth = svgNode.getBoundingClientRect().width || 250;
    const totalHeight = svgNode.getBoundingClientRect().height || 200;

    // Thiết lập margin cho vừa với kích thước khung nhỏ
    const margin = { top: 15, right: 20, bottom: 35, left: 40 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    // 3. Định dạng lại dữ liệu ngày tháng (Xử lý chuỗi "YYYY-MM-DD" thành đối tượng Date)
    const parseTime = d3.timeParse("%Y-%m-%d");
    
    // Tạo bản sao dữ liệu và parse ngày tháng để không ảnh hưởng dữ liệu gốc
    const formattedData = data.map(d => ({
        ...d,
        parsedDate: parseTime(d.date)
    }));

    // Sắp xếp dữ liệu theo thứ tự ngày tăng dần để đường Line không bị đứt gãy/bị rối
    formattedData.sort((a, b) => a.parsedDate - b.parsedDate);

    // 4. Tạo nhóm 'g' làm viewport chính
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);
    const tooltip = ensureTask11Tooltip();

    // Lọc bỏ những bản ghi không có day_length hợp lệ (cleaned dataset có thể null)
    const filtered = formattedData.filter(d => Number.isFinite(Number(d.day_length)));
    if (!filtered.length) return;

    // 5. Thiết lập Trục X (Thời gian - date) sử dụng scaleTime
    const xScale = d3.scaleTime()
                     .domain(d3.extent(filtered, d => d.parsedDate))
                     .range([0, width]);

    // 6. Thiết lập Trục Y (Độ dài ban ngày - day_length)
    // Tự động điều chỉnh khoảng từ [min, max] của day_length thay vì bắt đầu từ 0 để thấy rõ sự biến động nhỏ
    const yScale = d3.scaleLinear()
                     .domain(d3.extent(filtered, d => Number(d.day_length)))
                     .nice()
                     .range([height, 0]);

    // 7. Vẽ Trục X (Định dạng hiển thị ngày/tháng ngắn gọn)
        const xAxisG = g.append("g")
         .attr("class", "axis x-axis")
         .attr("transform", `translate(0,${height})`)
         .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat("%d/%m")));

        xAxisG.selectAll('text')
            .attr('transform', null)
            .style('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '11px');

        // X label centered under the chart (consistent with Task8)
        g.append('text')
            .attr('class', 'chart-axis-label')
            .attr('x', width / 2)
            .attr('y', height + 30)
            .attr('text-anchor', 'middle')
            .text('Ngày');

    // 8. Vẽ Trục Y 
        const yAxisG = g.append("g")
         .attr('class', 'axis y-axis')
         .call(d3.axisLeft(yScale).ticks(5));

        // Y label rotated on the left, centered vertically like Task8
        g.append('text')
            .attr('class', 'chart-axis-label')
            .attr('transform', `translate(-36, ${height / 2}) rotate(-90)`)
            .attr('text-anchor', 'middle')
            .text('Độ dài ban ngày (h)');

    // 9. Tạo hàm vẽ đường (D3 Line Generator)
    const line = d3.line()
                   .x(d => xScale(d.parsedDate))
                   .y(d => yScale(Number(d.day_length)));

    const bisectDate = d3.bisector(d => d.parsedDate).center;
    let hoveredIndex = -1;
    let hoverFrame = 0;

    const focusGroup = g.append("g")
        .attr("class", "task11-focus")
        .style("pointer-events", "none")
        .style("display", "none");

    focusGroup.append("circle")
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    focusGroup.append("line")
        .attr("class", "task11-focus-line")
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "steelblue")
        .attr("stroke-dasharray", "3 3")
        .attr("opacity", 0.35);

    const overlay = g.append("rect")
        .attr("class", "task11-overlay")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .style("pointer-events", "all");

    function hideHover() {
        hoveredIndex = -1;
        focusGroup.style("display", "none");
        tooltip.style("opacity", 0).style("display", "none");
    }

    function updateHover(event) {
        const [mouseX] = d3.pointer(event, overlay.node());
        const dateAtPointer = xScale.invert(mouseX);
        const index = bisectDate(filtered, dateAtPointer);
        const leftIndex = Math.max(0, Math.min(filtered.length - 1, index - 1));
        const rightIndex = Math.max(0, Math.min(filtered.length - 1, index));
        const chosenIndex = Math.abs(filtered[rightIndex].parsedDate - dateAtPointer) < Math.abs(filtered[leftIndex].parsedDate - dateAtPointer)
            ? rightIndex
            : leftIndex;

        if (chosenIndex === hoveredIndex) {
            tooltip.style("transform", `translate(${event.clientX + 12}px, ${event.clientY - 28}px)`);
            return;
        }

        hoveredIndex = chosenIndex;
        const d = filtered[chosenIndex];
        const cx = xScale(d.parsedDate);
        const cy = yScale(Number(d.day_length));

        focusGroup
            .style("display", null)
            .attr("transform", `translate(${cx},${cy})`);

        focusGroup.select("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", height - cy);

        tooltip.style("display", "block").style("opacity", 1)
            .html(`<strong>${d.province}</strong><br/>Ngày: ${d.date}<br/>Độ dài ban ngày: ${window.safeFixed(d.day_length, 2, "--")} giờ`);
        tooltip.style("transform", `translate(${event.clientX + 12}px, ${event.clientY - 28}px)`);
    }

    // 10. Vẽ đường Line nối các điểm dữ liệu
    g.append("path")
     .datum(filtered)
     .attr("fill", "none")
     .attr("stroke", "steelblue")
     .attr("stroke-width", 2)
     .attr("d", line);

    overlay
        .on('pointerenter', function(event) {
            if (hoverFrame) cancelAnimationFrame(hoverFrame);
            hoverFrame = requestAnimationFrame(() => updateHover(event));
        })
        .on('pointermove', function(event) {
            if (hoverFrame) cancelAnimationFrame(hoverFrame);
            hoverFrame = requestAnimationFrame(() => updateHover(event));
        })
        .on('pointerleave', function() {
            if (hoverFrame) cancelAnimationFrame(hoverFrame);
            hideHover();
        });
}