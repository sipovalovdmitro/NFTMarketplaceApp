import {symbol} from "prop-types";

$(document).ready(function () {
  $(document).on('click', '.view-notification', function () {
    $.ajax({
      url: "/notifications",
      type: "get",
      dataType: "script",
      data: {}
    })
  })

  $(document).on('click', '.dark-theme-slider', function () {
    lightSelected = $(this).hasClass('lightTheme');
    document.getElementById('themeChange').setAttribute('href', lightSelected ? 'dark' : '');
  });

  $(document).on('click', '.copyUserAddress', function () {
    var copyText = document.getElementById("userAddress");
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */
    document.execCommand("copy");
    toastr.success('Copied successfully.')
  });

  $(document).on("click", ".dashboard-load-more", function (e) {
    $.ajax({
      url: "/category_filter",
      type: "get",
      dataType: "script",
      data: {page_no: $(this).data("page-no"), category: $(this).data("category"), sort_by: $(this).data("sort-by")}
    })
  });

  $(window).scroll(function() {
    if ($(window).scrollTop() == $(document).height() - $(window).height()) {
      $(".dashboard-load-more").click()
      $(".user-load-more").click()
    }
  });

  $(".scrollbar-activity").scroll(function() {
    if ($(".scrollbar-activity").scrollTop() > $(".overall-activities").height() - $(".scrollbar-activity").height()) {
      $(".common-activity-load-more").click()
    }

  })

  $(document).on("click", ".user-load-more", function (e) {
    $.ajax({
      url: "/users/load_tabs",
      type: "get",
      dataType: "script",
      data: {id: $(this).data("id"), page_no: $(this).data("page-no"), tab: $(this).data("tab")}
    })
  });

  $(document).on("click", ".common-activity-load-more", function (e) {
    $.ajax({
      url: "/load_more_activities",
      type: "get",
      dataType: "script",
      data: {id: $(this).data("id"), page_no: $(this).data("page-no"), tab: $(this).data("tab")}
    })
  });

  $(document).on("click", ".dashboard-sort-by", function(e) {
    e.preventDefault()
    var dataParam = {}
    if ($(".top-filter li.active a").data("name")) {
      dataParam["category"] = $(".top-filter li.active a").data("name")
    }

    if ($(this).data("name")) {
      dataParam["sort_by"] = $(this).data("name")
    }

    $.ajax({
      url: "/category_filter",
      type: "get",
      dataType: "script",
      data: dataParam
    })
  })

  $(document).on("click", ".crete-model-close", function(e) {
    $("#collectionCreateForm :input").prop("disabled", false);
  })

  preventNegativeNumbers(document.getElementById('royalties'));
  preventNegativeNumbers(document.getElementById('bid_amt'));
  preventNegativeNumbers(document.getElementById('bid_qty'));
  preventNegativeNumbers(document.getElementById('tokens'));
  preventNegativeNumbers(document.getElementById('burn_tokens'));
  preventNegativeNumbers(document.getElementById('no_of_copies'));
  $('.timed-action-trigger').each(function () {
    timed_auction_trigger(this)
  });
});

window.limit_char = function limit_char(element, max_chars = 5){
  if(element.value.length > max_chars) {
    const defaultVal = '9';
    element.value = element.value.substr(0, max_chars);
    toastr.error('You cant enter more than ' + defaultVal.padStart(max_chars, 9))
  }
}

function preventNegativeNumbers(input){
  if(!input) {
    return;
  }
  input.addEventListener('keypress', function(e) {
    var key = !isNaN(e.charCode) ? e.charCode : e.keyCode;
    function keyAllowed() {
      var keys = [8,9,13,16,17,18,19,20,27,46,48,49,50,51,52,53,54,55,56,57,91,92,93];
      if (key && keys.indexOf(key) === -1)
        return false;
      else
        return true;
    }
  if (!keyAllowed())
    e.preventDefault();
  }, false);

  // EDIT: Disallow pasting non-number content
  input.addEventListener('paste', function(e) {
    var pasteData = e.clipboardData.getData('text/plain');
    if (pasteData.match(/[^0-9]/))
      e.preventDefault();
  }, false);
}

const timers = [];

function timed_auction_trigger(_this, secondRound = false) {
  timers[_this.id] = setInterval(function() {
    if (_this) {
      const address = $(_this).data('address')
      const start_time = $("#"+address+"_start_time").val();
      const end_time = $("#"+address+"_end_time").val();
      const collectionShowPage = $(_this).data('collection-show')
      const scheduledCollection = $(_this).data('future-time')
      const countDownDate = new Date(scheduledCollection && secondRound == false ? start_time : end_time).getTime();
      let tempArray = [];
      let now = new Date().getTime();
      let distance = countDownDate - now;
      // Time calculations for days, hours, minutes and seconds
      let days = Math.floor(distance / (1000 * 60 * 60 * 24));
      let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if(collectionShowPage && distance > 0) {
        if(scheduledCollection){
          $('#future_timedAuction').removeClass('hide')
        }
        else{
          $('#current_timedAuction').removeClass('hide')
        }
        $('#tA-days').text(days)
        $('#tA-hours').text(hours)
        $('#tA-minutes').text(minutes)
        $('#tA-seconds').text(seconds)
      } else {
          days = days ? days + "d " : ""
          hours = hours ? (hours>=10? hours: '0'+hours) + "h " : "00h "
          minutes = minutes ? (minutes>=10? minutes: '0'+minutes) + "m " : "00m "
          seconds = seconds ? (seconds>=10? seconds: '0'+seconds) + "s " : "00s "
          const result =  days + hours + minutes + seconds;
          if (distance > 0) {
            tempArray = document.getElementsByClassName(address + "-timedAuction-Countdown");
            for(let i=0;i<tempArray.length;i++) {
              tempArray[i].innerHTML = result;
            }
        }
      }

      // If the count down is over, write some text
      if (distance < 0) {
        let endTime = new Date(end_time).getTime();
        let currentTime = new Date().getTime();
        if(collectionShowPage) {
          if (endTime - currentTime <= 0) {
            $('#timedAuction-countdown, #collection-actions').hide();
            $('.end-action').show();
            window.refresh();
            document.getElementById('collection_minimum_bid').style.display = "none";
          }
          else
          {
            $('#timedAuction-countdown, #collection-actions').hide();
            window.location.reload();
            document.getElementById('collection_minimum_bid').style.display = "none";
          }
          return
        }
        tempArray = document.getElementsByClassName(address +"-timedAuction-Countdown");
        for(let i=0;i<tempArray.length;i++) {
          if (endTime >= currentTime && !secondRound) {
            clearInterval(timers[_this.id]);
            delete timers[_this.id]
            $('.'+ address + "-timedAuction-Headline").html(`<b>Auction ends in<b/>`);
            timed_auction_trigger(_this, true)
            return
          } else if(endTime <= currentTime) {
            tempArray[i].innerHTML = "Expired";
          }
        }
        $('.'+ address + "-timedAuction-Headline").hide();
      }
    }
  }, 1000);
}


