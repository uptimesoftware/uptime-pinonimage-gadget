NewNodeDialog = function() {
	var getSelectedSystemInfo = function() {
		var info = new Object();
		info.type = $("input[name=nodeType]:checked").val();
		info.id = $("#nodeSelect option:selected").val();
		info.name = $("#nodeSelect option:selected").text().trim();
		return info;
	};

	var sortByHostname = function(attributeToSortBy) {
		return function(a, b) {
			var hostname1 = a[attributeToSortBy];
			var hostname2 = b[attributeToSortBy];
			return naturalSort(hostname1, hostname2);
		};
	};

	var getProfilePageUrls = function(nodeType, nodeId, nodeName) {
		if (nodeType == "group") {
			return uptimeGadget.getGroupUrls(nodeId, nodeName);
		}
		return uptimeGadget.getElementUrls(nodeId, nodeName);
	};

	var getSelectedPageToGoTo = function(systemInfo, pageType) {
		var pageToGoTo = $(".DestinationSelectionOption option:selected").val();
		if (pageType == "profile") {
			var urls = getProfilePageUrls(systemInfo.type, systemInfo.id, systemInfo.name);
			pageToGoTo = urls[pageToGoTo];
		}
		return pageToGoTo;
	};

	this.getNewSystem = function(mousePointer) {
		var xRatio = mousePointer.data("xRatio");
		var yRatio = mousePointer.data("yRatio");
		var systemInfo = getSelectedSystemInfo();
		var pageType = $("input[name=PageType]:checked").val();
		var pageToGoTo = getSelectedPageToGoTo(systemInfo, pageType);
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

	this.cancel = function() {
		$('#mapNodeProperties .mapNodePropertiesError').empty().hide();
	};

	var getProfileSelectionValue = function(url, nodeType, nodeId, nodeName) {
		var urls = getProfilePageUrls(nodeType, nodeId, nodeName);
		if (urls.graphing = url) {
			return "graphing";
		}
		if (urls.services = url) {
			return "services";
		}
		return "info";
	};

	this.setFormForNewNode = function() {
		var nodeTypeRadio = $("#nodeTypeElement");
		nodeTypeRadio.prop("checked", true);
		populateNodeSelection(nodeTypeRadio);
		var pageTypeRadio = $("#pageTypeDashboard");
		pageTypeRadio.prop("checked", true);
		populatePageSelection(pageTypeRadio);
	};

	this.setFormFromSettings = function(nodeSettings) {
		if (nodeSettings.elementId) {
			var radio = $("#nodeTypeElement");
			radio.prop("checked", true);
			populateNodeSelection(radio).then(function() {
				$("#nodeSelect").val(nodeSettings.elementId);
			});
		} else {
			var radio = $("#nodeTypeGroup");
			radio.prop("checked", true);
			populateNodeSelection(radio).then(function() {
				$("#nodeSelect").val(nodeSettings.groupId);
			});
		}
		if (nodeSettings.pageType == "dashboard") {
			var radio = $("#pageTypeDashboard");
			radio.prop("checked", true);
			populatePageSelection(radio).then(function() {
				$("#destinationSelect").val(nodeSettings.pageToGoTo);
			});
		} else {
			var radio = $("#pageTypeProfile");
			radio.prop("checked", true);
			populatePageSelection(radio).then(
					function() {
						var nodeId = nodeSettings.elementId ? nodeSettings.elementId : nodeSettings.groupId;
						var nodeType = nodeSettings.elementId ? "element" : "group";
						var profileSelectionValue = getProfileSelectionValue(nodeSettings.pageToGoTo, nodeType, nodeId,
								nodeSettings.name);
						$("#destinationSelect").val(profileSelectionValue);
					});
		}
	};

	this.updateNode = function(nodeSettings) {
		var systemInfo = getSelectedSystemInfo();
		nodeSettings.name = systemInfo.name;
		nodeSettings.pageType = $("input[name=PageType]:checked").val();
		nodeSettings.pageToGoTo = getSelectedPageToGoTo(systemInfo, nodeSettings.pageType);

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
		nodeList.empty().append($("<option />").val(-1).text("Loading...")).prop('disabled', true);
		var nodeTypeRadios = $('input[name=nodeType]');
		nodeTypeRadios.prop('disabled', true);
		$('div.mapNodeProperties button.ok').prop('disabled', true).addClass("ui-state-disabled");

		var nodeDeferred = null;
		if (radioSelected.val() == "group") {
			nodeDeferred = $.ajax("/api/v1/groups", {
				cache : false,
				success : function(data, textStatus, jqXHR) {
					nodeList.empty();
					var availableGroups = data;
					availableGroups.sort(sortByHostname("name"));
					$.each(availableGroups, function(i, group) {
						if (group.id != 1 && group.name != "My Infrastructure") {
							nodeList.append($("<option />").val(group.id).text(group.name));
						}
					});
				}
			});
		} else {
			nodeDeferred = $.ajax("/api/v1/elements", {
				cache : false,
				success : function(data, textStatus, jqXHR) {
					nodeList.empty();
					var availableElements = data;
					availableElements.sort(sortByHostname("hostname"));
					$.each(availableElements, function(i, element) {
						if (!element.isMonitored) {
							return;
						}
						nodeList.append($("<option />").val(element.id).text(element.hostname));
					});
				}
			});
		}
		return UPTIME.pub.gadgets.promises.resolve(nodeDeferred).then(function() {
			$('#mapNodeProperties .mapNodePropertiesError').empty().hide();
			nodeList.prop('disabled', false);
			nodeTypeRadios.prop('disabled', false);
			if ($("#nodeSelect option").length == 0) {
				$('div.mapNodeProperties button.ok').prop('disabled', true).addClass("ui-state-disabled");
			} else {
				$('div.mapNodeProperties button.ok').prop('disabled', false).removeClass("ui-state-disabled");
			}
		}, function(error) {
			$('div.mapNodeProperties button.ok').prop('disabled', true).addClass("ui-state-disabled");
			var errorSpan = uptimeErrorFormatter.getErrorSpan(error, "Error Communicating with up.time Controller");
			$('#mapNodeProperties .mapNodePropertiesError').empty().append(errorSpan).slideDown();
		});
	};

	this.onChangeNodeType = function() {
		populateNodeSelection($(this));
	};

	var populateProfileDestination = function() {
		$(".DestinationSelectionOption").empty();
		$(".DestinationSelectionOption").append('<option value="info">Info Page</option>');
		$(".DestinationSelectionOption").append('<option value="services">Services Page</option>');
		$(".DestinationSelectionOption").append('<option value="graphing">Graphing Page</option>');
	};

	var populateDashboardUrls = function(dashboardUrls) {
		$(".DestinationSelectionOption").empty();
		$.each(dashboardUrls, function(index, value) {
			$(".DestinationSelectionOption").append('<option value="' + value.url + '">' + value.name + '</option>');
		});
	};

	var populatePageSelection = function(radioSelected) {
		$(".DestinationSelectionOption").empty().append($("<option />").val(-1).text("Loading...")).prop('disabled', true);
		var pageTypeRadio = $("input[name=PageType]");
		pageTypeRadio.prop('disabled', true);
		if (radioSelected.val() == "profile") {
			return UPTIME.pub.gadgets.promises.Promise(function(resolve, reject) {
				populateProfileDestination();
				$(".DestinationSelectionOption").prop('disabled', false);
				pageTypeRadio.prop('disabled', false);
				resolve();
			});
		}
		return uptimeGadget.listDashboards().then(populateDashboardUrls).then(function() {
			$(".DestinationSelectionOption").prop('disabled', false);
			pageTypeRadio.prop('disabled', false);
		});
	};

	this.onChangePageType = function() {
		populatePageSelection($(this));
	};

};
