// Choropleth Map - Task 4 + Task 6
// Render vào: <svg id="vietnam-map"></svg>

const mapState = {
  geo: null,
  svg: null,
  width: 0,
  height: 0,
  projection: null,
  path: null,
  provinceLayer: null,
  stationLayer: null,
  tooltip: null,
  provinceTempMap: new Map(),
  currentRecords: [],
  selectedProvince: null,
  pendingRender: null
};

document.addEventListener('dataChanged', function (event) {
  const records = event.detail && Array.isArray(event.detail.data) ? event.detail.data : [];
  mapState.currentRecords = records;
  if (mapState.geo) {
    renderMap(records);
  } else {
    mapState.pendingRender = records;
  }
});

document.addEventListener('DOMContentLoaded', initVietnamMap);

async function initVietnamMap() {
  try {
    const [geo] = await Promise.all([
      d3.json('./Data/vietnam_geojson.json')
    ]);

    const svg = d3.select('#vietnam-map');
    if (svg.empty()) {
      console.error('Không tìm thấy svg#vietnam-map');
      return;
    }

    mapState.geo = geo;
    mapState.svg = svg;
    mapState.tooltip = ensureMapTooltip();

    setupMapCanvas();

    const initialRecords = mapState.currentRecords.length
      ? mapState.currentRecords
      : (mapState.pendingRender || []);

    renderMap(initialRecords);
  } catch (err) {
    console.error('Lỗi khi khởi tạo bản đồ:', err);
  }
}

function setupMapCanvas() {
  const svg = mapState.svg;
  const width = svg.node().clientWidth || +svg.attr('width') || 800;
  const height = svg.node().clientHeight || +svg.attr('height') || 500;

  mapState.width = width;
  mapState.height = height;

  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  mapState.projection = d3.geoMercator()
    .center([108.5, 16.5])
    .fitSize([width, height], mapState.geo);

  mapState.path = d3.geoPath().projection(mapState.projection);

  mapState.provinceLayer = svg.append('g').attr('class', 'provinces');
  mapState.stationLayer = svg.append('g').attr('class', 'stations-layer');
}

function renderMap(records) {
  if (!mapState.geo || !mapState.svg) return;

  const safeRecords = Array.isArray(records) ? records : [];
  mapState.currentRecords = safeRecords;
  mapState.provinceTempMap = buildProvinceTemperatureMap(safeRecords);

  const temperatures = Array.from(mapState.provinceTempMap.values());
  const minTemp = temperatures.length ? d3.min(temperatures) : 0;
  const maxTemp = temperatures.length ? d3.max(temperatures) : 40;
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([minTemp, maxTemp]);

  const provinceFeatures = mapState.geo.features || [];
  const provinceNames = provinceFeatures.map(feature => getProvinceName(feature));

  const provinces = mapState.provinceLayer
    .selectAll('path')
    .data(provinceFeatures, feature => getProvinceName(feature));

  provinces.join(
    enter => enter.append('path')
      .attr('d', mapState.path)
      .attr('fill', feature => getProvinceFill(feature, colorScale))
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 0.6)
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('cursor', 'pointer')
      .on('mouseover', handleProvinceMouseOver)
      .on('mousemove', handleProvinceMouseMove)
      .on('mouseout', handleProvinceMouseOut)
      .on('click', handleProvinceClick),
    update => update
      .attr('d', mapState.path)
      .attr('fill', feature => getProvinceFill(feature, colorScale))
  );

  mapState.provinceLayer
    .selectAll('path')
    .classed('active', d => mapState.selectedProvince && getProvinceName(d) === mapState.selectedProvince);

  applyProvinceVisualState();
  renderStationDots(safeRecords);
}

function buildProvinceTemperatureMap(records) {
  const filtered = records.filter(record => record && record.province && Number.isFinite(+record.temp));
  return new Map(
    d3.rollups(
      filtered,
      values => d3.mean(values, d => +d.temp),
      d => normalizeName(d.province)
    )
  );
}

