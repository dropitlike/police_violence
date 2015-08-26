//# dc.js Getting Started and How-To Guide
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter */

// ### Create Chart Objects
// Create chart objects assocated with the container elements identified by the css selector.
// Note: It is often a good idea to have these objects accessible at the global scope so that they can be modified or filtered by other page controls.
var racesChart = dc.pieChart("#races-chart");
var agesChart = dc.barChart("#ages-chart");
var outcomesChart = dc.pieChart("#outcomes-chart");
var dayOfWeekChart = dc.rowChart("#day-of-week-chart");
//var yearlyBubbleChart = dc.bubbleChart("#yearly-bubble-chart");
var usChart = dc.geoChoroplethChart("#us-chart");

// ### Anchor Div for Charts
/*
// A div anchor that can be identified by id
    <div id="your-chart"></div>
// Title or anything you want to add above the chart
    <div id="chart"><span>Days by Gain or Loss</span></div>
// #### .turnOnControls()
// If a link with css class "reset" is present then the chart
// will automatically turn it on/off based on whether there is filter
// set on this chart (slice selection for pie chart and brush
// selection for bar chart)
     <div id="chart">
       <a class="reset" href="javascript:myChart.filterAll();dc.redrawAll();" style="display: none;">reset</a>
     </div>
// dc.js will also automatically inject applied current filter value into
// any html element with css class set to "filter"
    <div id="chart">
        <span class="reset" style="display: none;">Current filter: <span class="filter"></span></span>
    </div>
*/

