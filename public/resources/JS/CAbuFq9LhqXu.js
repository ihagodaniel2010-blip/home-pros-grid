jQuery.fn.exists = function () { return this.length > 0; };

jQuery.fn.outerHTML = function () {
  return jQuery('<div />').append(this.eq(0).clone()).html();
};

jQuery.fn.stickyHeader = function () {
  return this.each(function () {
    var $this = $(this),
      $t_fixed;
    function init() {
      $this.wrap('<div class="container" />');
      $t_fixed = $this.clone();
      $t_width = $this.outerWidth();
      $t_fixed.find("tbody").remove();
      $t_fixed.find("tfoot").remove();
      $t_fixed.addClass("sticky").addClass("sticky-header").css("width", $t_width + "px").insertBefore($this);
      $this.addClass("int-sticky-header");
      resizeFixed();
    }
    function resizeFixed() {
      $t_fixed.find("th").each(function (index) {
        $(this).css("width", $this.find("th").eq(index).outerWidth() + "px");
      });
    }
    function scrollFixed() {
      var offset = $(this).scrollTop(),
        tableOffsetTop = $this.offset().top,
        tableOffsetBottom = tableOffsetTop + $this.height() - $this.find("thead").height();
      if (offset < tableOffsetTop || offset > tableOffsetBottom) {
        $t_fixed.css("transform", "translateX(0)");
        $t_fixed.hide();
      } else if (offset >= tableOffsetTop && offset <= tableOffsetBottom && (!$this.is(":hidden") && $t_fixed.is(":hidden"))) {
        $(".container").scrollLeft("1px");
        $t_fixed.show();
      }
    }
    $(window).resize(resizeFixed);
    $(window).scroll(scrollFixed);
    init();
  });
};

jQuery.fn.name = function (name) {
  if (name) {
    var eleme = $("[name='" + name + "']");
    if (eleme.length == 1) {
      return $($("[name='" + name + "']")[0]);
    } else {
      $("[name='" + name + "']")
    }

  } else {
    return $(this).attr("name");
  }
};

jQuery.fn.display = function (expression) {
  return this.each(function () {
    if (expression)
      $(this).show();
    else
      $(this).hide();
  });
};

jQuery.fn.inlineEdit = function () {
  var container = $(this);
  container.addClass('edit-mode');
  var editableElements = $(container).find('[data-editable]');

  container.bind('inlineEdit_reset', function () {
    $(container).removeClass('edit-mode');
    $(editableElements).show();
    $(container).find(".editable-input").remove();
  });

  container.bind('inlineEdit_save', function () {
    for (i = 0; i < editableElements.length; i++) {
      $(editableElements[i]).html($(editableElements[i]).next().val());
    }
    $(editableElements).show();
    $(container).find(".editable-input").remove();
  });

  for (i = 0; i < editableElements.length; i++) {

    var inputType;
    var thisElement = $(editableElements[i]);
    var reqType = $(thisElement).attr('data-editable-type') || 'text';

    if ($(thisElement).text() == ' ') {
      $(thisElement).text('');
    }

    if (reqType != 'textarea') {
      inputType = $('<input type="' + reqType + '" value="' + $(thisElement).text() + '"/>');

      if (reqType == 'checkbox' && $(thisElement).text() == "Y") inputType.prop("checked", true);

    } else if (reqType == 'textarea') {
      inputType = $('<textarea>' + $(thisElement).text() + '</textarea>');
    }

    if ($(thisElement).attr('data-editable-template')) {
      var templateElement = $(thisElement).attr('data-editable-template');
      $(thisElement).hide();
      inputType = $("<div/>");
      inputType.html($(templateElement).html());
    }

    if ($(thisElement).attr('data-editable-class')) {
      $(inputType).attr("class", $(thisElement).attr('data-editable-class'));
    }

    if ($(thisElement).attr('data-editable-name')) {
      $(inputType).attr('name', $(thisElement).attr('data-editable-name'));
    }

    if ($(thisElement).attr('data-maxlength')) {
      $(inputType).attr('maxlength', $(thisElement).attr('data-maxlength'));
    }

    inputType.addClass("editable-input");

    $(thisElement)
      .after(inputType)
      .hide();
  }
};

var isAppleOs = navigator.userAgent.indexOf('Mac OS X') != -1;
var isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
var isFirefox = navigator.userAgent.match(/firefox/i);

/**
 * ScrollTo Plugin
 * Copyright (c) 2007-2012 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * @author Ariel Flesler
 * @version 1.4.3
 */
; (function ($) { var h = $.scrollTo = function (a, b, c) { $(window).scrollTo(a, b, c) }; h.defaults = { axis: 'xy', duration: parseFloat($.fn.jquery) >= 1.3 ? 0 : 1, limit: true }; h.window = function (a) { return $(window)._scrollable() }; $.fn._scrollable = function () { return this.map(function () { var a = this, isWin = !a.nodeName || $.inArray(a.nodeName.toLowerCase(), ['iframe', '#document', 'html', 'body']) != -1; if (!isWin) return a; var b = (a.contentWindow || a).document || a.ownerDocument || a; return /webkit/i.test(navigator.userAgent) || b.compatMode == 'BackCompat' ? b.body : b.documentElement }) }; $.fn.scrollTo = function (e, f, g) { if (typeof f == 'object') { g = f; f = 0 } if (typeof g == 'function') g = { onAfter: g }; if (e == 'max') e = 9e9; g = $.extend({}, h.defaults, g); f = f || g.duration; g.queue = g.queue && g.axis.length > 1; if (g.queue) f /= 2; g.offset = both(g.offset); g.over = both(g.over); return this._scrollable().each(function () { if (!e) return; var d = this, $elem = $(d), targ = e, toff, attr = {}, win = $elem.is('html,body'); switch (typeof targ) { case 'number': case 'string': if (/^([+-]=)?\d+(\.\d+)?(px|%)?$/.test(targ)) { targ = both(targ); break } targ = $(targ, this); if (!targ.length) return; case 'object': if (targ.is || targ.style) toff = (targ = $(targ)).offset() }$.each(g.axis.split(''), function (i, a) { var b = a == 'x' ? 'Left' : 'Top', pos = b.toLowerCase(), key = 'scroll' + b, old = d[key], max = h.max(d, a); if (toff) { attr[key] = toff[pos] + (win ? 0 : old - $elem.offset()[pos]); if (g.margin) { attr[key] -= parseInt(targ.css('margin' + b)) || 0; attr[key] -= parseInt(targ.css('border' + b + 'Width')) || 0 } attr[key] += g.offset[pos] || 0; if (g.over[pos]) attr[key] += targ[a == 'x' ? 'width' : 'height']() * g.over[pos] } else { var c = targ[pos]; attr[key] = c.slice && c.slice(-1) == '%' ? parseFloat(c) / 100 * max : c } if (g.limit && /^\d+$/.test(attr[key])) attr[key] = attr[key] <= 0 ? 0 : Math.min(attr[key], max); if (!i && g.queue) { if (old != attr[key]) animate(g.onAfterFirst); delete attr[key] } }); animate(g.onAfter); function animate(a) { $elem.animate(attr, f, g.easing, a && function () { a.call(this, e, g) }) } }).end() }; h.max = function (a, b) { var c = b == 'x' ? 'Width' : 'Height', scroll = 'scroll' + c; if (!$(a).is('html,body')) return a[scroll] - $(a)[c.toLowerCase()](); var d = 'client' + c, html = a.ownerDocument.documentElement, body = a.ownerDocument.body; return Math.max(html[scroll], body[scroll]) - Math.min(html[d], body[d]) }; function both(a) { return typeof a == 'object' ? a : { top: a, left: a } } })(jQuery);


