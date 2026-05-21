// D3.js Bar Chart - So sánh nhiệt độ trung bình theo vùng ở Việt Nam
// ============================================================

// Hàm tải và xử lý dữ liệu
async function loadAndRenderChart() {
  try {
    // 1. Load dữ liệu từ file JSON
    const data = await d3.json('./Data/weather_dataset.json');
    
    // 2. Xóa nội dung cũ nếu có
    d3.select('#chart-task2').html('');
    
    // 3. Ánh xạ các vùng địa lý sang các vùng chính (Bắc, Trung, Nam)
    const regionMapping = {
      'Đồng Bằng Sông Hồng': 'Bắc',                                    // North
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
    
    console.log('Dữ liệu gom nhóm:', avgTemperatureByRegion);
    
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
      .attr('fill', '#4CAF50')  // Màu xanh
      .attr('opacity', 0.85)
      .attr('stroke', '#2E7D32')  // Viền tối hơn
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
      .text(d => d.avgTemp.toFixed(1) + '°C');  // Làm tròn 1 chữ số thập phân
    
    // 12. Tạo trục X (Axis X)
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .style('font-size', '11px');
    
    // 13. Tạo trục Y (Axis Y)
    const yAxis = d3.axisLeft(yScale)
      .ticks(5);  // Giảm số lượng tick
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .style('font-size', '11px');
    
    // 14. Thêm nhãn cho trục Y (Nhiệt độ trung bình) - nằm ngoài SVG
    svgElement.append('text')
      .attr('class', 'y-label')
      .attr('x', 15)
      .attr('y', 10)
      .attr('text-anchor', 'start')
      .attr('font-size', '11px')
      .attr('fill', '#666')
      .text('°C');
    console.log('✓ Biểu đồ đã được render thành công!');
    
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
