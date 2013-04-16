NodeUpdateRenderer = function(syncDashboard) {

	var getWorstStatus = function(monitorStatuses) {
		var worstMonitorStatus = "";
		$.each(monitorStatuses, function(i, monitor) {
			if (monitor.status == "MAINT" || worstMonitorStatus == "MAINT") {
				worstMonitorStatus = "MAINT";
			} else if (monitor.status == "CRIT" || worstMonitorStatus == "CRIT") {
				worstMonitorStatus = "CRIT";
			} else if (monitor.status == "WARN" || worstMonitorStatus == "WARN") {
				worstMonitorStatus = "WARN";
			} else if (monitor.status == "UNKNOWN" || worstMonitorStatus == "UNKNOWN") {
				worstMonitorStatus = "UNKNOWN";
			} else if (monitor.status == "OK" || worstMonitorStatus == "OK") {
				worstMonitorStatus = "OK";
			}
		});
		return worstMonitorStatus;
	};

	setInterval(function() {
		d3.selectAll("circle").each(function(d) {
			var circle = $(this);
			if (d.elementId) {
				$.get("/api/v1/elements/" + d.elementId + "/status", function(data) {
					circle.attr("stroke", getColour(data.status));
					var worstStatus = getWorstStatus(data.monitorStatus);
					circle.attr("fill", getColour(worstStatus));
				});
			} else if (d.groupId) {
				$.get("/api/v1/groups/" + d.groupId + "/status", function(data) {
					var worstElementStatus = getWorstStatus(data.elementStatus);
					circle.attr("stroke", getColour(worstElementStatus));
					var worstMonitorStatus = getWorstStatus(data.monitorStatus);
					circle.attr("fill", getColour(worstMonitorStatus));
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

	this.redraw = function(systems) {
		if (systems == null) {
			return;
		}

		var svg = d3.select("svg");
		var systemsAsArray = $.map(systems, function(value, key) {
			return value;
		});
		var circles = svg.selectAll("circle").data(systemsAsArray, function(d) {
			return d.d3Id;
		});
		var newSystems = circles.enter().append("circle");

		newSystems.attr("class", "mapNode editable").attr("cx", function(d) {
			return d.xRatio + "%";
		}).attr("cy", function(d) {
			return d.yRatio + "%";
		}).attr("r", "15px").attr("stroke", function(d) {
			return getColour(d.elementStatus);
		}).attr("stroke-width", 8).attr("fill", function(d) {
			return getColour(d.worstMonitorStatus);
		}).on("mouseover", function(d) {
			var div = d3.select("#systemTooltip");

			div.transition().duration(200).style("opacity", 1);
			var offset = $(this).offset();
			div.html(d.name).style("left", offset.left + 40 + "px").style("top", offset.top - 30 + "px");
		}).on("mouseout", function() {
			var div = d3.select("#systemTooltip");
			div.transition().style("opacity", 0);
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

};