/**
 * Phone mask -
 * When the input is blurred will show the phone mask "(000) 000-0000" if available.
 * When the input is focused we will show plain numbers "0000000000", and limit the length to 10 characters.
 */
$.fn.phoneMask = function () {
  $(this).each(function () {
    $(this).on("focus", function () {
      $(this).val($(this).val().unmaskPhone());
    }).on("blur", function () {
      $(this).val($(this).val().maskPhone());
    }).on("input change", function () {
      const format = $(this).val().unmaskPhone().slice(0, 10);
      $(this).val(format);
    }).addClass("numbers-only").blur();
  });
}

// Applies automatically the phoneMask function to all inputs with class "phone_mask".
$(function () {
  $(".phone_mask").phoneMask();
  $(document).on("onPopBox:open onNxModal:open", function () {
    $(".phone_mask").phoneMask();
  });
})

/**
 *
 * @param msg
 * @returns {HTMLElement}
 */
$.fn.safeSubmit = function (msg = "Saving...") {
  var me = $(this);
  if (isAppleOs) window.safeSubmitOn = true;
  me.bind('safesubmit safesubmit_reset', function (e) {
    var target = $(e.target);
    var btnPreloader = target.hasClass('preloader-btn');
    if (e.type == 'safesubmit') {
      if ($.data(e.target, "beenSubmitted")) return;

      if (btnPreloader) {
        target.css({
          'width': e.target.offsetWidth
        });
      } else {
        target.val(msg)
      }

      target.addClass('prevent-submit');

      $("<div/>").css({
        "width": e.target.offsetWidth + 4,
        "height": e.target.offsetHeight + 4,
        "top": $('.prevent-submit').offset().top - 2,
        "left": $('.prevent-submit').offset().left - 2,
        "background": "white",
        "opacity": 0,
        "position": "absolute",
        "z-index": 9999999999999
      }).addClass('ss-overflow').appendTo($('body'));

      $.data(e.target, "beenSubmitted", "true");

      //adding preloader to the ss-overflow div
      if (btnPreloader) {
        $('.ss-overflow').addClass('ss-preloader').html('<i class="fa fa-circle-o-notch fa-spin fa-3x fa-fw" style="' +
          'line-height:' + (e.target.offsetHeight + 4) + 'px; ' +
          'font-size: ' + (e.target.offsetHeight / 2) + 'px;' +
          '"></i>');
      }

      if (isAppleOs && isSafari && window.safeSubmitOn && (!target.hasClass("btn-ss-double-prevent"))) {
        window.safeSubmitOn = false;
        setTimeout(function () {
          if (isSafari) $('form.safe_submit').trigger("safesubmit_reset");
          target.trigger('click');
        }, 150);
      }
    } else {
      $.removeData(e.target, "beenSubmitted");
      var btn = $(".prevent-submit");
      btn.attr("disabled", false).val(btn.attr("data-ss-value"));
      btn.removeClass('prevent-submit');
      $.data(e.target, "beenSubmitted", undefined);
      $('.ss-overflow').remove();
    }
  });
  me.find("input[type=submit]:not(.no-safe-submit), .ss-button:not(.no-safe-submit)").click(function (e) {
    if (isAppleOs && ((typeof nxBraintree !== 'undefined') && nxBraintree.submited)) {
      nxBraintree.submited = false;
    }
    if (isAppleOs && isSafari && window.safeSubmitOn) e.preventDefault();
    //if(!window.safeSubmitOn && oldSafari) return;

    $.data(e.target, "beenSubmitted", null);
    $(this).attr("data-ss-value", $(this).val()).trigger('safesubmit');
  });
  return me
}

