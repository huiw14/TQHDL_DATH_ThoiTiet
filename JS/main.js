window.globalWeatherData = {};
window.globalWeatherRecords = [];

let updateAnimationTimer = null;

d3.json("Data/weather_dataset.json").then(function (data) {
    window.globalWeatherData = data;
    window.globalWeatherRecords = flattenWeatherData(data);

    const select = d3.select("#globalFilterSelect");
    buildGlobalFilterOptions(select, data);

    const initialRegion = Object.keys(data)[0];
    const initialValue = `region::${normalizeRegionName(initialRegion)}`;
    select.property("value", initialValue);
    updateChart(initialValue);

    select.on("change", function () {
        const selectedValue = d3.select(this).property("value");
        updateChart(selectedValue);
    });
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

function buildGlobalFilterOptions(select, dataByRegion) {
    select.html("");

    const regions = Array.from(
        new Map(
            Object.keys(dataByRegion).map(region => [normalizeRegionName(region), region])
        ).entries()
    ).map(([regionKey, displayName]) => ({ regionKey, displayName }));
    const months = Array.from(
        new Set(window.globalWeatherRecords.map(d => d.month).filter(Boolean))
    ).sort((a, b) => Number(a) - Number(b));

    const allOption = select.append("option")
        .attr("value", "all::all")
        .text("Tất cả dữ liệu");

    select.append("optgroup").attr("label", "Lọc theo vùng")
        .selectAll("option")
        .data(regions)
        .enter()
        .append("option")
        .attr("value", d => `region::${d.regionKey}`)
        .text(d => d.displayName);

    select.append("optgroup").attr("label", "Lọc theo tháng")
        .selectAll("option")
        .data(months)
        .enter()
        .append("option")
        .attr("value", d => `month::${d}`)
        .text(d => `Tháng ${Number(d)}`);

    allOption.property("selected", false);
}

function updateChart(filterToken) {
    if (!window.globalWeatherRecords.length) return;

    const [filterType, rawValue] = String(filterToken || "all::all").split("::");
    let filteredRecords = window.globalWeatherRecords;
    let selectedRegion = "Tất cả vùng";
    let selectedMonth = "Tất cả tháng";
    let badgeText = "Tất cả dữ liệu";

    if (filterType === "region") {
        filteredRecords = window.globalWeatherRecords.filter(d => d.regionKey === rawValue);
        const selectedRegionRecord = filteredRecords[0];
        selectedRegion = selectedRegionRecord ? selectedRegionRecord.region : rawValue;
        badgeText = `Vùng ${selectedRegion}`;
    } else if (filterType === "month") {
        filteredRecords = window.globalWeatherRecords.filter(d => d.month === rawValue);
        selectedMonth = `Tháng ${Number(rawValue)}`;
        badgeText = `Tháng ${Number(rawValue)}`;
    }

    if (filterType === "all") {
        badgeText = "Tất cả dữ liệu";
    }

    updateFilterBadge(badgeText, filteredRecords.length);

    animateDashboardUpdate();
    updateTask3_DetailCard(filteredRecords[0]);

    const event = new CustomEvent("dataChanged", {
        detail: {
            filterType,
            filterValue: rawValue,
            region: selectedRegion,
            month: selectedMonth,
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