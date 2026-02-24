function unhighlight(elem, errorClass, validClass){
    var value = $(elem).val();
    if(!$(elem).hasClass('no_error_border'))$(elem).css('border-color','').removeClass('errorAlert');
    if($('#paint_labels').length)$('#'+$(elem).attr('id')+'_label').css('color','');
    if($('#mobile').length > 0)$(elem).removeClass("error");
    $(elem).parents("li").find(".x_icon").hide();
    var check_icon = $(elem).parents("li").find(".check_icon");

    //this is for case of Jquery plugin adding an on the fly input element that always has a valid value (also when value is empty like 'choose option')
    if(check_icon.hasClass('ignore_input') && $(elem).is('input')) return check_icon.hide();

    (value!=="") ? check_icon.show() : check_icon.hide();

    var error_container = $(elem).data("error-container");
    if (error_container) {
        $(elem).parents("form").find("#"+error_container).html("").removeClass('error').removeClass('errorField').hide();
    }
}
function highlight(elem, errorClass, validClass){
    if(!$(elem).hasClass('no_error_border'))$(elem).css('border-color','#ff0000').addClass('errorAlert');
    if($('#paint_labels').length)$('#'+$(elem).attr('id')+'_label').css('color','#ff0000');
    $(elem).parents("li").find(".check_icon").hide();
    $(elem).parents("li").find(".x_icon").show();
    if($('#mobile').length > 0)$(elem).addClass("error");
}

$.validator.setDefaults({
    highlight: highlight,
    unhighlight: unhighlight,
    invalidHandler: function(form, validator){
        if($(form.target).hasClass('safe_submit')) {
            $(form.target).trigger('safesubmit_reset');
        }
        return false;
    },
    errorPlacement: function(error, element) {
        var error_container = element.data("error-container");
        if (error_container) {
            $(element).parents("form").find("#" + error_container).html($(error).html()).addClass('error errorField').show();
        } else if(!element.data("no-error-display")) {
            error.insertAfter(element);
        }
        var ua = window.navigator.userAgent;
        var isEdge = ua.indexOf("Edge");

        if (isEdge >= 1)
        {
            setTimeout(function () {
                $($('form')).trigger('safesubmit_reset');
            },2000)
        }
    },
    errorClass: "nx-error",
    groups: {
        expiration_date: "expr_month expr_year exp_date"
    }
});

$('form').each(function(){
    if(
      $(this).find("[name='l_name']").length &&
      $(this).find("[name='f_name']").length &&
      !$(this).hasClass("no-group")
    ){
        var settings = $('form').validate().settings;
        $(this).validate($.extend(true, settings, {
            groups: {
                full_name: 'f_name l_name'
            }
        }));
    }
});

jQuery.extend(jQuery.validator.messages, {
    zipcodeUS: "Please enter a valid zip code"
});
$('form.validate').each(function(){
    $(this).validate();
});

jQuery.validator.addMethod('question_select', function(value, element){
    return  value !== "true";
}, "Please select an answer");

jQuery.validator.addMethod('radio_selected', function(value, element){
    var name = $(element).attr('name');
    var radio_button = $('[name="'+name+'"][value=1]').first();
    return ($(radio_button).is(':checked'));
}, 'This field is required');

