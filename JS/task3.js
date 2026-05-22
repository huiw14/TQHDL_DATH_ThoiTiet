// Task 3: Mini Dashboard với chi tiết vùng khi click
// Click vào tên vùng -> Update Detail Card

let weatherData = null;
let regionsList = [];

// Load dữ liệu thời tiết
async function loadWeatherData() {
    try {
        const response = await fetch('Data/weather_dataset.json');
        weatherData = await response.json();
        initializeRegionList();
        renderDetailFromCurrentSelection();
        
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    }
}

// Khởi tạo khung chi tiết vùng
function initializeRegionList() {
    const dashboard = document.getElementById('dashboard-detail');
    if (!dashboard) {
        console.warn('Không tìm thấy #dashboard-detail');
        return;
    }
    
    // Tạo cấu trúc HTML cho mini dashboard
    dashboard.innerHTML = `
        <div class="mini-dashboard">
            <div class="region-detail-panel">
                <h3>Chi tiết Vùng</h3>
                <div class="region-detail-card">
                    <h4 id="selected-region-title">Chưa chọn vùng</h4>
                    <div class="detail-stats">
                        <div class="stat-item">
                            <span class="stat-label">Nhiệt độ trung bình:</span>
                            <span class="stat-value" id="avg-temp">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Lượng mưa trung bình:</span>
                            <span class="stat-value" id="avg-rain">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tốc độ gió trung bình:</span>
                            <span class="stat-value" id="avg-wind">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Độ ẩm trung bình:</span>
                            <span class="stat-value" id="avg-humidity">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Chỉ số UV trung bình:</span>
                            <span class="stat-value" id="avg-uv">--</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Tổng số dữ liệu:</span>
                            <span class="stat-value" id="total-records">--</span>
                        </div>
                    </div>
                    <div class="weather-condition">
                        <h5>Trạng thái thời tiết phổ biến:</h5>
                        <ul id="condition-list" class="condition-list">
                            <!-- Trạng thái phổ biến -->
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Tính toán thống kê
function calculateStats(regionData) {
    const stats = {
        avgTemp: 0,
        avgRain: 0,
        avgWind: 0,
        avgHumidity: 0,
        avgUv: 0,
        conditions: {}
    };
    
    let totalTemp = 0, totalRain = 0, totalWind = 0, totalHumidity = 0, totalUv = 0;
    
    regionData.forEach(record => {
        totalTemp += record.temp || 0;
        totalRain += record.rain || 0;
        totalWind += record.wind || 0;
        totalHumidity += record.humidity || 0;
        totalUv += record.uv || 0;
        
        // Đếm trạng thái thời tiết
        const condition = record.condition || 'Không xác định';
        stats.conditions[condition] = (stats.conditions[condition] || 0) + 1;
    });
    
    const count = regionData.length || 1;
    stats.avgTemp = totalTemp / count;
    stats.avgRain = totalRain / count;
    stats.avgWind = totalWind / count;
    stats.avgHumidity = totalHumidity / count;
    stats.avgUv = totalUv / count;
    
    return stats;
}

// Cập nhật danh sách trạng thái thời tiết
function updateConditionList(conditions) {
    const conditionList = document.getElementById('condition-list');
    conditionList.innerHTML = '';
    
    // Sắp xếp theo số lần xuất hiện
    const sortedConditions = Object.entries(conditions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Chỉ lấy 5 trạng thái hàng đầu
    
    sortedConditions.forEach(([condition, count]) => {
        const li = document.createElement('li');
        li.textContent = `${condition}: ${count} lần`;
        conditionList.appendChild(li);
    });
}

function renderDetailFromCurrentSelection(records, label) {
    const targetRecords = Array.isArray(records) && records.length
        ? records
        : (window.globalWeatherRecords || []);

    const selectedRegionTitle = document.getElementById('selected-region-title');
    if (selectedRegionTitle) {
        selectedRegionTitle.textContent = label || 'Tất cả dữ liệu';
    }

    const stats = calculateStats(targetRecords);
    const avgTemp = document.getElementById('avg-temp');
    const avgRain = document.getElementById('avg-rain');
    const avgWind = document.getElementById('avg-wind');
    const avgHumidity = document.getElementById('avg-humidity');
    const avgUv = document.getElementById('avg-uv');
    const totalRecords = document.getElementById('total-records');

    if (avgTemp) avgTemp.textContent = stats.avgTemp.toFixed(2) + ' °C';
    if (avgRain) avgRain.textContent = stats.avgRain.toFixed(2) + ' mm';
    if (avgWind) avgWind.textContent = stats.avgWind.toFixed(2) + ' kph';
    if (avgHumidity) avgHumidity.textContent = stats.avgHumidity.toFixed(2) + ' %';
    if (avgUv) avgUv.textContent = stats.avgUv.toFixed(2);
    if (totalRecords) totalRecords.textContent = targetRecords.length;

    updateConditionList(stats.conditions);
}

document.addEventListener('dataChanged', (event) => {
    const records = event.detail.data || [];
    if (!records.length || !document.getElementById('avg-temp')) return;
    renderDetailFromCurrentSelection(records, event.detail.label || 'Tất cả dữ liệu');
});

// Khởi động khi trang load
document.addEventListener('DOMContentLoaded', loadWeatherData);
