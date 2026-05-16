// Biến toàn cục để các file task khác có thể truy cập
window.globalWeatherData = {}; 

// 1. Tải dữ liệu JSON
d3.json("data/weather_dataset.json").then(function(data) {
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
    select.on("change", function() {
        let selectedRegion = d3.select(this).property("value");
        dispatchDataUpdate(selectedRegion);
    });

}).catch(error => {
    console.error("Lỗi tải dữ liệu JSON:", error);
});

// Hàm điều phối chung (Gọi các hàm update của từng Task)
function dispatchDataUpdate(regionName) {
    const regionData = window.globalWeatherData[regionName];
    
    // Cập nhật Detail Card
    updateTask3_DetailCard(regionData[0]); // Lấy data tỉnh đầu tiên làm mặc định

    // Bắn một Custom Event để báo cho các file js/task*.js biết đã có data mới
    // Anh em team chỉ cần dán đoạn lắng nghe sự kiện này vào file của họ
    const event = new CustomEvent("dataChanged", { detail: { region: regionName, data: regionData } });
    document.dispatchEvent(event);
}

// ==========================================
// THỰC THI TASK 3: CHI TIẾT VÙNG
// ==========================================
function updateTask3_DetailCard(provinceData) {
    if(!provinceData) return;
    
    // Cập nhật DOM bằng D3
    d3.select("#detail-province").text(provinceData.province);
    d3.select("#detail-temp").text(provinceData.temp.toFixed(1));
    d3.select("#detail-rain").text(provinceData.rain.toFixed(1));
    d3.select("#detail-wind").text(provinceData.wind.toFixed(1));
    d3.select("#detail-humidity").text(provinceData.humidity.toFixed(1));
    d3.select("#detail-uv").text(provinceData.uv.toFixed(1));
    d3.select("#detail-condition").text(provinceData.condition);
}