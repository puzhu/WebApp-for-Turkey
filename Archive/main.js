 d3.selection.prototype.moveToFront = function() {
	return this.each(function(){
		this.parentNode.appendChild(this);
	});
};
//DATA PROCESSING FUNCTIONS
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

//HELPER FUNCTIONS
function deString(d) {
	if (d==="") {
		return NaN;
	} else {
		return +d;
	}
}
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
function setBins(max,min) {// calculates the bins for the color domain in the map
	var bounds = [];
	for (var i=1;i<=5;i++) { // create 5 equally sized bins between min*.95 and max*1.05
		// bounds.push(min*.95+(((max*1.05)-(min*.95))*(i/5)));
		bounds.push(min+(((100.01)-(min))*(i/5)));
	}
	bounds = [20,40,60,80,100.01]
	return bounds;
}
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

function draw(mapFile1, mapFile2, mapFile3, nutsData, groups, indicatorList) {
											//FIRST WE DRAW THE MAPS
	//HELPER FUNCTIONs
	//TO ADD INDICATOR DATA TO THE MAP
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
	//TO FILTER DATA DURING TRIGGER EVENTS
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
	//CREATE THE INDICATOR LIST TO POPULATE THE DROPDOWN MENU BASED ON CURRENT TAB
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
	generateDropDown(indicatorList, "Corruption") //topic is hardcoded currently, should be base on tab selected

	//CREATE THE CANVAS
	var mapContainerSize = d3.select('#mapContainer').node().getBoundingClientRect()
  	var mapMargin = {top: 0.008 * mapContainerSize.height , right: 0.008 * mapContainerSize.width, bottom: 0.008 * mapContainerSize.height, left: 0.008 * mapContainerSize.width};
  	var mapWidth = mapContainerSize.width - mapMargin.right - mapMargin.left; //Chart width
  	var mapHeight = mapContainerSize.height - mapMargin.top - mapMargin.bottom; //Chart height

  	var map = d3.select('#mapContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
        .attr({
          height: mapHeight + mapMargin.top + mapMargin.bottom,
          width: mapWidth + mapMargin.left + mapMargin.right
        })
        .attr("id", "mapSvg")
      	.attr("transform", "translate(" + (mapMargin.left) + "," + (mapMargin.top)+ ")")//moving the origin to the point where it starts
      	//.call(makeResponsiveMap)

    //SET THE DOMAINS AND RANGES
    var filteredData = dataFilter(nutsData, true, 2) //mapOrPanel is set to trues
	var max = 100.01;
	var min = 0;
	var bounds = setBins(max,min);

	var colorArray = ['rgb(241,238,246)','rgb(189,201,225)','rgb(116,169,207)','rgb(43,140,190)','rgb(4,90,141)']

	var color = d3.scale.threshold()
    	.domain(bounds)
    	.range(colorArray);

	//GETTING THE MAP DATA READY
	var mapFile = mapFile2 //hardoded to use the nuts2 level as the default
	var mapKey = Object.keys(mapFile.objects)//Pulls out the key associated with the map features
	var mapFeatures = topojson.feature(mapFile, mapFile.objects[mapKey]).features
	mapFeatures = addInditoMap(filteredData, mapFeatures)

	//SETTING THE MAP PROJECTION AND PATH
	var mapProjection = d3.geo.mercator()
		.center([19.5,72.7])
		.scale(550)
		.rotate([0,0,5.5])
		.translate([mapWidth/2,mapHeight/2]);

	var mapPath = d3.geo.path()
		.projection(mapProjection)

	//DEFINING TOOL-TIPS
    var mapTip = d3.tip()
    	.attr('class', 'd3-tip')
    	.offset([10, 5])
      	.direction('e')
      	.html(function(d) {return "<strong>Name:</strong> <span style='color:silver'>" + d.properties.name + "</span>" + "<br>" +
      		"<strong>Value:</strong> <span style='color:silver'>" + d.properties.value + "</span>" })

	//DRAWING THE MAP
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

	//DRAWING BOUNDARIES
	var countryBoundary = map.append('g').append('path')
		.datum(topojson.mesh(mapFile, mapFile.objects[mapKey], function(a, b) {return a === b}))
		.attr({
			d: mapPath,
			class: 'country-boundary'
		});

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

	//DRAW MAP LEGEND
	var legendContainerSize = d3.select('#legend').node().getBoundingClientRect()
	var rectWidth = legendContainerSize.width/color.range().length, rectHeight = legendContainerSize.height/2;

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

	//REDRAW FUNCTION
	function redrawMapNUTS(mapFile, nutsData, groupID){
		filteredData = dataFilter(nutsData, true, groupID)

		var max = 100.01;
		var min = 0;
		bounds = setBins(max,min);
		color.domain(bounds)


		mapKey = Object.keys(mapFile.objects)
		mapFeatures = topojson.feature(mapFile, mapFile.objects[mapKey]).features
		mapFeatures = addInditoMap(filteredData, mapFeatures)

		turkeyMap.remove()
		turkeyMap = map.append('g').selectAll('.turkeyMap') //the large map with zone boundaries
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

/**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**/

											//THE NEXT SECTION DRAWS THE SIDE PANEL
	//HELPER FUNCTION FOR GETTING DATA INTO GROUPS
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

	//GET THE DATA INTO THE DIFFERENT GROUPS (HORIZ LINES) FOR THE SIDE PANEL
	var defaultRegion = "TR"
	var groupedData = groupData(nutsData, groups, defaultRegion); //the default region is set to national ("TR") for panel view

	//GET THE CANVAS READY
	var panelContainerSize = d3.select('#panelContainer').node().getBoundingClientRect();
  	var panelMargin = {top: 0.08 * panelContainerSize.height , right: 0.08 * panelContainerSize.width, bottom: 0.008 * panelContainerSize.height, left: 0.2 * panelContainerSize.width};
  	var panelWidth = panelContainerSize.width - panelMargin.right - panelMargin.left; //Chart width
  	var panelHeight = panelContainerSize.height - panelMargin.top - panelMargin.bottom; //Chart height

  	var panel = d3.select('#panelContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
        .attr({
          height: panelHeight + panelMargin.top + panelMargin.bottom,
          width: panelWidth + panelMargin.left + panelMargin.right
        })
        .attr("id", "panelSvg")
      	.attr("transform", "translate(0," + (panelMargin.top)+ ")");//moving the origin to the point where it starts
      	//.call(makeResponsiveMap)

    //GET THE SCALES AND CHARTING FUNCTIONS READY
    var maxValue = 100;
    var minValue = 0;
    var xScale = d3.scale.linear() //the xScale is set based on the values of the indicator
    	.domain([minValue, maxValue])
    	.range([0, panelWidth]);

    //CREATE THE X-AXIS
    var numberTicks = Math.floor((maxValue - minValue)/15); //shared with the grid
    var xAxis = d3.svg.axis()
    	.scale(xScale)
    	.orient('bottom')
    	.ticks(numberTicks)

    var xAxisLine = panel.append('g')
    	.attr('class', 'xAxis')
    	.call(xAxis)
    	.attr('transform', 'translate(' + panelMargin.left + "," + (panelHeight + panelMargin.top/2) + ")")
    	.style('cursor', 'default')

    //TOOLTIP
    var barTip = d3.tip()
    	.attr('class', 'd3-tip')
    	.offset([0, 0])
      	.direction('w')
      	.html(function(e) {return "<strong>Name:</strong> <span style='color:silver'>" + e.subGroup + "</span>" + "<br>" +
      		"<strong>Value:</strong> <span style='color:silver'>" + e.value + "</span>" })

    function drawBars(groupedData) {
    	//DRAWING THE ELEMENTS
	    var mainCategories = uniq_fast(groupedData.map(function(d) {return d.mainGroup})).sort()
	    var barHeight = 9;
	    var barGap = 5;
	    var padding = 5;
	    var mainFont = 14;
	    var mainCategoryPosition = panelMargin.top

	    mainCategories.forEach(function(d, i) {
				// console.log(mainCategoryPosition - mainFont - padding, d);
	    	//Draw the main category Label
	    	panel.append('text')
	            .attr('class','catLabel')
		        .text(d)
		        .attr({
		        	x: 0, //1.25 * panelMargin.left,
		        	y: mainCategoryPosition - mainFont - padding
		        })
		        .style('font-size', mainFont + 'px')
		        .style('cursor', 'default');

	    	//Draw the sub category bars for the main category
	    	var data = groupedData.filter(function(e) {return e.mainGroup === d})
	    	panel.append('g')
	    		.selectAll('.bars')
	    		.data(data)
	    		.enter()
	    		.append('line')
	    		.attr({
	    			x1:0,
	    			x2:function(e) {return xScale(e.value)},
	    			y1:function(e, j) {return j * (barHeight + barGap) + barHeight/2},
	    			y2:function(e, j) {return j * (barHeight + barGap) + barHeight/2},
	    			class: 'bars',
	    			transform: 'translate(' + panelMargin.left + "," + mainCategoryPosition +')'
	    		})
	    		.style('stroke','rgb(200,200,200)')
	    		.style('stroke-width','1px')

	    	panel.append('g')
	    		.selectAll('.dots')
	    		.data(data)
	    		.enter()
	    		.append('circle')
	    		.attr({
	    			cx:function(e) {return xScale(e.value)},
	    			cy:function(e, j) {return j * (barHeight + barGap) + barHeight/2},
	    			class: 'dots',
	    			r:3,
	    			transform: 'translate(' + panelMargin.left + "," + mainCategoryPosition +')'
	    		})
	    		.style('fill','red')

	    	//Draw the sub labels
	    	var labels = uniq_fast(data.map(function(d) {return d.subGroup}))
	    	panel.append('g')
	    		.selectAll('.subLabels')
	    		.data(labels)
	    		.enter()
	    		.append('text')
	    		.attr({
	    			width: panelMargin.left,
	    			x: panelMargin.left - padding,
	    			y: function(e, j) {return j * (barHeight + barGap)},
	    			class: 'subLabels',
	    			transform: 'translate(0,' + mainCategoryPosition + ')'
	    		})
	    		.text(function(d) {return d})

	    	//Draw hover rectangles
	    	panel.append('g')
	    		.selectAll('.hoverRects')
	    		.data(data)
	    		.enter()
	    		.append('rect')
	    		.attr({
	    			x:0,
	    			y:function(e, j) {return j * (barHeight + barGap) + mainCategoryPosition},
	    			height: 1.6 * barHeight,
	    			width: panelWidth + panelMargin.left,
	    			class: 'hoverRects'
	    		})
	    		.style('cursor', 'default')
	    		.on('mouseover', mouseoverBar)
	    		.on('mouseout', mouseoutBar)
	    		.call(barTip);

	    	//update the Y position
	    	mainCategoryPosition += data.length * (barHeight + barGap) + (2 * mainFont)
	    })
		var textLabels = d3.selectAll('.subLabels')[0]
		for(i = 0; i < textLabels.length; i++) {
			if(textLabels[i].getBBox().width > panelMargin.left - padding) {
				var len = textLabels[i].innerHTML.length
				while(textLabels[i].getBBox().width > panelMargin.left - padding){
					len--
					textLabels[i].innerHTML = textLabels[i].innerHTML.substring(0, len) + "..."
				}
			}
		}
    }

    drawBars(groupedData)


    //REDRAW FUNCTION FOR THE PANEL
    function redrawPanel(nutsData, groups, region){
    	//get the new data
    	groupedData = groupData(nutsData, groups, region)

    	//update the chart
    	d3.selectAll('.bars')
    		.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
    		.attr('x2',function(d) {return xScale(d.value)})
    	d3.selectAll('.dots')
    		.data(groupedData, function(d) {return d.subGroup}) //use the subGroup value to match the bars
    		.attr('cx',function(d) {return xScale(d.value)})
    }

/**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**//**/


    									//LISTENERS FOR DIFFERENT TRIGGER EVENTS
	//1. CLICK ON THE RADIO BUTTONS: ONLY AFFECTS MAPS SINCE PANEL IS AFFECTED ONLY BY HOVER OR CLICK EVENTS ON MAP
	$('input:radio').on('click', function(e) {
		var nutsLevel = Number($("input[type='radio'][name='mapLevel']:checked").val())
		if (nutsLevel === 1) {
			mapFile = mapFile1
		} else if (nutsLevel === 2) {
			mapFile = mapFile2
		} else {
			mapFile = mapFile3
		}
		redrawMapNUTS(mapFile, nutsData, 2)
	});

	//2. A NEW INDICATOR SELECTION AFFECTS BOTH MAP AND PANEL
	d3.select('#indicatorList').on('change.line', function(d) {
		redrawMapNUTS(mapFile, nutsData, 2);
		redrawPanel(nutsData, groups, defaultRegion) //region is reset to the national level (so clicked or hovered regions are wiped)
    });

	//3. MOUSE-HOVER ON REGION
	function mouseoverRegion(d) {
		var hoverRegion = d.properties.adminLevel;
		console.log(nutsData)
		redrawPanel(nutsData, groups, hoverRegion)
		mapTip.show(d)
		d3.select('.nuts-boundary#'+hoverRegion).classed('hover', true).moveToFront()
	}
	function mouseoutRegion(d) {
		var hoverRegion = d.properties.adminLevel;
		redrawPanel(nutsData, groups, defaultRegion)
		mapTip.hide(d)
		d3.select('.nuts-boundary#'+hoverRegion).classed('hover', false)//.classed('.nuts-boundary', true)
	}

	//4. PANEL HOVER
	function mouseoverBar(d) {
		redrawMapNUTS(mapFile, nutsData, d.groupID)
		barTip.show(d)
		d3.selectAll('.dots').filter(function(e) {return e.subGroup === d.subGroup}).attr({r: 5})
		d3.selectAll('.subLabels').filter(function(e) {return e=== d.subGroup}).style('font-style', 'italic')
	}

	function mouseoutBar(d) {
		redrawMapNUTS(mapFile, nutsData, 2)
		barTip.hide(d)
		d3.selectAll('.dots').filter(function(e) {return e.subGroup === d.subGroup}).attr({r: 3})
		d3.selectAll('.subLabels').filter(function(e) {return e=== d.subGroup}).style('font-style', 'normal')
	}

	d3.selectAll('.tabLink').on('click', function(d) {
		var tab = this.innerHTML

		//update the dropdown based on new tab
		d3.selectAll('option').remove()
		generateDropDown(indicatorList, tab)

		//reset the radio button
		$('input[type="radio"][name="mapLevel"][value='+'2'+']').prop('checked',true)

		//reset the mapFile to NUTS2
		mapFile = mapFile2

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
			redrawMapNUTS(mapFile, nutsData, 2)
			redrawPanel(nutsData, groups, defaultRegion)
		})
	})
}
	//Test: Automatically center map
/*	http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
	var b = [], west, east, south, north, bWidth, bHeight;
	for(i = 0; i < mapFeatures.length; i++) {
		b.push(mapPath.bounds(mapFeatures[i]));
	}
	west = d3.max(b.map(function(d) {return d[0][0]}))
	east = d3.max(b.map(function(d) {return d[1][0]}))
	south = d3.max(b.map(function(d) {return d[0][1]}))
	north = d3.max(b.map(function(d) {return d[1][1]}))

	bWidth = Math.abs(east - west);
	bHeight = Math.abs(north - south);
	console.log(mapWidth, mapHeight, bWidth, bHeight)
	var s = 0.9/Math.max((bWidth/mapWidth), (bHeight/mapHeight))
	var t = [(mapWidth - (s * bWidth)) / 2, (mapHeight - (s * bHeight)) / 2]
	console.log(s, t)
	mapProjection
		.scale(s)
		.translate(t)*/