$.fn.hasClasses = function () {
  for (var i = 0; i < arguments.length; i++) {
    if (this.hasClass(arguments[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Add a data-logo-autocreator atrribute to element you want to replace.
 */
$.fn.logoAutoCreator = function () {
  var me = $(this),
    logoWrapper = $("<div/>"),
    logoTitle = $("<span/>"),
    text = $(this).attr("data-logo-autocreator");

  if (!text) return;

  logoTitle.text(text.split(/\s+/).slice(0, 3).join(" "));

  logoWrapper.addClass("logo-auto-creator");

  var fontSize = 14;

  logoTitle.css({
    'font-size': fontSize + 'px',
    'line-height': fontSize + 'px'
  });

  logoWrapper.append(logoTitle);

  me.replaceWith(logoWrapper);
};

String.prototype.isJson = function () {
  try {
    JSON.parse(this);
  } catch (e) {
    return false;
  }
  return true;
}

String.prototype.maskPhone = function () {
  return this.replace(/(\d\d\d)(\d\d\d)(\d\d\d\d)/, '($1) $2-$3');
}

String.prototype.unmaskPhone = function () {
  return this.replace(/\D/g, '');
}

// safari mac fix:
window.onpageshow = function (event) {
  $('form.safe_submit').trigger("safesubmit_reset");
};


var styleQuestions = function () {
  $('select.select').each(function () {
    var title = $(this).attr('title');
    if ($('option:selected', this).val() !== '') {
      title = $('option:selected', this).text();
    }
    if ($('option:selected', this).val() === '' && $('option:selected', this).text() !== 'Select') {
      title = $('option:selected', this).text();
    }
    // if not selected and has an empty option - display - Select - by default
    if (!title)
      title = "Select";
    var maxlen = 50;
    var selectGuidId = nxFunctions.createGuid();
    if (title.length > maxlen) title = title.substr(0, maxlen);
    $(this).siblings('span.select').remove();
    $(this)
      .attr("data-style-select", "style-select-" + selectGuidId)
      .css({ 'z-index': 10, 'opacity': 0, '-khtml-appearance': 'none' })
      .after('<span class="select style-select-' + selectGuidId + '">' + title + '</span>')
      .change(function () {
        var val = $('option:selected', this).text();
        var thisSpan = $("." + $(this).data("style-select"));
        if (val.length > maxlen) val = val.substr(0, maxlen);
        thisSpan.text(val);
        if (thisSpan.text().length * 8 > thisSpan.width()) {
          thisSpan.addClass('no-top-padding')
        } else {
          thisSpan.removeClass('no-top-padding')
        }
      });
  });
  $('.select_mask').remove();
}

// Document Ready
$(function () {
  $("table.sticky-header").stickyHeader();

  // enable jquery.validate.js with default options
  // Note: need not to conflict with safesubmit
  var validate_options = {
    errorLabelContainer: "#messageBox",
    errorElement: "li"
  };
  $("form.validate").each(function () {
    $(this).validate(validate_options);
  });

  $("[data-logo-autocreator]").each(function () {
    $(this).logoAutoCreator();
  });

  // apply numbersonly function to elements
  $('.numbersonly').attr('onKeyPress', 'return nxFunctions.numbersonly(event);');

  $('.show_full_text').click(function () {
    $(this).parents('.expandable_text_wrapper').find('.short_text').hide();
    $(this).parents('.expandable_text_wrapper').find('.full_text').show();
  });
  $('.show_short_text').click(function () {
    $(this).parents('.expandable_text_wrapper').find('.short_text').show();
    $(this).parents('.expandable_text_wrapper').find('.full_text').hide();
  });

  if (isMobile) {
    $(".article_txt table").each(function () {
      var table = $(this).clone();
      var wrapDiv = $("<div/>");
      wrapDiv.css("overflow-y", "auto");
      wrapDiv.append(table);
      $(this).replaceWith(wrapDiv);
    });
  }

  if (isSafari && $("[data-tippy-content]").exists() && window.screen.width < 780) {
    $("body").addClass("tippy-iOS");
  }
})


function MapPopUp(pbl_id) {
  url = "/map_radius.php?pbl_id=" + pbl_id;
  window.open(url, '_metro', 'height=550,width=1100,scrollbars=1,toolbar=no,status=no,location=no,menubar=no');
}

function checkMinBudget(product_type_id, recurring_days, budget_elem) {
  $.post('/ajax/get_sales_info.php',
    {
      'type': 'get_min_budget',
      'product_type_id': product_type_id,
      'recurring_days': recurring_days
    }, function (data) {
      data = JSON.parse(data);
      var min_budget = data.min_budget;
      budget_elem.attr('min', min_budget);
      budget_elem.rules('remove', "min");
      budget_elem.rules('add', {
        min: parseFloat(min_budget),
        messages: {
          required: "Please enter a value greater than or equal to " + min_budget + "."
        }
      });
      budget_elem.blur();
      return min_budget;
    });
}

function launchQuotePopup(zip_code, service_id, source_id, prefer) {
  var preference_to = prefer ? '&preference_to=' + prefer : '';
  var src = '/quote_popup.php' + "?service_id=" + service_id + "&zip_code=" + zip_code + preference_to + "&source_id=" + source_id;
  var popWindow = $("<div/>").attr('data-frame', src);

  $('input').blur();
  popBox.open(popWindow);
  $(".popbox-inner").css("position", "relative");
  $("#popBoxIframe").css({
    border: 'none',
    margin: 0,
    padding: 0,
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0
  });
}

function checkMaxBudget(product_type_id, client_id, budget_elem, recurring_days = '') {
  $.post('/ajax/get_sales_info.php',
    {
      'type': 'get_max_budget',
      'product_type_id': product_type_id,
      'client_id': client_id,
      'recurring_days': recurring_days
    }, function (data) {
      data = JSON.parse(data);
      var max_budget = data.max_budget;
      var message = "Please enter a value less than or equal to " + max_budget + ".";
      var max_message = data.message ? data.message : message;
      budget_elem.attr('max', max_budget);
      budget_elem.rules('remove', "max");
      budget_elem.rules('add', {
        max: parseFloat(max_budget),
        messages: {
          required: message,
          max: max_message
        }
      });
      budget_elem.blur();
      return max_budget;
    });
}

function getZipCoverageData(zip_code, radius, exclude_diff_state) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: '/api/v2/get_zip_code_coverage',
      type: 'GET',
      dataType: 'json',
      data: {
        zip_code: zip_code,
        radius: radius,
        exclude_diff_state: exclude_diff_state
      },
      success: function (response) {
        resolve(response);
      },
      error: function (xhr, errorMsg) {
        var data = xhr.responseJSON;
        reject(data.response.error_messages.join());
      }
    });
  });
}



$(document).on('change keypress', 'input.float-label, textarea.float-label', function () {
  $(this).addClass('used');
});

$(document).on('change', 'select.float-label', function () {
  $(this).addClass('used');
});

$('input.float-label, textarea.float-label').each(function () {
  if ($(this).val()) $(this).addClass('used');
});

$("input.float-label[type=password]").val("");

$(document).on('blur', 'input.float-label, select.float-label, textarea.float-label', function () {
  var elem = $(this);
  setTimeout(function () {
    if (elem.val())
      elem.addClass('used');
    else
      elem.removeClass('used');
  }, 50);
});

