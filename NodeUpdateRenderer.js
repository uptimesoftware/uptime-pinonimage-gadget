NodeUpdateRenderer = function(syncDashboard, getEditNodePropertiesDialog, removeSystem) {

	var self = this;
	var setIntervalId = null;

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
			if (status.isHidden || !status.isMonitored) {
				return;
			}
			if (statusOrder[status.status] > statusOrder[stats.worstStatus]) {
				stats.worstStatus = status.status;
			}
			stats.counts[status.status]++;
			stats.counts.total++;
		});
		return stats;
	};

	var renderSystemData = function() {
		d3.selectAll("circle.mapNode").each(function(d) {
			var circle = $(this);
			if (d.elementId) {
				$.ajax("/api/v1/elements/" + d.elementId + "/status", {
					cache : false
				}).done(function(data, textStatus, jqXHR) {
					circle.attr("stroke", getColour(data.status));
					var monitorStats = getStatusStats(data.monitorStatus);
					circle.attr("fill", getColour(monitorStats.worstStatus));
					circle.data("monitorStatusCounts", monitorStats.counts);
				}).fail(function(jqXHR, textStatus, errorThrown) {
					try {
						var uptimeError = $.parseJSON(jqXHR.responseText);
						if (uptimeError.error && uptimeError.error == "UT-1000") {
							removeSystem(circle.get(0));
						}
					} catch (e) {
						// ignore any other exceptions
					}
				});
			} else if (d.groupId) {
				$.ajax("/api/v1/groups/" + d.groupId + "/status", {
					cache : false
				}).done(function(data) {
					var elementStats = getStatusStats(data.elementStatus);
					circle.attr("stroke", getColour(elementStats.worstStatus));
					circle.data("elementStatusCounts", elementStats.counts);
					var monitorStats = getStatusStats(data.monitorStatus);
					circle.attr("fill", getColour(monitorStats.worstStatus));
					circle.data("monitorStatusCounts", monitorStats.counts);
				}).fail(function(jqXHR, textStatus, errorThrown) {
					try {
						var uptimeError = $.parseJSON(jqXHR.responseText);
						if (uptimeError.error && uptimeError.error == "UT-1002") {
							removeSystem(circle.get(0));
						}
					} catch (e) {
						// ignore any other exceptions
					}
				});
			}
		});
	};

	this.resetUpdateInterval = function(seconds) {
		if (setIntervalId != null) {
			clearInterval(setIntervalId);
		} else {
			renderSystemData();
		}
		setIntervalId = setInterval(renderSystemData, seconds * 1000);
	};

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
		self.hideEditMapNodeSelectedUi();
		var mapNode = d3.select(this);
		mapNode.classed("dragging", true);
		var boardOffset = $("#wholeBoard").offset();
		var x = d3.event.sourceEvent.pageX - boardOffset.left;
		var y = d3.event.sourceEvent.pageY - boardOffset.top;

		var xRatio = x * 100 / $("#wholeBoard").width();
		var yRatio = y * 100 / $("#wholeBoard").height();

		mapNode.attr("cx", xRatio + '%');
		mapNode.attr("cy", yRatio + '%');

		d.xRatio = xRatio;
		d.yRatio = yRatio;
	}).on("dragend", function() {
		if (!$('#wholeBoard').hasClass("editOn")) {
			return;
		}
		d3.select(this).classed("dragging", false);
		showEditMapNodeHoverUi(this);
		syncDashboard();
	});

	function Wobbler(dNode) {
		var domNode = dNode;
		var isRunning = false;
		var wobbleStoppedCallbacks = $.Callbacks();

		var makeTransform = function(scaleFactor) {
			return function(d, i) {
				var xScale = 1 + scaleFactor;
				var yScale = 1 - scaleFactor;
				var xTrans = this.cx.baseVal.value * -1 * (xScale - 1);
				var yTrans = this.cy.baseVal.value * -1 * (yScale - 1);
				return "translate(" + xTrans + "," + yTrans + ") scale(" + xScale + "," + yScale + ")";
			};
		};

		this.start = function() {
			isRunning = true;
			var self = this;
			if (!domNode || !$('#wholeBoard').hasClass("editOn")) {
				wobbleStoppedCallbacks.fire();
				isRunning = false;
				return;
			}
			d3.select(domNode).transition().duration(150).ease("cubic-out").attr("transform", makeTransform(0.05)).each(
					"end",
					function() {
						d3.select(this).transition().duration(300).attr("transform", makeTransform(-0.05)).each(
								"end",
								function() {
									d3.select(this).transition().duration(150).ease("cubic-in").attr("transform",
											makeTransform(0)).each("end", function() {
										self.start();
									});
								});
					});
		};

		this.clear = function() {
			domNode = null;
			if (!isRunning) {
				wobbleStoppedCallbacks.fire();
			}
		};

		this.addWobbleStoppedListener = wobbleStoppedCallbacks.add;
		this.removeWobbleStoppedListener = wobbleStoppedCallbacks.remove;
	}

	var attachWobbler = function(d, i) {
		if (!this.wobbler) {
			this.wobbler = new Wobbler(this);
		}
		this.wobbler.start();
	};

	var detachWobblerAndRemove = function(d, i) {
		if (this.wobbler) {
			var wobbler = this.wobbler;
			var domNode = this;
			wobbler.addWobbleStoppedListener(function() {
				delete domNode.wobbler;
				d3.select(domNode).remove();
			});
			wobbler.clear();
		} else {
			d3.select(this).remove();
		}
	};

	var getColour = function(status) {
		if (status == "OK") {
			return "#67B10B";
		}
		if (status == "MAINT") {
			return "#555B98";
		}
		if (status == "CRIT") {
			return "#B61211";
		}
		if (status == "WARN") {
			return "#DAD60B";
		}
		if (status == "UNKNOWN") {
			return "#E6E6E6";
		}
		return "#E6E6E6";
	};

	var showSystemTooltip = function(mapNode, systemDatum) {
		var tooltip = d3.select("#systemTooltip");
		tooltip.style("opacity", 0).style("display", "inline");
		var jqMapNode = $(mapNode);
		$("#systemTooltip").position({
			of : jqMapNode,
			my : "left top",
			at : "right+40 bottom-10"
		});
		tooltip.select(".nodeName").text(systemDatum.name);
		jqMapNodeData = jqMapNode.data();
		if (jqMapNodeData.elementStatusCounts) {
			var elementCounts = tooltip.select(".elementCounts");
			elementCounts.style("display", "block").selectAll("td.countValue").each(function() {
				var cell = $(this);
				cell.text(jqMapNodeData.elementStatusCounts[cell.data('counttype')]);
			});
			elementCounts.select('.numElements').text(jqMapNodeData.elementStatusCounts.total);
		} else {
			tooltip.select(".elementCounts").style("display", "none");
		}
		if (jqMapNodeData.monitorStatusCounts) {
			var monitorCounts = tooltip.select(".monitorCounts");
			monitorCounts.style("display", "block").selectAll("td.countValue").each(function() {
				var cell = $(this);
				cell.text(jqMapNodeData.monitorStatusCounts[cell.data('counttype')]);
			});
			monitorCounts.select('.numMonitors').text(jqMapNodeData.monitorStatusCounts.total);
		} else {
			tooltip.select(".monitorCounts").style("display", "none");
		}
		tooltip.transition().duration(200).style("opacity", 1);
	};

	var showEditMapNodeHoverUi = function(mapNodeDomElem) {
		var mapNode = d3.select(mapNodeDomElem);
		var mapNodeEditCircle = d3.select("svg circle.mapNodeEdit");
		if (mapNodeEditCircle.classed("selected")) {
			return;
		}
		mapNodeEditCircle.attr("cx", mapNode.attr("cx")).attr("cy", mapNode.attr("cy")).attr("r", 5).style("display", "inline")
				.transition().attr("r", 30).style("opacity", 100).delay(0).duration(500).ease("elastic");
	};

	var hideEditMapNodeHoverUi = function() {
		var mapNodeEditCircle = d3.select("svg circle.mapNodeEdit");
		if (mapNodeEditCircle.classed("selected")) {
			return;
		}
		mapNodeEditCircle.transition().delay(0).duration(250).attr("r", 5).style("opacity", "0").each("end", function() {
			d3.select(this).style("display", "none");
		});
	};

	var showEditMapNodeSelectedUi = function(mapNodeDomElem) {
		d3.selectAll("circle.mapNode").classed("selected", false);
		var mapNode = d3.select(mapNodeDomElem);
		mapNode.classed("selected", true);
		var mapNodeEditCircle = d3.select("svg circle.mapNodeEdit");
		var cx = mapNode.attr("cx");
		var cy = mapNode.attr("cy");
		mapNodeEditCircle.classed("selected", true).attr("cx", cx).attr("cy", cy).style("display", "inline");
		d3.selectAll("g.mapNodeAction").each(function() {
			var mapNodeAction = d3.select(this);
			mapNodeAction.style("display", "inline").style("opacity", 0).attr("transform", "translate(-10, -10)");
			var svg = mapNodeAction.select("svg");
			svg.attr("x", cx).attr("y", cy);
			if (mapNodeAction.classed("mapNodeProperties")) {
				mapNodeAction.on("click", function() {
					var nodeSettings = mapNode.datum();
					var editNodePropertiesDialog = getEditNodePropertiesDialog(nodeSettings, mapNodeDomElem);
					editNodePropertiesDialog.dialog("open");
					d3.event.stopPropagation();
				});
				mapNodeAction.transition().attr("transform", "translate(19, -29)").style("opacity", 1).delay(0).duration(250);
			}
			if (mapNodeAction.classed("mapNodeRemove")) {
				mapNodeAction.on("click", function() {
					$("#removeSystem-confirm").data("clickedSystem", mapNodeDomElem).dialog("open");
					d3.event.stopPropagation();
				});
				mapNodeAction.transition().attr("transform", "translate(19, 9)").style("opacity", 1).delay(0).duration(250);
			}
		});
	};

	this.hideEditMapNodeSelectedUi = function() {
		d3.selectAll("circle.mapNode").classed("selected", false);
		d3.selectAll("svg circle.mapNodeEdit").classed("selected", false).style("display", "none");
		d3.selectAll("g.mapNodeAction").each(function() {
			d3.select(this).style("display", "none");
		});
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

		var newSystemClasses = "mapNode editable";
		if ($('#wholeBoard').hasClass("editOn")) {
			newSystemClasses += " editOn";
		}
		newSystems.attr("class", newSystemClasses).attr("cx", function(d) {
			return d.xRatio + "%";
		}).attr("cy", function(d) {
			return d.yRatio + "%";
		}).attr("r", "15px").attr("stroke", function(d) {
			return getColour("UNKNOWN");
		}).attr("stroke-width", 8).attr("fill", function(d) {
			return getColour("UNKNOWN");
		}).on("mouseover", function(d) {
			if ($('#wholeBoard').hasClass("editOn")) {
				showEditMapNodeHoverUi(this);
				return;
			}
			showSystemTooltip(this, d);
		}).on("mouseout", function(d) {
			hideEditMapNodeHoverUi();
			var tooltip = d3.select("#systemTooltip");
			tooltip.transition().duration(200).style("opacity", 0).style("display", "none");
		}).on("click", function(d) {
			if (d3.select(this).classed("editOn")) {
				if (d3.event.button == 1) {
					// middle button
					$("#removeSystem-confirm").data("clickedSystem", this).dialog("open");
					d3.event.stopPropagation();
					return;
				}
				showEditMapNodeSelectedUi(this);
			} else {
				window.top.location.href = d.pageToGoTo;
			}
			d3.event.stopPropagation();
		}).call(drag).each(attachWobbler);

		circles.exit().each(detachWobblerAndRemove);
	};

};
