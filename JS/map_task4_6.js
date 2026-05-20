// Choropleth Map - tô màu tỉnh/thành theo nhiệt độ trung bình
// Render vào: <svg id="vietnam-map"></svg>
// Sử dụng: Data/vietnam_geojson.json và Data/weather_dataset.json

document.addEventListener('DOMContentLoaded', renderVietnamChoropleth);

async function renderVietnamChoropleth() {
  try {
    // Load GeoJSON và dữ liệu thời tiết
    const [geo, weatherData] = await Promise.all([
      d3.json('./Data/vietnam_geojson.json'),
      d3.json('./Data/weather_dataset.json')
    ]);

    // Lấy svg hiện có (được khai báo trong index.html)
    const svg = d3.select('#vietnam-map');
    if (svg.empty()) {
      console.error('Không tìm thấy svg#vietnam-map');
      return;
    }

    // Xóa nội dung cũ
    svg.selectAll('*').remove();

    // Kích thước từ thuộc tính của SVG
    const width = svg.node().clientWidth || +svg.attr('width') || 800;
    const height = svg.node().clientHeight || +svg.attr('height') || 500;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // 1) Tiền xử lý dữ liệu thời tiết: flatten tất cả các bản ghi
    const allRecords = [];
    Object.values(weatherData).forEach(arr => arr.forEach(r => allRecords.push(r)));

    // 2) Tính nhiệt độ trung bình theo tỉnh/thành (trường province trong dataset)
    const avgByProvince = d3.rollups(
      allRecords.filter(d => d && d.province && isFinite(d.temp)),
      v => d3.mean(v, d => d.temp),
      d => normalizeName(d.province)
    ).map(([provinceNorm, avg]) => ({ provinceNorm, avg }));

    // Tạo map nhanh provinceNorm -> avg
    const provinceAvgMap = new Map(avgByProvince.map(d => [d.provinceNorm, d.avg]));

    // 3) Chuẩn bị projection và path
    const projection = d3.geoMercator()
      .fitSize([width, height], geo);
    const path = d3.geoPath().projection(projection);

    // 4) Tìm dãy giá trị min/max để tạo thang màu
    const temps = Array.from(provinceAvgMap.values());
    const tempMin = temps.length ? d3.min(temps) : 0;
    const tempMax = temps.length ? d3.max(temps) : 40;

    // Màu: nhạt (thấp) -> đậm (cao)
    const color = d3.scaleSequential()
      .domain([tempMin, tempMax])
      .interpolator(d3.interpolateYlOrRd);

    // 5) Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'map-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', 'rgba(255,255,255,0.95)')
      .style('border', '1px solid #ccc')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
      .style('display', 'none')
      .style('font-size', '13px');

    // 6) Vẽ các tỉnh
    svg.append('g').attr('class', 'provinces')
      .selectAll('path')
      .data(geo.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => {
        const name = normalizeName(d.properties.Name || d.properties.Name_1 || d.properties.NAME || '');
        const avg = provinceAvgMap.get(name);
        return avg == null ? '#f0f0f0' : color(avg);
      })
      .attr('stroke', '#999')
      .attr('stroke-width', 0.4)
      .on('mouseover', function(event, d) {
        d3.select(this).raise().attr('stroke-width', 1).attr('stroke', '#333');
        const nameRaw = d.properties.Name || d.properties.Name_1 || d.properties.NAME || 'Không rõ';
        const name = normalizeName(nameRaw);
        const avg = provinceAvgMap.get(name);
        tooltip.style('display', 'block')
          .html(`<strong>${escapeHtml(nameRaw)}</strong><br/>` +
            (avg == null ? 'Không có dữ liệu' : `Nhiệt độ trung bình: ${avg.toFixed(1)} °C`));
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY + 12) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.4).attr('stroke', '#999');
        tooltip.style('display', 'none');
      });

    // 7) Legend - gradient rectangle with labels
    const legendWidth = 220;
    const legendHeight = 10;
    const legendX = width - legendWidth - 20;
    const legendY = height - 40;

    // defs + linearGradient
    const defs = svg.append('defs');
    const gradId = 'legend-gradient-temp';
    const gradient = defs.append('linearGradient').attr('id', gradId).attr('x1', '0%').attr('x2', '100%');
    // create stops
    const stops = 6;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', color(tempMin + t * (tempMax - tempMin)));
    }

    // draw legend group
    const legendG = svg.append('g').attr('class', 'legend').attr('transform', `translate(${legendX},${legendY})`);
    legendG.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#${gradId})`)
      .style('stroke', '#ccc');

    // legend labels (min and max)
    legendG.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 14)
      .attr('font-size', 11)
      .attr('fill', '#333')
      .text(`${tempMin.toFixed(1)} °C`);
    legendG.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 14)
      .attr('text-anchor', 'end')
      .attr('font-size', 11)
      .attr('fill', '#333')
      .text(`${tempMax.toFixed(1)} °C`);

    // legend title
    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 6)
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .text('Nhiệt độ trung bình (°C)');

    // 8) Optional: outline coastline or borders already drawn above

  } catch (err) {
    console.error('Lỗi khi vẽ bản đồ:', err);
  }
}

// Helpers
function normalizeName(s) {
  if (!s) return '';
  // Lowercase, trim, remove diacritics, punctuation, extra spaces
  const str = s.toString().toLowerCase().trim();
  // Normalize NFD then remove diacritics
  const noDiacritics = str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  // Remove punctuation and extra spaces
  return noDiacritics.replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