$(document).on('keydown', '.numbers-only', function (e) {
  var key = e.keyCode ? e.keyCode : e.which;

  var allowKeys = [8, 9, 13, 27, 46, 110, 190, 39, 37];
  if ($(this).hasClass("allow-minus")) allowKeys.push(109, 189);
  if ($(this).hasClass("allow-plus")) allowKeys.push(107, 187);
  if (!(allowKeys.indexOf(key) !== -1 ||
    // CTRL+A / CTRL+C / CTRL+V / CTRL+X
    ([65, 67, 86, 88].indexOf(key) !== -1 && (e.ctrlKey || e.metaKey)) ||
    (key >= 35 && key <= 40) ||
    (key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
    (key >= 96 && key <= 105)
  )) e.preventDefault();
});

$(function () {
  $("form.get-quote-form").not("#findProsForm").each(function () {
    $(this).validate({
      submitHandler: function (form) {
        var zip_code = $(form).find(".main-zip").val() || 0;
        var prefer = $(form).find("#preference_to").val() || 0;
        var source_id = $(form).find(".source_id").val() || 0;
        var service_uri;
        if ($(form).find("select[name=service]").exists()) {
          service_uri = $(form).find('select[name=service] option:selected').attr('data-service-uri');
        } else {
          service_uri = $(form).find(".service-uri").val();
        }
        let params;
        params = (zip_code ? 'zip=' + zip_code : '');
        params += (prefer ? (params ? '&' : '') + 'preference_to=' + prefer : '');
        params += (source_id ? (params ? '&' : '') + 'source_id=' + source_id : '');
        params = params ? '?' + params : '';
        location.href = "/" + service_uri + params;
      }
    })
  });

  $(".btn-account-menu").on('click', function (e) {
    e.stopPropagation();
    $(".my-account-menu").toggleClass('open');
  });

  $(document).on('click', '.popBox', function (e) {
    e.preventDefault();
    popBox.open(this);
  });



});

var nxFunctions = {
  createGuid: function () {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  },

  createShortGuid: function () {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4();
  },

  editRadiusMap: {
    resultsTable: [],
    isLoaded: false,
    pricing_warning_zip: 0,
    loadFunction: function () {
      if (!nxFunctions.editRadiusMap.isLoaded) {
        $(document).on("click", ".map-radius-edit .close-map", function () {
          nxFunctions.editRadiusMap.closeMap();
        });

        $(document).on("click", ".btn-select-radius", function () {
          var accountSite = $(".popbox-wrapper").exists(),
            btnParentForm = $(document).find("" + (accountSite ? "[id" : "a[data-hash") + "=" + $("input[name=form_id]").val() + "]").parent();

          if ($('[name=center_zip]').val()) {
            btnParentForm.find('[data-inputname="zip_code_service"]').val($('[name=center_zip]').val()).trigger('change');
            btnParentForm.find('[data-inputname="radius_service"]').val($('[name=center_radius]').val());
            btnParentForm.find('[data-inputname="radius_service"]').trigger('change');
            btnParentForm.find("[name='radius_notice']").css('display', 'inline');
          }

          if (accountSite) $(".popbox-wrapper").removeClass("expanded");

          nxFunctions.removeURLParameter('action');
          nxFunctions.editRadiusMap.closeMap();

        });

        nxFunctions.editRadiusMap.isLoaded = true
      }
    },
    pblId: 0,
    mapEvents: function (mapElement) {

      if (!this.mapEvents.isLoaded) {

        function resetTable(data) {
          var accountSite = popBox.isOpen() ? ".popbox-inner " : "";
          nxFunctions.editRadiusMap.resultsTable = $(accountSite + "[data-table='results_table']").DataTable({
            "ajax": {
              "url": "/api/v2/get_radius_map_data",
              "data": function (d) {
                if (typeof data.circle == 'undefined') {
                  d.radius = data.getRadius();
                  d.latitude = data.getCenter().lat();
                  d.longitude = data.getCenter().lng();
                }
                else {
                  d.radius = data.circle.radius;
                  d.latitude = data.getPosition().lat();
                  d.longitude = data.getPosition().lng();
                }

                d.product_type_id = nxFunctions.editRadiusMap.pblId;
                d.min_radius_allowed = (typeof min_radius_allowed != 'undefined') ? min_radius_allowed : '';
                d.exclude_diff_state = $('input[type="hidden"][name=exclude_diff_state]').val();
                if (typeof is_sales_form != 'undefined' && is_sales_form) d.include_keys = 0;
              },
              "method": "GET",
              "dataSrc": function (response) {
                var result = response.data;
                var min_radius = (typeof min_radius_allowed == 'undefined') ? result.min_radius : min_radius_allowed;
                var radius = result.radius;
                var max_radius = result.max_radius;
                var message = '';
                var center_zip = result.center_zip;

                $('.map-radius-alert').remove();
                $(".radius-number").text(radius);

                if (radius === 0) {
                  message = "Please enter a valid zip.";
                } else if (radius > max_radius || result.radius < min_radius) {
                  message = "Radius must be between " + min_radius + " and " + max_radius + " miles.";
                }

                if (message) {
                  $('.map-selected-areas').hide();
                  $(".map-radius-edit").prepend("<div class='map-radius-alert'>" + message + "</div>");
                }

                if (!response.response.is_success) {
                  $('.map-selected-areas').hide();
                } else {
                  $('.map-selected-areas').show();
                  $('[name=center_zip]').val(center_zip).trigger('change');
                  $('[name=center_radius]').val(radius).trigger('change');
                }
                if (!$('.hidden-tmp-radius-zip-list').hasClass('adv-zip')) $('.hidden-tmp-radius-zip-list').text(result.zip_codes);
                return result.data;
              },
              "error": function (xhr, error, thrown) {
                $('.map-selected-areas').hide();
                if (xhr.responseJSON && xhr.responseJSON.response && xhr.responseJSON.response.error_messages) {
                  var errMsg = xhr.responseJSON.response.error_messages.join(",");
                  $(".map-radius-edit").prepend("<div class='map-radius-alert'>" + errMsg + "</div>");
                }
              }
            },
            retrieve: true,
            jQueryUI: false,
            paging: false,
            info: false,
            searching: false,
            order: [],
            columnDefs: [
              { 'type': 'num-html-currency', 'targets': '_all' }
            ]
          });
        }

        mapElement.on('nxGmap:circleCreated', function (e, data) {
          nxFunctions.editRadiusMap.resultsTable = [];
          resetTable(data);
          $('.map-footer-overlay').hide();
          $('.loading-div').hide();
          $("[data-table='results_table']").show();
        });

        mapElement.on('nxGmap:radiusChanged', function (e, data) {
          nxFunctions.editRadiusMap.resultsTable = [];
          resetTable(data);
          nxFunctions.editRadiusMap.resultsTable.ajax.reload();
        });

        mapElement.on('nxGmap:centerChanged', function (e, data) {
          nxFunctions.editRadiusMap.resultsTable = [];
          resetTable(data);
          nxFunctions.editRadiusMap.resultsTable.ajax.reload();
        });

        mapElement.on('nxGmap:dragEnd', function (e, data) {
          nxFunctions.editRadiusMap.resultsTable = [];
          resetTable(data);
          nxFunctions.editRadiusMap.resultsTable.ajax.reload();
        });

        this.mapEvents.isLoaded = true;
      }

    },
    open: function (parentForm, zipcode, orig_radius, display_area, exclude_diff_state, pbl_id, mapElement) {
      nxFunctions.editRadiusMap.pblId = pbl_id;
      $('.map-radius-alert').remove();
      $('.map-footer-overlay').show();
      var div = $('.map-radius-edit');
      var windowId = windowId;
      div.find('div.select_radius').attr("id", "radius_form");
      div.find('[name=exclude_diff_state]').val(exclude_diff_state);
      div.find('[name=form_id]').val(parentForm);

      var mapPblSettings = {
        zip: zipcode,
        radius: orig_radius,
        group_id: $('#group_id').val(),
        display_area: display_area
      }

      $.ajax({
        url: '/api/v2/gmaps/pbl_settings',
        type: "POST",
        dataType: "json",
        data: mapPblSettings,
        success: function (res) {

          $(".map-expand-preloader").remove();
          popBox.hidePreloader();

          if (res.response.is_success) {

            div.show().addClass('show');
            $('.popbox-wrapper').addClass("expanded");
            mapElement.nxGmap(res.data.map);
            nxFunctions.editRadiusMap.mapEvents(mapElement);

          } else {
            $('.map-radius-edit').hide();

            var errMsg = res.response.error_messages.join(",");

            if (popBox.isOpen()) {
              $(".popbox-wrapper").removeClass("expanded");
              popBox.addAlert(errMsg);
            } else {
              alert(errMsg);
            }
          }
        },
        error: function (xhr) {
          var res = JSON.parse(xhr.responseText);
        }
      });

      nxFunctions.editRadiusMap.loadFunction();

      $("[data-table='results_table']").hide();
      $('.loading-div').show();

    },
    closeMap: function (formId) {

      $("[name='center_zip']").val("");
      $("[name='center_radius']").val("");
      $("[name='latitude[0]']").val("");
      $("[name='longitude[0]']").val("");
      $("[name='radius[0]']").val("");
      $("[name='form_id']").val("");

      nxFunctions.editRadiusMap.resultsTable.destroy();

      $('.map-radius-alert').remove();
      $('.map-radius-edit').hide().removeClass('show');

      if ($(document).find(".popbox-wrapper").length >= 1) {
        $(".popbox-wrapper").removeClass("expanded");
      }

      if ($(document).find(".map-frame").length >= 1) {
        $(".map-frame").hide();
        $("html").css("overflow", "");
      }
    }
  },


  getQueryParams: function () {
    var qs = window.location.search.split('+').join(' ');
    var params = {},
      tokens,
      re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params;
  },

  updateQueryStringParameter: function (uri, key, value) {
    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (uri.match(re)) {
      return uri.replace(re, '$1' + key + "=" + value + '$2');
    }
    else {
      return uri + separator + key + "=" + value;
    }
  },

  changeURLParameter: function (url, param, paramVal) {
    var newAdditionalURL = "";
    var tempArray = url.split("?");
    var baseURL = tempArray[0];
    var additionalURL = tempArray[1];
    var temp = "";
    if (additionalURL) {
      tempArray = additionalURL.split("&");
      for (var i = 0; i < tempArray.length; i++) {
        if (tempArray[i].split('=')[0] != param) {
          newAdditionalURL += temp + tempArray[i];
          temp = "&";
        }
      }
    }

    var rows_txt = temp + "" + param + "=" + paramVal;
    return baseURL + "?" + newAdditionalURL + rows_txt;
  },

  numbersonly: function (e) {
    var unicode = false;
    if (e.charCode && !(e.ctrlKey || e.altKey)) unicode = e.charCode;
    else if (e.keyCode && e.keyCode > 47)
      unicode = e.keyCode;
    if (!unicode) return true;
    if (unicode < 48 || unicode > 57)
      return false
  },

  insertUrlParam: function (key, value) {
    var baseUrl = [location.protocol, '//', location.host, location.pathname].join(''),
      urlQueryString = document.location.search,
      newParam = key + '=' + value,
      params = '?' + newParam;
    if (urlQueryString) {

      updateRegex = new RegExp('([\?&])' + key + '[^&]*');
      removeRegex = new RegExp('([\?&])' + key + '=[^&;]+[&;]?');

      if (typeof value == 'undefined' || value == null || value == '') { // Remove param if value is empty

        params = urlQueryString.replace(removeRegex, "$1");
        params = params.replace(/[&;]$/, "");

      } else if (urlQueryString.match(updateRegex) !== null) { // If param exists already, update it

        params = urlQueryString.replace(updateRegex, "$1" + newParam);

      } else { // Otherwise, add it to end of query string

        params = urlQueryString + '&' + newParam;

      }

    }
    window.history.replaceState({}, "", baseUrl + params);
  },

  removeURLParameter: function (parameter) {
    var url = window.location.search;
    var baseUrl = [location.protocol, '//', location.host, location.pathname].join('');
    var urlparts = url.split('?');
    if (urlparts.length >= 2) {

      var prefix = encodeURIComponent(parameter) + '=';
      var pars = urlparts[1].split(/[&;]/g);

      //reverse iteration as may be destructive
      for (var i = pars.length; i-- > 0;) {
        //idiom for string.startsWith
        if (pars[i].lastIndexOf(prefix, 0) !== -1) {
          pars.splice(i, 1);
        }
      }

      url = urlparts[0] + (pars.length > 0 ? '?' + pars.join('&') : "");
      window.history.replaceState({}, "", baseUrl + url);
    } else {
      window.history.replaceState({}, "", baseUrl + url);
    }
    return baseUrl + url;
  },

  compileTemplate: function (templateEle, data) {
    var data = data;
    var template = $(templateEle).html();
    var blocks = template.split(/({{[^{^}]*}})/);
    var keys = [];

    var getObjValue = function (keys) {
      var childKeys = keys.split(".");
      var i = 0;
      var ex_data = "data";
      while (i < childKeys.length) {
        ex_data += "['" + childKeys[i] + "']";
        i++;
      }
      return eval(ex_data);
    }

    var getEval = function (statement) {
      var statementBreakdown;
      var statementEx;
      if (statement.indexOf("==") > 0) {
        statementBreakdown = statement.split("==");
        statementEx = "==";
      }
      if (statement.indexOf("=>") > 0) {
        statementBreakdown = statement.split("=>");
        statementEx = "=>";
      }
      if (statement.indexOf("=<") > 0) {
        statementBreakdown = statement.split("=<");
        statementEx = "=<";
      }
      if (statement.indexOf("<") > 0) {
        statementBreakdown = statement.split("<");
        statementEx = "<";
      }
      if (statement.indexOf(">") > 0) {
        statementBreakdown = statement.split(">");
        statementEx = ">";
      }
      if (statement.indexOf("!=") > 0) {
        statementBreakdown = statement.split("!=");
        statementEx = "!=";
      }
      return "data['" + statementBreakdown[0] + "']" + statementEx + "" + statementBreakdown[1];
    }

    for (var j = 0; j < blocks.length; j++) {
      var block = blocks[j];

      if (block.indexOf("{{#if") == 0) {
        var htmlStr = "";
        var ifStatement = block.split(" ")[1].replace("}}", "");
        var openStatement = template.indexOf(block);
        var closeStatement = openStatement + template.substring(openStatement).indexOf("{{/if}}");
        var statementHtml = template.substring(template.indexOf(block), closeStatement);
        var checkStatement;

        if (ifStatement.indexOf("==") > 0 || ifStatement.indexOf(">") > 0 || ifStatement.indexOf("<") > 0) {
          checkStatement = eval(getEval(ifStatement));
        }

        var keysValue = getObjValue(ifStatement);

        if (!keysValue && !checkStatement) {
          htmlStr = "";
        } else {
          htmlStr = statementHtml.replace(block, "");
          htmlStr = htmlStr.replace("{{/if}}", "");
        }
        template = template.replace(statementHtml, htmlStr);
      }

      if (block.indexOf("{{#forEach") == 0) {
        var htmlList = "";
        var listData;
        var listDataName = block.split(" ")[1].replace("}}", "");
        var listItemHtml = template.substring(template.lastIndexOf(block), template.lastIndexOf("{{/forEach}}") + 13);

        if (listDataName.indexOf(".") > 0) {
          listData = getObjValue(listDataName);
        } else {
          listData = data[listDataName];
        }

        for (l = 0; l < listData.length; l++) {
          var compileTem = listItemHtml.substring(listItemHtml.lastIndexOf(block) + block.length, listItemHtml.lastIndexOf("{{/forEach}}"));
          htmlList = htmlList + nxFunctions.compileTemplate($("<div>" + compileTem + "</div>"), listData[l]);
        }
        template = template.replace(listItemHtml, htmlList);
      }

      if (block.indexOf("{{") == 0 && block.indexOf("{{#") < 0) {
        var key = block.replace("{{", "").replace("}}", '');

        if (key.indexOf(".") > 0) {

          var keysValue = getObjValue(key);

          keys.push({
            key: block,
            value: keysValue
          });

        } else {
          keys.push({
            key: block,
            value: data[key]
          });
        }
      }
    }
    for (keid = 0; keid < keys.length; keid++) {
      template = template.replace(keys[keid].key, keys[keid].value ? keys[keid].value : '');
    }
    return template;
  },

  preventDefault: function (e) {
    e = e || window.event;
    return e.preventDefault ? e.preventDefault() : e.returnValue = false;
  },

  numberWithCommas: function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Conserve aspect ratio of the orignal region. Useful when shrinking/enlarging
   * elements to fit into a certain area.
   *
   * @param {Number} srcWidth Source area width
   * @param {Number} srcHeight Source area height
   * @param {Number} maxWidth Fittable area maximum available width
   * @param {Number} maxHeight Fittable area maximum available height
   * @return {Object} { width, height }
   */

  calculateAspectRatioFit: function (srcWidth, srcHeight, maxWidth, maxHeight) {
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return { width: srcWidth * ratio, height: srcHeight * ratio };
  },

  phoneNumberParser: function (number, include_areacode) {

    var parsed = number.replace(/\D+/g, '');

    if (include_areacode)
      return parsed;
    else
      return parsed.startsWith("1") ? parsed.substring(1) : parsed;

  }

}

var nxModal = {
  open: function (options, onApprove) {
    options.boxId = nxFunctions.createGuid();

    var modalBody = $('<div class="modal" id="' + options.boxId + '"></div>'),
      overlay = $('<div class="modal-overlay"></div>');

    if (options.modalCss) {
      modalBody.addClass(options.modalCss);
    }

    if (options.header) {
      modalBody.append($('<div/>')
        .addClass('modal-header')
        .html(options.header));
    }

    modalBody.append($('<div/>')
      .addClass('modal-inner')
      .html(options.innerHtml));

    if (onApprove) $(modalBody).find('.btn-modal-ok').on('click', function () {
      var btn = $(this);
      var options = {
        errorClass: 'hasError',
        onkeyup: function (a, b) {
          $(a.parentElement).find(".hasError").hide();
        },
        submitHandler: function () {
          if (onApprove) {
            onApprove();
            nxModal.close();
          }
        }
      }

      $('.modal-body').find('form').validate(options);
    });

    if (options.onClose) {
      nxModal[options.boxId] = options.onClose;
      nxModal.onClose = options.onClose;
    }

    $(modalBody).find('.btn-modal-cancel').on('click', function () {
      nxModal.close();
    });

    if (options.overlay && options.overlay == true) {
      $('body').append(overlay);
    }

    setTimeout(function () {

      $('body').append(modalBody);
      modalBody.addClass('modal-body');
      $(document).trigger('onNxModal:open');

      $('#' + options.boxId).css("height",
        modalBody.find('.modal-inner').innerHeight() +
        (options.header ? 58 : 0) +
        (options.showFooter || options.showFooter === undefined ? 60 : 0));

      if (options.onOpen) {
        setTimeout(function () {
          options.onOpen();
        }, 750);
      }
    }, 350);

    if (typeof options.backdropDismiss == 'undefined' || options.backdropDismiss == true) {
      overlay.on('click', function () {
        nxModal.close();
      });
    }
  },

  close: function () {
    $('.modal').remove();
    $('.modal-overlay').remove();
    if (nxModal.onClose) nxModal.onClose();
  },

  isOpen: function () {
    if ($('body').find(".modal").length === 0)
      return false;
    else
      return true;
  }

}

var popBox = {
  wrap: function () {
    return $('.popbox-wrapper')
  },
  overlay: function () {
    return $('.popbox-overlay')
  },
  open: function (element) {
    $(document.activeElement).blur();
    var innerHTML,
      wrap = $('<div class="popbox-wrapper"></div>'),
      overlay = $('<div class="popbox-overlay"></div>'),
      closeBtn = $('<i class="popbox-close fa fa-times fs17"></i>'),
      popHeight = (!$(element).data('height') ? "640px" : $(element).data('height')),
      popWidth = (!$(element).data('width') ? "640px" : $(element).data('width')),
      body = $('body');

    $(wrap).css("height", parseInt(popHeight) > window.innerHeight ? "100%" : popHeight);
    $(wrap).css("width", parseInt(popWidth) > window.innerWidth ? "100%" : popWidth);

    if ($(element).data('innerdiv')) innerHTML = $($(element).attr('data-innerdiv')).clone().show();
    if ($(element).data('html')) innerHTML = $(element).data('html');

    if ($(element).data('header')) {
      var header = $('<div/>')
        .addClass('popbox-header')
        .html($(element).attr('data-header'));
      if ($(element).data('header-class')) header.addClass($(element).attr('data-header-class'));
      if (!$(element).data('hide-close')) header.append(closeBtn);
      wrap.append(header);
    } else {
      wrap.addClass("no-header");
      if (!$(element).data('hide-close')) wrap.append(closeBtn.addClass("floating-close"));
    }

    if ($(element).data('frame')) {

      var ifrm = $('<iframe id="popBoxIframe" onload="popBox.onFrameLoaded()"></iframe>');

      ifrm.attr({
        src: $(element).attr('data-frame')
      });

      ifrm.attr({
        allow: $(element).attr('data-allow')
      });

      wrap.append($('<div/>')
        .addClass('iframe-waiting')
        .html('<div class="popbox-preloader"><img class="loader-img" src="/resources/images/global/networx-preloader-v2.svg" alt="Loading..." /></div>').attr("style", "height: 100%;text-align: center;"));
      innerHTML = $("<div/>").append(ifrm).html();

    } else {
      var noFrameMsg = $(element).attr('data-no-frame-msg');
      if (noFrameMsg) {
        wrap.append($('<div/>')
          .addClass('iframe-waiting')
          .html('<div class="popbox-preloader"><img class="loader-img" src="/resources/images/global/networx-preloader-v2.svg" alt="Loading..." /><div>' + noFrameMsg + '</div></div>').attr("style", "height: 100%;text-align: center;"));
        innerHTML = $("<div/>").append(ifrm).html();
      }
    }

    if ($(element).data('css-class')) {
      wrap.addClass($(element).data('css-class'));
    }

    if ($(element).data('onclose')) {
      wrap.attr('data-onclose', $(element).data('onclose'))
    }

    wrap.append($('<div/>').addClass('popbox-inner').html(innerHTML));

    $(closeBtn).on('click', function () {
      wrap.removeClass('zoomIn').addClass('bounceOut');
      setTimeout(function () {

        if (typeof ($(element).attr("class")) != "undefined") {

          var btn_element = function () {
            var class_names = $(element).attr("class");
            if ($(element).attr("class").indexOf(" ") >= 0) class_names = $(element).attr("class").split(' ').join('.');
            return $('.' + class_names)[0];
          }

          $(btn_element()).trigger("onPopBox:close", element);
        }

      }, 10);
      popBox.close();
    });
    $(document).keyup(function (e) {
      if (e.keyCode === 27) {
        wrap.removeClass('zoomIn').addClass('bounceOut');
        setTimeout(function () {
          $($('.' + $(element).attr("class").split(' ').join('.'))[0]).trigger("onPopBox:close", element);
        }, 10);
        popBox.close();
      }
    });

    $.Deferred(
      function () {
        body.append(overlay);
        body.append(wrap);
        body.css("overflow", "hidden");
        if (isAppleOs && !wrap.hasClass('popbox-discount-wrapper')) {
          $("html").css("overflow-y", "hidden");
          body.css("position", "fixed");
          body.css("width", "100%");
        }
      }
    );

    $.when().then(function () {
      if (typeof ($(element).attr("class")) != "undefined") {

        var btn_element = function () {
          var class_names = $(element).attr("class");
          if ($(element).attr("class").indexOf(" ") >= 0) class_names = $(element).attr("class").split(' ').join('.');
          return $('.' + class_names)[0];
        }
        //todo element is wrong and needs to be fixed
        $(btn_element()).trigger("onPopBox:open", element);
      }
    });

    if (!$(element).data('overlayexit')) {
      $(overlay).fadeIn(500, function () {
        $(wrap).fadeIn(350);
      });
    }

    if ($(element).data('closeoverlay')) {
      $('.popbox-overlay').on('click', function () {
        setTimeout(function () {
          $($('.' + $(element).attr("class").split(' ').join('.'))[0]).trigger("onPopBox:close", element);
        }, 10);
        popBox.close();
      });
    }

  },
  close: function () {
    $(popBox.wrap()).fadeOut(300, function () {
      nxFunctions.removeURLParameter('action');
      $(popBox.overlay()).fadeOut(200, function () {
        $('html, body').css("overflow", "");
        $('body').css("position", "");
        $('body').css("width", "");

        if (popBox.wrap().data("onclose")) {
          eval(popBox.wrap().data("onclose"));
        }

        popBox.overlay().remove();
        popBox.wrap().remove();
      });
    });
  },
  addAlert: function (msg) {
    this.addNotification('alert', msg);
  },
  closeNotification: function () {
    $("ul.popbox-alert-list").remove();
    popBox.wrap().removeClass("show-alert");
  },
  addNotification: function (type, msg) {
    if (!popBox.wrap().hasClass("show-alert")) {
      popBox.wrap().addClass("show-alert");
      $("<ul/>").addClass("popbox-alert-list").appendTo($(popBox.wrap()).find('.popbox-inner'));
    }

    $("ul.popbox-alert-list").append($("<li/>").html("<a href='javascript:void(0);' class='close_alert'><i class='fa fa-times fs17'></i></a>"
      + "<p>" + msg + "</p>").addClass(type));

    $("ul.popbox-alert-list .close_alert").on('click', function () {
      popBox.addNotification.close($(this));
    });

    $("ul.popbox-alert-list .close_alert").each(function () {
      var lineAlert = $(this);
      setTimeout(function () {
        popBox.addNotification.close(lineAlert);
      }, 8500);
    });

    popBox.addNotification.close = function (lineAlert) {
      $(lineAlert).parent().fadeOut(200, function () {
        $(lineAlert).remove();
        if ($("ul.popbox-alert-list").children().length == 0) {
          $("ul.popbox-alert-list").remove();
          popBox.wrap().removeClass("show-alert");
        }
      });
    }
  },
  showPreloader: function (msg) {

    if (!popBox.wrap().hasClass("show-preloader")) {
      popBox.wrap().addClass("show-preloader");
      $(popBox.wrap()).find('.popbox-inner').append($("<div/>").addClass("popbox-preloader"));

      $(".popbox-preloader").append(
        $("<div/>").addClass("preloader-bg")
      );
      $(".preloader-bg").append(
        $("<img/>").attr("src", "/resources/images/global/preloader.gif")
      );
    }

    this.showPreloader.close = function () {
      $(".popbox-preloader").fadeOut(200, function () {
        popBox.wrap().removeClass("show-preloader");
        $(".popbox-preloader").remove();
      });
    }

    this.showPreloader.isOpen = function () {
      if ($('body').find(".popbox-preloader").length === 0) return false;
      else return true
    }

    return true;

  },
  hidePreloader: function () {
    $(".popbox-preloader").fadeOut(200, function () {
      popBox.wrap().removeClass("show-preloader");
      $(".popbox-preloader").remove();
    });
  },
  addSuccess: function (msg) {
    this.addNotification('success', msg);
  },
  addNotificationOverlay: function () {

    if (!popBox.wrap().hasClass("show-overlay")) {
      popBox.wrap().addClass("show-overlay");
      $(popBox.wrap()).find('.popbox-inner').append($("<div/>").addClass("popbox-overlay"));
    }

  },
  isOpen: function () {
    if ($('body').find(".popbox-wrapper").length === 0) return false;
    else return true;
  },
  onFrameLoaded: function () {
    $('.iframe-waiting').remove();
  }
}

var addNotification = {
  alert: function (content, cookie, no_auto_hide) {
    this.general(content, 'alert', cookie, no_auto_hide);
  },
  success: function (content, cookie) {
    this.general(content, 'success', cookie);
  },
  general: function (content, cls, cookie, no_auto_hide) {

    // If #messageBox exists, messages will be handled by printMessages() and shouldn't be in a popup
    if ($("#messageBox").length) return;

    if (!$("body").hasClass("show-notification")) {
      $("body").addClass("show-notification");
      $("<ul/>").addClass("notification-list").appendTo(".headerWrap"); //Default
      $("<ul/>").addClass("notification-list").appendTo(".content_wrap"); //Accounts
      $("<ul/>").addClass("notification-list").appendTo(".popbox_content_wrap"); //Popups
    }

    var divNot = $("<li/>").html("<a href='javascript:void(0);' class='close_alert'><i class='fa fa-times fs15'></i></a>"
      + "<span class='msg'><span class='msg-inner'>" + content + "</span></span>"
      + "<span class='icon'><i class='" + (cls == 'success' ? 'icn-checked-mark' : 'fa fa-exclamation-triangle') + "'></i></span>").addClass(cls);

    $("ul.notification-list").append(divNot);

    if (!no_auto_hide) {
      setTimeout(function () {
        addNotification.close(divNot, cookie);
      }, 5500);
    }

    var offsetLeft = $(".notification-list").offset().left;

    var addStickyAlert = function () {
      if ($(this).scrollTop() > 58) {
        $(".notification-list").addClass('sticky').css("left", offsetLeft);
      } else {
        $(".notification-list").removeClass('sticky');
        $(".notification-list").attr("style", "");
      }
    }

    addStickyAlert();

    $(window).scroll(function () {
      addStickyAlert();
    });

    $("ul.notification-list .close_alert").on('click', function () {
      addNotification.close($(this).parent(), cookie);
    });
  },
  close: function (elem, cookie) {
    if (cookie) cookie();
    if (elem) elem.fadeOut(600, function () {
      const notificationLists = $("ul.notification-list");
      notificationLists.each(function () {
        const notificationList = $(this);
        notificationList.children().each(function () {
          var notificationItem = $(this);
          if (notificationItem.html() === elem.html()) {
            notificationItem.remove();
          }
        });
      })
      if ($("ul.notification-list").children().length == 0) {
        $("ul.notification-list").remove();
        $("body").removeClass("show-notification");
      }
    });
  },

}

if (isMobile) {
  $(".mobile-only").css("display", "block");
  $(".desktop-only").css("display", "none");
}

document.addEventListener("DOMContentLoaded", function () {
  var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));

  if ("IntersectionObserver" in window) {

    var lazyImageObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.srcset = lazyImage.dataset.srcset;
          lazyImage.classList.remove("lazy");
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(function (lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });

  } else {

    lazyImages.forEach(function (lazyImage) {
      lazyImage.src = lazyImage.dataset.src;
      lazyImage.srcset = lazyImage.dataset.srcset;
      lazyImage.classList.remove("lazy");
    });

  }
});

