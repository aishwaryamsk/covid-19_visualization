const linesColorScale = d3.scaleOrdinal()
    .range(["#3EB0E1", "#EA5F5F"]);
var highlightedState;
const lineOpacity = 0.5;
const legendWidth = 200;
var stateAbbrev = {};
var dailyData;
var line;

loadData();
function loadData() {
    Promise.all([
        d3.csv("covid_states_data.csv"),
        d3.csv("US_state_names.csv"),
    ]).then(function (dataset) {
        d3.select("#legend").attr("height", 280).attr("width", legendWidth);
        dailyData = parsedailyData(dataset[0]);
        var totalData = parseTotalData(dataset[0]);
        var stateData = parseBarData(dataset[0]);
        dataset[1].forEach(d => {
            stateAbbrev[d.state] = d.name;
        });
        plotBubbleChart(totalData);
        plotLineChart(dailyData);
        plotBarChart(stateData, totalData);
    });

}

function plotBubbleChart(data) {
    var titleHt = document.getElementById('title').offsetHeight;

    const margin = { top: 30, right: 30, bottom: 50, left: 100 },
        width = ((window.innerWidth - legendWidth - 10) / 2) - margin.left - margin.right,
        height = (window.innerHeight - titleHt) / 2 - margin.top - margin.bottom;

    const bubbleSVG = d3.select("#bubble");
    const bubbleG = bubbleSVG
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    var states = Object.keys(data);
    var maxHospitalized = d3.max(states, function (d) { return data[d].hospitalizedCurrently; });

    const colorScaleHosipitalized = d3.scaleLinear()
        .domain([0, maxHospitalized])
        .range(['#E1D7FF', '#7346F5'])

    // x axis
    const x = d3.scaleLinear()
        .domain([0, d3.max(states, function (d) { return data[d].death; })])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(states, function (d) { return data[d].positive; })])
        .range([height, 0]);

    const sizeScale = d3.scaleSqrt()
        .domain([0, maxHospitalized])
        .range([0, 20]);

    bubbleG.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr("transform", d => `translate(-5, 0) rotate(-45)`)
        .attr("text-anchor", "end");

    bubbleG.append("g")
        .call(d3.axisLeft(y));

    // Add circles
    bubbleG.append('g')
        .selectAll(".bubble")
        .data(states)
        .join("circle")
        .attr("id", d => `circle-${d}`)
        .attr("class", "bubble")
        .attr("cx", d => x(data[d].death))
        .attr("cy", d => y(data[d].positive))
        .attr("r", 5)
        .attr("r", d => sizeScale(data[d].hospitalizedCurrently))
        .style("fill", d => colorScaleHosipitalized(data[d].hospitalizedCurrently))
        .style("opacity", 0.7)
        .attr("stroke", "black")
        .style("stroke-width", 0)
        .on("mouseover", function (e, d) {
            handleHighlight(d);
        })
        .on("mouseout", function (d) {
            unHighlight(highlightedState);
            highlightedState = undefined;
        });

    bubbleG.selectAll(".states")
        .data(states)
        .join("text")
        .attr("class", "states")
        .attr("x", d => x(data[d].death))
        .attr("y", d => y(data[d].positive)) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function (d) {
            if (d == "TX" || d == "CA")
                return "#F1F1F1";
            else return "#616060";
        })
        .text(function (d) { return d })
        .attr("text-anchor", "middle")
        .style("alignment-baseline", "middle")
        .style("font-weight", "500")
        .style("font-size", function (d) {
            if (data[d].hospitalizedCurrently > 500000) {
                return 7;
            } else return 0;
        });

    // add axis labels
    bubbleSVG.append('text')
        .attr('x', margin.left + (width / 2))
        .attr('y', height + margin.top + 50)
        .text('Cumulative Death')
        .attr('text-anchor', 'middle')
        .style("font-size", 13);

    bubbleSVG.append('text')
        .attr('transform', `translate(${(margin.left / 2) - 20}, ${(height + margin.top + margin.bottom) / 2}) rotate(${-90})`)
        .text('Cumulative Positive Cases')
        .attr('text-anchor', 'middle')
        .style("font-size", 13);

    // add legend
    var legendValues = [Math.round(maxHospitalized / 8), maxHospitalized / 2, maxHospitalized];
    var colorValues = [{ color: '#E1D7FF', value: 0 }, { color: '#7346F5', value: maxHospitalized }];
    addCircleLegend('#legend', legendValues, sizeScale);
    addRectangleLegend('#legend', colorValues);
}

