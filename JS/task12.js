// Lắng nghe sự kiện đổi vùng dữ liệu từ main.js
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data; // Mảng dữ liệu thời tiết của vùng được chọn

    // Gọi hàm vẽ/cập nhật biểu đồ scatter
    drawTask12_ScatterPlot(regionData);
});

function drawTask12_ScatterPlot(data) {
    const svg = d3.select("#chart-task12");
    svg.selectAll("*").remove();

    const svgNode = svg.node();
    if (!svgNode || !data || !data.length) return;

    const totalWidth = svgNode.getBoundingClientRect().width || 250;
    const totalHeight = svgNode.getBoundingClientRect().height || 200;

    const margin = { top: 15, right: 15, bottom: 35, left: 40 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
                     .domain(d3.extent(data, d => d.day_length))
                     .nice()
                     .range([0, width]);

    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(data, d => d.uv) || 0])
                     .nice()
                     .range([height, 0]);

    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(xScale).ticks(5))
     .append("text")
     .attr("x", width)
     .attr("y", 30)
     .attr("fill", "#666")
     .attr("text-anchor", "end")
     .style("font-size", "10px")
     .text("Độ dài ban ngày (h)");

    g.append("g")
     .call(d3.axisLeft(yScale).ticks(5))
     .append("text")
     .attr("x", 5)
     .attr("y", -5)
     .attr("fill", "#666")
     .attr("text-anchor", "start")
     .style("font-size", "10px")
     .text("UV");

    g.selectAll("circle")
     .data(data)
     .enter()
     .append("circle")
     .attr("cx", d => xScale(d.day_length))
     .attr("cy", d => yScale(d.uv))
     .attr("r", 4)
     .attr("fill", "#f97316")
     .attr("opacity", 0.6)
     .append("title")
     .text(d => `${d.province}\nĐộ dài ban ngày: ${d.day_length.toFixed(2)} giờ\nChỉ số UV: ${d.uv.toFixed(1)}`);
}