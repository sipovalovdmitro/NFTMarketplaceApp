require("packs/ethereum/web3.js")
require('packs/formatter.js');
global.BigNumber = require('bignumber.js');
global.toastr = require("toastr")

$(document).on('click', '#fee_submit', function() {
    // console.log($('select#fee_type').val());
    $("div.loading-gif.displayInMiddle").show();
    if ($('select#fee_type').val() === 'Buyer') {
        updateBuyerServiceFee(parseInt($('input#fee_percentage').val()))
    } else if ($('select#fee_type').val() === 'Seller') {
        updateSellerServiceFee(parseInt($('input#fee_percentage').val()))
    } else if ($('select#fee_type').val() === 'Platform') {
        $("form#fee_form").submit();
        $("div.loading-gif.displayInMiddle").hide();
    } else {
      toastr.error('Please select the fee type.');
      $("div.loading-gif.displayInMiddle").hide();
    }
});