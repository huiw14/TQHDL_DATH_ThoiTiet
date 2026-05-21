// Task 4/6 - Bản đồ choropleth + trạm đo, cập nhật từ bộ lọc chung

let task46GeoData = null;
let task46CurrentData = [];

async function ensureGeoData() {
  if (task46GeoData) return task46GeoData;
  task46GeoData = await d3.json('./Data/vietnam_geojson.json');
  return task46GeoData;
}

async function renderVietnamChoropleth(records) {
  try {
    if (Array.isArray(records)) {
      task46CurrentData = records;
    }

    const geo = await ensureGeoData();
    const source = task46CurrentData.length ? task46CurrentData : (window.globalWeatherRecords || []);

    const svg = d3.select('#vietnam-map');
    if (svg.empty()) {
      console.error('Không tìm thấy svg#vietnam-map');
      return;
    }

    svg.selectAll('*').remove();

    const width = svg.node().clientWidth || +svg.attr('width') || 800;
    const height = svg.node().clientHeight || +svg.attr('height') || 500;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const avgByProvince = d3.rollups(
      source.filter(d => d && d.province && Number.isFinite(d.temp)),
      v => d3.mean(v, d => d.temp),
      d => normalizeName(d.province)
    ).map(([provinceNorm, avg]) => ({ provinceNorm, avg }));

    const provinceAvgMap = new Map(avgByProvince.map(d => [d.provinceNorm, d.avg]));

    const projection = d3.geoMercator().fitSize([width, height], geo);
    const path = d3.geoPath().projection(projection);

    const temps = Array.from(provinceAvgMap.values());
    const tempMin = temps.length ? d3.min(temps) : 0;
    const tempMax = temps.length ? d3.max(temps) : 40;

    const color = d3.scaleSequential()
      .domain([tempMin, tempMax])
      .interpolator(d3.interpolateYlOrRd);

    let tooltip = d3.select('#map-global-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('id', 'map-global-tooltip')
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
    }

    svg.append('g').attr('class', 'provinces')
      .selectAll('path')
      .data(geo.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#999')
      .attr('stroke-width', 0.4)
      .on('mouseover', function(event, d) {
        d3.select(this).raise().attr('stroke-width', 1).attr('stroke', '#333');
        const nameRaw = d.properties.Name || d.properties.Name_1 || d.properties.NAME || 'Khong ro';
        const avg = provinceAvgMap.get(normalizeName(nameRaw));
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
      })
      .transition()
      .duration(650)
      .attr('fill', d => {
        const name = normalizeName(d.properties.Name || d.properties.Name_1 || d.properties.NAME || '');
        const avg = provinceAvgMap.get(name);
        return avg == null ? '#f0f0f0' : color(avg);
      });

    const legendWidth = 220;
    const legendHeight = 10;
    const legendX = width - legendWidth - 20;
    const legendY = height - 40;

    const defs = svg.append('defs');
    const gradId = 'legend-gradient-temp';
    const gradient = defs.append('linearGradient').attr('id', gradId).attr('x1', '0%').attr('x2', '100%');
    const stops = 6;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', color(tempMin + t * (tempMax - tempMin)));
    }

    const legendG = svg.append('g').attr('class', 'legend').attr('transform', `translate(${legendX},${legendY})`);
    legendG.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#${gradId})`)
      .style('stroke', '#ccc');

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

    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 6)
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .text('Nhiệt độ trung bình (°C)');

    const uniqueStations = [];
    const seenProvinces = new Set();

    source.forEach(d => {
      if (d.lat && d.lon && d.province && !seenProvinces.has(d.province)) {
        seenProvinces.add(d.province);
        uniqueStations.push({
          province: d.province,
          lat: +d.lat,
          lon: +d.lon
        });
      }
    });

    const stationsG = svg.append('g').attr('class', 'stations-layer');

    stationsG.selectAll('.station-dot')
      .data(uniqueStations)
      .enter()
      .append('circle')
      .attr('class', 'station-dot')
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('r', 0)
      .on('mouseover', function(event, d) {
        tooltip.style('display', 'block')
          .style('opacity', 1)
          .html(`<strong>Trạm: ${escapeHtml(d.province)}</strong><br/>` +
            `<span class="tooltip-subtext">Lat: ${d.lat.toFixed(2)} | Lon: ${d.lon.toFixed(2)}</span>`);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('display', 'none').style('opacity', 0);
      })
      .transition()
      .duration(450)
      .attr('r', 4);

  } catch (err) {
    console.error('Lỗi khi vẽ bản đồ:', err);
  }
}

function normalizeName(s) {
  if (!s) return '';
  const str = s.toString().toLowerCase().trim();
  const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noDiacritics.replace(/[^\w ]+/g, ' ').replace(/\s+/g, ' ').trim();
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
  renderVietnamChoropleth(event.detail.data || []);
});