function plotLineChart(data) {
    var titleHt = document.getElementById('title').offsetHeight;
    const margin = { top: 10, right: 10, bottom: 40, left: 60 },
        width = ((window.innerWidth - legendWidth - 10) / 2) - margin.left - margin.right,
        height = (window.innerHeight - titleHt) / 2 - margin.top - margin.bottom;

    const attrs = ["Cumulative Positive Cases", "Cumulative Death",];
    linesColorScale.domain(attrs);

    const lineSVG = d3.select("#line").attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const lineG = d3.select("#lines")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis --> it is a date format
    const x = d3.scaleTime()
        .domain([new Date('1/13/2020'), new Date('3/7/2021')])
        .range([0, width]);

    var formatTime = d3.timeFormat("%b %Y");
    lineG.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(formatTime))
        .selectAll('text')
        .attr("transform", d => `translate(-5, 0) rotate(-45)`)
        .attr("text-anchor", "end");

    const maxPositiveCases = d3.max(Object.keys(data), function (elm) {
        return d3.max(data[elm][0].values, d => d.count);
    });
    // Add Y axis
    const y = d3.scaleLog()
        .domain([1, maxPositiveCases])
        .range([height, 0])
        .nice();

    lineG.append("g")
        .call(d3.axisLeft(y));

    line = d3.line()
        .x(function (d) { return x(d.date) })
        .y(function (d) { return y(d.count) });
    /* .curve(d3.curveStepBefore); */

    /*  var line = d3.area()
         .x(function (d) { return x(d.date) })
         .y0(y(1))
         .y1(d => y(d.count))
         .curve(d3.curveStepBefore); */

    // Add the line
    lineG
        .selectAll('.path')
        .data(Object.keys(data))
        .join("path")
        .attr("id", d => `path-${d}`)
        .attr('class', 'path')
        .attr("fill", "none")
        .style("opacity", lineOpacity)
        .attr("stroke", d => linesColorScale(data[d][0].field))
        .attr("stroke-width", 2)
        .attr("d", d => line(data[d][0].values))
        .on("mouseover", function (e, d) {
            handleHighlight(d);
        })
        .on("mouseout", function (d) {
            unHighlight(highlightedState);
            highlightedState = undefined;
        });

    // add axis labels
    lineG.append('text')
        .attr('transform', `translate(${- 40}, ${(height + margin.top + margin.bottom) / 2}) rotate(${-90})`)
        .text('Cumulative Cases (Log Scale)')
        .attr('text-anchor', 'middle')
        .style("font-size", 13);

    // add legend
    var legend = d3.select('#legend').append("g").attr("transform", `translate(${20},${90})`);
    addSquareBoxesLegend(legend, attrs, 100, linesColorScale);
}

function plotAuxillrairyLines(state) {
    // add path for number of deaths
    d3.select("#lines").selectAll('.auxilliary-paths')
        .data(dailyData[state].slice(-1))
        .join("path")
        .attr("id", d => `auxilliary-path-${state}`)
        .attr('class', 'auxilliary-paths')
        .attr("fill", "none")
        .attr("stroke", d => linesColorScale(d.field))
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 1")
        .attr("d", d => line(d.values));
}