jQuery.validator.addMethod('facebook', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?facebook.com(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "Facebook URL is invalid");

jQuery.validator.addMethod('email-tracker', function(value, element) {
    if (value=='') return true;
    return /^em([a-zA-Z0-9_]+)/.test(value);
}, "Email tracker must start with 'em'");

jQuery.validator.addMethod('sendgrid-template', function(value, element) {
    if (value=='') return true;
    return /^[a-zA-Z0-9\-]+$/.test(value);
}, "Sendgrid template ID is invalid.  Did you copy it correctly?");

jQuery.validator.addMethod('youtube', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?(youtube.com|youtu.be)(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "YouTube URL is invalid");

jQuery.validator.addMethod('yelp', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?(yelp.com)(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "Yelp URL is invalid");

jQuery.validator.addMethod('homeadvisor', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?(homeadvisor.com)(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "HomeAdvisor URL is invalid");

jQuery.validator.addMethod('twitter', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?twitter.com(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "Twitter URL is invalid");

jQuery.validator.addMethod('bbb', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?bbb.org(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "BBB URL is invalid");

jQuery.validator.addMethod('linkedin', function(value, element) {
    if (value=='') return true;
    return /^(https?:\/\/)?(www\.)?linkedin.com(\/[a-zA-Z0-9(\.\?)?])?/.test(value);
}, "LinkedIn URL is invalid");

jQuery.validator.addMethod("notEqualTo", function(value, element, param) {
        var notEqual = true;
        value = $.trim(value);
        for (i = 0; i < param.length; i++) {
            if (value == $.trim($(param[i]).val())) { notEqual = false; }
        }
        return this.optional(element) || notEqual;
    },
    "Please enter a different value."
);

$.validator.addMethod("email", function(value, element) {
    value = value.trim();
    return this.optional( element ) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test( value );
});


//adapted from url2 in additional methods file
$.validator.addMethod("website_url", function(value, element) {
    if (value=='') return true;
    var pattern =  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
    return pattern.test(value);
}, $.validator.messages.url);


jQuery.validator.addMethod("valid_expr_date", function(value, element) {

    var curdate = new Date();
    var year_elem = $(element).parents('form').find("select[name='expr_year']").first();
    var month_elem = $(element).parents('form').find("select[name='expr_month']").first()
    var year = $(year_elem).val();
    var month = $(month_elem).val();
    if (year !== '' && month !== '') {
        if (month < (curdate.getMonth() + 1) && year <= curdate.getFullYear())
        {
            return false;
        } else {
            unhighlight(year_elem);
            unhighlight(month_elem);
            return true;
        }
    } else {
        unhighlight(year_elem);
        unhighlight(month_elem);
        return true;
    }
}, "Expiration date must not be in the past.");

jQuery.validator.addMethod("date_not_past", function(value, element) {
    var curdate = new Date();
    var selected_date = new Date($(element).val());
    if (selected_date >= curdate) {
        return true;
    } else {
        return false;
    }
}, "Date must not be in the past");

jQuery.validator.addMethod("date_not_sixty_days", function(value, element) {
    var today_plus = new Date();
    today_plus.setDate(today_plus.getDate() + 60);

    if($(element).val() == "") return true;
    var selected_date = new Date($(element).val());
    if (selected_date <= today_plus) {
        return true;
    } else {
        return false;
    }
}, "Date must not be more than 60 days in the future");

jQuery.validator.addMethod('phone_including_toll_free', function(value, element) {
    value = value.replace(/\s+/g, "");
    var empty = /^\(___\)\s?___-____/.test(value);
    if (empty) {
        //if the element is required, placeholder is not a valid entry
        if($(element).hasClass('required')) {
            return false;
        } else {
            return true;
        }
    }
    //not just placeholder - validate
    return this.optional(element) || value.length > 9
        && value.match(/^(\+?1-?)?(((\([2-9]([02-9]\d|1[02-9])\)|[2-9]([02-9]\d|1[02-9]))-?[2-9]([02-9]\d|1[02-9]))|((\(8[087654]{2}\)|8[087654]{2})-?\d{3}))-?\d{4}$/);
}, 'Please enter a valid number');

jQuery.validator.addMethod('not_true', function(value) {
    if(value === 'true') {
        return false;
    } else {
        return true;
    }
});

//validate cvv is either numeric 3/4 digits or string xxxx
$.validator.addMethod("validCVV", function(value, element) {
    var cvv = $(element).val();
    if(!cvv ||
        (cvv == $(element).data('skip_validation')))return true;
    return /[0-9]{3}|[0-9]{4}/.test(cvv);
}, "Please enter a valid CVV number.");

//validate that the address starts with the number
$.validator.addMethod("validAddress", function(value, element) {
    var address = $(element).val();
    var address_arr = address.split(' ');
    if (address_arr.length < 2) {
        return false;
    } else {
        var street ='';
        for(var i = 1; i<address_arr.length; i++){
            street+=address_arr[i];
        }
        if (isNaN(address_arr[0])) {
            return false;
        }
        else if(street.length===0){
            return false;
        } else {
            return true;
        }
    }
}, "Please enter the street number followed by the street name.");
//non-negative-number validation - used for credit card CVV's.
$.validator.addMethod(
    "positiveNum",
    function(n, element) {
        return Number(n) > 0;
    },
    "This field must be greater than 0"
);

jQuery.validator.addMethod('comma_separated_email', function(value, element) {
    if (value=='') return true;
    var emails = value.split(',');
    for ( i = 0; i < emails.length; i++ ) {
        if(emails[i].trim() !== "") {
            if (!jQuery.validator.methods.email.call(this, emails[i].trim(), element)){
                return false;
            }
        }
    }
    return true;
}, "Email address(es) is invalid. Multiple addresses must be separated with a comma.");


$.validator.addMethod("alpha_chars_only", function(value, element) {
    if (value=='') return true;
    var pattern =  /^[A-Za-z ]+$/
    return pattern.test(value);
}, "Please enter alpha characters only.");

$.validator.addMethod("valid_chars_only", function (value) {
    const pattern = /^[\w\d\s\n\/\[\]\\.,<>?;:"'`!@#$%^&*(){}_+=|~-]+$/;
    return value === "" || pattern.test(value);
}, "Please enter valid characters.");

$.validator.addMethod("not_only_whitespace", function (value) {
    const pattern = /\s/g;
    return !!value.replace(pattern, "");
}, "This field is required.");

