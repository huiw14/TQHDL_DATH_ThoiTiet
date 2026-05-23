// D3.js Bar Chart - So sánh nhiệt độ trung bình theo vùng ở Việt Nam
// ============================================================

// Hàm tải và xử lý dữ liệu
async function loadAndRenderChart() {
  try {
    // 1. Reuse shared in-memory data when available to avoid duplicate fetch/parse
    const data = window.globalWeatherData && Object.keys(window.globalWeatherData).length
      ? window.globalWeatherData
      : await d3.json('./Data/weather_dataset_final.json');
    
    // 2. Xóa nội dung cũ nếu có
    d3.select('#chart-task2').html('');
    
    // 3. Ánh xạ các vùng địa lý sang các vùng chính (Bắc, Trung, Nam)
    const regionMapping = {
      'Đồng Bằng Sông Hồng': 'Bắc',                                    // North
      'Trung du và miền núi phía Bắc': 'Bắc',                          // North
      'Trung du và miền núi Bắc Bộ': 'Bắc',                            // North
      'Bắc Trung Bộ và Duyên hải miền Trung': 'Trung',                // Central
      'Tây Nguyên': 'Trung',                                            // Central
      'Đông Nam Bộ': 'Nam',                                             // South
      'Đồng Bằng Sông Cửu Long': 'Nam'                                 // South
    };
    
    // 4. Chuyển đổi dữ liệu: flatten tất cả các record và thêm thông tin vùng
    const allRecords = [];
    Object.entries(data).forEach(([regionKey, records]) => {
      const mainRegion = regionMapping[regionKey] || 'Khác';
      records.forEach(record => {
        allRecords.push({
          ...record,
          mainRegion: mainRegion
        });
      });
    });
    
    // 5. Gom nhóm dữ liệu theo vùng chính (Bắc, Trung, Nam) và tính trung bình
    // Sử dụng d3.rollups() để gom nhóm và tính toán
    const avgTemperatureByRegion = d3.rollups(
      allRecords,                      // Dữ liệu đầu vào
      (values) => d3.mean(values, d => d.temp),  // Hàm tính toán: trung bình nhiệt độ
      (d) => d.mainRegion              // Khóa gom nhóm: vùng chính
    ).map(([region, avgTemp]) => ({
      region: region,
      avgTemp: avgTemp
    }));
    
    // Sắp xếp dữ liệu theo thứ tự: Bắc, Trung, Nam
    avgTemperatureByRegion.sort((a, b) => {
      const order = { 'Bắc': 1, 'Trung': 2, 'Nam': 3 };
      return (order[a.region] || 999) - (order[b.region] || 999);
    });
    
    // debug log removed
    
    // 6. Lấy kích thước của SVG container hiện có
    const svgElement = d3.select('#chart-task2');
    const containerWidth = svgElement.node().clientWidth || 400;
    const containerHeight = svgElement.node().clientHeight || 250;
    
    // Định nghĩa margin phù hợp với kích thước nhỏ
    const margin = { top: 10, right: 15, bottom: 35, left: 45 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    // 7. Tạo scale (thang đo) cho biểu đồ
    // X scale: đối với các vùng (band scale)
    const xScale = d3.scaleBand()
      .domain(avgTemperatureByRegion.map(d => d.region))
      .range([0, width])
      .padding(0.3);  // Khoảng cách giữa các cột
    
    // Y scale: đối với nhiệt độ (linear scale)
    const yScale = d3.scaleLinear()
      .domain([18, d3.max(avgTemperatureByRegion, d => d.avgTemp) + 2])  // Từ 18 đến max + 2
      .range([height, 0]);  // Y được lật ngược (cao nhất ở top)
    
    // 8. Set kích thước SVG chính xác
    svgElement
      .attr('width', containerWidth)
      .attr('height', containerHeight);
    
    // 9. Tạo group chính cho biểu đồ (để áp dụng margin)
    const g = svgElement.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const regionPalette = (window.dashboardChartTheme && window.dashboardChartTheme.regionPalette) || {
      'Bắc': '#2563eb',
      'Trung': '#f97316',
      'Nam': '#16a34a'
    };

    // 10. Vẽ các cột (bars)
    g.selectAll('.bar')
      .data(avgTemperatureByRegion, d => d.region)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.region))
      .attr('y', d => yScale(d.avgTemp))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.avgTemp))
      .attr('fill', d => regionPalette[d.region] || '#4CAF50')
      .attr('opacity', 0.85)
      .attr('stroke', d => {
        const c = regionPalette[d.region];
        if (c === '#2563eb') return '#1d4ed8';
        if (c === '#f97316') return '#c2410c';
        if (c === '#16a34a') return '#15803d';
        return '#2E7D32';
      })
      .attr('stroke-width', 1);
    
    // 11. Thêm giá trị trên đầu mỗi cột
    g.selectAll('.bar-value')
      .data(avgTemperatureByRegion, d => d.region)
      .enter()
      .append('text')
      .attr('class', 'bar-value')
      .attr('x', d => xScale(d.region) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.avgTemp) - 3)  // Vị trí phía trên cột
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1B5E20')
      .text(d => window.safeFixed(d.avgTemp, 1, '--') + '°C');  // Làm tròn 1 chữ số thập phân
    
    // 12. Tạo trục X (Axis X)
    const xAxis = d3.axisBottom(xScale);
    const xAxisG = g.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    // style ticks similar to Task8
    xAxisG.selectAll('text')
      .attr('transform', null)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .attr('dy', '0.35em');

    // X axis label (centered)
    g.append('text')
      .attr('class', 'chart-axis-label')
      .attr('x', width / 2)
      .attr('y', height + 30)
      .attr('text-anchor', 'middle')
      .text('Vùng');
    
    // 13. Tạo trục Y (Axis Y)
    const yAxis = d3.axisLeft(yScale)
      .ticks(5);  // Giảm số lượng tick
    const yAxisG = g.append('g')
      .attr('class', 'axis y-axis')
      .call(yAxis);

    // Y axis label (rotated, centered)
    g.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', `translate(-36, ${height / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .text('Nhiệt độ (°C)');
    // debug log removed
    
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error);
    d3.select('#chart-task2')
      .append('text')
      .attr('x', '50%')
      .attr('y', '50%')
      .attr('text-anchor', 'middle')
      .style('fill', 'red')
      .text('Lỗi: Không thể tải dữ liệu!');
  }
}

// Gọi hàm khi trang web tải xong
document.addEventListener('DOMContentLoaded', loadAndRenderChart);
