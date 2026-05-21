// D3.js Bar Chart - Nhiệt độ trung bình theo trạng thái thời tiết

let task8CurrentData = [];

function renderTask8(records) {
  if (Array.isArray(records)) {
    task8CurrentData = records;
  }

  try {
    const source = task8CurrentData.length ? task8CurrentData : (window.globalWeatherRecords || []);
    let container = d3.select('#chart-task8');
    const isSvg = container.node() && container.node().tagName.toLowerCase() === 'svg';

    if (container.empty()) {
      container = d3.select('body').append('div').attr('id', 'chart-task8');
    }

    container.selectAll('*').remove();

    const filtered = source.filter(d => d && d.condition && Number.isFinite(d.temp));

    const avgByCondition = d3.rollups(
      filtered,
      v => d3.mean(v, d => d.temp),
      d => d.condition
    ).map(([condition, avg]) => ({ condition, avg }));

    avgByCondition.sort((a, b) => d3.descending(a.avg, b.avg));

    let svg;
    let width;
    let height;
    if (isSvg) {
      svg = container;
      width = svg.node().clientWidth || 400;
      height = svg.node().clientHeight || 250;
    } else {
      width = Math.min(760, Math.max(360, container.node().clientWidth || 760));
      height = 300;
      svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block')
        .style('margin', '0 auto');
    }

    const margin = { top: 40, right: 20, bottom: 70, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .domain(avgByCondition.map(d => d.condition))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, d3.max(avgByCondition, d => d.avg) || 0])
      .nice()
      .range([innerHeight, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '11px')
      .attr('transform', 'rotate(-30)')
      .attr('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('font-size', '11px');

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

    g.selectAll('.bar')
      .data(avgByCondition, d => d.condition)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.condition))
      .attr('y', innerHeight)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', '#4CAF50')
      .attr('opacity', 0.9)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition().duration(120)
          .attr('fill', '#2E7D32')
          .attr('opacity', 1)
          .attr('transform', 'translate(0,-4)');

        tooltip.style('display', 'block')
          .html(`<strong>${escapeHtml(d.condition)}</strong><br/>Nhiệt độ: ${d.avg.toFixed(1)} °C`);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY + 12) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition().duration(120)
          .attr('fill', '#4CAF50')
          .attr('opacity', 0.9)
          .attr('transform', 'translate(0,0)');

        tooltip.style('display', 'none');
      })
      .transition()
      .duration(700)
      .attr('y', d => y(d.avg))
      .attr('height', d => innerHeight - y(d.avg));

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
      .style('opacity', 0)
      .text(d => d.avg.toFixed(1) + 'degC')
      .transition()
      .delay(350)
      .duration(250)
      .style('opacity', 1);

    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Nhiệt độ trung bình theo trạng thái thời tiết');

    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Trạng thái thời tiết');

    svg.append('text')
      .attr('transform', `translate(12, ${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Nhiệt độ trung bình (°C)');

  } catch (err) {
    console.error('Loi khi render Task8:', err);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('dataChanged', function (event) {
  renderTask8(event.detail.data || []);
});
