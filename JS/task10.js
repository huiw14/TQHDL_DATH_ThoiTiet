// Lắng nghe sự kiện đổi vùng dữ liệu từ main.js
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data; // Mảng chứa dữ liệu thời tiết của vùng đang chọn
    
    // Gọi hàm vẽ/cập nhật biểu đồ
    drawTask10_ScatterPlot(regionData);
});

function drawTask10_ScatterPlot(data) {
    // 1. Chọn thẻ SVG từ index.html và xóa nội dung cũ (để vẽ lại khi đổi vùng)
    const svg = d3.select("#chart-task10");
    svg.selectAll("*").remove();

    // 2. Lấy kích thước thực tế của SVG từ DOM (vì CSS để width="33%")
    const svgNode = svg.node();
    const totalWidth = svgNode.getBoundingClientRect().width || 250;
    const totalHeight = svgNode.getBoundingClientRect().height || 200;

    // Thay đổi margin để nhét vừa các chữ số của trục
    const margin = { top: 15, right: 15, bottom: 35, left: 35 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    // 3. Tạo nhóm 'g' làm viewport chính
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    // 4. Thiết lập Trục X (Nhiệt độ - temp)
    // Dùng d3.extent để lấy tự động [min, max] của biến temp trong dữ liệu thực tế
    const xScale = d3.scaleLinear()
                     .domain(d3.extent(data, d => d.temp))
                     .nice() // Làm tròn các đầu mút trục tọa độ cho đẹp
                     .range([0, width]);

    // 5. Thiết lập Trục Y (Chỉ số UV - uv)
    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(data, d => d.uv)])
                     .nice()
                     .range([height, 0]);

    // 6. Vẽ Trục X (Nằm dưới đáy)
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(xScale).ticks(5)) // Giới hạn số tick cho đỡ chật
     .append("text") // Gắn nhãn tên trục X
     .attr("x", width)
     .attr("y", 30)
     .attr("fill", "#666")
     .attr("text-anchor", "end")
     .style("font-size", "10px")
     .text("Nhiệt độ (°C)");

    // 7. Vẽ Trục Y (Nằm bên trái)
    g.append("g")
     .call(d3.axisLeft(yScale).ticks(5))
     .append("text") // Gắn nhãn tên trục Y
     .attr("x", 5)
     .attr("y", -5)
     .attr("fill", "#666")
     .attr("text-anchor", "start")
     .style("font-size", "10px")
     .text("UV");

    // 8. Vẽ các chấm (Scatter Dots)
    g.selectAll("circle")
     .data(data)
     .enter()
     .append("circle")
     .attr("cx", d => xScale(d.temp)) // Ánh xạ temp vào trục X
     .attr("cy", d => yScale(d.uv))   // Ánh xạ uv vào trục Y
     .attr("r", 4)                     // Bán kính chấm tròn (chỉnh nhỏ lại vì biểu đồ nhỏ)
     .attr("fill", "tomato")           // Màu sắc chấm tròn giống template gốc
     .attr("opacity", 0.5)             // Đổ mờ nhẹ để khi các chấm đè lên nhau dễ nhìn hơn
     .append("title")                  // Tooltip cơ bản khi rê chuột vào
     .text(d => `${d.province}\nNhiệt độ: ${d.temp}°C\nChỉ số UV: ${d.uv}`);
}