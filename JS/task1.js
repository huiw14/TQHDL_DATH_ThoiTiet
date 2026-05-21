// File js/task1.js

const chart1Container = d3.select("#chart-task1");
const chart1TooltipId = "task1-tooltip";

function createTask1Tooltip() {
    let tooltip = d3.select(`#${chart1TooltipId}`);
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("id", chart1TooltipId)
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

let task1CurrentData = [];

function renderTask1(records) {
    if (Array.isArray(records)) {
        task1CurrentData = records;
    }

    chart1Container.selectAll("*").remove();

    const recordsToRender = task1CurrentData.length
        ? task1CurrentData
        : (window.globalWeatherRecords || []);

    if (!recordsToRender.length) {
        chart1Container.append("p")
            .text("Không có dữ liệu để hiển thị Task 1")
            .style("color", "#334155");
        return;
    }

        const parseDate = d3.timeParse("%Y-%m-%d");
        const data = Array.from(
            d3.rollups(
                recordsToRender,
                values => d3.mean(values, d => d.temp),
                d => d.date
            ),
            ([date, avgTemp]) => ({
                date: parseDate(date),
                avgTemp
            })
        )
            .filter(d => d.date)
            .sort((a, b) => d3.ascending(a.date, b.date));

        const margin = { top: 28, right: 22, bottom: 40, left: 52 };
        const width = chart1Container.node().clientWidth || 760;
        const height = 340;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // FIX TRÀN KHUNG: Dùng viewBox để tự động co giãn
        const svg = chart1Container.append("svg")
            .attr("class", "chart-svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "task1-gradient")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#38bdf8")
            .attr("stop-opacity", 0.38);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#38bdf8")
            .attr("stop-opacity", 0);

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.avgTemp) - 1, d3.max(data, d => d.avgTemp) + 1])
            .nice()
            .range([innerHeight, 0]);

        chart.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickSize(-innerWidth)
                .tickFormat(""))
            .selectAll("line")
            .attr("stroke-opacity", 0.18);

        const xAxis = d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(d3.timeFormat("%d-%m-%Y"));

        const yAxis = d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(-6)
            .tickPadding(10);

        chart.append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .attr("class", "axis")
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "translate(0,6)")
            .style("text-anchor", "middle");

        chart.append("g")
            .attr("class", "axis")
            .call(yAxis)
            .selectAll("text")
            .style("font-size", "12px");

        const area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.date))
            .y0(innerHeight)
            .y1(d => yScale(d.avgTemp));

        chart.append("path")
            .datum(data)
            .attr("d", area)
            .attr("fill", "url(#task1-gradient)")
            .attr("opacity", 0.95);

        chart.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("d", d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => xScale(d.date))
                .y(d => yScale(d.avgTemp))
            )
            .attr("stroke-dasharray", function () {
                const totalLength = this.getTotalLength();
                return `${totalLength} ${totalLength}`;
            })
            .attr("stroke-dashoffset", function () {
                return this.getTotalLength();
            })
            .transition()
            .duration(1400)
            .attr("stroke-dashoffset", 0);

        const tooltip = createTask1Tooltip();

        chart.selectAll("circle.hover-point")
            .data(data)
            .join("circle")
            .attr("class", "hover-point")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.avgTemp))
            .attr("r", 8)
            .attr("fill", "transparent")
            .attr("cursor", "pointer")
            .on("mouseenter", function (event, d) {
                tooltip.style("opacity", 1)
                    .html(`Ngày: <strong>${d3.timeFormat("%d-%m-%Y")(d.date)}</strong><br>Nhiệt độ: <strong>${d.avgTemp.toFixed(1)}°C</strong>`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", `${event.pageX + 14}px`)
                    .style("top", `${event.pageY + 14}px`);
            })
            .on("mouseleave", function () {
                tooltip.style("opacity", 0);
            });

        chart.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 34)
            .attr("text-anchor", "middle")
            .text("Ngày");

        chart.append("text")
            .attr("class", "axis-label")
            .attr("transform", `translate(-42, ${innerHeight / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .text("Nhiệt độ (°C)");
}

document.addEventListener("dataChanged", function (event) {
    renderTask1(event.detail.data || []);
});

window.addEventListener("resize", debounce(() => renderTask1(), 180));