function getProvinceName(feature) {
  return normalizeName(
    feature?.properties?.Name ||
    feature?.properties?.Name_1 ||
    feature?.properties?.NAME ||
    ''
  );
}

function getProvinceFill(feature, colorScale) {
  const provinceName = getProvinceName(feature);
  const avgTemp = mapState.provinceTempMap.get(provinceName);
  return avgTemp == null ? '#e2e8f0' : colorScale(avgTemp);
}

function renderStationDots(records) {
  const stations = [];
  const seen = new Set();

  records.forEach(record => {
    const hasCoords = Number.isFinite(+record?.lat) && Number.isFinite(+record?.lon);
    if (!record || !record.province || !hasCoords) return;

    const key = normalizeName(record.province);
    if (seen.has(key)) return;

    const projected = mapState.projection([+record.lon, +record.lat]);
    if (!projected) return;

    seen.add(key);
    stations.push({
      province: record.province,
      lat: +record.lat,
      lon: +record.lon,
      x: projected[0],
      y: projected[1]
    });
  });

  const dots = mapState.stationLayer
    .selectAll('circle.station-dot')
    .data(stations, d => normalizeName(d.province));

  dots.join(
    enter => enter.append('circle')
      .attr('class', 'station-dot')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 4),
    update => update
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 4),
    exit => exit.remove()
  );
}

function handleProvinceMouseOver(event, feature) {
  const target = d3.select(this);
  target.attr('stroke', '#1e293b').attr('stroke-width', 2);

  const provinceName = feature?.properties?.Name || feature?.properties?.Name_1 || feature?.properties?.NAME || 'Không rõ';
  const avgTemp = mapState.provinceTempMap.get(getProvinceName(feature));

  mapState.tooltip
    .style('display', 'block')
    .style('opacity', 1)
    .html(`<strong>${escapeHtml(provinceName)}</strong><br/>Nhiệt độ: ${avgTemp == null ? 'Không có dữ liệu' : `${avgTemp.toFixed(1)} °C`}`);

  if (!mapState.selectedProvince || getProvinceName(feature) !== mapState.selectedProvince) {
    target.raise();
  }
}

function handleProvinceMouseMove(event) {
  mapState.tooltip
    .style('left', `${event.pageX + 12}px`)
    .style('top', `${event.pageY + 12}px`);
}

function handleProvinceMouseOut(event, feature) {
  mapState.tooltip.style('opacity', 0).style('display', 'none');
  applyProvinceVisualState();
}

function handleProvinceClick(event, feature) {
  const provinceName = getProvinceName(feature);
  mapState.selectedProvince = mapState.selectedProvince === provinceName ? null : provinceName;

  console.log('Clicked:', feature?.properties?.Name || feature?.properties?.Name_1 || feature?.properties?.NAME || 'Không rõ');

  mapState.provinceLayer
    .selectAll('path')
    .classed('active', d => getProvinceName(d) === mapState.selectedProvince);

  applyProvinceVisualState();
}

function applyProvinceVisualState() {
  const paths = mapState.provinceLayer.selectAll('path');
  const hasSelection = Boolean(mapState.selectedProvince);

  paths
    .attr('opacity', d => {
      if (!hasSelection) return 1;
      return getProvinceName(d) === mapState.selectedProvince ? 1 : 0.3;
    })
    .attr('stroke', d => {
      if (hasSelection && getProvinceName(d) === mapState.selectedProvince) return '#1e293b';
      return '#cbd5e1';
    })
    .attr('stroke-width', d => {
      if (hasSelection && getProvinceName(d) === mapState.selectedProvince) return 2;
      return 0.6;
    });
}

function ensureMapTooltip() {
  const existingTooltip = d3.select('body').select('#map-tooltip');
  if (!existingTooltip.empty()) {
    return existingTooltip;
  }

  return d3.select('body')
    .append('div')
    .attr('id', 'map-tooltip')
    .attr('class', 'tooltip');
}

function normalizeName(s) {
  if (!s) return '';
  const str = s.toString().toLowerCase().trim();
  const noDiacritics = str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
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