if (typeof closePopup !== 'undefined' && closePopup === '1') {
  window.parent.popBox.close();
}

$(function () {
  initSSForms();
  $(document).on("onPopBox:open onNxModal:open", initSSForms);
})

function initSSForms() {
  var safeSubmitForms = $("form").not(".disable-safe-submit");
  var messageDict = { search: "Searching...", send: "Sending..." };
  safeSubmitForms.each(function () {
    var form = $(this);
    form.addClass("safe_submit");
    var text = messageDict[form.data("ss-type")] || form.data("ss-value");
    form.safeSubmit(text);
  })
}

function confirmSubmitAction(form, message) {
  var confirmation = confirm(message);
  var jqueryForm = form.trigger ? form : $(form);
  if (!confirmation) jqueryForm.trigger("safesubmit_reset");
  return confirmation;
}


/**
 * only works for versions that are in the same format!
 * @param v1
 * @param v2
 * @returns {boolean|number}
 * returns -1 if v1<v2, returns 1 if v1> v2, returns 0 if v1==v2
 */
function versionCompare(v1, v2) {
  if (typeof v1 !== 'string' || typeof v2 != 'string') return false;
  v1 = v1.split('.');
  v2 = v2.split('.');
  const k = Math.min(v1.length, v2.length);
  for (let i = 0; i < k; ++i) {
    v1[i] = parseInt(v1[i], 10);
    v2[i] = parseInt(v2[i], 10);
    if (v1[i] > v2[i]) return 1;
    if (v1[i] < v2[i]) return -1;
  }
  return v1.length == v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
}

function form_submit(form) {
  $(form).append("<input type='hidden' name='cmdSubmitRequest' value='1' />");

  const el = form.querySelector('input[name="tcpa_compliance_text"]');
  if (el) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = el.value;
    el.value = tempDiv.innerText;
  }
  form.submit();
}

function list_into_array(list) {
  return list.split(/[,\s]+/).filter(el => el)
}
