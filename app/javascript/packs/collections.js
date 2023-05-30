$(document).ready(function () {
  $(document).on("change", "#collection_put_on_sale", function () {
    if (
      $(this).is(":checked") &&
      $("#collection_timed_auction_enabled").is(":checked")
    ) {
      $("#collection_minimum_bid").closest("li").removeClass("hide");
      $("#collection_start_time").closest("li").removeClass("hide");
    } else if (
      !$("#collection_put_on_sale").is(":checked") &&
      $("#collection_instant_sale_enabled").is(":checked")
    ) {
      $("#collection_minimum_bid").closest("li").addClass("hide");
    } else {
      $("#collection_instant_sale_enabled").prop("checked", false).change();
      $("#collection-unlock-on-purchase").prop("checked", false).change();
      $("#collection_timed_auction_enabled").prop("checked", false).change();
      $("#collection_minimum_bid").closest("li").addClass("hide");
      $("#collection_start_time").closest("li").addClass("hide");
    }
  });

  $(document).on("change", "#collection-allow-bid", function () {
    if (
      $(this).is(":checked") &&
      $("#collection_timed_auction_enabled").is(":checked")
    ) {
      $("#collection_minimum_bid").closest("li").removeClass("hide");
    } else if (
      $(this).is(":checked") &&
      $("#collection_instant_sale_enabled").is(":checked")
    ) {
      $("#collection_start_time").closest("li").addClass("hide");
    } else {
      $("#collection_minimum_bid").val("");
      $("#collection_minimum_bid").closest("li").addClass("hide");
    }

    if ($("#collection_timed_auction_running").val() == "true") {
      if ($(this).is(":checked")) {
        $("#collection-allow-bid").prop("checked", false);
        return toastr.error(
          "Allow Bid cannot be enabled while Auction Running."
        );
      } else if (!$(this).is(":checked")) {
        $("#collection-allow-bid").prop("checked", true);
        return toastr.error(
          "Allow Bid cannot be disabled while Auction Running."
        );
      }
    }
  });

  $(document).on("change", "#collection_instant_sale_enabled", function () {
    if ($(this).is(":checked")) {
      $("#instPrice").removeClass("hide");
      $("#timesale").removeClass("hide");
      if ($("#collection_timed_auction_running").val() == "true") {
        $("#instPrice").addClass("hide");
        $("#collection_instant_sale_enabled").prop("checked", false);
        return toastr.error(
          "Instant Sale price cannot be enabled while Auction Running."
        );
      }
    } else {
      if ($("#collection_timed_auction_running").val() == "true") {
        $("#instPrice").removeClass("hide");
        $("#collection_instant_sale_price").prop("disabled", true);
        $("#collection_instant_sale_enabled").prop("checked", true);
        return toastr.error(
          "Instant Sale price cannot be disabled while Auction Running."
        );
      }
      $("#instPrice").addClass("hide");
      if (
        !$(this).is(":checked") &&
        !$("#collection-allow-bid").is(":checked")
      ) {
        $("#collection_timed_auction_enabled").prop("checked", false).change();
        $("#collection_start_time").closest("li").addClass("hide");
        $("#collection_minimum_bid").closest("li").addClass("hide");
      }
    }
  });

  $(document).on("change", "#collection_timed_auction_enabled", function () {
    if ($(this).is(":checked")) {
      if (
        !$("#collection-allow-bid").is(":checked") &&
        !$("#collection_instant_sale_enabled").is(":checked")
      ) {
        $("#collection_timed_auction_enabled").prop("checked", false).change();
        return toastr.error(
          "Timed Auction would not be enabled without enabling Put on Sale/Instant Sale Price."
        );
      } else if ($("#collection-allow-bid").is(":checked")) {
        $("#collection_minimum_bid").closest("li").removeClass("hide");
        $("#collection_start_time").closest("li").removeClass("hide");
      } else if ($("#collection_instant_sale_enabled").is(":checked")) {
        $("#collection_start_time").closest("li").removeClass("hide");
      }
    } else if (!$(this).is(":checked")) {
      $("#collection_minimum_bid").closest("li").addClass("hide");
      $("#collection_start_time").closest("li").addClass("hide");
    }
  });

  // $('#collection_timed_auction_enabled').click(function(){
  //   auctionChange(this)
  // });

  function auctionChange(_this) {
    if ($(_this).is(":checked")) {
      $("#collection_minimum_bid").closest("li").removeClass("hide");
      $("#collection_start_time").closest("li").removeClass("hide");
    } else {
      $("#collection_minimum_bid").closest("li").addClass("hide");
      $("#collection_start_time").closest("li").addClass("hide");
    }
  }

  $(document).on("change", "#collection-unlock-on-purchase", function () {
    if ($(this).is(":checked")) {
      $(".unlock-description-section").removeClass("hide");
    } else {
      $(".unlock-description-section").addClass("hide");
    }
  });

  $(document).on("change", "#collection_timed_auction_enabled", function () {
    if ($(this).is(":checked")) {
      $(".timed_auction_hide").removeClass("hide");
    } else {
      $(".timed_auction_hide").addClass("hide");
    }
  });

  $(document).on("change", "#collection-unlock-referral-fee", function () {
    if ($(this).is(":checked")) {
      $(".referral-fee").removeClass("hide");
    } else {
      $(".referral-fee").addClass("hide");
    }
  });

  if ($("#referral_percentage").val()?.length > 0) {
    $("#collection-unlock-referral-fee").prop("checked", true);
    $(".referral-fee").removeClass("hide");
  }

  $(document).on("change", "input[name=chooseCollection]", function () {
    var collectionType = $("input[name=chooseCollection]")
      .filter(":checked")
      .val();
    if (collectionType == "create") {
      $(".Own_contract_partials").removeClass("hide");
    } else {
      $(".Own_contract_partials").addClass("hide");
    }
  });

  // Collection Attribute Add/Remove section
  function updateJsonField() {
    var data = {};
    $.each(
      $(".collection-attribute-section .collection-attribute-entry"),
      function (i, collection) {
        var attrKey = $(collection).find(".attr-key").val();
        var attrVal = $(collection).find(".attr-val").val();
        if (attrKey.length > 0 && attrVal.length > 0) {
          data[attrKey] = attrVal;
        }
      }
    );
    $(".collection-data-val").val(JSON.stringify(data));
  }

  function processAttribute(_this) {
    var inputKey = _this
      .closest(".collection-attribute-entry")
      .find(".attr-key")
      .val();
    var inputVal = _this
      .closest(".collection-attribute-entry")
      .find(".attr-val")
      .val();

    if (inputKey.length > 0 && inputVal.length > 0) {
      var totalEntry = $(
        ".collection-attribute-section .collection-attribute-entry"
      ).length;
      var nonEmptyKey = $(".attr-key").filter(function () {
        return this.value === "";
      });
      var nonEmptyval = $(".attr-val").filter(function () {
        return this.value === "";
      });

      if (nonEmptyKey.length <= 1 && nonEmptyval.length <= 1) {
        var collectionAttrLength = $(".collection-attribute-entry").length;
        var clonedDiv = $(".collection-attribute-entry-base").clone();
        clonedDiv.removeClass("hide collection-attribute-entry-base");
        clonedDiv
          .find(".attr-key")
          .attr(
            "name",
            "collection[attributes][" + collectionAttrLength + "][key]"
          );
        clonedDiv
          .find(".attr-val")
          .attr(
            "name",
            "collection[attributes][" + collectionAttrLength + "][val]"
          );
        clonedDiv.appendTo(".collection-attribute-section");
      }
    }

    if (inputKey.length === 0 || inputVal.length === 0) {
      var emptyKey = $(".attr-key").filter(function () {
        return this.value === "";
      });
      var emptyval = $(".attr-val").filter(function () {
        return this.value === "";
      });

      if (emptyKey.length == 3 || emptyval.length === 3) {
        var totalEntry = $(
          ".collection-attribute-section .collection-attribute-entry"
        ).length;
        var collections = $(
          ".collection-attribute-section .collection-attribute-entry"
        );
        var currentCollection = collections[totalEntry - 1];
        currentCollection.remove();
      }
    }

    updateJsonField();
  }

  $(document).on("change", "#collection-unlock-referral-fee", function () {
    if ($(this).is(":checked")) {
      $(".referral-fee").removeClass("hide");
    } else {
      $(".referral-fee").addClass("hide");
    }
  });

  // Collection Attribute Add/Remove section end

  $(document).on("keyup", ".attr-key", function () {
    processAttribute($(this));
  });

  $(document).on("keyup", ".attr-val", function () {
    processAttribute($(this));
  });

  // // ERC 721 section
  // $(document).on("click", ".chooseCollectionNft", function() {
  //   $("#createOwnErc721").modal("hide")
  //   $("#createOwnErc721").find(":input").prop("disabled", true)
  // })
  // // ERC 721 section end

  // Process and Approve section

  $(document).on("click", ".triggerCollectionValidation", function (e) {
    e.preventDefault();
    let cdate,
      current_time,
      st_date,
      st_time,
      start_time,
      en_date,
      en_time,
      end_time;
    cdate = new Date();
    current_time = new Date(
      cdate.getFullYear(),
      cdate.getMonth(),
      cdate.getDate(),
      cdate.getHours(),
      cdate.getMinutes()
    );
    if ($("#collection_start_time").val() != "") {
      st_date = $("#collection_start_time").val().split("/");
      st_time = st_date[2].split(" ")[1];
      start_time = new Date(
        st_date[2].split(" ")[0],
        st_date[1] - 1,
        st_date[0],
        st_time.split(":")[0],
        st_time.split(":")[1]
      );
    }
    if ($("#collection_end_time").val() != "") {
      en_date = $("#collection_end_time").val().split("/");
      en_time = en_date[2].split(" ")[1];
      end_time = new Date(
        en_date[2].split(" ")[0],
        en_date[1] - 1,
        en_date[0],
        en_time.split(":")[0],
        en_time.split(":")[1]
      );
    }
    var form = $("#collectionCreateForm")[0];
    var source = $("#collection_source").val();
    if (source == "opensea" || form.checkValidity()) {
      var mintType = $("input[name=chooseMintType]").filter(":checked").val();
      var isImportNft = $("#collection_imported").val();
      if (isImportNft == undefined && mintType == undefined) {
        return toastr.error("Please select minting type");
      } else {
        if (
          $("#collection_instant_sale_enabled").is(":checked") &&
          !validFloat($("#collection_instant_sale_price").val())
        ) {
          return toastr.error("Please enter valid instant price.");
        } else if (
          $("#no_of_copies").length &&
          !validNum($("#no_of_copies").val())
        ) {
          return toastr.error("Please enter valid no of copies");
        } else if (
          $("#no_of_copies").length &&
          $("#no_of_copies")[0].validationMessage !== ""
        ) {
          return toastr.error(
            "Number of copies " +
              $("#no_of_copies")[0].validationMessage.toLowerCase()
          );
        } else if (
          $("input[name=chooseCollection]").filter(":checked").val() ==
            "create" &&
          mintType == "lazy"
        ) {
          return toastr.error("Lazy Minting disabled with Own Contract");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          $("#collection-allow-bid").is(":checked") &&
          !validFloat($("#collection_minimum_bid").val())
        ) {
          return toastr.error("Please enter Minimum Bid");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          (!$("#collection_start_time").val() ||
            !$("#collection_end_time").val())
        ) {
          if (
            !$("#collection_start_time").val() &&
            !$("#collection_end_time").val()
          ) {
            return toastr.error("Please enter Auction Start & End time.");
          }
          if (
            !$("#collection_start_time").val() &&
            $("#collection_end_time").val()
          ) {
            return toastr.error("Please enter Auction Start time.");
          }
          if (
            $("#collection_start_time").val() &&
            !$("#collection_end_time").val()
          ) {
            return toastr.error("Please enter Auction End time.");
          }
        } else if (
          $("#collection-unlock-on-purchase").is(":checked") &&
          $("#collection-unlock-description").val() == ""
        ) {
          return toastr.error("Please enter Unlock Description.");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          start_time.getTime() < current_time.getTime()
        ) {
          return toastr.error("Auction Start time should be Future Time.");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          end_time.getTime() < current_time.getTime()
        ) {
          return toastr.error("Auction End time should be Future Time.");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          end_time.getTime() == start_time.getTime()
        ) {
          return toastr.error(
            "Auction Start Time & End time should not be the same time."
          );
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          end_time.getTime() <= start_time.getTime()
        ) {
          return toastr.error(
            "Auction End time should not be less or equal to the Start Time."
          );
        } else {
          if ($("#collection_instant_sale_enabled").is(":checked") === false) {
            // $('#collection_instant_sale_price').val('')
          }
          if ($("#collection_timed_auction_enabled").is(":checked") === false) {
            $("#collection_minimum_bid").val("");
            $("#collection_bid_time").val("");
          }
          $("#submitCollection").click();
          $("#collectionCreateForm :input").prop("disabled", true);
        }
      }
    } else {
      var collectionType = $("input[name=chooseCollection]")
        .filter(":checked")
        .val();
      if ($("#file-1").val() === "") {
        return toastr.error("Please select collection file");
      } else if ($("#collection-category option:selected").length === 0) {
        return toastr.error("Please select categories");
      } else if (collectionType === undefined) {
        return toastr.error("Please select collection type");
      } else if ($("#collection-name").val() === "") {
        return toastr.error("Please provide collection name");
      } else if ($("#description").val() === "") {
        return toastr.error("Please provide collection description");
      } else if (
        $("#no_of_copies").length &&
        !validNum($("#no_of_copies").val())
      ) {
        return toastr.error("Please enter valid no of copies");
      } else if (parseFloat($("#royalties").val()) > 50) {
        return toastr.error("Royalty must be less than or equal to 50");
      } else {
        toastr.error("Please fill all required fields.");
      }
    }
  });

  $(document).on("click", ".collection-submit", function (e) {
    e.preventDefault();
    $(this).text("In Progress");
    $(this)
      .closest(".row")
      .find("status-icon")
      .html('<div class="follow-step-2-icon"><div class="loader"></div></div>');
    $(".collection-submit-btn").click();
  });

  $(document).on("click", ".default-btn", function (e) {
    e.preventDefault();
  });

  $(document).on("click", ".createOwnErc721Form", function () {
    startContractDeploy($("#collection_contract_type").val());
  });

  window.startContractDeploy = function startContractDeploy(contractType) {
    var name = $("#nft_contract_name").val();
    var symbol = $("#nft_contract_symbol").val();
    var desc = $("#nft_contract_desc").val();
    var ref_fee = $("#nft_contract_referral_percentage").val();
    var imageElement = document.getElementById("nft_contract_attachment").files;
    var image = null;
    var cover_imageElement =
      document.getElementById("nft_contract_cover").files;
    var cover_image = null;
    if (imageElement.length > 0) {
      image = imageElement[0];
    }
    if (cover_imageElement.length > 0) {
      cover_image = cover_imageElement[0];
    }
    var collectionId = $("#collection_id").val();
    if (!name || !symbol || !image || !desc || !cover_image) {
      toastr.info("Provide valid name, image, description and symbol");
      $.magnificPopup.close();
      $.magnificPopup.open({
        closeOnBgClick: false,
        enableEscapeKey: false,
        items: {
          src: "#createOwnErc721",
        },
        type: "inline",
      });
    } else {
      var compiled_details = getContractABIAndBytecode("", contractType, false); //shared=false
      var abi = compiled_details["compiled_contract_details"]["abi_factory"];
      var bytecode = compiled_details["compiled_contract_details"]["bytecode"];
      contractDeployInit();
      deployContract(
        abi,
        bytecode,
        name,
        symbol,
        contractType,
        collectionId,
        image,
        desc,
        cover_image,
        ref_fee
      );
    }
  };

  window.contractDeployInit = function contractDeployInit() {
    $.magnificPopup.close();
    $.magnificPopup.open({
      closeOnBgClick: false,
      enableEscapeKey: false,
      items: {
        src: "#deployContract",
      },
      type: "inline",
    });
    $(".deployProgress").removeClass("hide");
    $(".deployDone").addClass("hide");
    $(".deployRetry").addClass("hide");
    $(".signStart").addClass("grey").removeClass("hide");
    $(".signProgress").addClass("hide");
    $(".signRetry").addClass("hide");
    $(".signDone").addClass("hide");
  };

  window.contractDeploySuccess = function contractDeploySuccess(
    contractAddress,
    contractType
  ) {
    $(".deployProgress").addClass("hide");
    $(".deployProgress").addClass("hide");
    $(".deployDone").addClass("disabledLink").removeClass("hide");
    initCollectionCreate(contractAddress, contractType);
  };

  window.contractDeployFailed = function (error) {
    getRpcErrorMessageToast(error);
    $(".deployProgress").addClass("hide");
    $(".deployDone").addClass("hide");
    $(".deployRetry").removeClass("hide").addClass("grey");
  };

  $(document).on("click", ".deployRetry", function () {
    startContractDeploy($("#collection_contract_type").val());
  });

  window.initCollectionCreate = function (contractAddress, contractType) {
    var existingToken = $("#collection_token").val();
    collectionCreateInit(false, existingToken);
    var sharedCollection =
      $("input[name=chooseCollection]").filter(":checked").val() === "nft";
    approveNFT(
      contractType,
      contractAddress,
      sharedCollection,
      "collection",
      existingToken
    );
  };

  window.collectionCreateInit = function collectionCreateInit(
    lazyMint = false,
    existingToken = null
  ) {
    var existingToken = $("#collection_token").val();
    if ($("#collection_instant_sale_enabled").is(":checked")) {
      $(".signFixedPrice").removeClass("hide");
    } else {
      $(".signFixedPrice").addClass("hide");
    }
    show_modal("#collectionStepModal");
    if (existingToken) {
      $(".mintFlow").addClass("hide");
    }
    if (lazyMint) {
      $(".mintFlow").addClass("hide");
      $(".approveFlow").addClass("hide");
    }
    $("#deployContract").modal("hide");
    $("#collectionStepModal").modal("show");
    $(".allProgress").addClass("hide");
    $(".allDone").addClass("hide");
    $(".allRetry").addClass("hide");
    $(".allStart").removeClass("hide").addClass("grey");
    $(".approveProgress").removeClass("hide");
  };

  window.collectionApproveSuccess = function collectionApproveSuccess(
    contractType,
    existingToken = null
  ) {
    mintCollectionCreate(contractType, existingToken);
  };

  function mintCollectionCreate(contractType, existingToken = null) {
    $(".allProgress").addClass("hide");
    $(".allDone").addClass("hide");
    $(".allRetry").addClass("hide");
    $(".allStart").addClass("hide").addClass("grey");
    $(".approveDone")
      .removeClass("hide")
      .removeClass("grey")
      .addClass("disabledLink");
    $(".mintProgress").removeClass("hide");
    $(".signFixPriceStart").removeClass("hide").addClass("grey");
    // TODO: WHILE CHANGE NFT TO SHARED/OWNER THS HAS TO BE CHANGED
    if (existingToken) {
      if ($("#collection_instant_sale_enabled").is(":checked")) {
        initSignFixedPriceProcess();
      } else {
        toastr.success("Collection created succcessfully.");
        window.location.href = "/collections/" + $("#collection_id").val();
      }
    } else {
      var sharedCollection =
        $("input[name=chooseCollection]").filter(":checked").val() === "nft";
      if ($("#collection_royalty_fee").val().length == 0) {
        var wallet_address = [$("#collection_wallet_address").val()];
        var royalties = [0];
      } else {
        var wallet_address = JSON.parse(
          $("#collection_royalty_fee").val()
        ).wallet_address;
      }
      if (contractType === "nft721") {
        createCollectible721(
          $("#collection_contract_address").val(),
          $("#collection_token_uri").val(),
          $("#collection_royalty_fee").val(),
          $("#collection_id").val(),
          sharedCollection
        );
      } else if (contractType === "nft1155") {
        createCollectible1155(
          $("#collection_contract_address").val(),
          $("#collection_supply").val(),
          $("#collection_token_uri").val(),
          $("#collection_royalty_fee").val(),
          $("#collection_id").val(),
          sharedCollection
        );
      }
    }
  }

  window.collectionApproveFailed = function collectionApproveFailed(error) {
    getRpcErrorMessageToast(error);
    $(".allProgress").addClass("hide");
    $(".allDone").addClass("hide");
    $(".allRetry").addClass("hide");
    $(".allStart").removeClass("hide").addClass("grey");
    $(".approveRetry").removeClass("hide");
  };

  $(document).on("click", ".approveRetry", function () {
    if ($("#priceChange").length) {
      initApproveResale();
    } else {
      initCollectionCreate(
        $("#collection_contract_address").val(),
        $("#collection_contract_type").val()
      );
    }
  });

  $(document).on("click", ".mintRetry", function () {
    mintCollectionCreate($("#collection_contract_type").val());
  });

  window.collectionMintSuccess = async function (collectionId) {
    if ($("#collection_instant_sale_enabled").is(":checked")) {
      $(".mintProgress").addClass("hide");
      $(".mintDone").removeClass("hide");

      initSignFixedPriceProcess();
      return;
    }
    toastr.success("Collection created successfully.");
    window.location.href = "/collections/" + collectionId;
  };

  window.collectionMintFailed = function (error) {
    getRpcErrorMessageToast(error);
    $(".allProgress").addClass("hide");
    $(".allDone").addClass("hide");
    $(".allRetry").addClass("hide");
    $(".allStart").removeClass("hide").addClass("grey");
    $(".approveDone")
      .removeClass("hide")
      .removeClass("grey")
      .addClass("disabledLink");
    $(".mintStart").addClass("hide");
    $(".mintRetry").removeClass("hide");
  };

  window.initSignFixedPriceProcess = function (lazyMint = false) {
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approveDone").removeClass("hide");
    $(".mintDone").removeClass("hide");
    $(".signFixPriceProgress").removeClass("hide");
    var pay_token_address =
      $("#collection_timed_auction_running").val() == "true"
        ? $("#collection_erc20_token_id").attr("data-address")
        : $("#collection_erc20_token_id option:selected, this").attr("address");
    var details = fetchCollectionDetails(null, pay_token_address);
    if (details) {
      const tokenId = lazyMint ? 0 : details["token_id"];
      signSellOrder(
        details["unit_price"],
        details["pay_token_decimal"],
        details["pay_token_address"],
        tokenId,
        details["asset_address"],
        details["collection_id"],
        "",
        details["asset_supply"]
      );
    } else {
      bidSignFixedFailed(
        "Unable to fetch token details. Please try again later"
      );
    }
  };

  window.bidSignFixedSuccess = function bidSignFixedSuccess(collectionId) {
    toastr.success("Collection created succcessfully.");
    window.location.href = "/collections/" + collectionId;
  };

  window.bidSignFixedFailed = function bidSignFailed(error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approveDone").removeClass("hide");
    $(".mintDone").removeClass("hide");
    $(".signFixPriceRetry").removeClass("hide");
  };

  $(document).on("click", ".signFixPriceRetry", function () {
    if ($("#priceChange").length) {
      initSignFixedPriceUpdate();
    } else {
      initSignFixedPriceProcess(
        $("input[name=chooseMintType]").filter(":checked").val() === "lazy"
      );
    }
  });

  // BIDDING MODEL STARTS HERE
  // Process and Approve section
  $(document).on("click", ".triggerBiddingValidation", function (e) {
    clearToastr();
    e.preventDefault();
    var form = $("#biddingForm")[0];
    if ($("#bid_qty").length && !validNum($("#bid_qty").val())) {
      return toastr.error("Please enter valid quantity");
    } else if (!validFloat($("#bid_amt").val())) {
      return toastr.error("Please enter valid price");
    } else if (form.checkValidity()) {
      if (parseFloat($("#collection_min_bid_price").val()) > 0) {
        if (
          $("#collection_min_bid_price_currency").val() ==
          $("#bid_currency option:selected").text()
        ) {
          if ($("#first_bid").val() == "true") {
            if (
              parseFloat($("#collection_min_bid_price").val()) >
              parseFloat($("#bid_amt").val())
            ) {
              return toastr.error(
                "Please enter price greater than minimum bid price."
              );
            }
          } else {
            if (
              parseFloat($("#collection_min_bid_price").val()) >=
              parseFloat($("#bid_amt").val())
            ) {
              return toastr.error(
                "Please enter price greater than minimum bid price."
              );
            }
          }
        } else {
          if ($("#first_bid").val() == "true") {
            if (
              parseFloat($("#min_bid_usd_price").val) >
              parseFloat($("#bid_amt").val() * $("#own_token_usd_price").val())
            ) {
              return toastr.error(
                "Please enter price greater than minimum bid price."
              );
            } else {
              if (
                parseFloat($("#min_bid_usd_price").val()) >=
                parseFloat(
                  $("#bid_amt").val() * $("#own_token_usd_price").val()
                )
              ) {
                return toastr.error(
                  "Please enter price greater than minimum bid price."
                );
              }
            }
          }
        }
        if (
          gon.owntokenSymbol.includes($("#bid_currency option:selected").text())
        ) {
          if (
            parseFloat($("#currency_max_bid_usd_price").val()) >=
            parseFloat($("#bid_amt").val() * $("#own_token_usd_price").val())
          ) {
            return toastr.error(
              "Please enter price greater than minimum bid price."
            );
          }
        } else if (
          parseFloat($("#currency_max_bid_usd_price").val()) >=
          parseFloat($("#bid_amt").val() * $("#weth_live_price").val()).toFixed(
            2
          )
        ) {
          return toastr.error(
            "Please enter price greater than minimum bid price."
          );
        }
      }
      // $("#biddingForm :input").prop("disabled", true);
      var contractAddress = $("#bid_currency :selected").attr("address");
      var decimals = $("#bid_currency :selected").attr("decimals");
      initBidProcess(contractAddress, decimals);
    } else if ($("#bid_qty")[0].validationMessage !== "") {
      return toastr.error($("#bid_qty")[0].validationMessage);
    }
  });

  // TODO: WHILE ADDING NEW CUREENCIES HAVE TO MAKE LOGIC TO FETCH DECIMALS HERE
  window.initBidProcess = function initBidProcess(
    contractAddress,
    contractDecimal
  ) {
    var curErc20Balance = $("#erc20_balance").text();
    var ethBalance = $("#eth_balance").text();
    var totalAmt = $("#bid-total-amt-dp").attr("bidAmt");
    var symbol = $("#bid_currency :selected").text();
    var check_own_token = gon.owntokenSymbol.includes(symbol);
    if (!isGreaterThanOrEqualTo(curErc20Balance, totalAmt) && check_own_token) {
      return toastr.error("Insufficient funds");
    } else if (isGreaterThanOrEqualTo(curErc20Balance, totalAmt)) {
      $(".convertEth").addClass("hide");
      initApproveBidProcess(contractAddress);
    } else if (
      symbol != "WMATIC" &&
      isGreaterThanOrEqualTo(ethBalance, totalAmt)
    ) {
      convertEthToWeth(totalAmt);
    } else {
      $("#biddingForm :input").prop("disabled", false);

      $.magnificPopup.close();
      return toastr.error("Not enough balance");
    }
  };

  window.bidConvertSuccess = function bidConvertSuccess(transactionHash) {
    $(".convertProgress").addClass("hide");
    $(".convertDone").removeClass("hide");
    var contractAddress = $("#bid_currency option:selected, this").attr(
      "address"
    );
    initApproveBidProcess(contractAddress);
  };

  window.bidConvertFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".allStart").removeClass("hide").addClass("grey");
    $(".convertRetry").removeClass("hide");
  };

  window.initApproveBidProcess = function initApproveBidProcess(
    contractAddress,
    decimals = 18
  ) {
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebidProgress").removeClass("hide");
    $(".signbidStart").removeClass("hide");
    $.magnificPopup.close();
    $.magnificPopup.open({
      closeOnBgClick: false,
      enableEscapeKey: false,
      items: {
        src: "#placeBid",
      },
      type: "inline",
      callbacks: {
        close: function () {
          $("#biddingForm :input").prop("disabled", false);
        },
      },
    });
    approveERC20(
      contractAddress,
      "erc20",
      toNum($("#bid-total-amt-dp").attr("bidAmt")),
      decimals
    );
  };

  window.bidApproveSuccess = function bidApproveSuccess(
    transactionHash,
    contractAddress
  ) {
    $(".approvebidProgress").addClass("hide");
    $(".approvebidDone").removeClass("hide");
    var contractAddress = $("#bid_currency option:selected, this").attr(
      "address"
    );
    initSignBidProcess(contractAddress);
  };

  window.bidApproveFailed = function bidApproveFailed(error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebidRetry").removeClass("hide");
    $(".signbidStart").removeClass("hide");
  };

  $(document).on("click", ".approvebidRetry", function () {
    var contractAddress = $("#bid_currency option:selected, this").attr(
      "address"
    );
    initApproveBidProcess(contractAddress);
  });

  window.initSignBidProcess = function initSignBidProcess(contractAddress) {
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebidDone").removeClass("hide");
    $(".signbidProgress").removeClass("hide");
    var details = fetchCollectionDetails(null, contractAddress);
    if (details) {
      bidAsset(
        details["asset_address"],
        details["token_id"],
        $("#bid_qty").val(),
        toNum($("#bid-total-amt-dp").attr("bidAmt")),
        details["pay_token_address"],
        details["pay_token_decimal"],
        details["collection_id"],
        $("#bid-total-amt-dp").attr("bidPayAmt")
      );
    } else {
      bidSignFailed("Unable to fetch token details. Please try again later");
    }
  };

  window.bidSignSuccess = function bidSignSuccess(collectionId) {
    toastr.success("Bidding succces.");
    window.location.href = "/collections/" + collectionId;
  };

  window.bidSignFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebidDone").removeClass("hide");
    $(".signbidRetry").removeClass("hide");
  };

  $(document).on("click", ".signbidRetry", function () {
    var contractAddress = $("#bid_currency option:selected, this").attr(
      "address"
    );
    initSignBidProcess(contractAddress);
  });

  // BUYING MODAL STARTS HERE
  $(document).on("click", ".triggerBuyValidation", function (e) {
    clearToastr();
    e.preventDefault();
    if (!validNum($("#buy_qty").val())) {
      return toastr.error("Please enter valid quantity");
    } else if (
      !isLessThanOrEqualTo(
        $("#buy_qty").val(),
        $("#buy_qty").attr("maxQuantity")
      )
    ) {
      return toastr.error(
        "Maximum quantity available is " + $("#buy_qty").attr("maxQuantity")
      );
    } else {
      $("#buyForm :input").prop("disabled", true);

      // var href = window.location.href;
      // var $get_href = $(".href").text(href);
      // var params = $get_href?.prevObject?.[0]?.location?.search.split("&");
      // var token = params[1]?.split("=")[1];
      // var referralSign = params[2]?.split("=")[1];
      // if(referralAdd == undefined){

      // } else {
      initBuyProcess();
      // }
    }
  });

  // NFTPAY BUYING MODAL STARTS HERE
  $(document).on("click", ".triggerCreditCardPay", function (e) {
    clearToastr();
    e.preventDefault();
    if (!validNum($("#credit_card_buy_qty").val())) {
      return toastr.error("Please enter valid quantity");
    } else if (
      !isLessThanOrEqualTo(
        $("#credit_card_buy_qty").val(),
        $("#credit_card_buy_qty").attr("maxQuantity")
      )
    ) {
      return toastr.error(
        "Maximum quantity available is " +
          $("#credit_card_buy_qty").attr("maxQuantity")
      );
    } else {
      $("#creaditCardBuyForm :input").prop("disabled", true);

      // var href = window.location.href;
      // var $get_href = $(".href").text(href);
      // var params = $get_href?.prevObject?.[0]?.location?.search.split("&");
      // var token = params[1].split("=")[1];
      // var referralSign = params[2].split("=")[1];
      // if(referralAdd == undefined){

      // } else {
      initCredtiCardProcess();
      // }
    }
  });

  window.initBuyProcess = function initBuyProcess() {
    var curErc20Balance = $("#erc20_balance").text();
    var ethBalance = $("#eth_balance").text();
    var totalAmt = $("#buy-total-amt-dp").attr("buyAmt");

    var $referral_link_params = $("#referral_link_params__").val();
    var referred_collection = $("#referred_collection").val();
    var split_string = $referral_link_params.split("&");

    var check_own_token = gon.owntokenSymbol.includes(
      $("#buy_currency").text().trim()
    );
    if (Number(curErc20Balance) == 0 && check_own_token) {
      $("#buyForm :input").prop("disabled", false);
      $.magnificPopup.close();
      return toastr.error("Insufficient funds");
    }
    if (!isGreaterThanOrEqualTo(curErc20Balance, totalAmt) && check_own_token) {
      $("#buyForm :input").prop("disabled", false);
      $.magnificPopup.close();
      return toastr.error("Insufficient funds");
    } else if (isGreaterThanOrEqualTo(curErc20Balance, totalAmt)) {
      $(".convertEth").addClass("hide");
      initApproveBuyProcess(
        $("#buyContractAddress").text(),
        $("#buyContractDecimals").text()
      );
    } else if (isGreaterThanOrEqualTo(ethBalance, totalAmt)) {
      convertEthToWeth(totalAmt, "Buy");
    } else {
      $("#buyForm :input").prop("disabled", false);
      // $("#placeBuy").modal("hide");
      $.magnificPopup.close();
      return toastr.error("Not enough balance");
    }
  };

  window.initCredtiCardProcess = function initCredtiCardProcess() {
    $.magnificPopup.close();
    $.magnificPopup.open({
      closeOnBgClick: false,
      enableEscapeKey: false,
      items: {
        src: "#placeCreditCardPay",
      },
      type: "inline",
      callbacks: {
        close: function () {
          $("#creaditCardBuyForm :input").prop("disabled", false);
        },
      },
    });
    $(".purchaseAndMintStart").removeClass("hide");
    $("#credit-card-modal").modal("hide");
    $("#placeCreditCardPay").modal("show");
    initCreditCardPurchaseProcess($("#buyContractAddress").text());
  };

  window.initCreditCardPurchaseProcess =
    async function initCreditCardPurchaseProcess(erc20ContractAddress) {
      hideAll();
      $(".convertDone").removeClass("hide");
      $(".approvebuyDone").removeClass("hide");
      $(".purchaseProgress").removeClass("hide");
      $(".purchaseAndMintProgress").removeClass("hide");
      var paymentDetails = fetchCollectionDetails(null, erc20ContractAddress);
      const title = $(".title-item").val();
      const decimals = toNum(paymentDetails["pay_token_decimal"]);
      const buyingAssetQty = toNum($("#credit_card_buy_qty").val());
      var isLazyMinted = $("#is_collection_lazy_minted").val() === "true";
      const unitPrice = roundNumber(
        mulBy(toNum(paymentDetails["unit_price"]), 10 ** decimals),
        0
      );
      const paymentAmt = toNum(
        $("#credit-card-buy-total-amt-dp").attr("buyAmt")
      );
      const paymentAmtInWei = roundNumber(mulBy(paymentAmt, 10 ** decimals), 0);

      let royalty;

      if (paymentDetails["royalty"]) {
        royalty = paymentDetails["royalty"];
      } else {
        royalty = 0;
      }
      let collectionName = $("#credit_card_collection_name").text().trim();
      initWertWidget(
        collectionName,
        paymentDetails["creator_address"],
        paymentDetails["owner_address"],
        toNum(paymentDetails["asset_type"]),
        paymentDetails["asset_address"],
        paymentDetails["token_id"],
        unitPrice,
        buyingAssetQty,
        paymentAmtInWei,
        paymentDetails["pay_token_address"],
        paymentDetails["seller_sign"],
        paymentDetails["collection_id"],
        paymentDetails["token_uri"],
        royalty,
        paymentDetails["total"],
        paymentDetails["trade_address"],
        isLazyMinted
      );
      // setNftPayIframe(
      //   paymentDetails["owner_address"],
      //   paymentDetails["pay_token_address"],
      //   paymentDetails["asset_type"],
      //   paymentDetails["asset_address"],
      //   unitPrice,
      //   paymentAmtInWei,
      //   paymentDetails["token_id"],
      //   token_uri,
      //   paymentDetails["total"],
      //   royalty,
      //   buyingAssetQty,
      //   paymentDetails["seller_sign"],
      //   paymentDetails["collection_id"],
      //   isLazyMinted,
      //   collectionName,
      //   paymentDetails["trade_address"]
      // );
    };

  window.buyConvertSuccess = function buyConvertSuccess(transactionHash) {
    $(".convertProgress").addClass("hide");
    $(".convertDone").removeClass("hide");
    initApproveBuyProcess(
      $("#buyContractAddress").text(),
      $("#buyContractDecimals").text()
    );
  };

  window.buyConvertFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".allStart").removeClass("hide").addClass("grey");
    $(".convertRetry").removeClass("hide");
  };

  window.initApproveBuyProcess = function initApproveBuyProcess(
    contractAddress,
    contractDecimals
  ) {
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebuyProgress").removeClass("hide");
    $(".purchaseStart").removeClass("hide");
    $.magnificPopup.close();
    $.magnificPopup.open({
      closeOnBgClick: false,
      enableEscapeKey: false,
      items: {
        src: "#placeBuy",
      },
      type: "inline",
      callbacks: {
        close: function () {
          $("#buyForm :input").prop("disabled", false);
        },
      },
    });
    $(".purchaseAndMintStart").removeClass("hide");
    $("#Buy-modal").modal("hide");
    $("#placeBuy").modal("show");
    approveERC20(
      contractAddress,
      "erc20",
      toNum($("#buy-total-amt-dp").attr("buyAmt")),
      contractDecimals,
      "Buy"
    );
  };

  window.buyApproveSuccess = function buyApproveSuccess(
    transactionHash,
    contractAddress
  ) {
    $(".approvebuyProgress").addClass("hide");
    $(".approvebuyDone").removeClass("hide");
    initPurchaseProcess(contractAddress);
  };

  window.buyApproveFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebuyRetry").removeClass("hide");
    $(".purchaseStart").removeClass("hide");
  };

  $(document).on("click", ".approvebuyRetry", function () {
    initApproveBuyProcess(
      $("#buyContractAddress").text(),
      $("#buyContractDecimals").text()
    );
  });

  window.initPurchaseProcess = function initPurchaseBuyProcess(
    contractAddress
  ) {
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebuyDone").removeClass("hide");
    $(".purchaseProgress").removeClass("hide");
    $(".purchaseAndMintProgress").removeClass("hide");
    var paymentDetails = fetchCollectionDetails(null, contractAddress);
    const paymentAmt = toNum($("#buy-total-amt-dp").attr("buyAmt"));
    const buyingAssetQty = toNum($("#buy_qty").val());
    console.log(paymentDetails["token_id"], 'paymentDetails["token_id"]');
    const decimals = toNum(paymentDetails["pay_token_decimal"]);
    if ($("#is_collection_lazy_minted").val() == "true") {
      MintAndBuyAsset(
        paymentDetails["owner_address"],
        toNum(paymentDetails["asset_type"]),
        paymentDetails["asset_address"],
        paymentDetails["token_id"],
        toNum(paymentDetails["unit_price"]),
        toNum($("#buy_qty").val()),
        toNum($("#buy-total-amt-dp").attr("buyAmt")),
        paymentDetails["pay_token_address"],
        toNum(paymentDetails["pay_token_decimal"]),
        paymentDetails["seller_sign"],
        paymentDetails["collection_id"],
        paymentDetails["token_uri"],
        paymentDetails["royalty"],
        paymentDetails["shared"],
        paymentDetails["total"],
        paymentDetails["trade_address"]
      );
    } else {
      buyAsset(
        paymentDetails["owner_address"],
        toNum(paymentDetails["asset_type"]),
        paymentDetails["asset_address"],
        paymentDetails["token_id"],
        toNum(paymentDetails["unit_price"]),
        toNum($("#buy_qty").val()),
        toNum($("#buy-total-amt-dp").attr("buyAmt")),
        paymentDetails["pay_token_address"],
        toNum(paymentDetails["pay_token_decimal"]),
        paymentDetails["seller_sign"],
        paymentDetails["collection_id"],
        paymentDetails["asset_supply"],
        paymentDetails["token_uri"],
        paymentDetails["royalty"]
      );
    }
  };

  window.buyPurchaseSuccess = function buyPurchaseSuccess(collectionId) {
    $(".convertDone").removeClass("hide");
    $(".approvebuyDone").removeClass("hide");
    $(".purchaseProgress").addClass("hide");
    $(".purchaseMintAndProgress").addClass("hide");
    $(".purchaseDone").removeClass("hide");
    $(".purchaseAndMintDone").removeClass("hide");
    toastr.success("Purchase success.");
    window.location.href = "/collections/" + collectionId;
  };

  window.buyPurchaseFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebuyDone").removeClass("hide");
    $(".purchaseRetry").removeClass("hide");
  };

  $(document).on("click", ".purchaseRetry", function () {
    initPurchaseProcess($("#buyContractAddress").text());
  });

  $(document).on("click", ".execButton", function (e) {
    clearToastr();
    $(".bidExecDetail").text($(this).attr("bidDetail"));
    $("#bidByUser").text($(this).attr("bidUser"));
    $(".executeBidSymbol").text($(this).attr("bidSymbol"));
    $("#contractAddress").text($(this).attr("contractAddress"));
    $("#erc20ContractAddress").text($(this).attr("erc20ContractAddress"));
    $("#bidId").val($(this).attr("bidId"));
    calculateBidExec($(this));
    show_modal("#bidDetail");
  });

  // EXECUTING BID MODEL HERE
  $(document).on("click", ".triggerExecuteBidValidation", function (e) {
    clearToastr();
    e.preventDefault();
    show_modal("#executeBid");
    initApproveExecBidProcess();
  });

  window.initApproveExecBidProcess = function () {
    var contractType = $("#contractType").text();
    var contractAddress = $("#contractAddress").text();
    approveNFT(
      contractType,
      contractAddress,
      gon.collection_data["contract_shared"],
      "executeBid"
    );
  };

  window.approveBidSuccess = function () {
    hideAll();
    $(".approveExecbidDone").removeClass("hide");
    $(".acceptBidProgress").removeClass("hide");
    initAcceptBidProcess();
  };

  window.approveBidFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".approveExecbidRetry").removeClass("hide");
    $(".approveBidStart").removeClass("hide");
  };

  $(document).on("click", ".approveExecBidRetry", function () {
    initApproveExecBidProcess();
  });

  window.initAcceptBidProcess = function () {
    const contractAddress = $("#erc20ContractAddress").text();
    const paymentDetails = fetchCollectionDetails(
      $("#bidId").val(),
      contractAddress
    );
    var lazyMint = $("#is_collection_lazy_minted").val();
    if (lazyMint == "true") {
      $(".MintAndacceptBidProgress").removeClass("hide");
      MintAndAcceptBid(
        paymentDetails["buyer_address"],
        toNum(paymentDetails["asset_type"]),
        paymentDetails["asset_address"],
        paymentDetails["token_id"],
        toNum(paymentDetails["amount_with_fee"]),
        toNum(paymentDetails["quantity"]),
        paymentDetails["pay_token_address"],
        toNum(paymentDetails["pay_token_decimal"]),
        paymentDetails["buyer_sign"],
        paymentDetails["collection_id"],
        paymentDetails["bid_id"],
        paymentDetails["token_uri"],
        paymentDetails["royalty"],
        paymentDetails["shared"],
        paymentDetails["total"],
        paymentDetails["trade_address"]
      );
    } else {
      executeBid(
        paymentDetails["buyer_address"],
        toNum(paymentDetails["asset_type"]),
        paymentDetails["asset_address"],
        paymentDetails["token_id"],
        toNum(paymentDetails["amount_with_fee"]),
        toNum(paymentDetails["quantity"]),
        paymentDetails["pay_token_address"],
        toNum(paymentDetails["pay_token_decimal"]),
        paymentDetails["buyer_sign"],
        paymentDetails["collection_id"],
        paymentDetails["bid_id"]
      );
    }
  };

  window.acceptBidSuccess = function (collectionId) {
    hideAll();
    $(".allDone").removeClass("hide");
    toastr.success("Bid accept success.");
    window.location.href = "/collections/" + collectionId;
  };

  window.acceptBidFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".approveExecbidDone").removeClass("hide");
    $(".acceptBidRetry").removeClass("hide");
  };

  $(document).on("click", ".acceptBidRetry", function () {
    hideAll();
    $(".approveExecbidDone").removeClass("hide");
    $(".acceptBidProgress").removeClass("hide");
    initAcceptBidProcess();
  });

  // BUYING MODEL STARTS HERE
  $(document).on("click", ".triggerBurn", function (e) {
    clearToastr();
    e.preventDefault();
    if ($(".burnQuantity").length && !validNum($(".burnQuantity").val())) {
      return toastr.error("Please enter valid quantity");
    } else {
      var form = $("#tokenBurnForm")[0];
      if (form.checkValidity()) {
        show_modal("#burnToken");
        initBurnProcess($(".burnQuantity").val());
      } else if ($("#burn_qty")[0].validationMessage !== "") {
        return toastr.error($("#burn_qty")[0].validationMessage);
      }
    }
  });

  window.initBurnProcess = function initBurnProcess(burnQuantity) {
    var paymentDetails = fetchCollectionDetails();
    burnNFT(
      paymentDetails["contract_type"],
      paymentDetails["asset_address"],
      paymentDetails["token_id"],
      burnQuantity,
      paymentDetails["collection_id"],
      paymentDetails["shared"]
    );
  };

  window.burnSuccess = function burnSuccess(transactionHash) {
    $(".burnProgress").addClass("hide");
    $(".burnDone").removeClass("hide");
    toastr.success("Burned successfully.");
    window.location.href = "/";
  };

  window.burnFailed = function burnFailed(error) {
    getRpcErrorMessageToast(error);
    $(".burnProgress").addClass("hide");
    $(".burnRetry").removeClass("hide");
  };

  $(document).on("click", ".burnRetry", function () {
    initBurnProcess($(".burnQuantity").val());
  });

  // TRANSFERRING MODEL STARTS HERE
  $(document).on("click", ".triggerTransfer", function (e) {
    clearToastr();
    e.preventDefault();
    var form = $("#tokenTransferForm")[0];
    if ($("#address").val().length == 0) {
      return toastr.error("Please enter user address");
    } else if (
      $("#transfer_qty").length &&
      !validNum($("#transfer_qty").val())
    ) {
      return toastr.error("Please enter valid quantity");
    } else if (form.checkValidity()) {
      var address = fetchTransferDetails();
      if (address) {
        show_modal("#transferToken");
        initTransferProcess(
          $(".transferAddress").val(),
          $(".transferQuantity").val()
        );
      } else {
        return toastr.error(
          "Invalid user address. Please provide address of the user registered in the application"
        );
      }
    } else if ($("#transfer_qty")[0].validationMessage !== "") {
      return toastr.error($("#transfer_qty")[0].validationMessage);
    }
  });

  function fetchTransferDetails() {
    var resp = false;
    $.ajax({
      url: "/collections/" + $("#collection_id").val() + "/fetch_transfer_user",
      type: "GET",
      async: false,
      data: { address: $(".transferAddress").val() },
      success: function (data) {
        if (data.errors) {
          toastr.error(data["error"]);
        } else {
          resp = data["address"];
        }
      },
    });
    return resp;
  }
  $(document).on(
    "click",
    "#remove_from_sale_id, .removeSaleRetry",
    function (e) {
      e.preventDefault();
      hideAll();
      $(".removeSaleProgress").removeClass("hide");
      if ($("#instant_sale_enabled").val() == "true") {
        show_modal("#removeSaleModalData");
        const { nonce } = getRemoveData();
        removeSale(nonce);
      } else {
        removeFromSale();
      }
    }
  );
  window.removeFromSale = function removeFromSale() {
    var resp = false;
    $.ajax({
      url: "/collections/" + $("#collection_id").val() + "/remove_from_sale",
      type: "GET",
      async: false,
      success: function (respVal) {
        console.log(respVal);
        // resp = respVal
        toastr.success("Nft removed from sale successfully");
        window.location.reload("/collections/" + respVal["address"]);
      },
    });
    return resp;
  };

  function getRemoveData() {
    var resp = false;
    $.ajax({
      url:
        "/collections/" + $("#collection_id").val() + "/remove_from_sale_data",
      type: "POST",
      async: false,
      success: function (respVal) {
        resp = respVal;
      },
    });
    return resp;
  }

  function fetchTokenCurrentPrice() {
    var resp = false;
    $.ajax({
      url:
        "/collections/" + $("#collection_id").val() + "/fetch_cur_token_price",
      type: "GET",
      async: false,
      // data: {token_id: token_id, bid_amt: bidAmt},
      success: function (respVal) {
        resp = respVal;
      },
    });
    return resp;
  }

  window.initTransferProcess = function initTransferProcess(
    recipientAddress,
    transferQty
  ) {
    var paymentDetails = fetchCollectionDetails();
    if (
      recipientAddress.toLowerCase() ==
      paymentDetails["owner_address"].toLowerCase()
    ) {
      toastr.error(
        "You can't transfer your own tokens to you. Please try to transfer to another user."
      );
      $.magnificPopup.close();
    } else {
      directTransferNFT(
        paymentDetails["contract_type"],
        paymentDetails["asset_address"],
        recipientAddress,
        paymentDetails["token_id"],
        transferQty,
        gon.collection_data["contract_shared"],
        paymentDetails["collection_id"]
      );
    }
  };

  window.directTransferSuccess = function directTransferSuccess(
    transactionHash,
    collectionId
  ) {
    $(".transferProgress").addClass("hide");
    $(".transferDone").removeClass("hide");
    toastr.success("Transferred successfully.");
    window.location.href = "/collections/" + collectionId;
  };

  window.directTransferFailed = function (error) {
    getRpcErrorMessageToast(error);
    $(".transferProgress").addClass("hide");
    $(".transferRetry").removeClass("hide");
  };

  $(document).on("click", ".transferRetry", function () {
    initTransferProcess(
      $(".transferAddress").val(),
      $(".transferQuantity").val()
    );
  });

  // PRICECHANGE MODEL STARTS HERE

  $(document).on("click", ".triggerPriceChange", function (e) {
    e.preventDefault();
    var details = fetchCollectionDetails();
    if (details["is_lazy_minted"]) {
      if ($("#collection_instant_sale_enabled").is(":checked")) {
        if (!validFloat($("#collection_instant_sale_price").val())) {
          return toastr.error("Please enter valid instant price.");
        }
        hideAll();
        $(".approveFlow").addClass("hide");
        $.magnificPopup.close();
        show_modal("#priceChange");
        initSignFixedPriceUpdate();
      } else {
        //  show_modal('#removeSaleModalData')
        // const { nonce } = getRemoveData()
        // removeSale(nonce)
        $("#submitPriceChange").trigger("click");
      }
    } else {
      initApproveResale();
    }
  });

  window.initApproveResale = function initApproveResale() {
    if (
      $("#collection-put-on-sale").is(":checked") ||
      $("#collection_instant_sale_enabled").is(":checked")
    ) {
      if ($("#collection_instant_sale_enabled").is(":checked")) {
        if (!validFloat($("#collection_instant_sale_price").val())) {
          return toastr.error("Please enter valid instant price.");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          !validFloat($("#collection_minimum_bid").val())
        ) {
          return toastr.error("Please enter minimum bid");
        } else if (
          $("#collection_timed_auction_enabled").is(":checked") &&
          !$("#collection_start_time").val() &&
          !$("#collection_end_time").val()
        ) {
          return toastr.error("Please enter bid time");
        } else if (
          $("#collection_instant_sale_price").val() !=
          $("#collection_instant_sale_price").attr("prevVal")
        ) {
          $(".signFixedPrice").removeClass("hide");
        }
      }

      const minBidVal =
        $("#collection_timed_auction_enabled").is(":checked") &&
        $("#collection_instant_sale_enabled").is(":checked") &&
        $("#collection_minimum_bid").val() >
          $("#collection_instant_sale_price").val();

      if (minBidVal) {
        return toastr.error(
          "Minimum bid cant be more than instant selling price"
        );
      }

      if (
        $("#collection-put-on-sale").is(":checked") &&
        $("#collection_ismultiple").val() == "true"
      ) {
        const copies = $("#no_of_copies").val();
        if (copies <= 0) {
          return toastr.error("Please enter valid token numbers");
        }
        const max = Number($("#no_of_copies").attr("max"));
        if (max < copies) {
          return toastr.error(
            "Please enter number of copies less than or equal to " + max
          );
        }
      }

      // $("#change-price").modal("hide");
      // $("#priceChange").modal("show");
      $.magnificPopup.close();
      show_modal("#priceChange");
      if ($("#collection_instant_sale_enabled").is(":checked")) {
        $(".approveRetry").addClass("hide");
        $(".approveProgress").removeClass("hide");
        var details = fetchCollectionDetails();
        approveResaleNFT(
          details["contract_type"],
          details["asset_address"],
          details["shared"]
        );
      } else {
        show_modal("#removeSaleModalData");
        const { nonce } = getRemoveData();
        removeSale(nonce);
        // hideAll()
        // $('.approveFlow').addClass('hide')
        // initSignFixedPriceUpdate()
      }
    } else {
      $("#submitPriceChange").click();
    }
  };

  window.approveResaleSuccess = function approveResaleSuccess() {
    hideAll();
    $(".approveDone").removeClass("hide");
    if ($("#collection_instant_sale_enabled").is(":checked")) {
      initSignFixedPriceUpdate();
    } else {
      $("#submitPriceChange").click();
    }
  };

  window.approveResaleFailed = function (error) {
    getRpcErrorMessageToast(error);
    $(".approveProgress").addClass("hide");
    $(".approveRetry").removeClass("hide");
  };

  window.initSignFixedPriceUpdate = function () {
    hideAll();
    $(".approveDone").removeClass("hide");
    $(".signFixedPrice").removeClass("hide");
    $(".signFixPriceRetry").addClass("hide");
    $(".signFixPriceProgress").removeClass("hide");
    var pay_token_address =
      $("#collection_timed_auction_running").val() == "true"
        ? $("#collection_erc20_token_id").attr("data-address")
        : $("#collection_erc20_token_id option:selected, this").attr("address");
    var pay_token_decimal =
      $("#collection_timed_auction_running").val() == "true"
        ? $("#collection_erc20_token_id").attr("data-decimals")
        : $("#collection_erc20_token_id option:selected, this").attr(
            "decimals"
          );
    var details = fetchCollectionDetails(null, pay_token_address);
    if (details) {
      signSellOrder(
        $("#collection_instant_sale_price").val(),
        pay_token_decimal,
        pay_token_address,
        details["token_id"],
        details["asset_address"],
        details["collection_id"],
        "update",
        details["asset_supply"]
      );
    } else {
      bidSignFixedFailed(
        "Unable to fetch token details. Please try again later"
      );
    }
  };

  window.updateSignFixedSuccess = function updateSignFixedSuccess(
    collectionId
  ) {
    $("#submitPriceChange").click();
    $(".signFixPriceProgress").addClass("hide");
    $(".signFixPriceDone").removeClass("hide");
    toastr.success("Collection price updated successfully.");
    window.location.href = "/collections/" + collectionId;
  };

  window.updateSignFixedFailed = function (error) {
    console.log({ error });
    getRpcErrorMessageToast(error);
    hideAll();
    $(".approveDone").removeClass("hide");
    $(".signFixPriceRetry").removeClass("hide");
  };

  // COMMON METHODS FOR BIDDING MODEL
  function hideAll() {
    $(".allProgress").addClass("hide");
    $(".allDone").addClass("hide");
    $(".allRetry").addClass("hide");
    $(".allStart").addClass("hide");
  }

  window.hideAll = hideAll;

  $("#createOwnErc721, #deployContract, #collectionStepModal").on(
    "hidden.bs.modal",
    function () {
      $("#collectionCreateForm :input").prop("disabled", false);
    }
  );

  $(document).on("click", ".collectionModalClose", function () {
    $("#collectionCreateForm :input").prop("disabled", false);
  });

  function convertEthToWeth(totalAmt, callBackType = "Bid") {
    $(".allRetry").addClass("hide");
    $(".convertProgress").removeClass("hide");
    $.magnificPopup.close();
    $.magnificPopup.open({
      closeOnBgClick: false,
      enableEscapeKey: false,
      items: {
        src: "#place" + callBackType,
      },
      type: "inline",
    });
    convertWETH(totalAmt, callBackType);
  }

  $(document).on("click", ".convertRetry", function () {
    if ($("#bid-total-amt-dp").attr("bidAmt") === undefined) {
      convertEthToWeth($("#buy-total-amt-dp").attr("buyAmt"), "Buy");
    } else {
      convertEthToWeth($("#bid-total-amt-dp").attr("bidAmt"), "Bid");
    }
  });

  $(document).on("click", ".buy-now", function () {
    loadTokenBalance(
      $("#buyContractAddress").text(),
      $("#buyContractDecimals").text()
    );
  });

  $(document).on("click", ".bid-now", function () {
    var sym = $("#bid_currency :selected").text();
    var contractAddress = $("#bid_currency :selected").attr("address");
    var decimals = $("#bid_currency :selected").attr("decimals");
    loadTokenBalance(contractAddress, decimals, sym);
  });

  window.loadTokenBalance = async function loadTokenBalance(
    contractAddress,
    decimals,
    symbol
  ) {
    var assetBalance = await tokenBalance(contractAddress, decimals);
    $(".ercCurBalance").text(assetBalance);
    $("#erc20_balance").text(assetBalance);
    $("#biding-asset-balance").text(mergeAmountSymbol(assetBalance, symbol));
  };

  function fetchCollectionDetails(bidId, erc20Address) {
    var resp = false;
    var erc20Address;
    $.ajax({
      url: "/collections/" + $("#collection_id").val() + "/fetch_details",
      type: "GET",
      async: false,
      data: { bid_id: bidId, erc20_address: erc20Address },
      success: function (respVal) {
        resp = respVal["data"];
      },
    });
    return resp;
  }

  window.calculateBid = async function calculateBid(feePercentage) {
    var sym = $("#bid_currency :selected").text();
    var contractAddress = $("#bid_currency :selected").attr("address");
    var decimals = $("#bid_currency :selected").attr("decimals");
    if ($("#bid_qty").val()) {
      var qty =
        $("#bid_qty")
          .val()
          .replace(/[^0-9]/g, "") || 0;
    } else {
      var qty = 1;
    }
    var price =
      $("#bid_amt")
        .val()
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, "$1") || 0;
    var payAmt = multipliedBy(price, qty);
    var serviceFee = parseFloat(percentageOf(feePercentage, payAmt));
    var totalAmt = plusNum(payAmt, serviceFee);
    $("#bid-amt-dp").html(mergeAmountSymbol(serviceFee, sym));
    $("#bid-total-amt-dp").html(mergeAmountSymbol(totalAmt, sym));
    var biddingAssetBalance =
      (await tokenBalance(contractAddress, decimals)) || 0;
    $("#erc20_balance").text(biddingAssetBalance);
    $("#biding-asset-balance").text(
      mergeAmountSymbol(biddingAssetBalance, sym)
    );
    $("#bid-total-amt-dp").attr("bidAmt", totalAmt);
    $("#bid-total-amt-dp").attr("bidPayAmt", payAmt);
  };

  window.calculateBuy = function calculateBuy(feePercentage) {
    var price = $("#buy_price").attr("price");
    var qty =
      $("#buy_qty")
        .val()
        .replace(/[^0-9]/g, "") || 0;
    var payAmt = multipliedBy(price, qty);
    var serviceFee = parseFloat(percentageOf(feePercentage, payAmt));
    var totalAmt = plusNum(payAmt, serviceFee);
    $("#buy-amt-dp").html(numToString(serviceFee));
    $("#buy-total-amt-dp").html(numToString(totalAmt));
    $("#buy-total-amt-dp").attr("buyAmt", numToString(totalAmt));
  };

  window.calculateCreditCardBuy = function calculateCreditCardBuy(
    feePercentage
  ) {
    var price = $("#credit_card_buy_price").attr("price");
    var qty =
      $("#credit_card_buy_qty")
        .val()
        .replace(/[^0-9]/g, "") || 0;
    var payAmt = multipliedBy(price, qty);
    var serviceFee = parseFloat(percentageOf(feePercentage, payAmt));
    var totalAmt = plusNum(payAmt, serviceFee);
    $("#credit-card-buy-amt-dp").html(numToString(serviceFee));
    $("#credit-card-buy-total-amt-dp").html(numToString(totalAmt));
    $("#credit-card-buy-total-amt-dp").attr("buyAmt", numToString(totalAmt));
  };

  window.calculateBidExec = function calculateBidExec(thisBid) {
    var payAmt = thisBid.attr("price");
    var qty = thisBid.attr("qty");
    var serviceFee = $("#SellerserviceFee").text();
    var serviceFee = percentageOf(serviceFee, payAmt);
    var totalAmt = minusNum(payAmt, serviceFee);
    $("#execServiceFee").html(numToString(serviceFee));
    if ($("#royaltyFee").attr("royaltyPercentage")) {
      var royaltyFeePer = $("#royaltyFee").attr("royaltyPercentage");
      var royaltyFee = percentageOf(royaltyFeePer, payAmt);
      $("#executeBidRoyaltyFee").html(royaltyFee);
      var totalAmt = minusNum(totalAmt, royaltyFee);
    }
    $("#executeBidFinalAmt").html(numToString(totalAmt));
  };

  $(document).on("click", ".change-price", function () {
    $(".change-price-modal-title").text($(this).text());
  });

  // Collection - Detail page buy and Place bid button action
  $(document).on("click", ".show-login-message", function (e) {
    toastr.error("Please connect your wallet to proceed.");
    e.preventDefault();
  });

  $(document).on("click", ".pending-admin-approval", function (e) {
    toastr.error("Please connect to your wallet and proceed.");
    e.preventDefault();
  });

  window.initLazyMint = function initLazyMint() {
    // approveCollection($('#collection_id').val());
    if ($("#collection_instant_sale_enabled").is(":checked")) {
      collectionCreateInit(true, null);
      initSignFixedPriceProcess(true);
    } else {
      toastr.success("Collection created succcessfully.");
      window.location.href = "/collections/" + $("#collection_id").val();
    }
  };

  window.buyMintAndPurchaseFailed = function (error) {
    getRpcErrorMessageToast(error);
    hideAll();
    $(".convertDone").removeClass("hide");
    $(".approvebuyDone").removeClass("hide");
    $(".purchaseRetry").removeClass("hide");
  };
});