function plotBarChart(data, totalData) {
    var titleHt = document.getElementById('title').offsetHeight;
    const margin = { top: 10, right: 90, bottom: 40, left: 100 },
        width = window.innerWidth - margin.left - margin.right,
        height = (window.innerHeight - titleHt) / 2 - margin.top - margin.bottom;

    const subgroups = data.columns.slice(1);
    const linesColorScale = d3.scaleOrdinal()
        .domain(subgroups)
        .range(['#EAC566', '#D16499']);

    const barSVG = d3.select("#bar");

    const barG = barSVG
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const stackedData = d3.stack()
        .keys(subgroups)
        (data);

    // Add X axis
    const x = d3.scaleBand()
        .domain(data.map(d => (d.state))) // List of groups = value of the first column
        .range([0, width])
        .padding([0.2]);

    barG.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .attr("class", "bar-labels")
        .attr("fill", function (d, i) {
            var stateData = stackedData[0][i].data;
            if (stateData.onVentilatorCumulative === 0 || stateData.inIcuCumulative === 0)
                return "grey";
            else return "black";
        })
        .on("mouseover", function (e, d) {
            handleHighlight(d);
        })
        .on("mouseout", function (d) {
            unHighlight(highlightedState);
            highlightedState = undefined;
        });

    // Add Y axis
    const y = d3.scaleLinear()
        .domain([0, 700000])
        .range([height, 0]);

    barG.append("g")
        .call(d3.axisLeft(y));

    // Show the bars
    var stackedGroups = barG.append("g")
        .selectAll(".bar")
        // Enter in the stack data = loop key per key = group per group
        .data(stackedData)
        .join("g")
        .attr("id", (d, i) => `bar-${i}`)
        .attr('class', 'bar')
        .attr("fill", d => linesColorScale(d.key));



    stackedGroups.selectAll("rect")
        // enter a second time = loop subgroup per subgroup to add all rectangles
        .data(d => d)
        .join("rect")
        .attr("class", (d, i) => d.data.state)
        .attr("x", d => x(d.data.state))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("stroke", "black")
        .attr("stroke-width", 0)
        .on("mouseover", function (e, d) {
            if (d.data !== undefined) {
                handleHighlight(d.data.state);
            }
        })
        .on("mouseout", function () {
            unHighlight(highlightedState);
            highlightedState = undefined;
        });

    // Add lines to show death per state
    barG.append('g')
        .selectAll('.num-dead-line')
        .data(Object.keys(totalData))
        .join("line")
        .attr('class', 'num-dead-line')
        .attr("x1", d => x(d))
        .attr("x2", d => x(d) + x.bandwidth())
        .attr("y1", d => y(totalData[d].death))
        .attr("y2", d => y(totalData[d].death))
        .attr("stroke", "black")
        .attr("stroke-dasharray", "4 2");




    // add axis labels
    barSVG.append('text')
        .attr('transform', `translate(${(margin.left / 2) - 20}, ${(height + margin.top + margin.bottom) / 2}) rotate(${- 90})`)
        .text('Cumulative Hospitalized')
        .attr('text-anchor', 'middle')
        .style("font-size", 13);

    // add comment
    barSVG.append('text')
        .attr('transform', `translate(${width + margin.left}, ${margin.top + 180})`)
        .text('*Limited data available')
        .attr('text-anchor', 'middle')
        .attr('fill', '#9A9A9A')
        .attr('font-style', 'italic')
        .style("font-size", 11);

    // add state title in center
    barSVG.append("text")
        .attr("id", "state")
        .attr("transform", `translate(${window.innerWidth / 2},${margin.top + 15})`)
        .attr("text-anchor", "middle");

    // add legend
    var legend = d3.select("#bar-legend").append("g").attr("transform", `translate(${width + 20}, ${margin.top})`);
    addSquareBoxesLegend(legend, ['Cumulative in ICU', 'Cumulative in Ventilators'], 50, linesColorScale, ['Cumulative Death']);
}

function handleHighlight(d) {
    if (highlightedState === undefined) {
        highlight(d);
    } else if (d !== highlightedState) {
        unHighlight(highlightedState);
        highlight(d);
        highlightedState = d;
    }
}

function highlight(state) {
    // highlight circle
    d3.select(`#circle-${state}`).style("stroke-width", 1.5);
    // highlight line
    highlightedState = state;
    d3.selectAll(`.path`).style("opacity", 0.2);
    var path = d3.select(`#path-${state}`);
    path.style("opacity", "1").attr("stroke", "#3E75E1");
    path.raise();
    // highlight auxilliary lines
    plotAuxillrairyLines(state);
    // highlight bar
    d3.select('#bar').selectAll(`.${state}`).style("stroke-width", 1);
    // update state
    updateState(state);
}

