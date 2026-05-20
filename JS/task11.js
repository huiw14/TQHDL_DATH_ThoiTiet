// Lắng nghe sự kiện đổi vùng dữ liệu từ main.js
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data; // Mảng dữ liệu thời tiết của vùng được chọn
    
    // Gọi hàm vẽ/cập nhật biểu đồ đường
    drawTask11_LineChart(regionData);
});

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

    // 5. Thiết lập Trục X (Thời gian - date) sử dụng scaleTime
    const xScale = d3.scaleTime()
                     .domain(d3.extent(formattedData, d => d.parsedDate))
                     .range([0, width]);

    // 6. Thiết lập Trục Y (Độ dài ban ngày - day_length)
    // Tự động điều chỉnh khoảng từ [min, max] của day_length thay vì bắt đầu từ 0 để thấy rõ sự biến động nhỏ
    const yScale = d3.scaleLinear()
                     .domain(d3.extent(formattedData, d => d.day_length))
                     .nice()
                     .range([height, 0]);

    // 7. Vẽ Trục X (Định dạng hiển thị ngày/tháng ngắn gọn)
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat("%d/%m")))
     .append("text")
     .attr("x", width)
     .attr("y", 30)
     .attr("fill", "#666")
     .attr("text-anchor", "end")
     .style("font-size", "10px")
     .text("Ngày");

    // 8. Vẽ Trục Y 
    g.append("g")
     .call(d3.axisLeft(yScale).ticks(5))
     .append("text")
     .attr("x", 5)
     .attr("y", -5)
     .attr("fill", "#666")
     .attr("text-anchor", "start")
     .style("font-size", "10px")
     .text("Độ dài ban ngày (h)");

    // 9. Tạo hàm vẽ đường (D3 Line Generator)
    const line = d3.line()
                   .x(d => xScale(d.parsedDate))
                   .y(d => yScale(d.day_length));

    // 10. Vẽ đường Line nối các điểm dữ liệu
    g.append("path")
     .datum(formattedData)
     .attr("fill", "none")
     .attr("stroke", "steelblue")
     .attr("stroke-width", 2)
     .attr("d", line);

    // 11. Bổ sung các chấm tròn nhỏ tại các nút giao để hover xem chi tiết (Tùy chọn nâng cao)
    g.selectAll("circle")
     .data(formattedData)
     .enter()
     .append("circle")
     .attr("cx", d => xScale(d.parsedDate))
     .attr("cy", d => yScale(d.day_length))
     .attr("r", 1)
     .attr("fill", "steelblue")
     .append("title")
     .text(d => `${d.province}\nNgày: ${d.date}\nĐộ dài ban ngày: ${d.day_length.toFixed(2)} giờ`);
}