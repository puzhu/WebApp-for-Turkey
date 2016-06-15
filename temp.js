function drawMap(mapFile1, mapFile2, mapFile3, nutsData){
  //Create the canvas
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
      //.call(makeResponsiveMap)

  //Set the domains and ranges
  var filteredData = dataFilter(nutsData, true, 2) //mapOrPanel is set to trues
  var max = 100.01;
  var min = 0;
  var bounds = setBins(max,min);

  var colorArray = ['rgb(241,238,246)','rgb(189,201,225)','rgb(116,169,207)','rgb(43,140,190)','rgb(4,90,141)']

  var color = d3.scale.threshold()
      .domain(bounds)
      .range(colorArray);

  //Getting the map data ready
  var mapFile = mapFile2 //hardoded to use the nuts2 level as the default
  var mapKey = Object.keys(mapFile.objects)//Pulls out the key associated with the map features
  var mapFeatures = topojson.feature(mapFile, mapFile.objects[mapKey]).features
  mapFeatures = addInditoMap(filteredData, mapFeatures)

  //Set the map projection and call it
  var mapProjection = d3.geo.mercator()
    .center([19.5,72.8])
    .scale(750)
    .rotate([0,0,5.5])
    .translate([mapWidth/2, mapHeight/2]);

  var mapPath = d3.geo.path()
    .projection(mapProjection)

  //Create the TOOL-TIPS
  var mapTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([10, 5])
      .direction('e')
      .html(function(d) {return "<strong>Name:</strong> <span style='color:silver'>" + d.properties.name + "</span>" + "<br>" +
        "<strong>Value:</strong> <span style='color:silver'>" + d.properties.value + "</span>" })

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
    // .on('mouseover', mouseoverRegion)
    // .on('mouseout', mouseoutRegion)
    // .call(mapTip);

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


function drawMapLegend(){
  var legendContainerSize = d3.select('#legend').node().getBoundingClientRect()
	var rectWidth = legendContainerSize.width/color.range().length
  var rectHeight = legendContainerSize.height/2;
      console.log(rectHeight, rectWidth)
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

function drawBarChart(nutsData, groups){
  //Set the initial values and create the initial grouped dataset
	var defaultRegion = "TR"
	var groupedData = groupData(nutsData, groups, defaultRegion); //the default region is set to national ("TR") for panel view

  var panelContainerSize = d3.select('#panelContainer').node().getBoundingClientRect();
  var panelMargin = {top: 20, right: 10, bottom: 20, left: 10};
  var panelWidth = panelContainerSize.width - panelMargin.right - panelMargin.left; //Chart width
  var panelHeight = panelContainerSize.height - panelMargin.top - panelMargin.bottom; //Chart height

  var panel = d3.select('#panelContainer').append('svg') //http://bl.ocks.org/mbostock/3019563
      .attr({
        height: panelHeight + panelMargin.top + panelMargin.bottom,
        width: panelWidth + panelMargin.left + panelMargin.right
      })
      .append('g')
      .attr("transform", "translate("+ panelMargin.left +"," + (panelMargin.top)+ ")");

  //set the xScale and axis
  var maxValue = 100;
  var minValue = 0;
  var xScale = d3.scale.linear() //the xScale is set based on the values of the indicator
  	.domain([minValue, maxValue])
  	.range([0, panelWidth]);

  var numberTicks = Math.floor((maxValue - minValue)/15); //shared with the grid
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom')
    .ticks(numberTicks)

  //draw the xAxis
  var xAxisLine = panel.append('g')
    .attr('class', 'xAxis')
    .call(xAxis)
    .attr('transform', 'translate(' + panelMargin.left + "," + (panelHeight + panelMargin.top/2) + ")")
    .style('cursor', 'default')


  //Create the TOOLTIP
  var barTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([0, 0])
      .direction('w')
      .html(function(e) {return "<strong>Name:</strong> <span style='color:silver'>" + e.subGroup + "</span>" + "<br>" +
        "<strong>Value:</strong> <span style='color:silver'>" + e.value + "</span>" })

  //DRAWING THE ELEMENTS
  var mainCategories = uniq_fast(groupedData.map(function(d) {return d.mainGroup})).sort()
  var barHeight = 9;
  var barGap = 5;
  var padding = 5;
  var mainFont = 14;
  var mainCategoryPosition = panelMargin.top

  mainCategories.forEach(function(d, i) {
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
