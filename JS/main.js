// Biến toàn cục để các file task khác có thể truy cập
window.globalWeatherData = {};

const kpiFormatters = {
    temp: d3.format('.1f'),
    rain: d3.format('.1f'),
    wind: d3.format('.1f'),
    humidity: d3.format('d'),
    uv: d3.format('.1f')
};

function normalizeName(s) {
    if (!s) return '';
    const str = s.toString().toLowerCase().trim();
    const noDiacritics = str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return noDiacritics.replace(/đ/g, 'd').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// 1. Tải dữ liệu JSON
d3.json("Data/weather_dataset.json").then(function (data) {
    window.globalWeatherData = data;

    // 2. Lấy danh sách các Vùng để đổ vào Dropdown
    const regions = Object.keys(data);
    const select = d3.select("#regionSelect");

    select.html(""); // Xóa option "Đang tải..."
    select.append("option").text("Tất cả vùng").attr("value", "all");

    regions.forEach(region => {
        select.append("option").text(region).attr("value", region);
    });

    // 3. Khởi tạo biểu đồ lần đầu với dữ liệu toàn bộ vùng
    const initialRegion = 'all';
    select.property('value', initialRegion);
    dispatchDataUpdate(initialRegion);

    // 4. Lắng nghe sự kiện người dùng đổi Filter
    select.on("change", function () {
        let selectedRegion = d3.select(this).property("value");
        dispatchDataUpdate(selectedRegion);
    });

}).catch(error => {
    console.error("Lỗi tải dữ liệu JSON:", error);
    const select = d3.select("#regionSelect");
    select.text("Lỗi tải dữ liệu");
    select.property("disabled", true);
});

// Hàm điều phối chung (Gọi các hàm update của từng Task)
function dispatchDataUpdate(regionName, provinceName) {
    const allData = Object.values(window.globalWeatherData).flat();
    let regionData;
    let eventDetail = { region: regionName, fullData: allData };

    if (regionName === 'all') {
        regionData = allData;
        eventDetail.region = 'Tất cả vùng';
        eventDetail.filterType = 'all';
    } else {
        regionData = window.globalWeatherData[regionName] || [];
        eventDetail.region = regionName;
        eventDetail.filterType = 'region';
    }

    eventDetail.data = regionData;
    eventDetail.mapData = regionData;

    if (provinceName) {
        const normalizedProvince = normalizeName(provinceName);
        const provinceRecords = regionData.filter(record => normalizeName(record.province) === normalizedProvince);
        if (provinceRecords.length > 0) {
            eventDetail.data = provinceRecords;
            eventDetail.mapData = allData;
            eventDetail.province = provinceName;
            eventDetail.filterType = 'province';
        }
    }

    document.body.classList.add('is-updating');

    const event = new CustomEvent("dataChanged", { detail: eventDetail });
    document.dispatchEvent(event);

    setTimeout(() => {
        document.body.classList.remove('is-updating');
    }, 350);
}

window.dispatchDataUpdate = dispatchDataUpdate;

// ==========================================
// THỰC THI TASK 3: KPI CARDS
// ==========================================
document.addEventListener("dataChanged", function (event) {
    const regionName = event.detail && event.detail.region;
    const provinceName = event.detail && event.detail.province;
    const regionData = event.detail && event.detail.data;
    const filterType = event.detail && event.detail.filterType;
    renderKPICards(regionName, provinceName, filterType, Array.isArray(regionData) ? regionData : []);
});

function renderKPICards(regionName, provinceName, filterType, regionData) {
    if (!Array.isArray(regionData) || regionData.length === 0) return;

    const stats = calculateRegionStats(regionData);
    const label = provinceName || regionName || "Chưa chọn";
    const conditionLabel = filterType === 'all' ? '' : (stats.commonCondition || "--");

    d3.select("#detail-province").text(label);
    d3.select("#kpi-condition").text(conditionLabel);

    animateKPIValue("#kpi-temp", stats.avgTemp, kpiFormatters.temp);
    animateKPIValue("#kpi-rain", stats.avgRain, kpiFormatters.rain);
    animateKPIValue("#kpi-wind", stats.avgWind, kpiFormatters.wind);
    animateKPIValue("#kpi-humidity", stats.avgHumidity, kpiFormatters.humidity);
    animateKPIValue("#kpi-uv", stats.avgUv, kpiFormatters.uv);
}

function calculateRegionStats(regionData) {
    const filtered = regionData.filter(record => record && Number.isFinite(+record.temp));
    const count = filtered.length || 1;
    const totals = filtered.reduce((acc, record) => {
        acc.temp += +record.temp || 0;
        acc.rain += +record.rain || 0;
        acc.wind += +record.wind || 0;
        acc.humidity += +record.humidity || 0;
        acc.uv += +record.uv || 0;
        return acc;
    }, { temp: 0, rain: 0, wind: 0, humidity: 0, uv: 0 });

    const conditionCounts = filtered.reduce((acc, record) => {
        const condition = record.condition || 'Không rõ';
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});

    const commonCondition = Object.entries(conditionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0])[0] || '--';

    return {
        avgTemp: totals.temp / count,
        avgRain: totals.rain / count,
        avgWind: totals.wind / count,
        avgHumidity: totals.humidity / count,
        avgUv: totals.uv / count,
        commonCondition
    };
}

function animateKPIValue(selector, value, formatter) {
    const targetValue = Number(value);
    const selection = d3.select(selector);

    if (selection.empty()) return;

    if (!Number.isFinite(targetValue)) {
        selection.text("--");
        return;
    }

    const startValue = Number.parseFloat(selection.text());
    const initialValue = Number.isFinite(startValue) ? startValue : 0;

    selection.text(formatter(initialValue));

    selection
        .interrupt()
        .transition()
        .duration(1000)
        .tween("text", function () {
            const interpolateValue = d3.interpolateNumber(initialValue, targetValue);
            return function (t) {
                this.textContent = formatter(interpolateValue(t));
            };
        });
}