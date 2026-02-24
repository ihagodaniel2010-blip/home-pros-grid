/**
 * Created by Yo Meyers on 12/12/2016.
 */

if (!String.prototype.includes) {
    String.prototype.includes = function () {
        'use strict';
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };
}

// safari mac fix:
window.onpageshow = function(event) {
    if (nxServiceSelector.selectList.children.length === 0) nxServiceSelector.searchWords();
};

window.onbeforeunload = function(event) {
    if (nxServiceSelector.selectList.children.length === 0) nxServiceSelector.searchWords();
};

//// iphone fix on back
window.onpagehide = function(event) {
    if (nxServiceSelector.selectList.children.length === 0) nxServiceSelector.searchWords();
};

var serviceScrollTop = 0;
var nxServiceSelector = {

    selectInput: document.getElementById("serviceSelectorInput"),
    isMatchedInput: document.getElementById("isMatchedInput"),
    selectList: document.getElementById("serviceSelectorList"),
    selectId: document.getElementById("serviceSelectorServiceId"),
    serviceUri: document.getElementById("serviceSelectorServiceUri"),
    activeSelection: $('li.service-selector-active'),

    clearList: function () {
        $(nxServiceSelector.selectInput).removeClass('open-list');
        nxServiceSelector.selectList.innerHTML = '';
        serviceScrollTop = 0;
        $(nxServiceSelector.selectList).hide();
    },

    selectService: function (data, force) {
        if (nxServiceSelector.dataResultList.length == 1 || force) {
            nxServiceSelector.selectInput.value = $(data).text();
            nxServiceSelector.isMatchedInput.value = 1;
            $(nxServiceSelector.selectId).val($(data).data("service-id"));
            $(nxServiceSelector.serviceUri).val($(data).data("service-uri"));
        }

        $(this.selectInput).parents(".service-selector-wrapper").find(".main-zip").focus();

        nxServiceSelector.clearList();
    },

    findSelectIdByInputValue: function () {
        if (nxServiceSelector.selectInput.value.length >= 3) {

            var listData = nxServiceSelector.dataResultList;

            if (listData.length == 1) {
                nxServiceSelector.isMatchedInput.value = 1;
                $(nxServiceSelector.selectId).val(listData[0].id);
                $(nxServiceSelector.serviceUri).val(listData[0].uri);
            }

            var matchedStringFromList = listData.filter(function (itm) {
                return itm.service_name.toUpperCase() == nxServiceSelector.selectInput.value.toUpperCase()
            });

            if (matchedStringFromList.length) {
                nxServiceSelector.isMatchedInput.value = matchedStringFromList[0].id;
                $(nxServiceSelector.selectId).val(matchedStringFromList[0].id);
                $(nxServiceSelector.serviceUri).val(matchedStringFromList[0].uri);
            }
        }
    },

    onKeyDown: function (keyEvent) {

        var $hlight = $('li.service-selector-active');

        switch (keyEvent.keyCode) {
            // backspace
            case 8:
                nxServiceSelector.selectInput.setAttribute("autocomplete", "off");
                nxServiceSelector.dataResultList = [];
                $(nxServiceSelector.selectId).val(null);
               // nxServiceSelector.searchWords();
                nxServiceSelector.isMatchedInput.value = 0;
                break;

            // enter or tab
            case 13:
            case 9:
                if ($('li.service-selector-active').exists()) {
                    keyEvent.preventDefault();
                    if ($hlight.length != 0) nxServiceSelector.selectService($hlight, true);
                    return false;
                } else {
                    nxServiceSelector.findSelectIdByInputValue();
                }
                break;

            // escape
            case 27:
                nxServiceSelector.clearList();
                break;

            default:
                nxServiceSelector.selectInput.setAttribute("autocomplete", "off");
                break;

        }
    },

    onKeyUp: function (keyEvent) {
        var $hlight = $('li:not([data-hidden]).service-selector-active');
        switch (keyEvent.keyCode) {

            // enter or tab
            case 13:
            case 9:
                if ($('li.service-selector-active').exists()) {
                    keyEvent.preventDefault();
                    if ($hlight.length != 0) nxServiceSelector.selectService($hlight, true);
                    return false;
                } else {
                    nxServiceSelector.findSelectIdByInputValue();
                }
                break;

            // down arrow
            case 40:

                $hlight.removeClass('service-selector-active').next().addClass('service-selector-active');

                if ($hlight.next().length == 0) {
                    var el = $("#serviceSelectorList li").eq(0);
                    el.addClass('service-selector-active');
                }

                if (($("#serviceSelectorList").height() + $("#serviceSelectorList").offset().top) < ($(".service-selector-active").offset().top + $("#serviceSelectorList li").outerHeight(true)) + 29) {
                    nxServiceSelector.selectList.scrollTop = serviceScrollTop;
                    serviceScrollTop += $("#serviceSelectorList li").outerHeight(true);
                }

                if ($(".service-selector-active").is(":last-child")) {
                    nxServiceSelector.selectList.scrollTop = 0;
                    serviceScrollTop = 0;
                }

                break;

            // up arrow
            case 38:

                if ($(".service-selector-active").is(":first-child")) {
                    keyEvent.preventDefault();
                    nxServiceSelector.selectList.scrollTop = 0;
                    serviceScrollTop = 0;
                    return false;
                }

                $hlight.removeClass('service-selector-active').prev(":not([data-hidden])").addClass('service-selector-active');
                if ($hlight.prev(":not([data-hidden])").length == 0) {
                    $("#serviceSelectorList li:not([data-hidden])").eq(-1).addClass('service-selector-active');
                }

                if ($(".service-selector-active").offset().top < ($(".service-list-wrapper").offset().top + 57)) {
                    serviceScrollTop -= $("#serviceSelectorList li:not([data-hidden])").outerHeight(true);
                    nxServiceSelector.selectList.scrollTop = (serviceScrollTop - $("#serviceSelectorList li:not([data-hidden])").outerHeight(true))
                }
                break;

            // escape key
            case 27:
                nxServiceSelector.clearList();
                break;

            default:
                nxServiceSelector.searchWords();
                nxServiceSelector.selectInput.setAttribute("autocomplete", "off");
        }
    },

    onFocus: function (keyEvent) {
        nxServiceSelector.searchWords();
    },

    searchWords: function () {
        if (nxServiceSelector.selectInput.value.length >= 3) {

            $.ajax('/ajax/service_search.php',
                {
                    method: "GET",
                    async: true,
                    data:{
                        keyword: nxServiceSelector.selectInput.value
                    },
                    success:function(d) {

                        nxServiceSelector.clearList();

                        var data = JSON.parse(d);

                        nxServiceSelector.dataResultList = data;

                        for (i = 0; i < nxServiceSelector.dataResultList.length; i++) {
                            var li = document.createElement("li"),
                                serviceId = nxServiceSelector.dataResultList[i].id,
                                serviceUri = nxServiceSelector.dataResultList[i].uri;
                            li.setAttribute('data-service-id', serviceId);
                            li.setAttribute('data-service-uri', serviceUri);

                            var str = nxServiceSelector.selectInput.value;
                            li.innerHTML = nxServiceSelector.dataResultList[i].service_name.replace(RegExp(str, "gi"), '<b><u>$&</u></b>');

                            $(li).on('mouseenter', function () {
                                $("#serviceSelectorList li.service-selector-active").removeClass('service-selector-active');
                                $(this).addClass('service-selector-active');
                                serviceScrollTop = 0;
                            });



                            $(li).on('click', function (event) {
                                event.preventDefault();
                                nxServiceSelector.selectService($(this), true);
                            });

                            nxServiceSelector.selectList.appendChild(li);
                        }

                        if (nxServiceSelector.dataResultList.length != 0) {
                            nxServiceSelector.results = 0;
                            nxServiceSelector.selectInput.setAttribute("autocomplete", "off");
                            $(nxServiceSelector.selectInput).addClass("open-list");
                            $(nxServiceSelector.selectList).show();
                            $(nxServiceSelector.selectList).css("max-height", $("#serviceSelectorList li:first-child").outerHeight(true) * 5 + 1);
                        } else {
                            nxServiceSelector.selectId.value = null;
                            nxServiceSelector.isMatchedInput.value = 0;
                        }

                        nxServiceSelector.findSelectIdByInputValue();

                        nxServiceSelector.selectList.scrollTop = 0;
                        serviceScrollTop = 0;

                    }
                }
            );

        } else {
            nxServiceSelector.clearList();
        }
    }
};

