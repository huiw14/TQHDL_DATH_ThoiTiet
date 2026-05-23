// Task 10: Biểu đồ phân tán Nhiệt độ và UV

const task10Container = d3.select("#chart-task10");

const task10State = {
    svg: null,
    root: null,
    plotArea: null,
    xAxisGroup: null,
    yAxisGroup: null,
    pointsLayer: null,
    brushLayer: null,
    tooltip: null,
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    margin: { top: 18, right: 18, bottom: 40, left: 44 },
    xScale: d3.scaleLinear(),
    yScale: d3.scaleLinear(),
    currentData: [],
    brushedSelection: null,
    brush: null
};

function ensureTask10Tooltip() {
    const existingTooltip = d3.select('body').select('#task10-tooltip');
    if (!existingTooltip.empty()) {
        return existingTooltip;
    }

    return d3.select('body').append('div')
        .attr('id', 'task10-tooltip')
        .attr('class', 'tooltip')
        .style('display', 'none');
}

function ensureTask10Chart() {
    if (task10State.svg) return;

    const containerNode = task10Container.node();
    if (!containerNode) return;

    task10State.width = containerNode.getBoundingClientRect().width || 250;
    task10State.height = containerNode.getBoundingClientRect().height || 200;
    task10State.innerWidth = task10State.width - task10State.margin.left - task10State.margin.right;
    task10State.innerHeight = task10State.height - task10State.margin.top - task10State.margin.bottom;

    task10State.svg = task10Container.append('svg')
        .attr('class', 'chart-svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${task10State.width} ${task10State.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    task10State.root = task10State.svg.append('g')
        .attr('transform', `translate(${task10State.margin.left},${task10State.margin.top})`);

    task10State.plotArea = task10State.root.append('rect')
        .attr('class', 'plot-area')
        .attr('width', task10State.innerWidth)
        .attr('height', task10State.innerHeight)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all');

    task10State.pointsLayer = task10State.root.append('g').attr('class', 'points-layer');
    task10State.xAxisGroup = task10State.root.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${task10State.innerHeight})`);
    task10State.yAxisGroup = task10State.root.append('g')
        .attr('class', 'axis y-axis');
    task10State.brushLayer = task10State.root.append('g').attr('class', 'brush-layer');

    task10State.root.append('text')
        .attr('class', 'axis-label')
        .attr('x', task10State.innerWidth / 2)
        .attr('y', task10State.innerHeight + 34)
        .attr('text-anchor', 'middle')
        .text('Nhiệt độ (°C)');

    task10State.root.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(-36, ${task10State.innerHeight / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .text('UV');

    task10State.tooltip = ensureTask10Tooltip();

    task10State.brush = d3.brush()
        .extent([[0, 0], [task10State.innerWidth, task10State.innerHeight]])
        .on('brush end', handleTask10Brush);

    task10State.brushLayer.call(task10State.brush);

    task10State.root.on('click', function (event) {
        if (!task10State.brushedSelection) return;
        if (event.target.closest && event.target.closest('.brush')) return;
        clearTask10Brush();
    });
}

function prepareTask10Data(records) {
    return (Array.isArray(records) ? records : [])
        .filter(d => d && Number.isFinite(+d.temp) && Number.isFinite(+d.uv))
        .map((d, index) => ({
            ...d,
            _task10Index: index,
            _task10Date: parseTask10Date(d.time || d.date)
        }))
        .sort((a, b) => {
            if (a._task10Date && b._task10Date) return a._task10Date - b._task10Date;
            return d3.ascending(a._task10Index, b._task10Index);
        });
}

function parseTask10Date(value) {
    if (!value) return null;
    const parseIso = d3.timeParse('%Y-%m-%d');
    const parseAlt = d3.timeParse('%d/%m/%Y');
    return parseIso(value) || parseAlt(value) || null;
}

function updateScatterChart(records) {
    ensureTask10Chart();

    if (Array.isArray(records)) {
        task10State.currentData = records;
    }

    const data = prepareTask10Data(task10State.currentData);
    if (!data.length) {
        task10State.pointsLayer.selectAll('*').remove();
        task10State.xAxisGroup.selectAll('*').remove();
        task10State.yAxisGroup.selectAll('*').remove();
        task10State.brushedSelection = null;
        return;
    }

    const xDomain = d3.extent(data, d => d.temp);
    const yDomain = d3.extent(data, d => d.uv);

    task10State.xScale
        .domain(xDomain)
        .nice()
        .range([0, task10State.innerWidth]);

    task10State.yScale
        .domain(yDomain)
        .nice()
        .range([task10State.innerHeight, 0]);

    const axisBottom = d3.axisBottom(task10State.xScale).ticks(5);
    const axisLeft = d3.axisLeft(task10State.yScale).ticks(5);

    task10State.xAxisGroup
        .transition()
        .duration(750)
        .call(axisBottom);

    task10State.yAxisGroup
        .transition()
        .duration(750)
        .call(axisLeft);

    const points = task10State.pointsLayer
        .selectAll('circle.point')
        .data(data, d => d._task10Index);

    points.join(
        enter => enter.append('circle')
            .attr('class', 'point')
            .attr('cx', d => task10State.xScale(d.temp))
            .attr('cy', d => task10State.yScale(d.uv))
            .attr('r', 0)
            .attr('fill', 'var(--chart-amber)')
            .attr('stroke', 'var(--chart-amber)')
            .attr('stroke-width', 1)
            .attr('opacity', 0.35)
            .call(enter => enter.transition().duration(750).attr('r', 5))
            .on('mouseenter', handleTask10MouseEnter)
            .on('mousemove', handleTask10MouseMove)
            .on('mouseleave', handleTask10MouseLeave),
        update => update
            .on('mouseenter', handleTask10MouseEnter)
            .on('mousemove', handleTask10MouseMove)
            .on('mouseleave', handleTask10MouseLeave)
            .call(update => update.transition().duration(750)
                .attr('cx', d => task10State.xScale(d.temp))
                .attr('cy', d => task10State.yScale(d.uv))
                .attr('r', 5)
                .attr('fill', 'var(--chart-amber)')
                .attr('stroke', 'var(--chart-amber)')
                .attr('stroke-width', 1)
                .attr('opacity', 0.6)),
        exit => exit.transition().duration(300).attr('r', 0).remove()
    );

    applyTask10BrushSelection(task10State.brushedSelection);

    // --- Regression line (least squares) ---
    try {
        const xy = data.map(d => [Number(d.temp), Number(d.uv)]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (xy.length >= 2) {
            const n = xy.length;
            const sumX = d3.sum(xy, p => p[0]);
            const sumY = d3.sum(xy, p => p[1]);
            const sumXY = d3.sum(xy, p => p[0] * p[1]);
            const sumX2 = d3.sum(xy, p => p[0] * p[0]);
            const denom = (n * sumX2 - sumX * sumX) || 1e-9;
            const m = (n * sumXY - sumX * sumY) / denom;
            const b = (sumY - m * sumX) / n;

            const xMin = task10State.xScale.domain()[0];
            const xMax = task10State.xScale.domain()[1];
            const yForMin = m * xMin + b;
            const yForMax = m * xMax + b;

            // remove old regression
            task10State.root.selectAll('.regression-line').remove();

            task10State.root.append('line')
                .attr('class', 'regression-line')
                .attr('x1', task10State.xScale(xMin))
                .attr('y1', task10State.yScale(yForMin))
                .attr('x2', task10State.xScale(xMax))
                .attr('y2', task10State.yScale(yForMax))
                .attr('stroke', 'rgba(34,34,34,0.8)')
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '4 3');
        }
    } catch (e) {
        console.warn('Regression failed for Task10', e);
    }
}

function handleTask10MouseEnter(event, d) {
    d3.select(this)
        .raise()
        .transition()
        .duration(180)
        .attr('r', 8)
        .attr('stroke', 'var(--text-main)')
        .attr('stroke-width', 1.5)
        .attr('opacity', 1);

    task10State.tooltip
        .style('display', 'block')
        .style('opacity', 1)
        .html(`Ngày: <strong>${formatTask10Date(d)}</strong><br/>Nhiệt độ: <strong>${formatTask10Value(d.temp)}°C</strong><br/>UV: <strong>${formatTask10Value(d.uv)}</strong>`);
}

function handleTask10MouseMove(event) {
    task10State.tooltip
        .style('left', `${event.clientX + 8}px`)
        .style('top', `${event.clientY - 18}px`);
}

function handleTask10MouseLeave(event, d) {
    d3.select(this)
        .transition()
        .duration(180)
        .attr('r', 5)
        .attr('stroke', 'var(--chart-amber)')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);

    task10State.tooltip
        .style('opacity', 0)
        .style('display', 'none');

    applyTask10BrushSelection(task10State.brushedSelection);
}

function handleTask10Brush(event) {
    task10State.brushedSelection = event.selection;
    applyTask10BrushSelection(event.selection);
}

function clearTask10Brush() {
    task10State.brushedSelection = null;
    task10State.brushLayer.call(task10State.brush.move, null);
    applyTask10BrushSelection(null);
}

function applyTask10BrushSelection(selection) {
    const points = task10State.pointsLayer.selectAll('circle.point');

    if (!selection) {
        points.transition().duration(200)
            .attr('opacity', 0.6)
            .attr('fill', 'var(--chart-amber)')
            .attr('stroke', 'var(--chart-amber)');
        return;
    }

    const [[x0, y0], [x1, y1]] = selection;

    points.transition().duration(200)
        .attr('opacity', d => {
            const cx = task10State.xScale(d.temp);
            const cy = task10State.yScale(d.uv);
            const inside = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            return inside ? 0.8 : 0.1;
        })
        .attr('fill', d => {
            const cx = task10State.xScale(d.temp);
            const cy = task10State.yScale(d.uv);
            const inside = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            return inside ? 'var(--chart-amber)' : 'var(--border-color)';
        })
        .attr('stroke', d => {
            const cx = task10State.xScale(d.temp);
            const cy = task10State.yScale(d.uv);
            const inside = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            return inside ? 'var(--chart-amber)' : 'var(--border-color)';
        });
}

function formatTask10Date(d) {
    if (d._task10Date) return d3.timeFormat('%d-%m-%Y')(d._task10Date);
    return d.date || d.time || 'Không rõ';
}

function formatTask10Value(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(1) : '--';
}

document.addEventListener('dataChanged', function (event) {
    updateScatterChart(event.detail?.data || []);
});

if (window.globalWeatherRecords && window.globalWeatherRecords.length) {
    updateScatterChart(window.globalWeatherRecords);
}