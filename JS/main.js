// Biến toàn cục để các file task khác có thể truy cập
window.globalWeatherData = {};

const kpiFormatters = {
    temp: d3.format('.1f'),
    rain: d3.format('.1f'),
    wind: d3.format('.1f'),
    humidity: d3.format('.1f'),
    uv: d3.format('.1f')
};

// 1. Tải dữ liệu JSON
d3.json("Data/weather_dataset.json").then(function (data) {
    window.globalWeatherData = data;

    // 2. Lấy danh sách các Vùng để đổ vào Dropdown
    const regions = Object.keys(data);
    const select = d3.select("#regionSelect");

    select.html(""); // Xóa option "Đang tải..."

    regions.forEach(region => {
        select.append("option").text(region).attr("value", region);
    });

    // 3. Khởi tạo biểu đồ lần đầu với vùng đầu tiên
    let initialRegion = regions[0];
    dispatchDataUpdate(initialRegion);

    // 4. Lắng nghe sự kiện người dùng đổi Filter
    select.on("change", function () {
        let selectedRegion = d3.select(this).property("value");
        dispatchDataUpdate(selectedRegion);
    });

}).catch(error => {
    console.error("Lỗi tải dữ liệu JSON:", error);
});

// Hàm điều phối chung (Gọi các hàm update của từng Task)
function dispatchDataUpdate(regionName) {
    const regionData = window.globalWeatherData[regionName];

    // Bắn một Custom Event để báo cho các file js/task*.js biết đã có data mới
    // Anh em team chỉ cần dán đoạn lắng nghe sự kiện này vào file của họ
    const event = new CustomEvent("dataChanged", { detail: { region: regionName, data: regionData } });
    document.dispatchEvent(event);
}

// ==========================================
// THỰC THI TASK 3: KPI CARDS
// ==========================================
document.addEventListener("dataChanged", function (event) {
    const regionData = event.detail && event.detail.data;
    renderKPICards(Array.isArray(regionData) ? regionData[0] : null);
});

function renderKPICards(provinceData) {
    if (!provinceData) return;

    d3.select("#detail-province").text(provinceData.province || "Chưa chọn");

    animateKPIValue("#kpi-temp", provinceData.temp, kpiFormatters.temp);
    animateKPIValue("#kpi-rain", provinceData.rain, kpiFormatters.rain);
    animateKPIValue("#kpi-wind", provinceData.wind, kpiFormatters.wind);
    animateKPIValue("#kpi-humidity", provinceData.humidity, kpiFormatters.humidity);
    animateKPIValue("#kpi-uv", provinceData.uv, kpiFormatters.uv);

    d3.select("#kpi-condition").text(provinceData.condition || "--");
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