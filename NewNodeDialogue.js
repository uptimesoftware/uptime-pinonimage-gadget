NewNodeDialogue = function() {
	var availableGroups;
	var availableElements;

	$.ajax("/api/v1/groups", {
		cache : false,
		success : function(data, textStatus, jqXHR) {
			availableGroups = data;
			availableGroups.sort(sortByHostname("name"));
		}
	});

	$.ajax("/api/v1/elements", {
		cache : false,
		success : function(data, textStatus, jqXHR) {
			availableElements = data;
			availableElements.sort(sortByHostname("hostname"));
			populateNodeSelection($("input[name=nodeType]:checked"));
		}
	});

	var sortByHostname = function(attributeToSortBy) {
		return function(a, b) {
			var hostname1 = a[attributeToSortBy];
			var hostname2 = b[attributeToSortBy];
			return ((hostname1 < hostname2) ? -1 : ((hostname1 > hostname2) ? 1 : 0));
		};
	};

	var populateDashboardUrls = function(dashboardUrls){
		$(".DestinationSelectionOption").empty();
		$.each(dashboardUrls, function(index, value){
			$(".DestinationSelectionOption").append('<option value="'+ value.url + '">' + value.name+ '</option>');
		});
	};

	this.populateDropdowns = function() {
		uptimeGadget.listDashboards(populateDashboardUrls);
	};

	this.showDestinationSelection = function(event) {
		var target = $(event.target);
		if (target.prop("name") == "Page") {
			populateDestinationSelection(target);
		}

	};

	this.showNodeSelection = function(event) {
		var target = $(event.target);
		if (target.prop("name") == "nodeType") {
			populateNodeSelection($(target));
		}

	};

	this.openDialogue = function() {
		$("#createNode").dialog("open");

	};

	this.getNewSystem = function(mousePointer) {
		var xRatio = mousePointer.data("xRatio");
		var yRatio = mousePointer.data("yRatio");
		var systemInfo = getNewSystemInfo();
		var pageToGoTo = $(".DestinationSelectionOption option:selected");
		var newSystem = {
			"name" : systemInfo.name,
			"pageToGoTo" : pageToGoTo.val(),
			"xRatio" : xRatio,
			"yRatio" : yRatio
		};

		injectIdAttribute(newSystem, systemInfo);
		newSystem.d3Id = getD3Id(newSystem);
		return newSystem;
	};

	var injectIdAttribute = function(newSystem, systemInfo) {
		if (systemInfo.type == "element") {
			newSystem.elementId = systemInfo.id;
		} else if (systemInfo.type = "group") {
			newSystem.groupId = systemInfo.id;
		}
	};

	var getD3Id = function(system) {
		var elementPrefix = "1";
		var groupPrefix = "2";
		if (system.elementId) {
			return parseInt(elementPrefix + system.elementId);
		}
		if (system.groupId) {
			return parseInt(groupPrefix + system.groupId);
		}
	};

	var populateNodeSelection = function(radioSelected) {
		var nodeList = $("#nodeSelectOption");
		nodeList.empty();
		if (radioSelected.val() == "group") {
			$('availableGroups').each(function(i, group) {
				if (group.id != 1 && group.name != "My Infrastructure") {
					nodeList.append($("<option />").val(group.id).text(group.name));
				}

			});
		} else if (radioSelected.val() == "element") {
			$('availableElements').each(function(i, element) {
				nodeList.append($("<option />").val(element.id).text(element.hostname));
			});
		}

		$(".DestinationPageSection").toggle($("#nodeSelectOption option").length != 0);
		$("#noGroupMessage").toggle($("#nodeSelectOption option").length == 0);
	};

	var populateDestinationSelection = function(radioSelected) {
		var systemInfo = getNewSystemInfo();
		var elementUrls = uptimeGadget.getElementUrls(systemInfo.id, systemInfo.name);
		if (radioSelected.val() == "Profile Page") {
			populateProfileDestination(elementUrls);
		} else {
			uptimeGadget.listDashboards(populateDashboardUrls);
		}
	};

	var getNewSystemInfo = function() {
		var info = new Object();
		info.type = $("input[name=nodeType]:checked").val();
		info.id = $("#nodeSelectOption option:selected").val();
		info.name = $("#nodeSelectOption option:selected").text().trim();
		return info;
	};
	
	var populateProfileDestination = function(elementUrls) {
		$(".DestinationSelectionOption").empty();
		$(".DestinationSelectionOption").append('<option value="' + elementUrls.info + '">Info Page</option>');
		$(".DestinationSelectionOption").append('<option value="' + elementUrls.services + '">Services Page</option>');
		$(".DestinationSelectionOption").append('<option value="' + elementUrls.graphing + '">Graphing Page</option>');
	};

};
