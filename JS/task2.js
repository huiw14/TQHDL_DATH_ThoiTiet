// D3.js Bar Chart - So sánh nhiệt độ trung bình theo 3 miền Bắc/Trung/Nam

const task2RegionMapping = {
  'Dong Bang Song Hong': 'Bắc',
  'Trung du va mien nui Bac Bo': 'Bắc',
  'Bac Trung Bo va Duyen hai mien Trung': 'Trung',
  'Tay Nguyen': 'Trung',
  'Dong Nam Bo': 'Nam',
  'Dong Bang Song Cuu Long': 'Nam'
};

let task2CurrentData = [];

function normalizeTextTask2(value) {
  return String(value || '')
    .replace(/\s*\[\*\]\s*/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderTask2(records) {
  if (Array.isArray(records)) {
    task2CurrentData = records;
  }

  const source = task2CurrentData.length ? task2CurrentData : (window.globalWeatherRecords || []);
  const svgElement = d3.select('#chart-task2');
  svgElement.html('');

  if (!source.length) {
    svgElement.append('text')
      .attr('x', '50%')
      .attr('y', '50%')
      .attr('text-anchor', 'middle')
      .style('fill', 'red')
      .text('Không có dữ liệu!');
    return;
  }

  const mapped = source.map(record => {
    const key = normalizeTextTask2(record.region);
    return {
      ...record,
      mainRegion: task2RegionMapping[key] || 'Khác'
    };
  });

  const avgTemperatureByRegion = d3.rollups(
    mapped,
    values => d3.mean(values, d => d.temp),
    d => d.mainRegion
  ).map(([region, avgTemp]) => ({ region, avgTemp }));

  avgTemperatureByRegion.sort((a, b) => {
    const order = { 'Bắc': 1, Trung: 2, Nam: 3 };
    return (order[a.region] || 999) - (order[b.region] || 999);
  });

  const containerWidth = svgElement.node().clientWidth || 400;
  const containerHeight = svgElement.node().clientHeight || 250;
  const margin = { top: 10, right: 15, bottom: 35, left: 45 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  const xScale = d3.scaleBand()
    .domain(avgTemperatureByRegion.map(d => d.region))
    .range([0, width])
    .padding(0.3);

  const yScale = d3.scaleLinear()
    .domain([18, d3.max(avgTemperatureByRegion, d => d.avgTemp) + 2])
    .range([height, 0]);

  svgElement
    .attr('width', containerWidth)
    .attr('height', containerHeight);

  const g = svgElement.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.selectAll('.bar')
    .data(avgTemperatureByRegion, d => d.region)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.region))
    .attr('y', height)
    .attr('width', xScale.bandwidth())
    .attr('height', 0)
    .attr('fill', '#4CAF50')
    .attr('opacity', 0.85)
    .attr('stroke', '#2E7D32')
    .attr('stroke-width', 1)
    .transition()
    .duration(700)
    .attr('y', d => yScale(d.avgTemp))
    .attr('height', d => height - yScale(d.avgTemp));

  g.selectAll('.bar-value')
    .data(avgTemperatureByRegion, d => d.region)
    .enter()
    .append('text')
    .attr('class', 'bar-value')
    .attr('x', d => xScale(d.region) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.avgTemp) - 3)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#1B5E20')
    .style('opacity', 0)
    .text(d => d.avgTemp.toFixed(1) + '°C')
    .transition()
    .delay(400)
    .duration(300)
    .style('opacity', 1);

  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .style('font-size', '11px');

  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).ticks(5))
    .style('font-size', '11px');

  svgElement.append('text')
    .attr('class', 'y-label')
    .attr('x', 15)
    .attr('y', 10)
    .attr('text-anchor', 'start')
    .attr('font-size', '11px')
    .attr('fill', '#666')
    .text('°C');
}

document.addEventListener('dataChanged', function (event) {
  renderTask2(event.detail.data || []);
});
