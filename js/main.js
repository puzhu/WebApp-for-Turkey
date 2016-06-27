/*
#################################################
SECTION 1: ADDING ALL THE HELPER FUNCTIONS
To-Dos: 1. Use gulp to setup the require functionality of node to load a helper file separately
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
		var tempVal = Math.round(min * .95 + (((max * 1.05) - (min * .95)) * (i / 5)))
		bounds.push(tempVal);
		// bounds.push(min+(((100.01)-(min))*(i/5)));
	}
	// bounds = [20,40,60,80,100.01]
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
	SECTION 3.1: SETTING UP THE GLOBAL VARIABLES AND DRAWING AREAS FOR THE MAP
	To-Dos: 1.
	#################################################
	*/
	//Setting global plotting variables
	var colorArray = ['rgb(234,232,240)','rgb(189,201,225)','rgb(116,169,207)','rgb(43,140,190)','rgb(4,90,141)'];
	var color = d3.scale.threshold()
				.range(colorArray);

	//Create map the canvas
  var mapContainerSize = d3.select('#mapContainer').node().getBoundingClientRect()
  var mapMargin = {top: 10, right: 10, bottom: 10, left: 10};
  var mapWidth = mapContainerSize.width - mapMargin.right - mapMargin.left; //Chart width
  var mapHeight = mapContainerSize.height - mapMargin.top - mapMargin.bottom; //Chart height

  var map = d3.select('#mapContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
      .attr({
        height: mapHeight + mapMargin.top + mapMargin.bottom,
        width: mapWidth + mapMargin.left + mapMargin.right
      })
      .attr("id", "mapSvg")
      .append("g")
      .attr("transform", "translate(" + (mapMargin.left) + "," + (mapMargin.top)+ ")")//moving the origin to the point where it starts

	//Set the map projection and call it
	var mapScale;
	if (window.innerWidth > 768){
		mapScale = 750
	} else{
		mapScale = 500
	}
  var mapProjection = d3.geo.mercator()
    .center([19.5,72.2])
    .scale(mapScale)
    .rotate([0,0,5.5])
    .translate([mapWidth/2, mapHeight/2]);

  var mapPath = d3.geo.path()
    .projection(mapProjection);

	//Create the map tool tip
  var mapTip = d3.tip()
    .attr('class', 'd3-tip')
		.attr('id', 'popUp')
    .offset([10, 5])
      .direction('e')
      .html(function(d) {return "<strong>Region:</strong> <span style='color:silver'>" + d.properties.name + "</span>" + "<br>" +
        "<strong>Value:</strong> <span style='color:silver'>" + d.properties.value + "</span>" })

	// Setting the default region for the bar chart as Turkey
	var defaultRegion = "TR"

	var legendContainerSize = d3.select('#legend').node().getBoundingClientRect()
	var rectWidth = legendContainerSize.width/color.range().length
	var rectHeight = legendContainerSize.height/2;
	var legend = d3.select('#legend').append('svg')
		.attr({
						height: legendContainerSize.height,
						width: legendContainerSize.width
					})
		.attr("id", "legendSvg");
	/*
	#################################################
	SECTION 3.2: SETTING UP THE GLOBAL VARIABLES AND DRAWING AREAS FOR THE BAR CHART
	To-Dos: 1.
	#################################################
	*/
	//Create the bar chart canvas
  var panelContainerSize = d3.select('#panelContainer').node().getBoundingClientRect();
  var panelMargin = {top: 20, right: 20, bottom: 20, left: 260};//large left margin for labels
  var panelWidth = panelContainerSize.width - panelMargin.right - panelMargin.left; //Chart width
  var panelHeight = panelContainerSize.height - panelMargin.top - panelMargin.bottom; //Chart height
  var panel = d3.select('#panelContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
      .attr({
        height: panelHeight + panelMargin.top + panelMargin.bottom,
        width: panelWidth + panelMargin.left + panelMargin.right
      })
			.attr("id", "barSvg")
      .append('g')
      .attr("transform", "translate("+ panelMargin.left +"," + (panelMargin.top)+ ")");

	// X Scale and x axis for the bar chart. The domains are set within each function
	var xScale = d3.scale.linear() //the xScale is set based on the values of the indicator
		.range([0, panelWidth]);

	var xAxis = d3.svg.axis()
    .orient('bottom')

	// Aesthetics of the bar chart
	var barWidth = 16;
	var barPadding = 2;//padding between bars
	var categoryPadding = 8;//padding between the main category sections
	var mainCategoryPosition = 0; //the loop updates this value based on number of subCategories in previos

	/*
	#################################################
	SECTION 3.3: DRAW THE DEFAULT VIEW
	To-Dos: 1.
	#################################################
	*/

	//Draw the map
	drawMap(mapFile, nutsData);

	//Draw the bar Chart
	drawBarChart(nutsData, groups, defaultRegion);

	/*
	#################################################
	SECTION 3.4: REDRAW BASED ON LISTENERS
	To-Dos: 1.
	#################################################
	*/
	// Redraw the map based on the radio button
	$('input:radio').on('click', function(e) {
		mapFile = setMapFile(mapFile1, mapFile2, mapFile3);
		redrawMap(mapFile, nutsData, 2);
		document.getElementById('nuts').innerHTML = "Nuts " + Number($("input[type='radio'][name='mapLevel']:checked").val());
	});

	//2. Redraw map and panel based on new indiator
	d3.select('#indicatorList').on('change.line', function(d) {
		//reset the radio button
		$('input[type="radio"][name="mapLevel"][value='+'2'+']').prop('checked',true)

		//redraw map and bar chart
		redrawMap(mapFile2, nutsData, 2);
		redrawBarChart(nutsData, groups, defaultRegion) //region is reset to the national level (so clicked or hovered regions are wiped)
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
			redrawMap(mapFile, nutsData, 2);
			redrawBarChart(nutsData, groups, defaultRegion)
		})
	})

	/*
	#################################################
	SECTION 3.4: DEFINE MOUSEOVER FUNCTIONS
	To-Dos: 1.
	#################################################
	*/
	// Mouse interactions on map
	function mouseoverRegion(d) {
		var hoverRegion = d.properties.adminLevel;
		redrawBarChart(nutsData, groups, hoverRegion);
		mapTip.show(d);
		d3.select('.nuts-boundary#'+hoverRegion).classed('hover', true).moveToFront();
		document.getElementById('regionName').innerHTML = d.properties.name + " region";
	}
	function mouseoutRegion(d) {
		var hoverRegion = d.properties.adminLevel;
		redrawBarChart(nutsData, groups, defaultRegion);
		mapTip.hide(d);
		d3.select('.nuts-boundary#'+hoverRegion).classed('hover', false);
		document.getElementById('regionName').innerHTML = "Turkey"
	}

	// Mouse interactionS on bar chart
	function mouseoverBar(d) {
		mapFile = setMapFile(mapFile1, mapFile2, mapFile3);
		redrawMap(mapFile, nutsData, d.groupID);
		d3.selectAll('.dots').filter(function(e) {return e.subGroup === d.subGroup}).style({stroke: 'darkred'}).style('stroke-width', '2px')
		d3.selectAll('.bar').filter(function(e) {return e.subGroup === d.subGroup}).style({fill: 'brown'})
		d3.selectAll('.subCatLabel').filter(function(e) {return e.subGroup === d.subGroup}).style({'font-weight': 'bold', 'font-size': '11px'})
		document.getElementById('group').innerHTML = d.subGroup;
		d3.selectAll('.barText').filter(function(e) {return e.subGroup === d.subGroup}).style('font-weight', 'bold')
	}
	//
	function mouseoutBar(d) {
		redrawMap(mapFile, nutsData, 2);
		d3.selectAll('.dots').filter(function(e) {return e.subGroup === d.subGroup}).style({stroke: 'darkblue'}).style('stroke-width', '2px')
		d3.selectAll('.bar').filter(function(e) {return e.subGroup === d.subGroup}).style({fill: 'steelblue'})
		d3.selectAll('.subCatLabel').filter(function(e) {return e.subGroup === d.subGroup}).style({'font-weight': 'normal', 'font-size': '11px'})
		d3.selectAll('.barText').filter(function(e) {return e.subGroup === d.subGroup}).style('font-weight', 'normal')
		document.getElementById('group').innerHTML = "ALL";
	}
	/*
	#################################################
	SECTION 3.5: THE DRAW MAP FUNCTION
	To-Dos: 1.
	#################################################
	*/
	function drawMap(mapFile, nutsData){
	  //Set the domains and ranges
	  var filteredData = dataFilter(nutsData, true, 2) //mapOrPanel is set to trues

	  var max = d3.max(filteredData, function(d){return d.value;});
	  var min = d3.min(filteredData, function(d){return d.value;});
	  var bounds = setBins(max,min);
		//set the domain for the color scale
		color.domain(bounds);


	  //Getting the map data ready
	  // var mapFile = mapFile2 //hardoded to use the nuts2 level as the default
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

		drawMapLegend(bounds);
	}

	/*
	#################################################
	SECTION 4: DRAWING THE MAP LEGEND
	To-Dos: 1: Prettify the legend by making it smaller
	#################################################
	*/
	function drawMapLegend(bounds){
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

	  var legendText = bounds;
		legend.append('g')
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
	To-Dos: 1.
	#################################################
	*/
	function drawBarChart(nutsData, groups, region){
	  //Set the initial values and create the initial grouped dataset
		var groupedData = groupData(nutsData, groups, region); //the default region is set to national ("TR") for panel view

	  //set the xScale and axis (Should be based on data)
	  var maxValue = d3.max(groupedData, function(d) {return d.value;}) * 1.05;
	  var minValue = d3.min(groupedData, function(d) {return d.value;}) * 0.95;
		xScale.domain([minValue, maxValue])
		var numberTicks = Math.floor((maxValue - minValue)/15);
	  xAxis.scale(xScale).ticks(numberTicks)

	  //draw the xAxis
	  panel.append('g')
	    .attr('class', 'xAxis')
	    .call(xAxis)
	    .attr('transform', 'translate(0,'+ (panelHeight) + ")")
	    .style('cursor', 'default');

	  //Drawing the bar chart
		/*Iterate through the main categories and use the count of subcategories to position the main category labels. The bar should look like it has distinct sections and should be easy to understand.*/
	  var mainCategories = uniq_fast(groupedData.map(function(d) {return d.mainGroup})).sort();

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
					});

			// Draw the dots and labels for the bar
			panel.append('g')
					.selectAll('.dots')
					.data(data)
					.enter().append('circle')
					.attr({
						cx: function(e){return xScale(e.value) + barWidth/2 + barPadding},
						cy: function(e, j) {return j * (barWidth + barPadding) + mainCategoryPosition + barWidth/2},
						r: barWidth/2,
						class: 'dots'
					});

			panel.append('g')
					.selectAll('.barText')
					.data(data)
					.enter().append('text')
					.text(function(e) {return e.value;})
					.attr({
						x: function(e){return xScale(e.value) + barWidth/2 + barPadding},
						y: function(e, j) {return j * (barWidth + barPadding) + mainCategoryPosition + barWidth/2},
						class: 'barText'
					});

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

			// Add invisible bars that cover the labels, the bars and the padding in between
			panel.append('g')
					.selectAll('.hoverRect')
					.data(data)
					.enter().append('rect')
					.attr({
						x: -panelMargin.left,
						y: function(e, j) {return j * (barWidth + barPadding) + mainCategoryPosition}, //
						width: function(e){return xScale(e.value) + panelMargin.left + barWidth},
						height: barWidth + barPadding,
						class: 'hoverRect'
					})
					.on('mouseover', mouseoverBar)
			    .on('mouseout', mouseoutBar);

			//update the main category position for next iteration with the height of the added bars
			mainCategoryPosition += subCategories.length * (barWidth + barPadding) + categoryPadding


		})

	}

	/*
	#################################################
	SECTION 6: REDRAW THE MAP
	To-Dos: 1.
	#################################################
	*/
	function redrawMap(mapFile, nutsData, groupID){//color, map, mapPath
	  filteredData = dataFilter(nutsData, true, groupID)

		var max = d3.max(filteredData, function(d){return d.value;});
	  var min = d3.min(filteredData, function(d){return d.value;});
	  var bounds = setBins(max,min);
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

		var legendText = bounds;
		d3.selectAll('.legendLabels').data(legendText)
				.text(function(d){return Math.ceil(d)})
	}

	/*
	#################################################
	SECTION 6: REDRAW THE BAR CHART
	To-Dos: 1.
	#################################################
	*/
	function redrawBarChart(nutsData, groups, region){
		//get the new data
		var groupedData = groupData(nutsData, groups, region);

		//set the xScale and axis (Should be based on data)
	  var maxValue = d3.max(groupedData, function(d) {return d.value;}) * 1.05;;
	  var minValue = d3.min(groupedData, function(d) {return d.value;}) * 0.95;
		xScale.domain([minValue, maxValue]);
		var numberTicks = Math.floor((maxValue - minValue)/15);
	  xAxis.scale(xScale).ticks(numberTicks);
		d3.selectAll('.xAxis')
				.transition().duration(200).ease("exp")
				.call(xAxis);

		d3.selectAll('.bar')
			.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
			.attr('width',function(d) {return xScale(d.value)});

		d3.selectAll('.dots')
			.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
			.attr('cx',function(d) {return xScale(d.value) + barWidth/2 + barPadding});

		d3.selectAll('.barText')
			.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
			.text(function(d) {return d.value;})
			.attr('x',function(d) {return xScale(d.value) + barWidth/2 + barPadding});

		d3.selectAll('.hoverRect')
			.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
			.attr('width',function(d) {return xScale(d.value) + panelMargin.left + barWidth})
			.on('mouseover', mouseoverBar)
			.on('mouseout', mouseoutBar)
	}


}
