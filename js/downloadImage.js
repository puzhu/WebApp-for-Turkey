d3.select("#saveMapButton").on("click", function(){
  saveSvgAsPng(document.getElementById("mapSvg"), "map.png")
  saveSvgAsPng(document.getElementById("legendSvg"), "legend.png")
});


d3.select("#saveChartButton").on("click", function(){
  saveSvgAsPng(document.getElementById("barSvg"), "barChart.png")
});
