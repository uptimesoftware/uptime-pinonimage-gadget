NewNodeDialog = function() {
	var availableGroups = {};
	var availableElements = {};

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

	var getSelectedSystemInfo = function() {
		var info = new Object();
		info.type = $("input[name=nodeType]:checked").val();
		info.id = $("#nodeSelect option:selected").val();
		info.name = $("#nodeSelect option:selected").text().trim();
		return info;
	};

	var populateProfileDestination = function(elementUrls) {
		$(".DestinationSelectionOption").empty();
		$(".DestinationSelectionOption").append('<option value="' + elementUrls.info + '">Info Page</option>');
		$(".DestinationSelectionOption").append('<option value="' + elementUrls.services + '">Services Page</option>');
		$(".DestinationSelectionOption").append('<option value="' + elementUrls.graphing + '">Graphing Page</option>');
	};

	var sortByHostname = function(attributeToSortBy) {
		return function(a, b) {
			var hostname1 = a[attributeToSortBy];
			var hostname2 = b[attributeToSortBy];
			return naturalSort(hostname1, hostname2);
		};
	};

	var populateDashboardUrls = function(dashboardUrls) {
		$(".DestinationSelectionOption").empty();
		$.each(dashboardUrls, function(index, value) {
			$(".DestinationSelectionOption").append('<option value="' + value.url + '">' + value.name + '</option>');
		});
	};

	this.populateDropdowns = function() {
		uptimeGadget.listDashboards(populateDashboardUrls);
	};

	this.showDestinationSelection = function(event) {
		var target = $(event.target);
		if (target.prop("name") == "PageType") {
			populateDestinationSelection(target);

		}
	};

	this.showNodeSelection = function(event) {
		var target = $(event.target);
		if (target.prop("name") == "nodeType") {
			populateNodeSelection(target);
			if (target.val() == "group") {
				$('#pageTypeDashboard').click();
				$('#pageTypeProfile').prop('disabled', true);
			} else {
				$('#pageTypeProfile').prop('disabled', false);
			}
		}
	};

	this.openDialog = function() {
		$("#mapNodeProperties").dialog("open");
	};

	this.getNewSystem = function(mousePointer) {
		var xRatio = mousePointer.data("xRatio");
		var yRatio = mousePointer.data("yRatio");
		var systemInfo = getSelectedSystemInfo();
		var pageType = $("input[name=PageType]:checked").val();
		populateDestinationSelection($("input[name=PageType]:checked"));
		var pageToGoTo = $(".DestinationSelectionOption option:selected").val();
		var newSystem = {
			"name" : systemInfo.name,
			"pageType" : pageType,
			"pageToGoTo" : pageToGoTo,
			"xRatio" : xRatio,
			"yRatio" : yRatio
		};

		injectIdAttribute(newSystem, systemInfo);
		newSystem.d3Id = createD3Id();
		return newSystem;
	};

	this.setFormFromSettings = function(nodeSettings) {
		if (nodeSettings.elementId) {
			var radio = $("#nodeTypeElement");
			radio.prop("checked", true);
			populateNodeSelection(radio);
			$("#nodeSelect").val(nodeSettings.elementId);
		} else {
			var radio = $("#nodeTypeGroup");
			radio.prop("checked", true);
			populateNodeSelection(radio);
			$("#nodeSelect").val(nodeSettings.groupId);
		}
		if (nodeSettings.pageType == "dashboard") {
			var radio = $("#pageTypeDashboard");
			radio.prop("checked", true);
			populateDestinationSelection(radio);
			$("#destinationSelect").val(nodeSettings.pageToGoTo);
		} else {
			var radio = $("#pageTypeProfile");
			radio.prop("checked", true);
			populateDestinationSelection(radio);
			$("#destinationSelect").val(nodeSettings.pageToGoTo);
		}
	};

	this.updateNode = function(nodeSettings) {
		var systemInfo = getSelectedSystemInfo();
		nodeSettings.name = systemInfo.name;
		nodeSettings.pageType = $("input[name=PageType]:checked").val();
		populateDestinationSelection($("input[name=PageType]:checked"));
		var pageToGoTo = $(".DestinationSelectionOption option:selected").val();
		nodeSettings.pageToGoTo = pageToGoTo;

		injectIdAttribute(nodeSettings, systemInfo);
		return nodeSettings;
	};

	var injectIdAttribute = function(newSystem, systemInfo) {
		if (systemInfo.type == "element") {
			newSystem.elementId = systemInfo.id;
			if (newSystem.groupId) {
				delete newSystem.groupId;
			}
		} else if (systemInfo.type == "group") {
			newSystem.groupId = systemInfo.id;
			if (newSystem.elementId) {
				delete newSystem.elementId;
			}
		}
	};

	var createD3Id = function() {
		return uuid.v4();
	};

	var populateNodeSelection = function(radioSelected) {
		var nodeList = $("#nodeSelect");
		nodeList.empty();
		if (radioSelected.val() == "group") {
			$.each(availableGroups, function(i, group) {
				if (group.id != 1 && group.name != "My Infrastructure") {
					nodeList.append($("<option />").val(group.id).text(group.name));
				}
			});
		} else if (radioSelected.val() == "element") {
			$.each(availableElements, function(i, element) {
				nodeList.append($("<option />").val(element.id).text(element.hostname));
			});
		}

		$(".DestinationPageSection").toggle($("#nodeSelect option").length != 0);
		$("#noGroupMessage").toggle($("#nodeSelect option").length == 0);
	};

	var populateDestinationSelection = function(radioSelected) {
		var systemInfo = getSelectedSystemInfo();
		var elementUrls = uptimeGadget.getElementUrls(systemInfo.id, systemInfo.name);
		if (radioSelected.val() == "profile") {
			populateProfileDestination(elementUrls);
		} else {
			uptimeGadget.listDashboards(populateDashboardUrls);
		}
	};

};
