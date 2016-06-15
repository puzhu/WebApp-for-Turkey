/*
#################################################
SECTION 1: ADDING ALL THE HELPER FUNCTIONS
#################################################
*/
//Move elements to the front
d3.selection.prototype.moveToFront = function() {
	return this.each(function(){
		this.parentNode.appendChild(this);
	});
};

//Data processing functions
function processData(data) {
	var array = {
		regionCode: data.regionCode,
		groupID: deString(data.groupID),
		indicatorID: deString(data.indicatorID),
		sampleSize: deString(data.N),
		value: deString(data.value)
	}
	return array
}

function processGroups(data) {
	var array = {
		mainGroup: data.mainGroup,
		groupID: deString(data.groupID),
		subGroup: data.subGroup,
		symbol: data.symbols,
		fontSize: data.fontSize
	}
	return array
}

function processIndicators(data) {
	var array = {
		topic: data.topic,
		indicator: data.indicator,
		indicatorID: deString(data.indicatorID)
	}
	return array
}

//Convert strings to numbers
function deString(d) {
	if (d==="") {
		return NaN;
	} else {
		return +d;
	}
}

//Wrap text to a particular width
function wrap(text, width) {
	text.each(function() {
	    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0, //<-- 0!
        lineHeight = 1.2, // ems
        x = text.attr("x"), //<-- include the x!
        y = text.attr("y"),
        dy = text.attr("dy") ? text.attr("dy") : 0; //<-- null check
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

//Separate into 5 bins given range
function setBins(max,min) {// calculates the bins for the color domain in the map
	var bounds = [];
	for (var i=1;i<=5;i++) { // create 5 equally sized bins between min*.95 and max*1.05
		// bounds.push(min*.95+(((max*1.05)-(min*.95))*(i/5)));
		bounds.push(min+(((100.01)-(min))*(i/5)));
	}
	bounds = [20,40,60,80,100.01]
	return bounds;
}

//Create a unique array
function uniq_fast(a) { // quickly drop duplicate values from an array
	var seen = {};
	var out = [];
	var len = a.length;
	var j = 0;
	for(var i = 0; i < len; i++) {
	   var item = a[i];
		if(seen[item] !== 1) {
		    seen[item] = 1;
		    out[j++] = item;
		}
	}
	return out;
}

//Add indicator data to the map
function addInditoMap(data, mapFeatures) {
	for (i = 0; i < data.length; i++) {
		var value = data[i].value;
		var regionCode = data[i].regionCode
		if(uniq_fast(mapFeatures.map(function(d) {return d.properties.adminLevel})).indexOf(regionCode) === -1) console.log(regionCode)
		var feature = mapFeatures.filter(function(d) { return d.properties.adminLevel === regionCode;})
		for(j = 0; j < feature.length; j++) {
			feature[j].properties.value = value;
		}
	}
	return mapFeatures;
}

//Filter data during trigger events
function dataFilter(nutsData, mapOrPanel, groupID) {//group is set to 2 for initial draw at national level for map hover/click select the appropriate regional id
		var sel = document.getElementById('indicatorList'); //selecting the default based on current input
		var currentIndicator = deString(sel.options[sel.selectedIndex].value)
		var nutsLevel = Number($("input[type='radio'][name='mapLevel']:checked").val())
		if (mapOrPanel) { //for map we need all the nuts regions data at the aggregated grouping
			return nutsData.filter(function(d) { return d.indicatorID === currentIndicator && d.regionCode.length === (nutsLevel + 2) && d.groupID === groupID})
		} else {// for panel we want disaggregated groups (so not 2) for one particular region selection with defaul of national
			return nutsData.filter(function(d) { return d.indicatorID === currentIndicator && d.groupID !== 2})//fixing this to 2 since for panel that is the only value we will be using to filter
		}
	}

//Populate the dropdown menu based on current topic tab
function generateDropDown(indicatorList, topic) {
	var indicators = indicatorList.filter(function(d) {return d.topic === topic})

	d3.select('#indicatorList')
		.selectAll('option')
		.data(indicators)
		.enter()
		.append('option')
		.attr('value', function(d) {return d.indicatorID})
		.text(function(d) {return d.indicator})
}

//Group the data based on region and groups
function groupData(nutsData, groups, region) { //region specifies the regional specification for the groups (so national or a particular hovered/clicked region)
	var data = dataFilter(nutsData, false, 2)
	var array = []
	groups.forEach(function(d) {
		var value = data.filter(function(e){return e.groupID === d.groupID && e.regionCode === region})[0].value
		array.push({
			mainGroup: d.mainGroup,
			subGroup: d.subGroup,
			groupID: d.groupID,
			value: value
		})
	})
	return array
};

// Set mapfile based on radio button
function setMapFile(mapFile1, mapFile2, mapFile3){
	var mapFile;
	var nutsLevel = Number($("input[type='radio'][name='mapLevel']:checked").val())
	if (nutsLevel === 1) {
		mapFile = mapFile1
	} else if (nutsLevel === 2) {
		mapFile = mapFile2
	} else {
		mapFile = mapFile3
	}
	return mapFile;
}

/*
#################################################
SECTION 2: LOADING THE DATA FILES AND PROCESSING THEM
#################################################
*/
queue()
	.defer(d3.json, "maps/nuts1.json") //the zone map
	.defer(d3.json, "maps/nuts2.json")
	.defer(d3.json, "maps/nuts3.json")
	.defer(d3.csv, "data/nutsDataCorruption.csv", processData)
	.defer(d3.csv, "data/groups.csv", processGroups)
	.defer(d3.csv, "data/indicators.csv", processIndicators)
	.await(ready);

function ready(error, mapFile1, mapFile2, mapFile3, nutsData, groups, indicators){
	draw(mapFile1, mapFile2, mapFile3, nutsData, groups, indicators)
}

/*
#################################################
SECTION 3: CREATING THE DATA VISUALIZATIONS
#################################################
*/

function draw(mapFile1, mapFile2, mapFile3, nutsData, groups, indicatorList){

	generateDropDown(indicatorList, "Corruption") //generate the dropdown menu
	mapFile = setMapFile(mapFile1, mapFile2, mapFile3);
	/*
	#################################################
	SECTION 3.1: SETTING UP THE GLOBAL VARIABLES AND DRAWING AREAS
	To-Dos: 1.
	#################################################
	*/
	//Setting global plotting variables
	var colorArray = ['rgb(241,238,246)','rgb(189,201,225)','rgb(116,169,207)','rgb(43,140,190)','rgb(4,90,141)'];
	var color = d3.scale.threshold()
				.range(colorArray);

	//Create map the canvas
  var mapContainerSize = d3.select('#mapContainer').node().getBoundingClientRect()
  var mapMargin = {top: 20, right: 10, bottom: 20, left: 10};
  var mapWidth = mapContainerSize.width - mapMargin.right - mapMargin.left; //Chart width
  var mapHeight = mapContainerSize.height - mapMargin.top - mapMargin.bottom; //Chart height

  var map = d3.select('#mapContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
      .attr({
        height: mapHeight + mapMargin.top + mapMargin.bottom,
        width: mapWidth + mapMargin.left + mapMargin.right
      })
      // .attr("id", "mapSvg")
      .append("g")
      .attr("transform", "translate(" + (mapMargin.left) + "," + (mapMargin.top)+ ")")//moving the origin to the point where it starts

	//Set the map projection and call it
  var mapProjection = d3.geo.mercator()
    .center([19.5,72.8])
    .scale(750)
    .rotate([0,0,5.5])
    .translate([mapWidth/2, mapHeight/2]);

  var mapPath = d3.geo.path()
    .projection(mapProjection);

	//Create the map tool tip
  var mapTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([10, 5])
      .direction('e')
      .html(function(d) {return "<strong>Name:</strong> <span style='color:silver'>" + d.properties.name + "</span>" + "<br>" +
        "<strong>Value:</strong> <span style='color:silver'>" + d.properties.value + "</span>" })

	// Setting the default region for the bar chart as Turkey
	var defaultRegion = "TR"
	//Create the bar chart canvas
  var panelContainerSize = d3.select('#panelContainer').node().getBoundingClientRect();
  var panelMargin = {top: 20, right: 40, bottom: 20, left: 200};//large left margin for labels
  var panelWidth = panelContainerSize.width - panelMargin.right - panelMargin.left; //Chart width
  var panelHeight = panelContainerSize.height - panelMargin.top - panelMargin.bottom; //Chart height
  var panel = d3.select('#panelContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
      .attr({
        height: panelHeight + panelMargin.top + panelMargin.bottom,
        width: panelWidth + panelMargin.left + panelMargin.right
      })
      .append('g')
      .attr("transform", "translate("+ panelMargin.left +"," + (panelMargin.top)+ ")");

	// X Scale and x axis for the bar chart. The domains are set within each function
	var xScale = d3.scale.linear() //the xScale is set based on the values of the indicator
		.range([0, panelWidth]);


	var xAxis = d3.svg.axis()
    .orient('bottom')

	// var barTip = d3.tip()
	// 	.attr('class', 'd3-tip')
	// 	.offset([0, 0])
	// 		.direction('w')
	// 		.html(function(e) {return "<strong>Name:</strong> <span style='color:silver'>" + e.subGroup + "</span>" + "<br>" +
	// 			"<strong>Value:</strong> <span style='color:silver'>" + e.value + "</span>" })

	/*
	#################################################
	SECTION 3.2: DRAW THE DEFAULT VIEW
	To-Dos: 1.
	#################################################
	*/

	//Draw the map
	drawMap(mapFile, nutsData, color, map, mapPath);

	//Draw the legend
	drawMapLegend(color);

	//Draw the bar Chart
	drawBarChart(nutsData, groups, panelMargin, panelWidth, panelHeight, panel, defaultRegion, xScale, xAxis);

	/*
	#################################################
	SECTION 3: REDRAW BASED ON LISTENERS
	To-Dos: 1.
	#################################################
	*/
	// Redraw the map based on the radio button
	$('input:radio').on('click', function(e) {
		mapFile = setMapFile(mapFile1, mapFile2, mapFile3);
		redrawMap(mapFile, nutsData, 2, color, map, mapPath, defaultRegion);
	});

	//2. Redraw map and panel based on new indiator
	d3.select('#indicatorList').on('change.line', function(d) {
		//reset the radio button
		$('input[type="radio"][name="mapLevel"][value='+'2'+']').prop('checked',true)

		//redraw map and bar chart
		redrawMap(mapFile2, nutsData, 2, color, map, mapPath, defaultRegion);
		redrawBarChart(nutsData, groups, defaultRegion, xScale, xAxis) //region is reset to the national level (so clicked or hovered regions are wiped)
    });

	//3. Change tabs
	d3.selectAll('.tabLink').on('click', function(d) {
		var tab = this.innerHTML

		//update the dropdown based on new tab
		d3.selectAll('option').remove()
		generateDropDown(indicatorList, tab)

		//reset the radio button and the map file
		$('input[type="radio"][name="mapLevel"][value='+'2'+']').prop('checked',true)
		mapFile = setMapFile(mapFile1, mapFile2, mapFile3);

		//load the new data and redraw map and chart
		var pathName = "data/nutsData"+tab+".csv"
		d3.csv(pathName, function(error, nutsDataNew){
			nutsDataNew.forEach(function(e){
				e.regionCode = e.regionCode;
				e.groupID = deString(e.groupID);
				e.indicatorID = deString(e.indicatorID),
				e.sampleSize = deString(e.N),
				e.value = deString(e.value)
			})
			nutsData = nutsDataNew

			//redraw map and bar chart
			redrawMap(mapFile, nutsData, 2, color, map, mapPath, defaultRegion);
			redrawBarChart(nutsData, groups, defaultRegion, xScale, xAxis)
		})
	})

	/*
	#################################################
	SECTION 3: THE DRAW MAP FUNCTION
	To-Dos: 1. Play around with the projection to change the orientation of the map
					2. Experiment with a new color scheme
	#################################################
	*/
	function drawMap(mapFile2, nutsData, color, map, mapPath){
	  //Set the domains and ranges
	  var filteredData = dataFilter(nutsData, true, 2) //mapOrPanel is set to trues
	  var max = 100.01;
	  var min = 0;
	  var bounds = setBins(max,min);

		//set the domain for the color scale
		color.domain(bounds);


	  //Getting the map data ready
	  var mapFile = mapFile2 //hardoded to use the nuts2 level as the default
	  var mapKey = Object.keys(mapFile.objects)//Pulls out the key associated with the map features
	  var mapFeatures = topojson.feature(mapFile, mapFile.objects[mapKey]).features
	  mapFeatures = addInditoMap(filteredData, mapFeatures)

	  //Draw the map
	  var turkeyMap = map.append('g').selectAll('.turkeyMap') //the large map with zone boundaries
	    .data(mapFeatures)
	    .enter()
	    .append('path')
	    .attr({
	      d: mapPath,
	      'class': 'turkeyMap',
	      fill: function (d) {return color(d.properties.value)}
	    })
	    .style('cursor', 'pointer')
	    .on('mouseover', mouseoverRegion)
	    .on('mouseout', mouseoutRegion)
	    .call(mapTip);

	  //Draw country boundary
	  var countryBoundary = map.append('g').append('path')
	    .datum(topojson.mesh(mapFile, mapFile.objects[mapKey], function(a, b) {return a === b}))
	    .attr({
	      d: mapPath,
	      class: 'country-boundary'
	    });

	  //Draw region boundary
	  var regionArray = uniq_fast(mapFeatures.map(function(d) {return d.properties.adminLevel}))
	  regionArray.forEach(function(d) {
	    map.append("path")
	      .datum(topojson.mesh(mapFile, mapFile.objects[mapKey], function(a, b) { return a.properties.adminLevel === d || b.properties.adminLevel === d;}))
	      .attr({
	        d: mapPath,
	        'class': 'nuts-boundary' //controls the fill in css
	      })
	      .attr("id",function(e) {return d});
	  });

	}

	/*
	#################################################
	SECTION 4: DRAWING THE MAP LEGEND
	To-Dos: 1: Prettify the legend by making it smaller
	#################################################
	*/
	function drawMapLegend(color){
	  var legendContainerSize = d3.select('#legend').node().getBoundingClientRect()
		var rectWidth = legendContainerSize.width/color.range().length
	  var rectHeight = legendContainerSize.height/2;
		var legend = d3.select('#legend').append('svg')
			.attr({
		          height: legendContainerSize.height,
		          width: legendContainerSize.width
		        })
		legend.append('g')
			.selectAll('rect')
			.data(color.range())
			.enter()
			.append('rect')
			.attr({
				x:function(d, i){return i * rectWidth},
				y: 0,
				height:rectHeight,
				width:rectWidth,
				fill: function(d){return d}
			})
			.style('stroke', 'white')
			.style('stroke-width', '0.6px')

	  var legendText = [20,40,60,80,100]
		var legendLabels = legend.append('g')
			.selectAll('.legendLabels')
			.data(legendText)
			.enter()
			.append('text')
			.text(function(d){return Math.ceil(d)})
			.attr({
				x:function(d,i){return (i+1) * rectWidth},
				y: rectHeight + 1,
				class: 'legendLabels'
			})
			.style('alignment-baseline', 'hanging')
	}

	/*
	#################################################
	SECTION 5: DRAWING THE BAR CHART
	To-Dos: 1. Make the axis data driven.
					2. Wrap and prettify the labels
	#################################################
	*/
	function drawBarChart(nutsData, groups, panelMargin, panelWidth, panelHeight, panel, region, xScale, xAxis){
	  //Set the initial values and create the initial grouped dataset
		var groupedData = groupData(nutsData, groups, region); //the default region is set to national ("TR") for panel view

	  //set the xScale and axis (Should be based on data)
	  var maxValue = 100;
	  var minValue = 0;
		xScale.domain([minValue, maxValue])
		var numberTicks = Math.floor((maxValue - minValue)/15);
	  xAxis.scale(xScale).ticks(numberTicks)

	  //draw the xAxis
	  var xAxisLine = panel.append('g')
	    .attr('class', 'xAxis')
	    .call(xAxis)
	    .attr('transform', 'translate(0,'+ (panelHeight) + ")")
	    .style('cursor', 'default')


	  //Create the TOOLTIP
	  // var barTip = d3.tip()
	  //   .attr('class', 'd3-tip')
	  //   .offset([0, 0])
	  //     .direction('w')
	  //     .html(function(e) {return "<strong>Name:</strong> <span style='color:silver'>" + e.subGroup + "</span>" + "<br>" +
	  //       "<strong>Value:</strong> <span style='color:silver'>" + e.value + "</span>" })

	  //Drawing the bar chart
		/*Iterate through the main categories and use the count of subcategories to position the main category labels. The bar should look like it has distinct sections and should be easy to understand.*/
	  var mainCategories = uniq_fast(groupedData.map(function(d) {return d.mainGroup})).sort()
	  var barWidth = 16;
	  var barPadding = 2;//padding between bars
	  var categoryPadding = 10;//padding between the main category sections
	  var mainCategoryPosition = 0; //the loop updates this value based on number of subCategories in previos

		mainCategories.forEach(function(d, i) {
			var data = groupedData.filter(function(e) {return e.mainGroup === d})
			var subCategories = uniq_fast(data.map(function(e) {return e.subGroup}))

			//Draw the main category Label
	    panel.append('text')
	        .attr('class','catLabel')
	        .text(d)
	        .attr({
	          x: -panelMargin.left, //use the large left margin for labels
	          y: mainCategoryPosition,
						height: barWidth,
						width: panelMargin.left
	        });
			// Update the main category position based on the font size of the last added category
			mainCategoryPosition += 16

			// Draw the bars
			panel.append('g')
					.selectAll(".bar")
					.data(data)
					.enter().append("rect")
					.attr("class", "bar")
					.attr({
						x: 0,
						y: function(e, j) {return j * (barWidth + barPadding) + mainCategoryPosition}, //
						width: function(e){return xScale(e.value)},
						height: barWidth
					})
					.on('mouseover', mouseoverBar)
			    .on('mouseout', mouseoutBar);
			// Draw the labels
			panel.append('g').selectAll('subCatLabel')
					.data(data)
					.enter().append('text')
					.text(function(e) {return e.subGroup})
					.attr('class', 'subCatLabel')
					.attr({
						x: -5,
						y: function(e, j){return mainCategoryPosition + j * (barWidth + barPadding)}
					})

			//update the main category position for next iteration with the height of the added bars
			mainCategoryPosition += subCategories.length * (barWidth + barPadding) + categoryPadding


		})

	}

	/*
	#################################################
	SECTION 6: REDRAW THE MAP
	To-Dos: 1. Make the axis data driven.
	#################################################
	*/
	function redrawMap(mapFile, nutsData, groupID, color, map, mapPath){
	  filteredData = dataFilter(nutsData, true, groupID)

	  var max = 100.01;
	  var min = 0;
	  bounds = setBins(max,min);
	  color.domain(bounds)

	  var mapKey = Object.keys(mapFile.objects)
	  var mapFeatures = topojson.feature(mapFile, mapFile.objects[mapKey]).features
	  var mapFeatures = addInditoMap(filteredData, mapFeatures)

	  // d3.selectAll('.turkeyMap').remove()
		var turkeyMap = map.append('g').selectAll('.turkeyMap') //the large map with zone boundaries
	    .data(mapFeatures)
	    .enter()
	    .append('path')
	    .attr({
	      d: mapPath,
	      'class': 'turkeyMap',
	      fill: function (d) {return color(d.properties.value)}
	    })
	    .style('cursor', 'pointer')
	    .on('mouseover', mouseoverRegion)
	    .on('mouseout', mouseoutRegion)
	    .call(mapTip);

	  d3.selectAll('.nuts-boundary').remove()
	  regionArray = uniq_fast(mapFeatures.map(function(d) {return d.properties.adminLevel}))
	  regionArray.forEach(function(d) {
	    map.append("path")
	      .datum(topojson.mesh(mapFile, mapFile.objects[mapKey], function(a, b) { return a.properties.adminLevel === d || b.properties.adminLevel === d;}))
	      .attr({
	        d: mapPath,
	        'class': 'nuts-boundary' //controls the fill in css
	      })
	      .attr("id",function(e) {return d});
	  });
	}

	/*
	#################################################
	SECTION 6: REDRAW THE BAR CHART
	To-Dos: 1. Make the axis data driven.
	#################################################
	*/
	function redrawBarChart(nutsData, groups, region, xScale, xAxis){
		//get the new data
		var groupedData = groupData(nutsData, groups, region)

		//set the xScale and axis (Should be based on data)
	  var maxValue = 100;
	  var minValue = 0;
		xScale.domain([minValue, maxValue]);
		var numberTicks = Math.floor((maxValue - minValue)/15);
	  xAxis.scale(xScale).ticks(numberTicks)

		d3.selectAll('.bar')
			.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
			.attr('width',function(d) {return xScale(d.value)})
			.on('mouseover', mouseoverBar)
			.on('mouseout', mouseoutBar);
	}

	/*
	#################################################
	SECTION 7: DEFINE MOUSEOVER FUNCTIONS
	To-Dos: 1.
	#################################################
	*/
	// Mouse interactions on map
	function mouseoverRegion(d) {
		var hoverRegion = d.properties.adminLevel;
		redrawBarChart(nutsData, groups, hoverRegion, xScale, xAxis)
		mapTip.show(d)
		d3.select('.nuts-boundary#'+hoverRegion).classed('hover', true).moveToFront()
	}
	function mouseoutRegion(d) {
		var hoverRegion = d.properties.adminLevel;

		redrawBarChart(nutsData, groups, defaultRegion, xScale, xAxis)
		mapTip.hide(d)
		d3.select('.nuts-boundary#'+hoverRegion).classed('hover', false)//.classed('.nuts-boundary', true)
	}

	// Mouse interactionS on bar chart
	function mouseoverBar(d) {
		mapFile = setMapFile(mapFile1, mapFile2, mapFile3)
		redrawMap(mapFile, nutsData, d.groupID, color, map, mapPath, defaultRegion)
		// barTip.show(d)
	}
	//
	function mouseoutBar(d) {
		redrawMap(mapFile, nutsData, 2, color, map, mapPath, defaultRegion)
	}
}
