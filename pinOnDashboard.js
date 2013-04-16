$(function() {
	var allSettings = {};
	var width = 0;
	var height = 0;
	var newNodeDialog = new NewNodeDialog();
	var updateRenderer = new NodeUpdateRenderer(syncDashboard);
	uptimeGadget.loadSettings(goodLoad, onBadAjax);
	$("#editPanel").hide();

	uptimeGadget.registerOnLoadHandler(function(onLoadData) {
		uptimeGadget.loadSettings(goodLoad, onBadAjax);
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
		getBackgroundSelection();
	});

	uptimeGadget.registerOnEditHandler(showEditPanel);
	getBackgroundSelection();
	newNodeDialog.populateDropdowns();
	$(".PageTypeRadios").on("click", newNodeDialog.showDestinationSelection);
	$(".NodeTypeRadios").on("click", newNodeDialog.showNodeSelection);

	function resizeBoard(width, height) {
		$("#wholeBoard").css("width", width);
		$("#wholeBoard").css("height", height);
	}

	$("#backgroundList").change(function() {
		var newBackground = $(this).val();
		$("#svgBackground").attr("xlink:href", newBackground);
		allSettings["background"] = newBackground;
		uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
	});

	$("#createNode").dialog({
		autoOpen : false,
		modal : true,
		buttons : {
			"Pin on " : function() {

				var newSystem = newNodeDialog.getNewSystem($(this));

				if (allSettings["systems"] == null) {
					allSettings["systems"] = {};
				}
				allSettings["systems"][newSystem.d3Id] = newSystem;
				uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
				updateRenderer.redraw(allSettings["systems"]);

				$(this).dialog("close");
			},
			"Cancel" : function() {
				$(this).dialog("close");
			}
		},
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
			$(this).find("span#message").text("Do you want to remove '" + selectedSystem.property("__data__").name + "'?");
		},
		buttons : {
			"Remove System" : function(e) {
				var systems = allSettings["systems"];
				var selectedSystem = d3.select($(this).data("clickedSystem"));
				var d3Id = selectedSystem.property("__data__").d3Id;
				delete systems[d3Id];
				uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
				updateRenderer.redraw(systems);

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
		if (!$(this).hasClass("editOn")) {
			return;
		}
		var x = e.pageX - this.offsetLeft;
		var y = e.pageY - this.offsetTop;
		var xRatio = x * 100 / $(this).width();
		var yRatio = y * 100 / $(this).height();

		$("#createNode").data({
			"xRatio" : xRatio,
			"yRatio" : yRatio
		});

		$("#createNode").dialog("open");
	});

	$(document).keydown(function(e) {
		if (e.which == 16) {
			$(this).addClass("editOn");
			d3.selectAll(".editable").classed("editOn", true);
		}
	}).keyup(function(e) {
		if (e.which == 16) {
			$(this).removeClass("editOn");
			d3.selectAll(".editable").classed("editOn", false);
		}
	});

	$("#closeEdit").click(function(e) {
		hideEditPanel();
	});

	function hideEditPanel() {
		d3.selectAll(".editable").classed("editOn", false);

		$("#editPanel").slideUp();
	}

	function syncDashboard() {
		var systems = {};
		d3.selectAll("circle").each(function(d) {
			systems[d.d3Id] = d;
		});
		allSettings["systems"] = systems;
		uptimeGadget.saveSettings(allSettings, onGoodSave, onBadAjax);
	}

	function showEditPanel() {
		$("#editPanel").slideDown();
		d3.selectAll(".editable").classed("editOn", true);

		$("statusBar").hide();
	}

	function goodLoad(settings) {
		if (settings != null) {
			allSettings = {
				"systems" : settings.systems || {},
				"background" : settings.background
			};
		}
		$("#loadedPanel").show().fadeOut(3000);
		$("#svgBackground").attr("xlink:href", allSettings["background"]);

		var statusBar = $("#statusBar");

		statusBar.css("color", "green");
		statusBar.text("Loaded and READY!");
		statusBar.show().fadeOut(2000);
		updateRenderer.redraw(allSettings["systems"]);

		if (settings) {
			$.each(settings, function(key, value) {
				var $ctrl = $('#myForm [name=' + key + ']');
				$ctrl.val(value);
			});

			$("#loadedPanel").show();

		} else {
			showEditPanel();
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

	function getBackgroundSelection() {
		uptimeGadget.listResources(populateBackgroundSelection);
	}

	function populateBackgroundSelection(backgrounds) {
		$.each(backgrounds, function(index, background) {
			$("#backgroundList").append('<option value="' + background.url + '">' + background.name + '</option>');
		});
	}

});