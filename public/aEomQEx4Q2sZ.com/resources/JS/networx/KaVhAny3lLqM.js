
var resizeNavigation;

$(function()
{
    styleQuestions();

    // Validate all the forms
    if(typeof($.fn.validate)!=="undefined")
    {
        $('form.validate').each(function(){
            $(this).validate();
        });
    }

    $(window).click(function() {
        $(".my-account-menu").removeClass('open');
    });

    //how it works testimonials
    $('.switch').click(function(){
        var id = $(this).attr('id');
        $('.testimonials').hide();
        $('.'+id).show();
        $('.switch').removeClass('on');
        $(this).addClass('on');
    });

    $('.see_more_contents').click(function(){
        var row_class = $(this).data('row');
        $('.'+row_class).removeClass('hidden');
        $('[data-row="'+row_class+'"]').hide();
    });

    resizeNavigation = function () {
        var navHeight =  document.body.offsetHeight - $(".headerWrap").height() - $(".siteFooter").height();
        $(".homeowner-side-nav").css("height",navHeight);
    }

    if($(".homeowner-side-nav").exists() && !isMobile) {
        resizeNavigation();
        $(window).scroll(function(){

            var navList = $('.stick-navigation');
            var stickyNavListHeight = navList.height();

            var windowTop = $(window).scrollTop();

            if (!isMobile) {
                var windowTop = $(window).scrollTop();
                var footerLimit = $('.siteFooter').offset().top - stickyNavListHeight - 20;
                if ((footerLimit < windowTop && navList.hasClass('sticky'))) {
                    var diff = footerLimit - windowTop;
                    navList.css({top: diff});
                } else {
                    navList.css({top: 0});
                }
            }

            if ($(this).scrollTop() > 60){
                navList.fadeIn().addClass("sticky");

            } else {
                navList.removeClass("sticky");
            }

        });
    }
});
