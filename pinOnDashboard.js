$(function() {
	var allSettings = {};
	var width = 0;
	var height = 0;
	var canEdit = uptimeGadget.isOwner();
	var newNodeDialog = new NewNodeDialog();
	var updateRenderer = new NodeUpdateRenderer(syncDashboard, getEditNodePropertiesDialog, removeSystem);
	$("#closeEdit").button().click(function(e) {
		hideEditPanel();
	});
	var wholeBoardContextMenu = $('#wholeBoardContextMenu').menu().hide();
	if (canEdit) {
		wholeBoardContextMenu.on("menuselect", function(e, ui) {
			wholeBoardContextMenu.hide();
			if (ui.item.text() == "Enter Edit Mode") {
				enterEditMode();
			}
			if (ui.item.text() == "Exit Edit Mode") {
				exitEditMode();
				if ($('#editPanel').is(":visible")) {
					$("#editPanel").slideUp();
				}
			}
		});
		$('#wholeBoard').on("contextmenu", function(e) {
			e.preventDefault();
			if ($(this).hasClass("editOn")) {
				wholeBoardContextMenu.empty().append('<li><a href="#">Exit Edit Mode</a></li>').menu("refresh");
			} else {
				wholeBoardContextMenu.empty().append('<li><a href="#">Enter Edit Mode</a></li>').menu("refresh");
			}
			wholeBoardContextMenu.fadeIn('fast').position({
				my : "left top",
				of : e,
				collision : "fit"
			});
		});
	}
	$("#editPanel").hide();

	uptimeGadget.registerOnLoadHandler(function(onLoadData) {
		uptimeGadget.loadSettings(onGoodLoad, onBadAjax);
		width = onLoadData.dimensions.width;
		height = onLoadData.dimensions.height;
		resizeBoard(width, height);
	});

	uptimeGadget.registerOnResizeHandler(function(dimensions) {
		width = dimensions.width;
		height = dimensions.height;
		resizeBoard(width, height);
	});

	uptimeGadget.registerOnUploadSuccessHandler(function(uploadedResource) {
		addNewUploadedBackgroundImageToImageSelector(uploadedResource);
	});

	uptimeGadget.registerOnEditHandler(showEditPanel);

	$('#backgroundList').imageselector({
		change : function(e, ui) {
			var newBackground = ui.url;
			$("#editSettingsHint").hide();
			$("#svgBackground").attr("xlink:href", newBackground);
			allSettings["background"] = newBackground;
			uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
		}
	});
	addUploadedBackgroundImagesToImageSelector();

	$(".NodeTypeRadios input").change(newNodeDialog.onChangeNodeType);
	$(".PageTypeRadios input").change(newNodeDialog.onChangePageType);

	function resizeBoard(width, height) {
		$("#wholeBoard").css("width", width);
		$("#wholeBoard").css("height", height);
	}

	var addNewNodeButtons = {
		"Pin on" : function() {
			var newSystem = newNodeDialog.getNewSystem($(this));

			if (allSettings["systems"] == null) {
				allSettings["systems"] = {};
			}
			allSettings["systems"][newSystem.d3Id] = newSystem;
			uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
			updateRenderer.update(allSettings["systems"]);

			$(this).dialog("close");
		},
		"Cancel" : function() {
			$(this).dialog("close");
		}
	};

	$("#mapNodeProperties").dialog({
		autoOpen : false,
		modal : true,
		resizable : false,
		open : function(e, ui) {
			$(this).parent().find('.ui-dialog-buttonpane button').button({
				icons : {
					primary : 'ui-icon ui-icon-pin-s'
				}
			}).next().button({
				icons : {
					primary : 'ui-icon-cancel'
				}
			});
		}
	});

	function removeStatsData(domElem) {
		var jqData = $(domElem).data();
		if (jqData.monitorStatusCounts) {
			delete jqData.monitorStatusCounts;
		}
		if (jqData.elementStatusCounts) {
			delete jqData.elementStatusCounts;
		}
	}

	function removeSystem(circleDomElem) {
		var systems = allSettings["systems"];
		var d3Id = d3.select(circleDomElem).datum().d3Id;
		delete systems[d3Id];
		removeStatsData(circleDomElem);
		// nodes will be removed if a non-owner user views nodes for which they
		// do not have permission but we don't want to save those changes.
		if (canEdit) {
			uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
		}
		updateRenderer.update(systems);
	}

	$("#removeSystem-confirm").dialog({
		autoOpen : false,
		resizable : false,
		height : 140,
		modal : true,
		open : function() {
			$(this).parent().find('.ui-dialog-buttonpane button').button({
				icons : {
					primary : 'ui-icon ui-icon-trash'
				}
			}).next().button({
				icons : {
					primary : 'ui-icon-cancel'
				}
			});

			var selectedSystem = d3.select($(this).data("clickedSystem"));
			$(this).find("span#message").text("Do you want to remove '" + selectedSystem.datum().name + "'?");
		},
		buttons : {
			"Remove System" : function(e) {
				updateRenderer.hideEditMapNodeSelectedUi();
				var selectedDomElem = $(this).data("clickedSystem");
				removeSystem(selectedDomElem);

				$(this).dialog("close");
			},
			Cancel : function() {
				$(this).dialog("close");
			}
		},
		close : function() {
			$(this).data("clickedSystem", null);
		}
	});

	$("#wholeBoard").click(function(e) {
		wholeBoardContextMenu.hide();
		updateRenderer.hideEditMapNodeSelectedUi();
		if (!$(this).hasClass("editOn")) {
			return;
		}
		var x = e.pageX - this.offsetLeft;
		var y = e.pageY - this.offsetTop;
		var xRatio = x * 100 / $(this).width();
		var yRatio = y * 100 / $(this).height();

		var mapNodeProperties = $("#mapNodeProperties");
		mapNodeProperties.data({
			"xRatio" : xRatio,
			"yRatio" : yRatio
		});

		newNodeDialog.setFormForNewNode();
		mapNodeProperties.dialog("option", "title", "Add a New Node");
		mapNodeProperties.dialog("option", "buttons", addNewNodeButtons);
		mapNodeProperties.dialog("open");
	});

	function enterEditMode() {
		$('wholeBoard').addClass("editOn");
		d3.selectAll(".editable").classed("editOn", true);
		d3.selectAll("circle.editable").each(function() {
			if (this.wobbler) {
				this.wobbler.start();
			}
		});
	}

	function exitEditMode() {
		$('wholeBoard').removeClass("editOn");
		d3.selectAll(".editable").classed("editOn", false);
		updateRenderer.hideEditMapNodeSelectedUi();
	}

	$(document).keydown(function(e) {
		if (e.which == 16) {
			enterEditMode();
		}
	}).keyup(function(e) {
		if (e.which == 16) {
			exitEditMode();
		}
	});

	function hideEditPanel() {
		exitEditMode();
		$("#editPanel").slideUp();
	}

	function syncDashboard() {
		var systems = {};
		d3.selectAll("circle.mapNode").each(function(d) {
			systems[d.d3Id] = d;
		});
		allSettings["systems"] = systems;
		uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
	}

	function updateNode(nodeSettings) {
		newNodeDialog.updateNode(nodeSettings);
	}

	function getEditNodePropertiesDialog(nodeSettings, mapNodeDomElem) {
		var mapNodeProperties = $("#mapNodeProperties");
		newNodeDialog.setFormFromSettings(nodeSettings);
		mapNodeProperties.dialog("option", "title", "Edit Node Properties");
		mapNodeProperties.dialog("option", "buttons", {
			"OK" : function() {
				updateNode(nodeSettings);
				removeStatsData(mapNodeDomElem);
				syncDashboard();
				$(this).dialog("close");
			},
			"Cancel" : function() {
				$(this).dialog("close");
			}
		});
		return mapNodeProperties;
	}

	function showEditPanel() {
		$("#editPanel").slideDown();
		enterEditMode();

		$("statusBar").hide();
	}

	function onGoodLoad(settings) {
		if (settings != null) {
			allSettings = {
				"systems" : settings.systems || {},
				"background" : settings.background,
				"refreshInterval" : settings.refreshInterval || 10
			};
		}
		$("#loadedPanel").show().fadeOut(3000);
		$("#backgroundList").imageselector("selectOption", allSettings["background"]);
		$("#svgBackground").attr("xlink:href", allSettings["background"]);

		var statusBar = $("#statusBar");

		statusBar.css("color", "green");
		statusBar.text("Loaded and READY!");
		statusBar.show().fadeOut(2000);
		var refreshRate = $("#refreshRate");
		refreshRate.val(allSettings.refreshInterval || 10);
		refreshRate.change($.debounce(500, function() {
			var refreshRate = $(this);
			var min = parseInt(refreshRate.attr("min"));
			var max = parseInt(refreshRate.attr("max"));
			var val = parseInt(refreshRate.val());
			if (isNaN(val)) {
				val = 10;
			}
			refreshRate.val(val);
			if (val < min) {
				refreshRate.val(min);
			}
			if (val > max) {
				refreshRate.val(max);
			}
			allSettings.refreshInterval = val;
			updateRenderer.resetUpdateInterval(allSettings.refreshInterval);
			uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
		}));
		updateRenderer.update(allSettings["systems"]);
		updateRenderer.resetUpdateInterval(allSettings.refreshInterval);
		if (settings) {
			$.each(settings, function(key, value) {
				var $ctrl = $('#myForm [name=' + key + ']');
				$ctrl.val(value);
			});

			$("#loadedPanel").show();

		} else {
			if (canEdit) {
				showEditPanel();
			}
		}
		if (!allSettings.background) {
			$('#editSettingsHint').fadeIn('slow');
		}
	}

	function onGoodSave(savedSettings) {
		var statusBar = $("#statusBar");

		statusBar.css("color", "green");
		statusBar.text("Updated settings!");
		statusBar.show().fadeOut(2000);
	}

	function onBadAjax(errorObject) {
		var statusBar = $("#statusBar");
		statusBar.css("color", "red");

		statusBar.text(errorObject.code + ": " + errorObject.description);
		statusBar.show().fadeOut(2000);
	}

	function appendResourceToList(resource) {
		$("#myUploadedFiles").append("<li><a href='" + resource.url + "'>" + resource.name + "</a></li>");
		$("#myUploadedFilesContainer").show();
	}

	function onGoodListResources(data) {
		if (data.length > 0) {
			$.each(data, function(e, resource) {
				appendResourceToList(resource);
			});
		}
	}

	function addNewUploadedBackgroundImageToImageSelector(background) {
		$("#backgroundList").imageselector("appendOption", background.url, background.name);
	}

	function addUploadedBackgroundImagesToImageSelector() {
		uptimeGadget.listResources(populateBackgroundSelection);
	}

	function populateBackgroundSelection(backgrounds) {
		$.each(backgrounds, function(index, background) {
			$("#backgroundList").imageselector("appendOption", background.url, background.name);
		});
	}

});