function unHighlight(state) {
    // unhighlight circle
    d3.select(`#circle-${state}`).style("stroke-width", 0);
    // unhighlight line
    highlightedState = state;
    d3.selectAll(`.path`).style("opacity", lineOpacity);
    d3.select(`#path-${state}`).attr("stroke", "#3EB0E1");
    // unhighlight bar
    d3.select('#bar').selectAll(`.${state}`).style("stroke-width", 0);
    // unhighlight auxilliary lines
    d3.select(`#auxilliary-path-${state}`).remove();
    // update state
    updateState('');
}

function updateState(state) {
    d3.select("#state")
        .text(stateAbbrev[state])
        .attr("font-size", "30px");
}

function parseTotalData(dataset) {
    var totalData = {};
    for (var i = 0; i < dataset.length; i++) {
        var d = dataset[i];

        if (totalData[d.state] === undefined) { // get the max for all for all states
            totalData[d.state] = { positive: 0, death: 0, hospitalizedCumulative: 0, hospitalizedCurrently: 0 };
        }
        if (totalData[d.state].positive == 0) {
            totalData[d.state].positive = +d.positive;
        }
        if (totalData[d.state].death == 0) {
            totalData[d.state].death = +d.death;
        }
        if (totalData[d.state].hospitalizedCumulative == 0) {
            totalData[d.state].hospitalizedCumulative = +d.hospitalizedCumulative;
        }
        totalData[d.state].hospitalizedCurrently += +d.hospitalizedCurrently;
    }
    return totalData;
}

function parseBarData(dataset) {
    var totalData = {};
    for (var i = 0; i < dataset.length; i++) {
        var d = dataset[i];
        if (!Object.keys(totalData).includes(d.state)) {
            totalData[d.state] = [{ field: 'Cumulative On ICU', value: 0 }, { field: 'Cumulative On Ventilator', value: 0 }];
        }
        if (+d.inIcuCurrently !== 0)
            totalData[d.state][0].value += +d.inIcuCurrently;

        if (+d.onVentilatorCurrently !== 0)
            totalData[d.state][1].value += +d.onVentilatorCurrently;
    }
    var stateData = [];
    for (var elm of Object.keys(totalData)) {
        stateData.push({
            state: elm,
            inIcuCumulative: totalData[elm][0].value,
            onVentilatorCumulative: totalData[elm][1].value
        });
    }
    stateData.columns = ['state', 'inIcuCumulative', 'onVentilatorCumulative'];
    return stateData;
}

function parsedailyData(dataset) {
    var dailyData = {};
    for (var i = 0; i < dataset.length; i++) {
        var d = dataset[i];
        if (!Object.keys(dailyData).includes(d.state)) {
            dailyData[d.state] = [{ field: 'Cumulative Positive Cases', values: [] }, { field: 'Cumulative Death', values: [] }];
        }
        // update array: take the last number for the end of week
        if (+d.positive !== 0)
            dailyData[d.state][0].values.push({ date: new Date(d.date), count: +d.positive });

        /* if (+d.recovered !== 0)
            dailyData[d.state][1].values.push({ date: new Date(d.date), count: +d.recovered });

        if (+d.hospitalizedCumulative !== 0)
            dailyData[d.state][2].values.push({ date: new Date(d.date), count: +d.hospitalizedCumulative }); */

        if (+d.death !== 0)
            dailyData[d.state][1].values.push({ date: new Date(d.date), count: +d.death });

    }
    return dailyData;
}