$(".popBox.open-service-select").on("onPopBox:open", function () {

    var serviceList = popBox.wrap().find(".suggest-service-list"),
        data = nxServiceSelector.dataResultList;

    if (data && data.length >= 1){
        serviceList.html('');

        for (i = 0; i < data.length; i++) {
                var li = $("<li>" +
                    "<a href='/" + nxServiceSelector.dataResultList[i].uri + "?zip=" + $(".main-zip").val()  + "' " +
                    "class='open-quote-from-list'>" +
                    "" + nxServiceSelector.dataResultList[i].service_name +
                    "</a>" +
                    "</li>");
            serviceList.append(li);
        }
    } else {

        serviceList.find("li a").each(function () {
                $(this).attr("href", $(this).attr("href").replaceAll('{{ZIPCODE}}', $(".main-zip").val()));
        });

        popBox.wrap().css("height", $(".popbox-inner .suggest-service-list").height() + 89 + "px");
    }

    $(".popBox").on('click', function (e) {
        e.preventDefault();
        popBox.open(this);
    });
    serviceList.show();
    popBox.wrap().css("height", $(".popbox-inner .suggest-service-list").height() + 89 + "px");

});

nxServiceSelector.selectInput.addEventListener("keyup", function (keyEvent) {
    nxServiceSelector.onKeyUp(keyEvent);
});

