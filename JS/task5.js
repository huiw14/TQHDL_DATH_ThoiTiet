// File: JS/task5.js
// Purpose: Nhiệt độ ở Ven biển vs. Nội địa (bar chart comparing coastal vs inland)
// Comments: keep hover/tooltip and transition logic documented with `// NOTE:` where needed.

const chart5Container = d3.select("#chart-task5");
const chart5TooltipId = "task5-tooltip";

function createTask5Tooltip() {
    let tooltip = d3.select(`#${chart5TooltipId}`);
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("id", chart5TooltipId)
            .attr("class", "tooltip");
    }
    return tooltip;
}

function debounce(fn, wait = 120) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}

function renderTask5() {
    chart5Container.selectAll("*").remove();
    const sourceData = window.globalWeatherData && Object.keys(window.globalWeatherData).length
        ? window.globalWeatherData
        : null;

    Promise.resolve(sourceData || d3.json("Data/weather_dataset_final.json")).then(rawData => {
        const records = Array.isArray(rawData) ? rawData : Object.values(rawData).flat();
        if (!records.length) {
            chart5Container.append("p")
                .text("Không có dữ liệu để hiển thị")
                .style("color", "#334155");
            return;
        }

        const groups = d3.rollups(
            records,
            values => ({
                meanTemp: d3.mean(values, d => d.temp),
                count: values.length
            }),
            d => d.is_coastal ? "Ven biển" : "Miền núi/Đồng bằng"
        ).map(([group, stats]) => ({
            group,
            meanTemp: stats.meanTemp,
            count: stats.count
        }))
            .sort((a, b) => a.group.localeCompare(b.group));

        // Match Task 2 visual grammar: same bar geometry, clear value labels, and category colors.
        const theme = {
            "Miền núi/Đồng bằng": "#2563eb",
            "Ven biển": "#f97316"
        };

        const groupOrder = ["Miền núi/Đồng bằng", "Ven biển"];
        groups.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));

        const margin = { top: 18, right: 16, bottom: 72, left: 56 };
        const width = chart5Container.node().clientWidth || 700;
        const height = 300;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // FIX TRÀN KHUNG: Dùng viewBox để tự động co giãn
        const svg = chart5Container.append("svg")
            .attr("class", "chart-svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(groups.map(d => d.group))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([18, d3.max(groups, d => d.meanTemp) + 2])
            .nice()
            .range([innerHeight, 0]);

        chart.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerWidth).tickFormat(""))
            .selectAll("line")
            .attr("stroke-opacity", 0.18);

        chart.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(yScale).ticks(4).tickSize(-6).tickPadding(10));

        const xAxisGroup = chart.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale));

        xAxisGroup.selectAll("text")
            .attr('transform', null)
            .style('text-anchor', 'middle')
            .style('font-size', '11px')
            .attr('dy', '0.35em')
            .text(d => d === "Miền núi/Đồng bằng" ? "Miền núi / đồng bằng" : d);

        const tooltip = createTask5Tooltip();

        chart.selectAll("rect.bar")
            .data(groups)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.group))
            .attr("y", innerHeight)
            .attr("width", xScale.bandwidth())
            .attr("height", 0)
            .attr("rx", 8)
            .attr("ry", 8)
            .attr("fill", d => theme[d.group])
            .attr("stroke", d => d.group === "Ven biển" ? "#c2410c" : "#1d4ed8")
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseenter", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.group}</strong><br>Trung bình: <strong>${window.safeFixed(d.meanTemp,1,'--')}°C</strong><br>Số bản ghi: <strong>${d.count}</strong>`);
            })
            .on("mousemove", function (event) {
                tooltip.style("transform", `translate(${event.clientX + 8}px, ${event.clientY + 8}px)`);
            })
            .on("mouseleave", function () {
                tooltip.style("opacity", 0);
            })
            .transition()
            .duration(900)
            .attr("y", d => yScale(d.meanTemp))
            .attr("height", d => innerHeight - yScale(d.meanTemp));

        chart.selectAll("text.bar-label")
            .data(groups)
            .join("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(d.group) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.meanTemp) - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#334155")
            .text(d => `${window.safeFixed(d.meanTemp,1,'--')}°C`);

        chart.append("text")
            .attr("class", "chart-axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 48)
            .attr("text-anchor", "middle")
            .text("Nhóm địa hình");

        chart.append("text")
            .attr("class", "chart-axis-label")
            .attr("transform", `translate(-36, ${innerHeight / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .text("Nhiệt độ (°C)");
    }).catch(error => {
        console.error("Task 5: Lỗi tải dữ liệu JSON:", error);
        chart5Container.append("p")
            .text("Không thể tải dữ liệu cho Task 5.")
            .style("color", "#dc2626");
    });
}

renderTask5();
window.addEventListener("resize", debounce(renderTask5, 180));