$(document).on("click", ".chooseCollectionType", function (e) {
  if ($(this).val() == "create") {
    $("#lazy_minting").hide();
    $("#chooseMintType_mint").prop("checked", true);
  } else {
    $("#lazy_minting").show();
  }
});

$(document).on("click", "li#lazy_minting", function (e) {
  $("#auctionBid").hide();
});

$(document).on("click", "li#instant_minting", function (e) {
  $("#auctionBid").show();
});

$(document).on("click", ".createContractClose", function (e) {
  $("#collectionCreateForm :input").prop("disabled", false);
});

$(document).on("click", "#view-rewards", function (e) {
  getReferralRewards().then(() => {
    $(".loading-rewards").show();
    $("#view-rewards").hide();

    if (
      parseFloat($("#sokuReferralRewards")[0].innerText) > 0 ||
      parseFloat($("#wethReferralRewards")[0].innerText) > 0
    ) {
      $(".loading-rewards").hide();

      $(".claim-soku-referral").show().attr("style", "display: flex;");
      $(".claim-eth-referral").show().attr("style", "display: flex;");
    } else {
      $(".loading-rewards").hide();
      $(".no-current-rewards").show();
    }
  });
});

$(document).on("click", "#claimSokuRewards", function (e) {
  const sokuAddress = gon.sokuAddress;
  if (parseFloat($("#sokuReferralRewards")[0].innerText) > 0) {
    withdrawRefRewards(sokuAddress);
  }
});

$(document).on("click", "#claimWethRewards", function (e) {
  const wethAddress = gon.wethAddress;
  if (parseFloat($("#wethReferralRewards")[0].innerText) > 0) {
    withdrawRefRewards(wethAddress);
  }
});

$(document).on("click", "#view-rewards", function (e) {
  getReferralRewards();
});

$(document).on("click", ".buy-with-credit-card", function (e) {
  $("#buy-with-card").show();
  $("#buy-with-crypto").hide();
});

$(document).on("click", ".crypto-buy", function (e) {
  $("#buy-with-crypto").show();
  $("#buy-with-card").hide();
});

$(document).on("keyup keydown change", ".ref__input", function (e) {
  if (toNum($(this).val()) > 50 && e.keyCode !== 46 && e.keyCode !== 8) {
    e.preventDefault();
    $(this).val("50");
  }
});
