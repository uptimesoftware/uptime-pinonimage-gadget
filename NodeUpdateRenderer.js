NodeUpdateRenderer = function(syncDashboard) {

	var statusOrder = {
		'MAINT' : 4,
		'CRIT' : 3,
		'WARN' : 2,
		'UNKNOWN' : 1,
		'OK' : 0
	};

	var getStatusStats = function(statuses) {
		var stats = {
			worstStatus : "OK",
			counts : {
				'MAINT' : 0,
				'CRIT' : 0,
				'WARN' : 0,
				'UNKNOWN' : 0,
				'OK' : 0,
				total : 0
			}
		};
		$.each(statuses, function(i, status) {
			// TODO hidden and monitored filter?
			if (statusOrder[status.status] > statusOrder[stats.worstStatus]) {
				stats.worstStatus = status.status;
			}
			stats.counts[status.status]++;
			stats.counts.total++;
		});
		return stats;
	};

	setInterval(function() {
		d3.selectAll("circle.mapNode").each(function(d) {
			var circle = $(this);
			if (d.elementId) {
				$.get("/api/v1/elements/" + d.elementId + "/status", function(data) {
					circle.attr("stroke", getColour(data.status));
					var monitorStats = getStatusStats(data.monitorStatus);
					circle.attr("fill", getColour(monitorStats.worstStatus));
					d.monitorStatusCounts = monitorStats.counts;
				});
			} else if (d.groupId) {
				$.get("/api/v1/groups/" + d.groupId + "/status", function(data) {
					var elementStats = getStatusStats(data.elementStatus);
					circle.attr("stroke", getColour(elementStats.worstStatus));
					d.elementStatusCounts = elementStats.counts;
					var monitorStats = getStatusStats(data.monitorStatus);
					circle.attr("fill", getColour(monitorStats.worstStatus));
					d.monitorStatusCounts = monitorStats.counts;
				});
			}
		});
	}, 5000);

	var drag = d3.behavior.drag().origin(Object).on("dragstart", function(d) {
		if (!$('#wholeBoard').hasClass("editOn")) {
			return;
		}
		var div = d3.select("#systemTooltip");
		div.transition().duration(200).style("opacity", 0);
	}).on("drag", function(d) {
		if (!$('#wholeBoard').hasClass("editOn")) {
			return;
		}
		var boardOffset = $("#wholeBoard").offset();
		var x = d3.event.sourceEvent.pageX - boardOffset.left;
		var y = d3.event.sourceEvent.pageY - boardOffset.top;

		var xRatio = x * 100 / $("#wholeBoard").width();
		var yRatio = y * 100 / $("#wholeBoard").height();

		d3.select(this).attr("cx", xRatio + '%');
		d3.select(this).attr("cy", yRatio + '%');

		d.xRatio = xRatio;
		d.yRatio = yRatio;
	}).on("dragend", function() {
		if (!$('#wholeBoard').hasClass("editOn")) {
			return;
		}
		syncDashboard();
	});

	var getColour = function(status) {
		if (status == "OK") {
			return "green";
		}
		if (status == "MAINT") {
			return "blue";
		}
		if (status == "CRIT") {
			return "red";
		}
		if (status == "WARN") {
			return "yellow";
		}
		if (status == "UNKNOWN") {
			return "Gainsboro";
		}
		return "Gainsboro";
	};

	this.update = function(systems) {
		if (systems == null) {
			return;
		}

		var svg = d3.select("svg");
		var systemsAsArray = $.map(systems, function(value, key) {
			return value;
		});
		var circles = svg.selectAll("circle.mapNode").data(systemsAsArray, function(d) {
			return d.d3Id;
		});
		var newSystems = circles.enter().append("circle");

		newSystems.attr("class", "mapNode editable").attr("cx", function(d) {
			return d.xRatio + "%";
		}).attr("cy", function(d) {
			return d.yRatio + "%";
		}).attr("r", "15px").attr("stroke", function(d) {
			return getColour("UNKNOWN");
		}).attr("stroke-width", 8).attr("fill", function(d) {
			return getColour("UNKNOWN");
		}).on("mouseover", function(d) {
			if ($('#wholeBoard').hasClass("editOn")) {
				return;
			}
			var tooltip = d3.select("#systemTooltip");
			tooltip.style("opacity", 0).style("display", "inline");
			$("#systemTooltip").position({
				of : $(this),
				my : "left top",
				at : "right+40 bottom-10"
			});
			tooltip.select(".nodeName").text(d.name);
			if (d.elementStatusCounts) {
				var elementCounts = tooltip.select(".elementCounts");
				elementCounts.style("display", "block").selectAll("td.countValue").each(function() {
					var cell = $(this);
					cell.text(d.elementStatusCounts[cell.data('counttype')]);
				});
				elementCounts.select('.numElements').text(d.elementStatusCounts.total);
			} else {
				tooltip.select(".elementCounts").style("display", "none");
			}
			if (d.monitorStatusCounts) {
				var monitorCounts = tooltip.select(".monitorCounts");
				monitorCounts.style("display", "block").selectAll("td.countValue").each(function() {
					var cell = $(this);
					cell.text(d.monitorStatusCounts[cell.data('counttype')]);
				});
				monitorCounts.select('.numMonitors').text(d.monitorStatusCounts.total);
			} else {
				tooltip.select(".monitorCounts").style("display", "none");
			}
			tooltip.transition().duration(200).style("opacity", 1);
		}).on("mouseout", function() {
			var tooltip = d3.select("#systemTooltip");
			tooltip.transition().duration(200).style("opacity", 0).style("display", "none");
		}).on("click", function(d) {
			if (d3.select(this).classed("editOn")) {
				if (d3.event.button == 1) {
					// middle button
					$("#removeSystem-confirm").data("clickedSystem", this).dialog("open");
				}
			} else {
				window.top.location.href = d.pageToGoTo;
			}
			d3.event.stopPropagation();
		}).call(drag);

		circles.exit().remove();
	};

};
