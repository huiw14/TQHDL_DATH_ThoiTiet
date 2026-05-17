// D3.js Bar Chart - Nhiệt độ trung bình theo trạng thái thời tiết
// Render vào: <div id="chart-task8"></div> (hỗ trợ cả <svg id="chart-task8"> nếu có)
// Dùng d3.rollups() để gom nhóm theo `condition` và d3.mean() để tính trung bình

// Gọi khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', loadAndRenderTask8);

async function loadAndRenderTask8() {
  try {
    // Load dữ liệu (đường dẫn tương đối từ index.html)
    const data = await d3.json('./Data/weather_dataset.json');

    // Chọn container: ưu tiên div#chart-task8, nếu không có thì dùng svg#chart-task8
    let container = d3.select('#chart-task8');
    const isSvg = container.node() && container.node().tagName.toLowerCase() === 'svg';

    // Nếu không tìm thấy bất kỳ phần tử nào, tạo div#chart-task8 trong body
    if (container.empty()) {
      container = d3.select('body').append('div').attr('id', 'chart-task8');
    }

    // Xóa nội dung cũ trước khi render
    container.selectAll('*').remove();

    // Gom nhóm theo condition và tính nhiệt độ trung bình
    const allRecords = [];
    Object.values(data).forEach(records => {
      records.forEach(r => allRecords.push(r));
    });

    // Loại bỏ bản ghi không có condition hoặc temp
    const filtered = allRecords.filter(d => d && d.condition && isFinite(d.temp));

    // Dùng d3.rollups để tính mean temp theo condition
    const avgByCondition = d3.rollups(
      filtered,
      v => d3.mean(v, d => d.temp),
      d => d.condition
    ).map(([condition, avg]) => ({ condition, avg }));

    // Sắp xếp theo nhiệt độ giảm dần để dễ so sánh
    avgByCondition.sort((a, b) => d3.descending(a.avg, b.avg));

    // Kích thước - nếu container là svg thì lấy kích thước hiện có, ngược lại tạo SVG bên trong div
    let svg;
    let width, height, margin;
    if (isSvg) {
      svg = container;
      width = svg.node().clientWidth || 400;
      height = svg.node().clientHeight || 250;
    } else {
      // đặt kích thước mặc định, sẽ responsive theo div
      width = Math.min(760, Math.max(360, container.node().clientWidth || 760));
      height = 300;
      svg = container.append('svg')
        .attr('Width', width)
        .attr('height', height)
        .style('display', 'block')
        .style('margin', '0 auto');
    }

    // Margin cho biểu đồ (nhỏ gọn để vừa trong dashboard)
    margin = { top: 40, right: 20, bottom: 70, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const x = d3.scaleBand()
      .domain(avgByCondition.map(d => d.condition))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(avgByCondition, d => d.avg) === undefined ? 0 : d3.max(avgByCondition, d => d.avg) + 2])
      .nice()
      .range([innerHeight, 0]);

    // Group chính
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Trục X
    const xAxis = d3.axisBottom(x);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .attr('transform', 'rotate(-30)')
      .attr('text-anchor', 'end');

    // Trục Y
    const yAxis = d3.axisLeft(y).ticks(5);
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '11px');

    // Tạo tooltip (nằm ở body) - dùng template hover_bar.html style nếu có
    let tooltip = d3.select('#tooltip-task8');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('id', 'tooltip-task8')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(255,255,255,0.95)')
        .style('border', '1px solid #ccc')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
        .style('font-size', '12px')
        .style('display', 'none');
    }

    // Bars
    const bars = g.selectAll('.bar')
      .data(avgByCondition, d => d.condition)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.condition))
      .attr('y', d => y(d.avg))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.avg))
      .attr('fill', '#4CAF50')
      .attr('opacity', 0.9)
      .on('mouseover', function(event, d) {
        // Nổi bật cột hiện tại
        d3.select(this)
          .transition().duration(120)
          .attr('fill', '#2E7D32')
          .attr('opacity', 1)
          .attr('transform', 'translate(0,-4)');

        // Hiện tooltip
        tooltip.style('display', 'block')
          .html(`<strong>${escapeHtml(d.condition)}</strong><br/>Nhiệt độ: ${d.avg.toFixed(1)} °C`);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY + 12) + 'px');
      })
      .on('mouseout', function() {
        // Trả về trạng thái ban đầu
        d3.select(this)
          .transition().duration(120)
          .attr('fill', '#4CAF50')
          .attr('opacity', 0.9)
          .attr('transform', 'translate(0,0)');

        tooltip.style('display', 'none');
      });

    // Giá trị trên đầu mỗi cột
    g.selectAll('.bar-label')
      .data(avgByCondition, d => d.condition)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => x(d.condition) + x.bandwidth() / 2)
      .attr('y', d => y(d.avg) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#111')
      .text(d => d.avg.toFixed(1) + '°C');

    // Title
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Nhiệt độ trung bình theo trạng thái thời tiết');

    // X axis label
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Trạng thái thời tiết');

    // Y axis label
    svg.append('text')
      .attr('transform', `translate(12, ${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Nhiệt độ trung bình (°C)');

  } catch (err) {
    console.error('Lỗi khi render Task8:', err);
  }
}

// Helper: escape HTML để tránh injection trong tooltip
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
