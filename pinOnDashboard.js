$(function() {
	var allSettings = {};
	var width = 0;
	var height = 0;
	var canEdit = uptimeGadget.isOwner();
	var newNodeDialog = new NewNodeDialog();
	var updateRenderer = new NodeUpdateRenderer(syncDashboard, getEditNodePropertiesDialog, removeSystem, makeErrorFunction,
			clearErrorStatus);
	$("#closeEdit").button().click(function(e) {
		hideEditPanel();
	});
	var wholeBoardContextMenu = $('#wholeBoardContextMenu').menu().hide();
	if (canEdit) {
		installContextMenu();
	}
	$("#editPanel").hide();

	uptimeGadget.registerOnLoadHandler(function(onLoadData) {
		uptimeGadget.loadSettings().then(onGoodLoad, makeErrorFunction("Error Loading Settings"));
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
			uptimeGadget.saveSettings(allSettings).then(onGoodSave, makeErrorFunction("Error Saving Settings"));
		}
	});
	addUploadedBackgroundImagesToImageSelector();

	$(".NodeTypeRadios input").change(newNodeDialog.onChangeNodeType);
	$(".PageTypeRadios input").change(newNodeDialog.onChangePageType);

	function resizeBoard(width, height) {
		$("#wholeBoard").css("width", width);
		$("#wholeBoard").css("height", height);
	}

	function installContextMenu() {
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
			if (canEdit) {
				wholeBoardContextMenu.fadeIn('fast').position({
					my : "left top",
					of : e,
					collision : "fit"
				});
			}
		});
	}

	var addNewNodeButtons = [ {
		text : "Pin on",
		click : function() {
			var newSystem = newNodeDialog.getNewSystem($(this));

			if (allSettings["systems"] == null) {
				allSettings["systems"] = {};
			}
			allSettings["systems"][newSystem.d3Id] = newSystem;
			uptimeGadget.saveSettings(allSettings).then(onGoodSave, makeErrorFunction("Error Saving Settings"));
			updateRenderer.update(allSettings["systems"]);

			$(this).dialog("close");
		},
		'class' : "ok"
	}, {
		text : "Cancel",
		click : function() {
			newNodeDialog.cancel();
			$(this).dialog("close");
		}

	} ];

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
		},
		dialogClass : "mapNodeProperties"
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
			uptimeGadget.saveSettings(allSettings).then(onGoodSave, makeErrorFunction("Error Saving Settings"));
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
		if (!canEdit) {
			return;
		}
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
		uptimeGadget.saveSettings(allSettings).then(onGoodSave, makeErrorFunction("Error Saving Settings"));
	}

	function updateNode(nodeSettings) {
		newNodeDialog.updateNode(nodeSettings);
	}

	function getEditNodePropertiesDialog(nodeSettings, mapNodeDomElem) {
		var mapNodeProperties = $("#mapNodeProperties");
		newNodeDialog.setFormFromSettings(nodeSettings);
		mapNodeProperties.dialog("option", "title", "Edit Node Properties");
		mapNodeProperties.dialog("option", "buttons", [ {
			text : "OK",
			click : function() {
				updateNode(nodeSettings);
				removeStatsData(mapNodeDomElem);
				syncDashboard();
				$(this).dialog("close");
			},
			'class' : "ok"
		}, {
			text : "Cancel",
			click : function() {
				$(this).dialog("close");
			}
		} ]);
		return mapNodeProperties;
	}

	function showEditPanel() {
		clearErrorStatus();
		$("#editPanel").slideDown();
		enterEditMode();
	}

	function onGoodLoad(settings) {
		clearErrorStatus();
		if (settings != null) {
			allSettings = {
				"systems" : settings.systems || {},
				"background" : settings.background,
				"refreshInterval" : settings.refreshInterval || 30
			};
		}
		$("#loadedPanel").show().fadeOut(3000);
		$("#backgroundList").imageselector("selectOption", allSettings["background"]);
		$("#svgBackground").attr("xlink:href", allSettings["background"]);

		var refreshRate = $("#refreshRate");
		refreshRate.val(allSettings.refreshInterval || 30);
		refreshRate.change($.debounce(500, function() {
			allSettings.refreshInterval = $(this).val();
			updateRenderer.resetUpdateInterval(allSettings.refreshInterval);
			uptimeGadget.saveSettings(allSettings).then(onGoodSave, makeErrorFunction("Error Saving Settings"));
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
		clearErrorStatus();
	}

	function wholeBoardDimOn() {
		var wholeBoard = $('#wholeBoard');
		if (wholeBoard.css('opacity') > 0.6) {
			$('#wholeBoard').fadeTo('slow', 0.3);
		}
	}

	function wholeBoardDimOff() {
		var wholeBoard = $('#wholeBoard');
		if (wholeBoard.css('opacity') < 0.6) {
			$('#wholeBoard').fadeTo('slow', 1);
		}
	}

	function makeErrorFunction(msg) {
		return function(error) {
			canEdit = false;
			var errorBox = uptimeErrorFormatter.getErrorBox(error, msg);
			var statusBar = $('#statusBar').empty();
			errorBox.appendTo(statusBar);
			statusBar.slideDown();
			hideEditPanel();
			wholeBoardDimOn();
		};
	}

	function clearErrorStatus() {
		canEdit = uptimeGadget.isOwner();
		$('#statusBar').slideUp().empty();
		wholeBoardDimOff();
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
		uptimeGadget.listResources().then(populateBackgroundSelection,
				makeErrorFunction("Error Loading User Uploaded Background Images"));
	}

	function populateBackgroundSelection(backgrounds) {
		clearErrorStatus();
		$.each(backgrounds, function(index, background) {
			$("#backgroundList").imageselector("appendOption", background.url, background.name);
		});
	}

});