(function($) {
	$
			.widget(
					"uptime.imageselector",
					{
						options : {},
						_create : function() {
							this.element.hide();

							var selectedUrl = this.element.val();
							this.selectedImage = $(
									'<div class="imageselector-image-container" style="background-image: url(\'' + selectedUrl
											+ '\')"></div>').insertAfter(this.element).wrap(
									"<div class='imageselector-container'></div>");
							var selectorButton = $('<button class="imageselector-button">Select Background</button>');
							this.selectedImage.after(selectorButton);
							selectorButton.button({
								icons : {
									primary : "ui-icon-arrowthick-2-ne-sw"
								},
								text : false
							});

							// create a div to hold the images at the end of the
							// doc. this is shared by all instances of
							// imageselector on the page.
							this.selectionDiv = $('<div class="imageselector-selection-container"><ul class="imageselector-selection-list"><ul></div>');
							this._on(selectorButton, {
								click : "_clickSelectImage"
							});

							this._trigger("ready");
						},
						_clickSelectImage : function(e) {
							if ($('div.imageselector-selection-container').length <= 0) {
								$('body').append(this.selectionDiv);
							} else {
								this.selectionDiv = $('div.imageselector-selection-container');
							}
							if (!this.selectionDiv.is(':data(ui-dialog)')) {
								this.selectionDiv.dialog({
									dialogClass : "imageselector-dialog",
									autoOpen : false,
									modal : true,
									draggable : false,
									resizable : false,
									show : "fade",
									hide : "fade"
								});
							}
							var viewportWidth = $(window).width();
							var viewportHeight = $(window).height();
							this.selectionDiv.dialog("option", "width", viewportWidth - 100);
							this.selectionDiv.dialog("option", "height", viewportHeight - 100);

							var imageList = this.selectionDiv.children('ul');
							imageList.empty();
							var imageSelectorWidget = this;
							this.element.children('option').each(
									function() {
										var opt = $(this);
										var image = $('<div class="imageselector-option" data-url="' + opt.val()
												+ '"><div class="imageselector-image-container  title="' + opt.text()
												+ ' style="background-image: url(\'' + opt.val() + '\')"></div></div>');
										image.appendTo(imageList).wrap('<li></li>');
										imageSelectorWidget._on(image, {
											click : "_change"
										});
									});
							var url = this.element.val();
							this._setSelectedImage(url);
							this.selectedImage.css('background-image', "url('" + url + "')");
							this.selectionDiv.dialog("open");
						},
						_change : function(e) {
							var url = $(e.currentTarget).data('url');
							this.element.val(url);
							this._setSelectedImage(url);
							this.selectedImage.css('background-image', "url('" + url + "')");
							this._trigger("change", e, {
								'url' : url
							});
							this.selectionDiv.dialog("close");
						},
						_setSelectedImage : function(url) {
							this.selectionDiv.find('div.imageselector-option').each(function() {
								var option = $(this);
								if (option.data('url') == url) {
									option.addClass('selected');
								} else {
									option.removeClass('selected');
								}
							});
						},
						appendOption : function(url, name) {
							this.element.append('<option value="' + url + '">' + name + '</option>');
						},
						selectOption : function(url, name) {
							if (!url) {
								return;
							}
							this.element.val(url);
							if ($('div.imageselector-selection-container').length > 0) {
								this._setSelectedImage(url);
							}
							this.selectedImage.css('background-image', "url('" + url + "')");
						},
						_destroy : function() {
							// Use the _destroy method to reverse everything
							// your plugin has
							// applied
							this.selectedImage.parent().parent().remove();
							if ($('div.imageselector-selection-container').length > 0) {
								$('div.imageselector-selection-container').remove();
							}
							this.element.show();
							// After you do that, you still need to invoke the
							// "base" destroy
							// method
							this._super();
						}
					});
})(jQuery);
