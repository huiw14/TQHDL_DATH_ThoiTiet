// Lắng nghe sự kiện đổi vùng dữ liệu từ main.js
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail.data; // Mảng dữ liệu thời tiết của vùng được chọn

    // Gọi hàm vẽ/cập nhật biểu đồ scatter
    drawTask12_ScatterPlot(regionData);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    drawTask12_ScatterPlot(window.globalWeatherRecords);
}

function ensureTask12Tooltip() {
    let tooltip = d3.select('#task12-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('id', 'task12-tooltip')
            .attr('class', 'tooltip')
            .style('display', 'none');
    }
    return tooltip;
}

function drawTask12_ScatterPlot(data) {
    const svg = d3.select("#chart-task12");
    svg.selectAll("*").remove();

    const svgNode = svg.node();
    if (!svgNode || !data || !data.length) return;

    // Filter out records missing numeric day_length or uv (cleaned dataset may null these)
    const filtered = data.filter(d => Number.isFinite(Number(d.day_length)) && Number.isFinite(Number(d.uv)));
    if (!filtered.length) return;

    const totalWidth = svgNode.getBoundingClientRect().width || 250;
    const totalHeight = svgNode.getBoundingClientRect().height || 200;

    const margin = { top: 15, right: 15, bottom: 35, left: 40 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
                     .domain(d3.extent(filtered, d => Number(d.day_length)))
                     .nice()
                     .range([0, width]);

    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(filtered, d => Number(d.uv)) || 0])
                     .nice()
                     .range([height, 0]);

        const xAxisG = g.append("g")
         .attr("transform", `translate(0,${height})`)
         .call(d3.axisBottom(xScale).ticks(5));

        // make ticks vertical for Task12, but keep axis label formatting like Task8
        xAxisG.selectAll('text')
            .attr('transform', null)
            .style('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '11px')
            .style('fill', 'var(--text-muted)');

        // Make axis lines/ticks lighter to avoid bold appearance
        xAxisG.selectAll('path, line')
            .style('stroke', 'var(--border-color)')
            .style('stroke-width', '0.6')
            .style('stroke-opacity', 0.4);
        xAxisG.selectAll('.tick line')
            .style('stroke', 'var(--border-color)')
            .style('stroke-width', '0.6')
            .style('stroke-opacity', 0.5);
        // Hide axis domain (baseline) to reduce perceived boldness
        xAxisG.selectAll('.domain').style('stroke', 'none');
        xAxisG.selectAll('text').style('font-weight', '400');

        // X axis label centered under chart
        g.append('text')
            .attr('class', 'chart-axis-label')
            .attr('x', width / 2)
            .attr('y', height + 30)
            .attr('text-anchor', 'middle')
            .text('Độ dài ban ngày (h)');

        const yAxisG = g.append("g")
         .call(d3.axisLeft(yScale).ticks(5));

        g.append('text')
            .attr('class', 'chart-axis-label')
            .attr('transform', `translate(-36, ${height / 2}) rotate(-90)`)
            .attr('text-anchor', 'middle')
            .text('UV');
        // Style y axis text and lines to be muted (less bold)
        yAxisG.selectAll('text')
            .style('fill', 'var(--text-muted)')
            .style('font-size', '11px')
            .style('font-weight', '400');
        yAxisG.selectAll('path, line')
            .style('stroke', 'var(--border-color)')
            .style('stroke-width', '0.6')
            .style('stroke-opacity', 0.4);
        yAxisG.selectAll('.tick line')
            .style('stroke', 'var(--border-color)')
            .style('stroke-width', '0.6')
            .style('stroke-opacity', 0.5);
        // Hide y axis domain (baseline) to reduce perceived boldness
        yAxisG.selectAll('.domain').style('stroke', 'none');

    const tooltip = ensureTask12Tooltip();
    g.selectAll("circle")
     .data(filtered)
     .enter()
     .append("circle")
     .attr("class", "point")
     .attr("cx", d => xScale(d.day_length))
     .attr("cy", d => yScale(d.uv))
      .attr("r", 4)
        .attr("fill", "#f97316")
        .attr("opacity", 0.35)
     .attr("cursor", "pointer")
     .on('mouseenter', function(event, d) {
        d3.select(this).attr('r', 7).attr('opacity', 1).attr('fill', '#ea580c');
             tooltip.style('display', 'block').style('opacity', 1)
                 .html(`<strong>${d.province}</strong><br/>Độ dài ban ngày: ${window.safeFixed(d.day_length,2,'--')} giờ<br/>Chỉ số UV: ${window.safeFixed(d.uv,1,'--')}`);
     })
     .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 28) + 'px');
     })
      .on('mouseleave', function() {
          d3.select(this).attr('r', 4).attr('opacity', 0.35).attr('fill', '#f97316');
        tooltip.style('opacity', 0).style('display', 'none');
     });

        // Regression line for Task12 (UV ~ day_length)
        try {
            const pts = data.map(d => [Number(d.day_length), Number(d.uv)]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
            if (pts.length >= 2) {
                const n = pts.length;
                const sumX = d3.sum(pts, p => p[0]);
                const sumY = d3.sum(pts, p => p[1]);
                const sumXY = d3.sum(pts, p => p[0] * p[1]);
                const sumX2 = d3.sum(pts, p => p[0] * p[0]);
                const denom = (n * sumX2 - sumX * sumX) || 1e-9;
                const m = (n * sumXY - sumX * sumY) / denom;
                const b = (sumY - m * sumX) / n;

                const xMin = xScale.domain()[0];
                const xMax = xScale.domain()[1];
                const yMin = m * xMin + b;
                const yMax = m * xMax + b;

                g.append('line')
                 .attr('class', 'regression-line')
                 .attr('x1', xScale(xMin))
                 .attr('y1', yScale(yMin))
                 .attr('x2', xScale(xMax))
                 .attr('y2', yScale(yMax))
                 .attr('stroke', '#222')
                 .attr('stroke-width', 1.2)
                 .attr('stroke-dasharray', '4 3');
            }
        } catch (e) {
            console.warn('Task12 regression error', e);
        }
}