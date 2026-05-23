// Task 3: Mini Dashboard với chi tiết vùng khi click
// Click vào tên vùng -> Update Detail Card

let weatherData = null;
let regionsList = [];

// Load dữ liệu thời tiết
async function loadWeatherData() {
    try {
        if (window.globalWeatherData && Object.keys(window.globalWeatherData).length) {
            weatherData = window.globalWeatherData;
        } else {
            const response = await fetch('Data/weather_dataset_final.json');
            weatherData = await response.json();
        }
        
        // Trích xuất danh sách vùng duy nhất
        regionsList = Array.from(new Set(Object.keys(weatherData)));
        
        // Sắp xếp vùng
        regionsList.sort();
        
        initializeRegionList();
        
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    }
}

// Khởi tạo danh sách vùng có thể click
function initializeRegionList() {
    const dashboard = document.getElementById('dashboard-detail');
    if (!dashboard) {
        console.warn('Không tìm thấy #dashboard-detail');
        return;
    }
    
    // Tạo cấu trúc HTML cho mini dashboard
    dashboard.innerHTML = `
        <div class="mini-dashboard">
            <div class="region-list-panel">
                <h3>Danh sách Vùng</h3>
                <ul class="region-list" id="regionListContainer">
                    <!-- Sẽ được populate bằng JS -->
                </ul>
            </div>
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
    
    // Populate danh sách vùng
    const regionListContainer = document.getElementById('regionListContainer');
    regionsList.forEach(region => {
        const li = document.createElement('li');
        li.className = 'region-item';
        li.textContent = region;
        li.addEventListener('click', () => selectRegion(region, li));
        regionListContainer.appendChild(li);
    });
}

// Xử lý khi click chọn vùng
function selectRegion(regionName, element) {
    // Bỏ active class từ item cũ
    document.querySelectorAll('.region-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Thêm active class cho item mới
    element.classList.add('active');
    
    // Update chi tiết vùng
    updateRegionDetail(regionName);
}

// Cập nhật chi tiết vùng
function updateRegionDetail(regionName) {
    if (!weatherData[regionName]) {
        console.warn('Không tìm thấy dữ liệu cho vùng:', regionName);
        return;
    }
    
    const regionData = weatherData[regionName];
    
    // Tính toán thống kê
    const stats = calculateStats(regionData);
    
    // Update UI
    document.getElementById('selected-region-title').textContent = regionName;
    document.getElementById('avg-temp').textContent = window.safeFixed(stats.avgTemp, 2, '--') + ' °C';
    document.getElementById('avg-rain').textContent = window.safeFixed(stats.avgRain, 2, '--') + ' mm';
    document.getElementById('avg-wind').textContent = window.safeFixed(stats.avgWind, 2, '--') + ' kph';
    document.getElementById('avg-humidity').textContent = window.safeFixed(stats.avgHumidity, 2, '--') + ' %';
    document.getElementById('avg-uv').textContent = window.safeFixed(stats.avgUv, 2, '--');
    document.getElementById('total-records').textContent = regionData.length;
    
    // Update danh sách trạng thái thời tiết
    updateConditionList(stats.conditions);
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
    // Sắp xếp theo thứ tự chuẩn nếu có, còn không thì theo số lần xuất hiện
    const entries = Object.entries(conditions || {}).map(([c, n]) => ({ condition: c, count: n }));
    let ordered = [];
    if (Array.isArray(window.conditionOrder) && window.conditionOrder.length) {
        const order = window.conditionOrder;
        const byName = new Map(entries.map(e => [e.condition, e]));
        // Add in the canonical order if present
        order.forEach(name => {
            if (byName.has(name)) ordered.push(byName.get(name));
        });
        // Add remaining entries sorted by count
        const remaining = entries.filter(e => !order.includes(e.condition)).sort((a, b) => b.count - a.count);
        ordered = ordered.concat(remaining);
    } else {
        ordered = entries.sort((a, b) => b.count - a.count);
    }

    ordered.slice(0, 5).forEach(e => {
        const li = document.createElement('li');
        li.textContent = `${e.condition}: ${e.count} lần`;
        conditionList.appendChild(li);
    });
}

// Cập nhật region select dropdown
function loadRegionSelect() {
    const regionSelect = document.getElementById('regionSelect');
    if (!regionSelect) return;
    
    regionSelect.innerHTML = '';
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Tất cả vùng';
    regionSelect.appendChild(allOption);
    
    regionsList.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
    
    regionSelect.addEventListener('change', (e) => {
        if (e.target.value !== 'all') {
            // Trigger click trên region item tương ứng
            const regionItem = document.querySelector(
                `.region-item:contains('${e.target.value}')`
            );
            if (regionItem) regionItem.click();
            else {
                // Alternative approach
                const items = document.querySelectorAll('.region-item');
                items.forEach(item => {
                    if (item.textContent === e.target.value) {
                        item.click();
                    }
                });
            }
        }
    });
}

// Khởi động khi trang load
document.addEventListener('DOMContentLoaded', loadWeatherData);