//### Load your data
//Data can be loaded through regular means with your
//favorite javascript library
//
//```javascript
//d3.csv("data.csv", function(data) {...};
//d3.json("data.json", function(data) {...};
//jQuery.getJson("data.json", function(data){...});
//```
d3.tsv("responses.tsv", function (data) {
            /* since its a csv file we need to format the data a bit */
            var dateFormat = d3.time.format("%m/%d/%Y" );
            var numberFormat = d3.format("d");
            var line=0;
            var bad_indexes = [];
            var filtered_data = [];
            data.forEach(function (e, index, obj) {
                if (e.Age == ""){
                    e.Age = 0;
                } else {
                    e.Age = +e.Age;
                    var ageint = parseInt(e.Age + 0.5);
                    e.Age = ageint;
                }
                if (e.Age > 100 || e.Age < 1){
                    console.log("Age out of bounds at line " + line.toString() + " Date " + e.Date + " State " + e.State + " Age " + e.Age);
                }
                if (e.Date === ""){
                    console.log("Date missing at line " + line.toString() + " Date " + e.Date + " State " + e.State);
                    bad_indexes.push(index);
                } else {
                    e.index = index
                    e.dd = dateFormat.parse(e.Date);
                    if (e.dd.getFullYear() < 2011 || e.dd.getFullYear() > 2013){
                        console.log("Year out of range at line " + line.toString() + " Date " + e.Date + " State " + e.State);
                        bad_indexes.push(index);
                    } else {
                        e.month = d3.time.month(e.dd); // pre-calculate month for better performance
                        e.State = e.State.slice(0,2);
                        filtered_data.push(e);
                        line = line + 1;
                    }
                }
            });
            //bad_indexes.forEach( function (e){
            //    data.splice(e, 1);
            //});
            data = filtered_data;

            //### Create Crossfilter Dimensions and Groups
            //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
            var ndx = crossfilter(data);
            var all = ndx.groupAll();

            var states = ndx.dimension(function (d) {
                return d["State"];
            });
            var statesGroup = states.group();

            var ages = ndx.dimension (function (d) { return +d.Age;});
            var agesGroup = ages.group();

            var outcomes = ndx.dimension (function (d) { return d.Hit;});
            var outcomesGroup = outcomes.group();

            var races = ndx.dimension (function (d) { return d.Race;});
            var racesGroup = races.group();


            var dateDimension = ndx.dimension(function (d) {
                return d.dd;
            });




            var dayOfWeek = ndx.dimension(function (d) {
                //console.log(d);
                var day = d.dd.getDay();
                switch (day) {
                    case 0:
                        return "0.Sun";
                    case 1:
                        return "1.Mon";
                    case 2:
                        return "2.Tue";
                    case 3:
                        return "3.Wed";
                    case 4:
                        return "4.Thu";
                    case 5:
                        return "5.Fri";
                    case 6:
                        return "6.Sat";
                }
            });
            var dayOfWeekGroup = dayOfWeek.group();

            //### Define Chart Attributes
            //Define chart attributes using fluent methods. See the [dc API Reference](https://github.com/NickQiZhu/dc.js/blob/master/web/docs/api-1.6.0.md) for more information
            //
        d3.json("geo/us-states.json", function (statesJson) {
        //d3.json("geo/jsoncounties.min_.js", function (statesJson) {
            usChart.width(990)
                    .height(500)
                    .dimension(states)
                    //.dimension(counties)
                    .group(statesGroup)
                    .colors(["#ccc", "#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
                    .colorDomain([-5, 200])
                    .overlayGeoJson(statesJson.features, "state", function (d) {
                        return d.properties.name;
                    })
                    .on("filtered", getFiltersValues)
                    .title(function (d) {
                        return "State: " + d.key + "\nTotal violent incidents: " + (d.value ? d.value : 0);
                    });

         });


            // #### Pie/Donut Chart
            // Create a pie chart and use the given css selector as anchor. You can also specify
            // an optional chart group for this chart to be scoped within. When a chart belongs
            // to a specific group then any interaction with such chart will only trigger redraw
            // on other charts within the same chart group.

            racesChart
                    .width(180) // (optional) define chart width, :default = 200
                    .height(180) // (optional) define chart height, :default = 200
                    .radius(80) // define pie radius
                    .dimension(races) // set dimension
                    .group(racesGroup) // set group
                    .on("filtered", getFiltersValues)
                    /* (optional) by default pie chart will use group.key as it's label
                     * but you can overwrite it with a closure */
                    .label(function (d) {
                        if (racesChart.hasFilter() && !racesChart.hasFilter(d.key))
                            return d.key + "(0%)";
                        return d.key + "(" + Math.floor(d.value / all.value() * 100) + "%)";
                    }) /*
                    // (optional) whether chart should render labels, :default = true
                    .renderLabel(true)
                    // (optional) if inner radius is used then a donut chart will be generated instead of pie chart
                    .innerRadius(40)
                    // (optional) define chart transition duration, :default = 350
                    .transitionDuration(500)
                    // (optional) define color array for slices
                    .colors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
                    // (optional) define color domain to match your data domain if you want to bind data or color
                    .colorDomain([-1750, 1644])
                    // (optional) define color value accessor
                    .colorAccessor(function(d, i){return d.value;})
                    */;

            outcomesChart.width(180)
                    .height(180)
                    .radius(80)
                    .innerRadius(30)
                    .dimension(outcomes)
                    .group(outcomesGroup)
                    .on("filtered", getFiltersValues);

            dayOfWeekChart.width(180)
                    .height(180)
                    .margins({top: 20, left: 10, right: 10, bottom: 20})
                    .group(dayOfWeekGroup)
                    .dimension(dayOfWeek)
                    .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
                    .label(function (d) {
                        return d.key.split(".")[1];
                    })
                    .title(function (d) {
                        return d.value;
                    })
                    .on("filtered", getFiltersValues)
                    .elasticX(true)
                    .xAxis().ticks(4);

            agesChart.width(420)
                    .height(180)
                    .margins({top: 10, right: 50, bottom: 30, left: 40})
                    .dimension(ages)
                    .group(agesGroup)
                    .elasticY(true)
                    .centerBar(true)
                    .gap(1)
                    .round(dc.round.floor)
                    .alwaysUseRounding(true)
                    .x(d3.scale.linear().domain([1, 100]))
                    //.elasticX(true)
                    .renderHorizontalGridLines(true)
                    .filterPrinter(function (filters) {
                        var filter = filters[0], s = "";
                        s += parseInt(filter[0]) + " -> " + parseInt(filter[1]);
                        return s;
                    })
                    .on("filtered", getFiltersValues)
                    .xAxis()
                    .tickFormat(function (v) {
                        return v;
                    });




            dc.dataCount(".dc-data-count")
                    .dimension(ndx)
                    .group(all);

            dc.dataTable(".dc-data-table")
                    .dimension(dateDimension)
                    .group(function (d) {
                        var format = d3.format("02d");
                        return d.dd.getFullYear() + "/" + format((d.dd.getMonth() + 1));
                    })
                    .size(Infinity)
                    .columns([
                        function (d) {
                            return d.Date;
                        },
                        function (d) {
                            return d.Victim;
                        },
                        function (d) {
                            return "<a href=" + d.Link + ">" + d.Link + "</a>";
                        },
                        function (d) {
                            return d.index;
                        }
                    ])
                    .sortBy(function (d) {
                        return d.dd;
                    })
                    .order(d3.ascending)
                    .renderlet(function (table) {
                        table.selectAll(".dc-table-group").classed("info", true);
                    });
                

    function getFiltersValues() {
        //var ages = [];
        //var agesFilters = agesChart.filters();
        //if (agesFilters.length > 0){
        //    agesFilters[0].forEach(function (a) { ages.push(parseInt(a))});
        //}
        var filters = [
            { name: 'state', value: usChart.filters()},
            { name: 'race', value: racesChart.filters()},
            { name: 'outcome', value: outcomesChart.filters()},
            { name: 'dayofweek', value: dayOfWeekChart.filters()},
            { name: 'age', value: agesChart.filters()}];
            //{ name: 'age', value: [ages]}];
            
        var recursiveEncoded = $.param( filters );
        location.hash = recursiveEncoded;
    }
    // Init chart filters
    function initFilters() {
        // Get hash values
        var parseHash = /^#state=([A-Za-z0-9,_\.\-\/\s]*)&race=([A-Za-z0-9,_\.\-\/\s]*)&outcome=([A-Za-z0-9,_\.\-\/\s]*)&dayofweek=([A-Za-z0-9,_\.\-\/\s]*)&age=([A-Za-z0-9,_\.\-\/\s]*)$/;
        var parsed = parseHash.exec(decodeURIComponent(location.hash));
        function filter(chart, rank) {  // for instance chart = sector_chart and rank in URL hash = 1
            // sector chart
            if (parsed[rank] == "") {
                chart.filter(null);
                //chart.filterAll();
            }
            else {
                var filterValues = parsed[rank].split(",");
                if (rank === 5) { // ages chart takes a brush, not a simple filter.
                    for (var i = 0; i < filterValues.length-1; i+=2 ) {
                        //console.log(chart.filters());
                        chart.filter(dc.filters.RangedFilter(parseInt(filterValues[i],10), parseInt(filterValues[i+1],10)));
                        //console.log(chart.filters());
                    }
                } else {
                    for (var i = 0; i < filterValues.length; i++ ) {
                        chart.filter(filterValues[i]);
                    }
                }
            }
        }
        if (parsed) {
            filter(usChart, 1);
            filter(racesChart, 2);
            filter(outcomesChart, 3);
            filter(dayOfWeekChart, 4);
            filter(agesChart, 5);
        }
    }


            dc.renderAll();
            initFilters();
            dc.redrawAll();
});

// Determine the current version of dc with `dc.version`
d3.selectAll("#version").text(dc.version);
