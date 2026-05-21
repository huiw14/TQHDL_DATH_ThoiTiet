// File js/task5.js

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
    d3.json("Data/weather_dataset.json").then(rawData => {
        const records = Object.values(rawData).flat();
        if (!records.length) {
            chart5Container.append("p")
                .text("Không có dữ liệu để hiển thị Task 5")
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

        const theme = {
            "Ven biển": "#38bdf8",
            "Miền núi/Đồng bằng": "#8b5cf6"
        };
        const margin = { top: 32, right: 24, bottom: 46, left: 54 };
        const width = chart5Container.node().clientWidth || 700;
        const height = 340;
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
            .padding(0.48);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(groups, d => d.meanTemp) + 1])
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

        chart.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("font-size", "12px");

        const tooltip = createTask5Tooltip();

        chart.selectAll("rect")
            .data(groups)
            .join("rect")
            .attr("x", d => xScale(d.group))
            .attr("y", innerHeight)
            .attr("width", xScale.bandwidth())
            .attr("height", 0)
            .attr("rx", 14)
            .attr("ry", 14)
            .attr("fill", d => theme[d.group])
            .style("cursor", "pointer")
            .on("mouseenter", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.group}</strong><br>Trung bình: <strong>${d.meanTemp.toFixed(1)}°C</strong><br>Số bản ghi: <strong>${d.count}</strong>`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", `${event.pageX + 12}px`)
                    .style("top", `${event.pageY + 14}px`);
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
            .text(d => `${d.meanTemp.toFixed(1)}°C`);

        chart.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 38)
            .attr("text-anchor", "middle")
            .text("Nhóm địa hình");

        chart.append("text")
            .attr("class", "axis-label")
            .attr("transform", `translate(-42, ${innerHeight / 2}) rotate(-90)`)
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