function addRectangleLegend(id, data) {
    var x = 40;
    var y = 110;
    var legend = d3.select(id).append("g").attr("transform", `translate(${x}, ${y})`);
    var extent = d3.extent(data, d => d.value);

    var padding = 9;
    var width = 140;
    var innerWidth = width - (padding * 2);
    var barHeight = 10;
    var xTicks = [0, extent[1] / 2, extent[1]];

    var xScale = d3.scaleLinear()
        .range([0, innerWidth])
        .domain(extent);

    var xAxis = d3.axisBottom(xScale)
        .tickSize(barHeight / 2)
        .tickValues(xTicks);

    var defs = d3.select('#bubble').append("defs");
    var linearGradient = defs.append("linearGradient").attr("id", "myGradient");
    linearGradient.selectAll("stop")
        .data(data)
        .enter().append("stop")
        .attr("offset", d => ((d.value - extent[0]) / (extent[1] - extent[0]) * 100) + "%")
        .attr("stop-color", d => d.color);

    legend.append("rect")
        .attr("width", innerWidth)
        .attr("height", barHeight)
        .style("fill", "url(#myGradient)")
        .style("opacity", 0.7);

    legend.append("g")
        .attr('transform', `translate(0, ${barHeight})`)
        .call(xAxis)
        .select(".domain")
        .remove();
}

function addCircleLegend(id, values, scale) {
    var x = 80;
    var y = 80;
    var legend = d3.select(id).append("g").attr("transform", `translate(${x}, ${y})`);
    var textPadding = 50;

    // circles
    legend.selectAll(".legend-circle")
        .data(values)
        .join('circle')
        .attr('class', 'legend-circle')
        .attr('cx', 0)
        .attr('cy', d => - Math.abs(scale(d)))
        .attr('r', d => Math.abs(scale(d)))
        .attr('fill', 'none')
        .attr('stroke', '#7346F5')
        .style('opacity', 0.9);

    // lines
    legend.append('g')
        .selectAll('.values-labels')
        .data(values)
        .join('line')
        .attr('class', 'values-labels')
        .attr('x1', 0)
        .attr('x2', Math.abs(scale(Math.max(Math.abs(values[0]), Math.abs(values.slice(-1))))) + 14)
        .attr('y1', d => - 2 * Math.abs(scale(d)))
        .attr('y2', d => - 2 * Math.abs(scale(d)))
        .style('stroke', 'grey')
        .style('stroke-dasharray', ('2,2'));

    // legend labels from values
    legend.append('g')
        .selectAll('.text-labels')
        .data(values)
        .join('text')
        .attr('class', 'text-labels')
        .attr('x', Math.abs(scale(Math.max(Math.abs(values[0]), Math.abs(values.slice(-1))))) + 14 + textPadding)
        .attr('y', d => (- 2 * Math.abs(scale(d))) + 4)
        .attr('shape-rendering', 'crispEdges')
        .style('text-anchor', 'end')
        .style('fill', 'black')
        .attr('font-size', 9)
        .text(d => d.toLocaleString());

    // title
    legend.append('g')
        .selectAll('text')
        .data(values)
        .join('text')
        .attr('x', 25)
        .attr('y', 20)
        .attr('font-size', 12)
        .style('text-anchor', 'middle')
        .text('Cumulative Hospitalized')
        .style('fill', '#7346F5');
}

function addSquareBoxesLegend(legend, titles, y, linesColorScale, lineTitle) {
    var size = 12;
    //var y = 90;
    legend.selectAll(".square")
        .data(titles)
        .join("rect")
        .attr("class", "square")
        .attr("x", 0)
        .attr("y", function (d, i) { return (y - 5) + i * (size + 12) }) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("width", size)
        .attr("height", size)
        .style("fill", function (d) { return linesColorScale(d) });

    // Add one dot in the legend for each name.
    let allTitles = lineTitle !== undefined ? titles.concat(lineTitle) : titles;
    legend.selectAll(".labels")
        .data(allTitles)
        .join("text")
        .attr("class", "labels")
        .attr("x", 17)
        .attr("y", function (d, i) { return y + i * 25 }) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function (d) { if (lineTitle && lineTitle.includes(d)) return "grey"; return linesColorScale(d); })
        .text(function (d) { return d })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .style("font-weight", "500")
        .style("font-size", 11);

    // Add dotted lines
    if (lineTitle !== undefined)
        legend.append("line")
            .attr("x1", 0)
            .attr("x2", size)
            .attr("y1", (y) + titles.length * (size + 12))
            .attr("y2", (y) + titles.length * (size + 12))
            .attr("stroke", "black")
            .attr("stroke-dasharray", "4 2");
}