window.globalWeatherData = {};
window.globalWeatherRecords = [];

let updateAnimationTimer = null;

d3.json("Data/weather_dataset.json").then(function (data) {
    window.globalWeatherData = data;
    window.globalWeatherRecords = flattenWeatherData(data);

    const regionSelect = d3.select("#globalFilterSelect");
    const monthSelect = d3.select("#monthFilterSelect");
    buildFilterOptions(regionSelect, monthSelect, data);

    regionSelect.property("value", "all");
    monthSelect.property("value", "all");
    updateChart();

    regionSelect.on("change", updateChart);
    monthSelect.on("change", updateChart);
}).catch(error => {
    console.error("Lỗi tải dữ liệu JSON:", error);
});

function flattenWeatherData(dataByRegion) {
    const records = [];
    Object.entries(dataByRegion).forEach(([region, rows]) => {
        const regionKey = normalizeRegionName(region);
        rows.forEach(row => {
            const month = extractMonth(row.date);
            records.push({
                ...row,
                region,
                regionKey,
                month
            });
        });
    });
    return records;
}

function normalizeRegionName(regionName) {
    return String(regionName || "")
    .replace(/\s*\[\*\]\s*/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function extractMonth(dateString) {
    if (!dateString || typeof dateString !== "string") return null;
    const chunks = dateString.split("-");
    if (chunks.length < 2) return null;
    return chunks[1];
}

function buildFilterOptions(regionSelect, monthSelect, dataByRegion) {
    regionSelect.html("");
    monthSelect.html("");

    const regions = Array.from(
        new Map(
            Object.keys(dataByRegion).map(region => [normalizeRegionName(region), region])
        ).entries()
    ).map(([regionKey, displayName]) => ({ regionKey, displayName }));
    const months = Array.from(
        new Set(window.globalWeatherRecords.map(d => d.month).filter(Boolean))
    ).sort((a, b) => Number(a) - Number(b));

    regionSelect.append("option")
        .attr("value", "all")
        .text("Tất cả khu vực");

    regionSelect.selectAll("option.region-option")
        .data(regions)
        .enter()
        .append("option")
        .attr("class", "region-option")
        .attr("value", d => d.regionKey)
        .text(d => d.displayName);

    monthSelect.append("option")
        .attr("value", "all")
        .text("Tất cả tháng");

    monthSelect.selectAll("option.month-option")
        .data(months)
        .enter()
        .append("option")
        .attr("class", "month-option")
        .attr("value", d => d)
        .text(d => `Tháng ${Number(d)}`);
}

function updateChart() {
    if (!window.globalWeatherRecords.length) return;

    const regionSelect = document.getElementById("globalFilterSelect");
    const monthSelect = document.getElementById("monthFilterSelect");
    const selectedRegionValue = regionSelect ? regionSelect.value : "all";
    const selectedMonthValue = monthSelect ? monthSelect.value : "all";

    let filteredRecords = window.globalWeatherRecords;
    let selectedRegion = "Tất cả vùng";
    let selectedMonth = "Tất cả tháng";
    let badgeText = "Tất cả dữ liệu";

    if (selectedRegionValue !== "all") {
        filteredRecords = filteredRecords.filter(d => d.regionKey === selectedRegionValue);
        const selectedRegionRecord = filteredRecords[0] || window.globalWeatherRecords.find(d => d.regionKey === selectedRegionValue);
        selectedRegion = selectedRegionRecord ? selectedRegionRecord.region : selectedRegionValue;
    }

    if (selectedMonthValue !== "all") {
        filteredRecords = filteredRecords.filter(d => d.month === selectedMonthValue);
        selectedMonth = `Tháng ${Number(selectedMonthValue)}`;
    }

    if (selectedRegionValue !== "all" && selectedMonthValue !== "all") {
        badgeText = `${selectedRegion} • ${selectedMonth}`;
    } else if (selectedRegionValue !== "all") {
        badgeText = `Vùng ${selectedRegion}`;
    } else if (selectedMonthValue !== "all") {
        badgeText = selectedMonth;
    }

    updateFilterBadge(badgeText, filteredRecords.length);

    animateDashboardUpdate();
    updateTask3_DetailCard(filteredRecords[0]);

    const event = new CustomEvent("dataChanged", {
        detail: {
            filterType: selectedRegionValue !== "all" && selectedMonthValue !== "all" ? "combined" : (selectedRegionValue !== "all" ? "region" : (selectedMonthValue !== "all" ? "month" : "all")),
            filterValue: { region: selectedRegionValue, month: selectedMonthValue },
            region: selectedRegion,
            month: selectedMonth,
            label: badgeText,
            data: filteredRecords,
            raw: window.globalWeatherData
        }
    });
    document.dispatchEvent(event);
}

window.updateChart = updateChart;

function updateFilterBadge(label, recordCount) {
    const badge = document.getElementById("filterBadge");
    if (!badge) return;

    badge.textContent = `${label} • ${recordCount} bản ghi`;
}

function animateDashboardUpdate() {
    document.body.classList.add("is-updating");
    if (updateAnimationTimer) {
        clearTimeout(updateAnimationTimer);
    }
    updateAnimationTimer = setTimeout(() => {
        document.body.classList.remove("is-updating");
    }, 260);
}

// ==========================================
// THỰC THI TASK 3: CHI TIẾT VÙNG
// ==========================================
function updateTask3_DetailCard(provinceData) {
    if (!provinceData) return;

    // Cập nhật DOM bằng D3
    d3.select("#detail-province").text(provinceData.province);
    d3.select("#detail-temp").text(provinceData.temp.toFixed(1));
    d3.select("#detail-rain").text(provinceData.rain.toFixed(1));
    d3.select("#detail-wind").text(provinceData.wind.toFixed(1));
    d3.select("#detail-humidity").text(provinceData.humidity.toFixed(1));
    d3.select("#detail-uv").text(provinceData.uv.toFixed(1));
    d3.select("#detail-condition").text(provinceData.condition);
}