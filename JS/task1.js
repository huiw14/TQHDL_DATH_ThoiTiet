// Task 1: Biểu đồ xu hướng nhiệt độ

const task1Container = d3.select("#chart-task1");
const task1TooltipId = "task1-tooltip";
const task1Margin = { top: 28, right: 22, bottom: 40, left: 52 };
const task1OuterHeight = 320;

const task1State = {
    svg: null,
    root: null,
    defs: null,
    gradient: null,
    gridGroup: null,
    xAxisGroup: null,
    yAxisGroup: null,
    linePath: null,
    areaPath: null,
    pointLayer: null,
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    xScale: d3.scaleTime(),
    yScale: d3.scaleLinear(),
    lineGenerator: d3.line().curve(d3.curveMonotoneX),
    areaGenerator: d3.area().curve(d3.curveMonotoneX),
    tooltip: null,
    currentData: []
};

function debounce(fn, wait = 120) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}

function createTask1Tooltip() {
    const existingTooltip = d3.select("body").select(`#${task1TooltipId}`);
    if (!existingTooltip.empty()) {
        return existingTooltip;
    }

    return d3.select("body")
        .append("div")
        .attr("id", task1TooltipId)
        .attr("class", "tooltip");
}

function ensureTask1Chart() {
    if (task1State.svg) return;

    const containerNode = task1Container.node();
    if (!containerNode) return;

    task1State.width = containerNode.clientWidth || 760;
    task1State.height = task1OuterHeight;
    task1State.innerWidth = task1State.width - task1Margin.left - task1Margin.right;
    task1State.innerHeight = task1State.height - task1Margin.top - task1Margin.bottom;

    task1State.svg = task1Container.append("svg")
        .attr("class", "chart-svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${task1State.width} ${task1State.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    task1State.defs = task1State.svg.append("defs");
    task1State.gradient = task1State.defs.append("linearGradient")
        .attr("id", "task1-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");

    task1State.gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "var(--chart-amber)")
        .attr("stop-opacity", 0.38);

    task1State.gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#f59e0b")
        .attr("stop-opacity", 0);

    task1State.root = task1State.svg.append("g")
        .attr("transform", `translate(${task1Margin.left},${task1Margin.top})`);

    task1State.gridGroup = task1State.root.append("g").attr("class", "grid");
    task1State.areaPath = task1State.root.append("path")
        .attr("class", "area")
        .attr("fill", "url(#task1-gradient)")
        .attr("opacity", 0.95);

    task1State.linePath = task1State.root.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "var(--chart-amber)")
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");

    task1State.pointLayer = task1State.root.append("g").attr("class", "point-layer");
    task1State.xAxisGroup = task1State.root.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0, ${task1State.innerHeight})`);
    task1State.yAxisGroup = task1State.root.append("g")
        .attr("class", "axis y-axis");

    task1State.root.append("text")
        .attr("class", "chart-axis-label")
        .attr("x", task1State.innerWidth / 2)
        .attr("y", task1State.innerHeight + 34)
        .attr("text-anchor", "middle")
        .text("Ngày");

    task1State.root.append("text")
        .attr("class", "chart-axis-label")
        .attr("transform", `translate(-42, ${task1State.innerHeight / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .text("Nhiệt độ (°C)");

    task1State.tooltip = createTask1Tooltip();
}

function getDailyAverageData(records) {
    const parseDate = d3.timeParse("%Y-%m-%d");
    const parseFallback = d3.timeParse("%d/%m/%Y");

    const source = Array.isArray(records) ? records : [];
    const grouped = d3.rollups(
        source.filter(d => d && Number.isFinite(+d.temp)),
        values => d3.mean(values, d => +d.temp),
        d => {
            const rawTime = d?.time || d?.date || "";
            const parsed = parseDate(rawTime) || parseFallback(rawTime);
            return parsed ? d3.timeFormat("%Y-%m-%d")(parsed) : String(rawTime).trim();
        }
    );

    return grouped
        .map(([dayKey, avgTemp]) => ({
            day: task1ParseDayKey(dayKey),
            avgTemp
        }))
        .filter(d => d.day && Number.isFinite(d.avgTemp))
        .sort((a, b) => d3.ascending(a.day, b.day));
}

function task1ParseDayKey(dayKey) {
    const parseDate = d3.timeParse("%Y-%m-%d");
    const parseFallback = d3.timeParse("%d/%m/%Y");
    return parseDate(dayKey) || parseFallback(dayKey) || null;
}

function updateLineChart(records) {
    ensureTask1Chart();

    if (Array.isArray(records)) {
        task1State.currentData = records;
    }

    const recordsToRender = task1State.currentData.length ? task1State.currentData : [];
    const dailyData = getDailyAverageData(recordsToRender);

    if (!dailyData.length) {
        task1State.gridGroup.selectAll("*").remove();
        task1State.xAxisGroup.selectAll("*").remove();
        task1State.yAxisGroup.selectAll("*").remove();
        task1State.linePath.datum([]).attr("d", null);
        task1State.areaPath.datum([]).attr("d", null);
        task1State.pointLayer.selectAll("circle").remove();
        task1State.root.selectAll("text.empty-state").data([null]).join("text")
            .attr("class", "empty-state")
            .attr("x", task1State.innerWidth / 2)
            .attr("y", task1State.innerHeight / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#64748b")
            .text("Không có dữ liệu để hiển thị");
        return;
    }

    task1State.root.selectAll("text.empty-state").remove();

    const x = task1State.xScale
        .domain(d3.extent(dailyData, d => d.day))
        .range([0, task1State.innerWidth]);

    const minY = d3.min(dailyData, d => d.avgTemp) ?? 0;
    const maxY = d3.max(dailyData, d => d.avgTemp) ?? 0;
    const y = task1State.yScale
        .domain([minY - 2, maxY + 2])
        .nice()
        .range([task1State.innerHeight, 0]);

    const line = task1State.lineGenerator
        .x(d => x(d.day))
        .y(d => y(d.avgTemp));

    const area = task1State.areaGenerator
        .x(d => x(d.day))
        .y0(task1State.innerHeight)
        .y1(d => y(d.avgTemp));

    task1State.gridGroup
        .transition()
        .duration(750)
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickSize(-task1State.innerWidth)
            .tickFormat(""));

    task1State.xAxisGroup
        .transition()
        .duration(750)
        .call(d3.axisBottom(x)
            .ticks(5)
            .tickFormat(d3.timeFormat("%d/%m")));

    // Make x-axis tick labels horizontal (parallel to axis)
    task1State.xAxisGroup.selectAll("text")
        .attr("transform", null)
        .style("text-anchor", "middle")
        .attr("dx", "0")
        .attr("dy", ".35em");

    task1State.yAxisGroup
        .transition()
        .duration(750)
        .call(d3.axisLeft(y).ticks(5).tickSize(-6).tickPadding(10));

    task1State.areaPath
        .datum(dailyData)
        .transition()
        .duration(750)
        .attr("d", area);

    const lineSelection = task1State.linePath.datum(dailyData);
    const previousPath = task1State.linePath.attr("d");
    if (!previousPath) {
        task1State.linePath.attr("d", line).attr("opacity", 0);
    }

    lineSelection
        .transition()
        .duration(750)
        .attr("opacity", 1)
        .attr("d", line);

    const points = task1State.pointLayer
        .selectAll("circle.hover-point")
        .data(dailyData, d => d.day);

    points.join(
        enter => enter.append("circle")
            .attr("class", "hover-point")
            .attr("cx", d => x(d.day))
            .attr("cy", d => y(d.avgTemp))
            .attr("r", 0)
            .attr("fill", "transparent")
            .attr("cursor", "pointer")
            .call(enter => enter.transition().duration(750).attr("r", 8))
            .on("mouseenter", function (event, d) {
                task1State.tooltip
                    .style("opacity", 1)
                    .html(`Ngày: <strong>${d3.timeFormat("%d-%m-%Y")(d.day)}</strong><br>Nhiệt độ: <strong>${window.safeFixed(d.avgTemp,1,'--')}°C</strong>`);
            })
            .on("mousemove", function (event) {
                task1State.tooltip
                    .style("left", `${event.clientX + 10}px`)
                    .style("top", `${event.clientY + 10}px`);
            })
            .on("mouseleave", function () {
                task1State.tooltip.style("opacity", 0);
            }),
        update => update
            .on("mouseenter", function (event, d) {
                task1State.tooltip
                    .style("opacity", 1)
                    .html(`Ngày: <strong>${d3.timeFormat("%d-%m-%Y")(d.day)}</strong><br>Nhiệt độ: <strong>${window.safeFixed(d.avgTemp,1,'--')}°C</strong>`);
            })
            .on("mousemove", function (event) {
                task1State.tooltip
                    .style("left", `${event.clientX + 10}px`)
                    .style("top", `${event.clientY + 10}px`);
            })
            .on("mouseleave", function () {
                task1State.tooltip.style("opacity", 0);
            })
            .call(update => update.transition().duration(750)
                .attr("cx", d => x(d.day))
                .attr("cy", d => y(d.avgTemp))
                .attr("r", 8)),
        exit => exit.transition().duration(300).attr("r", 0).remove()
    );
}

document.addEventListener("dataChanged", function (event) {
    updateLineChart(event.detail?.data || []);
});

window.addEventListener("resize", debounce(() => {
    if (task1State.svg) {
        task1State.svg.remove();
        task1State.svg = null;
        task1State.root = null;
        task1State.defs = null;
        task1State.gradient = null;
        task1State.gridGroup = null;
        task1State.xAxisGroup = null;
        task1State.yAxisGroup = null;
        task1State.linePath = null;
        task1State.areaPath = null;
        task1State.pointLayer = null;
    }
    updateLineChart(task1State.currentData);
}, 180));