nxServiceSelector.selectInput.addEventListener("keydown", function (keyEvent) {
    nxServiceSelector.onKeyDown(keyEvent);
});

nxServiceSelector.selectInput.addEventListener("blur", function (keyEvent) {
    nxServiceSelector.selectInput.setAttribute("autocomplete", "on");
});

nxServiceSelector.selectInput.addEventListener("focus", function (keyEvent) {
    nxServiceSelector.selectInput.setAttribute("autocomplete", "off");
    nxServiceSelector.onFocus(keyEvent);
});

var newTitle = "What type of pro are you looking for?",
    i = 0,
    sNewTitle;

(function type() {
    sNewTitle = newTitle.slice(0, ++i);
    $("#serviceSelectorInput").attr("placeholder", sNewTitle);
    if (sNewTitle === newTitle) return;

    var char = sNewTitle.slice(-1);
    setTimeout(type, 60);

}());

$(function () {
    var validator  = $("#findProsForm").validate({
        submitHandler: function(form) {
            if ($(nxServiceSelector.selectId).val().length != 0) {
                var zip_code = $(form).find(".main-zip").val();
                var source_id = $(form).find(".source_id").val();
                location.href = "/" + $(form).find("[data-service-uri]").val() + '?zip=' + zip_code + (typeof(source_id) != 'undefined' ? '&source_id=' + source_id : '');
            } else {
                popBox.open($(".open-service-select"));
                return;
            }
        }
    });
    validator.resetForm();
});

$(document).on("click touchstart", function(e){
    if ($(e.target).is('.site-promo-form form *, .popbox-wrapper *, #findProsForm *')) {
        return;
    } else {
        nxServiceSelector.findSelectIdByInputValue();
        nxServiceSelector.clearList();
    }
});