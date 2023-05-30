import axios from "axios";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import WalletConnect from "@walletconnect/web3-provider";
import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import { EthereumAddressFromSignedMessageResponse } from "@coinbase/wallet-sdk/dist/relay/Web3Response";
import WertWidget from "@wert-io/widget-initializer";
import { signSmartContractData } from "@wert-io/widget-sc-signer";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer/";
const ed = require("@noble/ed25519");

window.Buffer = Buffer; // needed to use `signSmartContractData` in browser

const tokenURIPrefix = gon.tokenURIPrefix;
const transferProxyContractAddress = gon.transferProxyContractAddress;
const wethAddress = gon.wethAddress;
const sokuAddress = gon.sokuAddress;
const sushiRouterAddress = gon.sushiRouterAddress;
const tradeContractAddress = gon.tradeContractAddress;
const factoryContractAddressFor721 = gon.factoryContractAddressFor721;
const factoryContractAddressFor1155 = gon.factoryContractAddressFor1155;
const sessionWallet = gon.wallet;
const DEFAULT_NETWORK = gon.network;
const DEFAULT_NETWORK_ID = gon.chainId;
const wertPrivateKey = gon.wertPrivateKey;
const wertPartnerId = gon.wertPartnerId;
let signer;
let provider;

const providerOptions = {
  walletlink: {
    package: CoinbaseWalletSDK,
    options: {
      appName: "SokuNFT",
      // infuraId: gon.rpc
      rpc: {
        [DEFAULT_NETWORK_ID]: gon.rpc,
      },
    },
  },
  walletconnect: {
    package: WalletConnect,
    options: {
      // infuraId: gon.rpc
      rpc: {
        [DEFAULT_NETWORK_ID]: gon.rpc,
      },
    },
  },
};

async function getCurrentAccount() {
  return await signer?.getAddress();
}

function getConnectedProvider() {
  return JSON.parse(localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER"));
}

async function loadWeb3() {
  const web3Modal = new Web3Modal({
    network: DEFAULT_NETWORK,
    cacheProvider: true,
    providerOptions,
  });

  if (!gon.session && web3Modal.cachedProvider) {
    web3Modal.clearCachedProvider();
  }

  const instance = await web3Modal.connect();
  gon.provider = provider = new ethers.providers.Web3Provider(instance);
  signer = provider.getSigner();
  if (provider && gon.session) {
    provider?.provider.on("accountsChanged", async function () {
      await load(true);
      window.location.reload();
    });
    provider?.provider.on("chainChanged", async function (id) {
      if (DEFAULT_NETWORK_ID != id) {
        window.disconnect(signer?.getAddress());
        window.location.reload();
      }
    });
  }
  return signer.getAddress();
}

$(async function () {
  if (gon.session && !loadWeb3()) {
    await destroySession();
  }
  $(document).on("click", ".connect_to_wallet", function (e) {
    e.preventDefault();
    connect();
  });
  setTimeout(checkNetwork, 1000);
});

async function checkNetwork() {
  try {
    if (provider) {
      const network = await provider.getNetwork();
      if (network["chainId"] == DEFAULT_NETWORK_ID) {
        $(".loading-gif-network").hide();
        updateEthBalance();
      } else {
        window.disconnect(signer?.getAddress());
        toastr.error("Please connect to Ethereum Mainnet");
        await switchNetwork();
      }
    }
  } catch (e) {
    console.error("Unable to change network");
  }
}

async function switchNetwork() {
  try {
    const network = await provider.getNetwork();
    if (network["chainId"] != DEFAULT_NETWORK_ID) {
      if (provider.connection.url != "metamask") {
        return $(".loading-gif-network").show();
      }
      await provider.send("wallet_switchEthereumChain", [
        { chainId: ethers.utils.hexValue(DEFAULT_NETWORK_ID).toString() },
      ]);
      window.location.reload();
    }
  } catch (switchError) {}
}

async function createUserSession(address, balance, destroy_session, wallet) {
  const config = {
    headers: {
      "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content"),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  const resp = await axios
    .post(
      `/sessions`,
      {
        address,
        balance,
        destroy_session,
        wallet,
      },
      config
    )
    .then((response) => {
      return resp;
    })
    .catch((err) => {
      console.log("User Session Create Error", err);
    });
  return resp;
}

async function destroyUserSession(address) {
  const config = {
    data: {},
    headers: {
      "X-CSRF-TOKEN": $('[name="csrf-token"]')[0].content,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  const resp = axios
    .delete(`/sessions/${address}`, config)
    .then((response) => response)
    .catch((err) => console.log("Session Error: ", err));
  return resp;
}

function updateTokenId(tokenId, collectionId, txId) {
  var request = $.ajax({
    url: `/collections/${collectionId}/update_token_id`,
    async: false,
    type: "POST",
    data: { tokenId: tokenId, collectionId: collectionId, tx_id: txId },
    dataType: "script",
  });
  request.done(function (msg) {
    console.log("Token Id updated for collection", collectionId);
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Failed to update token id");
  });
}

function saveContractNonceValue(collectionId, sign) {
  var request = $.ajax({
    url: `/collections/${collectionId}/save_contract_nonce_value`,
    async: false,
    type: "POST",
    data: { signature: sign },
    dataType: "script",
  });
  request.done(function (msg) {
    console.log("Contract Nonce Value updated.");
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Failed to update nonce value");
  });
}

window.createContract = function createContract(formData) {
  var request = $.ajax({
    url: "/users/create_contract",
    async: false,
    type: "POST",
    data: formData,
    dataType: "script",
    processData: false,
    contentType: false,
    cache: false,
  });
  request.done(function (msg) {
    console.log("Contract created successfully.");
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Failed to create contract");
  });
};

function updateCollectionBuy(
  collectionId,
  quantity,
  transactionHash,
  tokenId = 0
) {
  var invite_link = window.location.href;
  var invite_token = invite_link.split("?")[1]?.split("=")[1];

  var request = $.ajax({
    url: "/collections/" + collectionId + "/buy",
    type: "POST",
    async: false,
    data: {
      quantity: quantity,
      transaction_hash: transactionHash,
      tokenId,
      invite_token,
    },
    dataType: "script",
    success: function (respVal) {
      console.log(respVal);
    },
  });
}

function updateCollectionSell(
  collectionId,
  buyerAddress,
  bidId,
  transactionHash,
  tokenId = 0
) {
  var request = $.ajax({
    url: "/collections/" + collectionId + "/sell",
    type: "POST",
    async: false,
    data: {
      address: buyerAddress,
      bid_id: bidId,
      transaction_hash: transactionHash,
      tokenId,
    },
    dataType: "script",
    success: function (respVal) {
      console.log(respVal);
    },
  });
}

function updateOwnerTransfer(
  collectionId,
  recipientAddress,
  transactionHash,
  transferQuantity
) {
  var request = $.ajax({
    url: "/collections/" + collectionId + "/owner_transfer",
    type: "POST",
    async: false,
    data: {
      recipient_address: recipientAddress,
      transaction_hash: transactionHash,
      transaction_quantity: transferQuantity,
    },
    dataType: "script",
    success: function (respVal) {
      console.log(respVal);
    },
  });
}

function updateBurn(collectionId, transactionHash, burnQuantity) {
  var request = $.ajax({
    url: "/collections/" + collectionId + "/burn",
    type: "POST",
    async: false,
    data: {
      transaction_hash: transactionHash,
      transaction_quantity: burnQuantity,
    },
    dataType: "script",
    success: function (respVal) {
      console.log(respVal);
    },
  });
}

async function isValidUser(address, token, wallet) {
  const config = {
    headers: {
      "X-CSRF-TOKEN": token,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  const resp = await axios
    .get(
      `/sessions/valid_user`,
      { params: { address: address, authenticity_token: token, wallet } },
      config
    )
    .then((response) => {
      console.log("validate user", response);
      return response.data;
    })
    .catch((err) => {
      console.log("User Session Validate Error", err);
    });
  return resp;
}

function placeBid(collectionId, sign, quantity, bidDetails, nonce) {
  var request = $.ajax({
    url: `/collections/${collectionId}/bid`,
    type: "POST",
    async: false,
    data: { sign: sign, quantity: quantity, details: bidDetails, nonce },
    dataType: "script",
  });
  request.done(function (msg) {
    console.log("Bidding success.");
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Bidding failed. Please contact support");
  });
}

function signMetadataHash(collectionId, contractAddress) {
  var sign;
  var request = $.ajax({
    url: `/collections/${collectionId}/sign_metadata_hash`,
    type: "POST",
    async: false,
    data: { contract_address: contractAddress },
    dataType: "json",
  });
  request.done(function (msg) {
    sign = { sign: msg["signature"], nonce: msg["nonce"] };
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Request failed. Please contact support");
  });
  return sign;
}

function updateSignature(collectionId, sign, nonce) {
  var request = $.ajax({
    url: `/collections/${collectionId}/sign_fixed_price`,
    type: "POST",
    async: false,
    data: { sign, nonce },
    dataType: "script",
  });
  request.done(function (msg) {
    console.log("Signature updated.");
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Signature update failed. Please contact support");
  });
}

function getNonceValue(collectionId) {
  var nonce;
  var request = $.ajax({
    url: `/collections/${collectionId}/get_nonce_value`,
    type: "POST",
    async: false,
    data: {},
    dataType: "json",
  });
  request.done(function (data) {
    nonce = data["nonce"];
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Nonce failed. Please contact support");
  });
  return nonce;
}

function save_NonceValue(collectionId, sign, nonce) {
  var request = $.ajax({
    url: `/collections/${collectionId}/save_nonce_value`,
    type: "POST",
    async: false,
    data: { sign: sign, nonce: nonce },
    dataType: "script",
  });
  request.done(function (msg) {
    console.log("Nonce updated.");
  });
  request.fail(function (jqXHR, textStatus) {
    console.log("Nonce update failed. Please contact support");
  });
}

function getContractSignNonce(collectionId, sign) {
  let nonce = null;
  $.ajax({
    url: `/collections/${collectionId}/get_contract_sign_nonce`,
    type: "POST",
    async: false,
    data: { sign: sign },
    dataType: "json",
  })
    .done(function (data) {
      return (nonce = data?.nonce?.toString());
    })
    .fail(function (jqXHR, textStatus) {
      console.log("Nonce failed. Please contact support");
    });
  return nonce;
}

function getReferralAddress(collectionId, sign, token) {
  let address = null;
  $.ajax({
    url: `/collections/${collectionId}/get_referral_signed_address`,
    type: "GET",
    async: false,
    data: { sign: sign, token: token },
    dataType: "json",
  })
    .done(function (data) {
      address = data?.address?.toString();
    })
    .fail(function (jqXHR, textStatus) {
      console.log(jqXHR, textStatus, "res");
      console.log("Retrieving referral address failed. Please contact support");
      address = ethers.constants.AddressZero;
    });
  return address;
}

window.getContractABIAndBytecode = function getContractABIAndBytecode(
  contractAddress,
  type,
  shared = true
) {
  var res;
  var request = $.ajax({
    async: false,
    url: "/contract_abi",
    type: "GET",
    data: { contract_address: contractAddress, type: type, shared: shared },
    dataType: "json",
  });

  request.done(function (msg) {
    res = msg;
  });

  request.fail(function (jqXHR, textStatus) {
    console.log(textStatus);
  });
  return res;
};

function splitSign(sign, nonce) {
  let sig = ethers?.utils?.splitSignature(sign);
  return [sig?.v, sig?.r, sig?.s, nonce];
}

window.getContract = async function getContract(
  contractAddress,
  type,
  shared = true
) {
  var res = getContractABIAndBytecode(contractAddress, type, shared);
  var contractObj = new ethers.Contract(
    contractAddress,
    res["compiled_contract_details"]["abi"],
    provider
  );
  return contractObj;
};

window.createCollectible721 = async function createCollectible721(
  contractAddress,
  tokenURI,
  royaltyFee,
  collectionId,
  sharedCollection
) {
  try {
    var account = await getCurrentAccount();
    const contract721 = await fetchContract(
      contractAddress,
      "nft721",
      sharedCollection
    );
    var txn;
    if (sharedCollection) {
      var sign = signMetadataHash(collectionId, contractAddress);
      saveContractNonceValue(collectionId, sign);
      var signStruct = splitSign(sign["sign"], sign["nonce"]);
      txn = await contract721.mint(tokenURI, royaltyFee, signStruct);
    } else {
      txn = await contract721.mint(tokenURI, royaltyFee);
    }
    var tx = await txn.wait();
    var tokenId = parseInt(tx.events[0].topics[tx.events[0].topics.length - 1]);
    // check the token ID from the events above

    updateTokenId(tokenId, collectionId, tx.transactionHash);

    return window.collectionMintSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.collectionMintFailed(err);
  }
};

window.createCollectible1155 = async function createCollectible1155(
  contractAddress,
  supply,
  tokenURI,
  royaltyFee,
  collectionId,
  sharedCollection
) {
  try {
    var account = await getCurrentAccount();
    const contract1155 = await fetchContract(
      contractAddress,
      "nft1155",
      sharedCollection
    );
    var txn;
    if (sharedCollection) {
      var sign = signMetadataHash(collectionId, contractAddress);
      saveContractNonceValue(collectionId, sign);
      var signStruct = splitSign(sign["sign"], sign["nonce"]);
      txn = await contract1155.mint(tokenURI, royaltyFee, supply, signStruct);
    } else {
      txn = await contract1155.mint(tokenURI, royaltyFee, supply);
    }
    var tx = await txn.wait();
    var tokenId = parseInt(tx.events[0].data.slice(0, 66));
    updateTokenId(tokenId, collectionId, tx.transactionHash);
    return window.collectionMintSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.collectionMintFailed(err);
  }
};

window.approveNFT = async function (
  contractType,
  contractAddress,
  sharedCollection,
  sendBackTo = "collection",
  existingToken = null
) {
  try {
    var account = await getCurrentAccount();
    const contractapp = await fetchContract(
      contractAddress,
      contractType,
      sharedCollection
    );
    var isApproved = await contractapp.isApprovedForAll(
      account,
      transferProxyContractAddress
    );
    if (!isApproved) {
      var receipt = await contractapp.setApprovalForAll(
        transferProxyContractAddress,
        true
      );
      await receipt.wait();
    }
    if (sendBackTo == "executeBid") {
      return window.approveBidSuccess();
    } else {
      return window.collectionApproveSuccess(contractType, existingToken);
    }
  } catch (err) {
    console.error(err);
    if (sendBackTo == "executeBid") {
      return window.approveBidFailed(err);
    }
    return window.collectionApproveFailed(err);
  }
};

window.approveResaleNFT = async function (
  contractType,
  contractAddress,
  sharedCollection
) {
  try {
    var account = await getCurrentAccount();
    const resalenft = await fetchContract(
      contractAddress,
      contractType,
      sharedCollection
    );
    var isApproved = await resalenft.isApprovedForAll(
      account,
      transferProxyContractAddress
    );
    if (!isApproved) {
      var receipt = await resalenft.setApprovalForAll(
        transferProxyContractAddress,
        true
      );
      receipt = await receipt.wait();
    }
    return window.approveResaleSuccess(contractType);
  } catch (err) {
    console.error(err);
    return window.approveResaleFailed(err);
  }
};

window.fetchContract = async function (contractAddress, type, shared = true) {
  var compiledContractDetails = getContractABIAndBytecode(
    contractAddress,
    type,
    shared
  );
  var abi = compiledContractDetails["compiled_contract_details"]["abi"];
  var obj = new ethers.Contract(contractAddress, abi, provider);
  var connection = obj.connect(signer);
  return connection;
};

//TODO: OPTIMIZE
window.isApprovedNFT = async function isApprovedNFT(
  contractType,
  contractAddress
) {
  try {
    const approvedNft = await fetchContract(contractAddress, contractType);
    var account = await getCurrentAccount();
    var isApproved = await approvedNft.isApprovedForAll(
      account,
      transferProxyContractAddress
    );
    return isApproved;
  } catch (err) {
    console.error(err);
  }
};

// TODO: Return rewards
window.getReferralRewards = async function getReferralRewards() {
  try {
    const contract = await fetchContract(tradeContractAddress, "trade");
    const currentUser = await getCurrentAccount();
    const wethRewards = await contract.addressRefRewards(
      currentUser,
      wethAddress
    );
    const sokuRewards = await contract.addressRefRewards(
      currentUser,
      sokuAddress
    );

    $("#sokuReferralRewards").text(
      ethers.utils.formatEther(sokuRewards).toString()
    );
    $("#wethReferralRewards").text(
      ethers.utils.formatEther(wethRewards).toString()
    );
  } catch (e) {
    console.log(e);
  }
};

window.withdrawRefRewards = async function withdrawRefRewards(
  erc20tokenAddress
) {
  const contract = await fetchContract(tradeContractAddress, "trade");
  const account = await getCurrentAccount();

  const receipt = await contract.withdraw(erc20tokenAddress);
};

window.burnNFT = async function burnNFT(
  contractType,
  contractAddress,
  tokenId,
  supply = 1,
  collectionId,
  sharedCollection
) {
  try {
    const burnNft = await fetchContract(
      contractAddress,
      contractType,
      sharedCollection
    );
    var account = await getCurrentAccount();
    var receipt;
    if (contractType == "nft721") {
      receipt = await burnNft.burn(tokenId);
    } else if (contractType == "nft1155") {
      receipt = await burnNft.burn(account, tokenId, supply);
    }
    receipt = await receipt.wait();
    updateBurn(collectionId, receipt.transactionHash, supply);
    return window.burnSuccess(receipt.transactionHash);
  } catch (err) {
    console.error(err);
    return window.burnFailed(err);
  }
};

window.directTransferNFT = async function (
  contractType,
  contractAddress,
  recipientAddress,
  tokenId,
  supply = 1,
  shared,
  collectionId
) {
  try {
    const transferNft = await fetchContract(
      contractAddress,
      contractType,
      "true"
    );
    var account = await getCurrentAccount();
    var receipt;
    if (contractType == "nft721") {
      receipt = await transferNft["safeTransferFrom(address,address,uint256)"](
        account,
        recipientAddress,
        tokenId
      );
    } else if (contractType == "nft1155") {
      // TODO: Analyse and use proper one in future
      var tempData =
        "0x6d6168616d000000000000000000000000000000000000000000000000000000";
      receipt = await transferNft[
        "safeTransferFrom(address,address,uint256,uint256,bytes)"
      ](account, recipientAddress, tokenId, supply, tempData);
    }
    receipt = await receipt.wait();
    updateOwnerTransfer(
      collectionId,
      recipientAddress,
      receipt.transactionHash,
      supply
    );
    return window.directTransferSuccess(receipt.transactionHash, collectionId);
  } catch (err) {
    console.error(err);
    return window.directTransferFailed(err);
  }
};

window.approveERC20 = async function (
  contractAddress,
  contractType,
  amount,
  decimals = 18,
  sendBackTo = "Bid"
) {
  try {
    amount = roundNumber(mulBy(amount, 10 ** decimals), 0);
    const erc20Contract = await fetchContract(
      contractAddress,
      contractType,
      gon.collection_data["contract_shared"]
    );
    var account = await getCurrentAccount();
    const balance = await erc20Contract.allowance(
      account,
      transferProxyContractAddress
    );
    amount = BigInt(parseInt(balance) + parseInt(amount)).toString();
    var receipt = await erc20Contract.approve(
      transferProxyContractAddress,
      amount
    );
    receipt = await receipt.wait();
    if (sendBackTo == "Buy") {
      return window.buyApproveSuccess(receipt.transactionHash, contractAddress);
    }
    return window.bidApproveSuccess(receipt.transactionHash, contractAddress);
  } catch (err) {
    console.error(err);
    if (sendBackTo == "Buy") {
      return window.buyApproveFailed(err);
    }
    return window.bidApproveFailed(err);
  }
};

window.approvedTokenBalance = async function approvedTokenBalance(
  contractAddress
) {
  var contract = await fetchContract(contractAddress, "erc20", false);
  var account = await getCurrentAccount();
  var balance = await contract.allowance(account, transferProxyContractAddress);
  return balance;
};

window.convertWETH = async function (
  amount,
  sendBackTo = "Bid",
  decimals = 18
) {
  try {
    amount = roundNumber(mulBy(amount, 10 ** decimals), 0);
    var contract = await fetchContract(wethAddress, "erc20");
    var account = await getCurrentAccount();
    var receipt = await contract.deposit({ value: amount });
    receipt = await receipt.wait();
    if (sendBackTo == "Buy") {
      return window.buyConvertSuccess(receipt.transactionHash);
    } else {
      return window.bidConvertSuccess(receipt.transactionHash);
    }
  } catch (err) {
    console.error(err);
    if (sendBackTo == "Buy") {
      return window.bidConvertFailed(err);
    }
    return window.bidConvertFailed(err);
  }
};

window.updateBuyerServiceFee = async function (buyerFeePermille) {
  try {
    const contract = await fetchContract(tradeContractAddress, "trade");
    var account = await getCurrentAccount();
    var receipt = await contract.setBuyerServiceFee(buyerFeePermille * 10);
    receipt = await receipt.wait();
    if (String(receipt.status) === "true") {
      $("form#fee_form").submit();
      $("div.loading-gif.displayInMiddle").hide();
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};

window.updateSellerServiceFee = async function (sellerFeePermille) {
  try {
    const contract = await fetchContract(tradeContractAddress, "trade");
    var account = await getCurrentAccount();
    var receipt = await contract.setSellerServiceFee(sellerFeePermille * 10);
    receipt = await receipt.wait();
    if (String(receipt.status) === "true") {
      $("form#fee_form").submit();
      $("div.loading-gif.displayInMiddle").hide();
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};

window.signMessage = async function signMessage(msg) {
  try {
    var account = await getCurrentAccount();
    var sign = signer.signMessage(msg);
    return sign;
  } catch (err) {
    console.log(err);
    return "";
  }
};

window.signSellOrder = async function (
  amount,
  decimals,
  paymentAssetAddress,
  tokenId,
  assetAddress,
  collectionId,
  sendBackTo = "",
  asset_supply
) {
  try {
    amount = amount > 0 ? roundNumber(mulBy(amount, 10 ** decimals), 0) : 0;
    const nonce_value = getNonceValue(collectionId);
    var messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "address", "uint256", "uint256", "uint256"],
      [
        assetAddress,
        tokenId,
        paymentAssetAddress,
        amount,
        asset_supply ?? 1,
        nonce_value,
      ]
    );
    messageHash = ethers.utils.arrayify(messageHash);
    var account = await getCurrentAccount();
    var fixedPriceSignature = await signer.signMessage(messageHash, account);
    const receipt = await signOrder(
      assetAddress,
      tokenId,
      asset_supply ?? 1,
      paymentAssetAddress,
      amount,
      nonce_value
    );
    if (receipt && receipt.status == 1) {
      updateSignature(collectionId, fixedPriceSignature, nonce_value);
      save_NonceValue(collectionId, fixedPriceSignature, nonce_value);
      if (sendBackTo == "update") {
        return window.updateSignFixedSuccess(collectionId);
      }
      return window.bidSignFixedSuccess(collectionId);
    } else {
      throw "Sign fixed price failed";
    }
  } catch (err) {
    console.error(err);
    if (sendBackTo == "update") {
      return window.updateSignFixedFailed(err);
    }
    return window.bidSignFixedFailed(err);
  }
};

window.ethBalance = async function () {
  var account = await getCurrentAccount();
  if (!account) return;
  var bal = await signer.getBalance();
  var ethBal = roundNumber(ethers.utils.formatEther(bal), 5);
  return ethBal;
};

async function updateEthBalance() {
  var ethBal = await window.ethBalance();
  $(".curBalance").html(ethBal + "BNB");
  $(".curEthBalance").text(ethBal);
}

window.tokenBalance = async function (contractAddress, decimals) {
  var abi = [
    {
      constant: true,
      inputs: [{ name: "_owner", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "balance", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  ];
  var contract = new ethers.Contract(contractAddress, abi, provider);
  var account = await getCurrentAccount();
  var balance = await contract.balanceOf(account);
  var bal = parseInt(balance);
  balance = roundNumber(divBy(bal, 10 ** decimals), 5);
  return balance;
};

window.getNetworkType = async function getNetworkType() {
  if (!provider) return;
  var type = await provider.getNetwork();
  return type["name"];
};

async function showTermsCondition(account, ethBal, networkType) {
  var account = account || (await getCurrentAccount());
  $.magnificPopup.open({
    closeOnBgClick: false,
    enableEscapeKey: false,
    items: {
      src: "#terms-and-condition",
    },
    type: "inline",
  });
  $("#account").val(account);
  $("#eth_balance_tc").val(ethBal);
  $("#network_type").val(networkType);
}

async function load(shouldDestroySession = true) {
  const account = await loadWeb3();
  $("#account").val(account);
  const ethBal = await ethBalance(account);
  return createDeleteSession(
    account,
    ethBal,
    account ? shouldDestroySession : false,
    getConnectedProvider()
  );
}

async function createDeleteSession(
  account,
  balance,
  shouldDestroySession,
  wallet
) {
  const networkType = await getNetworkType();
  const isValidUserResp = await isValidUser(account, "", wallet);
  let destroy = false;
  if (isValidUserResp.user_exists) {
    await createUserSession(account, balance, shouldDestroySession, wallet);
    if (shouldDestroySession && destroy) {
      window.location.reload();
      destory = false;
    } else {
      return true;
    }
  } else {
    if (gon.session) {
      if (account) {
        await destroySession();
      }
      window.location.reload();
    } else {
      showTermsCondition(account, balance, networkType);
      return false;
    }
  }
}

window.disconnect = async function () {
  await destroySession();
  window.location.reload();
};

async function destroySession() {
  if (gon.session) {
    await destroyUserSession(await getCurrentAccount());
    provider?.provider?.disconnect && provider?.provider.disconnect();
    provider?.provider?.close && provider?.provider.close();
  }
}

async function connect() {
  const status = await load();
  if (status) {
    window.location.reload();
  }
}

window.proceedWithLoad = async function proceedWithLoad() {
  var account = $("#account").val();
  const ethBal = $("#eth_balance").text();
  if ($("#condition1").is(":checked") && $("#condition2").is(":checked")) {
    await createUserSession(account, ethBal, true, getConnectedProvider());
    window.location.reload();
  } else {
    toastr.error("Please accept the conditions to proceed");
  }
};

window.loadUser = async function loadUser() {
  if (provider && gon.session) {
    load();
  }
};

window.mobileCheck = function () {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
};

// ----- contract and lazy mint changes

window.getTokenId = function getTokenId(receipt, buyingAssetType) {
  if (buyingAssetType == 2) {
    var tokenId = receipt.logs[1].data.slice(0, 66);
  } else {
    var tokenId = receipt.logs[1].topics[3];
  }
  return parseInt(tokenId);
};

const getRandom = (address) => {
  let value = Date.now() + Math.floor(Math.random() * 10 ** 10 + 1);
  let hex = value.toString(16);
  hex = hex + address.slice(2);
  return `0x${"0".repeat(64 - hex.length)}${hex}`;
};

const buildBuyingAssetType = (options) => {
  const { asset_type } = options;
  return asset_type + 2;
};

const buildOderStruct = async (options) => {
  let {
    owner_address: assetOwner,
    pay_token_address: paymentAssetAddress,
    asset_address: buyingAssetAddress,
    unit_price: unitPrice,
    paymentAmt,
    token_id: tokenId,
    token_uri: tokenURI,
    total: supply,
    royalty,
    buyingAssetQty,
    decimals,
    account,
    assetType,
  } = options;
  paymentAmt = roundNumber(mulBy(paymentAmt, 10 ** decimals), 0);
  unitPrice = roundNumber(mulBy(unitPrice, 10 ** decimals), 0);
  account = account || (await getCurrentAccount());
  assetType = assetType || buildBuyingAssetType(options);
  return [
    assetOwner,
    account,
    paymentAssetAddress,
    buyingAssetAddress,
    assetType,
    unitPrice,
    false,
    paymentAmt,
    tokenId,
    tokenURI,
    supply,
    royalty,
    buyingAssetQty,
  ];
};

function sign_metadata_with_creator(
  buyingAssetAddress,
  creatorAddress,
  tokenURI,
  collectionId,
  tradeAddress = null
) {
  var sign;
  $.ajax({
    url: `/collections/${collectionId}/sign_metadata_with_creator`,
    type: "POST",
    async: false,
    data: {
      buying_asset_address: buyingAssetAddress,
      address: creatorAddress,
      tokenURI: tokenURI,
      trade_address: tradeAddress,
    },
    dataType: "json",
  })
    .done(function (msg) {
      sign = { sign: msg["signature"], nonce: msg["nonce"] };
    })
    .fail(function (jqXHR, textStatus) {
      console.log("Bidding failed. Please contact support");
    });
  return sign;
}

window.approveCollection = function approveCollection(collectionId) {
  $.ajax({
    url: `/collections/${collectionId}/approve`,
    type: "POST",
    async: false,
    dataType: "script",
  })
    .done(function (msg) {
      console.log("Collection updated.");
    })
    .fail(function (jqXHR, textStatus) {
      console.log("Collection update failed. Please contact support");
    });
};

window.deployContract = async function deployContract(
  abi,
  bytecode,
  name,
  symbol,
  contractType,
  collectionId,
  attachment,
  description,
  cover,
  ref_fee
) {
  let contractDeploy;
  var contractNFT;
  let contractAddress;
  try {
    var sign = provider.getSigner();
    if (contractType == "nft721") {
      contractNFT = new ethers.Contract(
        factoryContractAddressFor721,
        abi,
        provider
      );
    } else if (contractType == "nft1155") {
      contractNFT = new ethers.Contract(
        factoryContractAddressFor1155,
        abi,
        provider
      );
    }
    contractDeploy = contractNFT.connect(sign);
    const account = await getCurrentAccount();
    const salt = getRandom(account);
    var contract = await contractDeploy.deploy(
      salt,
      name,
      symbol,
      tokenURIPrefix,
      gon.transferProxyContractAddress
    );
    var receipt = await contract.wait();
    contractAddress = "0x" + receipt.logs[4].data.slice(90, 130);
    $("#nft_contract_address").val(contractAddress);
    let formData = new FormData();
    formData.append("file", attachment);
    formData.append("name", name);
    formData.append("symbol", symbol);
    formData.append("contract_address", contractAddress);
    formData.append("contract_type", contractType);
    formData.append("collection_id", collectionId);
    formData.append("description", description);
    formData.append("cover", cover);
    formData.append("referral_fee_percentage", ref_fee);
    createContract(formData);
    window.contractDeploySuccess(contractAddress, contractType);
  } catch (err) {
    console.error(err);
    window.contractDeployFailed(err);
  }
};

function getInitiateSale() {
  let resp;
  $.ajax({
    url: "/collections/" + $("#collection_id").val() + "/initiate_sale",
    type: "POST",
    async: false,
    success: function (respVal) {
      resp = respVal;
    },
  });
  return resp;
}

const signOrder = async (
  assetAddress,
  tokenId,
  qty,
  paymentAssetAddress,
  amount,
  nonce
) => {
  const user = await getCurrentAccount();
  const status = true;
  const { startTime, endTime } = getInitiateSale();
  if (!nonce) throw new Error("failed to initiate sale");

  const signStruct = [
    user,
    assetAddress,
    tokenId,
    qty,
    paymentAssetAddress,
    amount,
    startTime ? moment(startTime).unix() : 0,
    endTime ? moment(endTime).unix() : 0,
    status,
  ];

  const contract = await fetchContract(tradeContractAddress, "trade");

  let tx = await contract.putOnSale(signStruct, nonce);
  const receipt = await tx.wait();
  return receipt;
};

const removeSale = async (nonce) => {
  try {
    if (!nonce) throw new Error("failed to initiate remove sale");
    const contract = await fetchContract(tradeContractAddress, "trade");
    // if ($("#token").val()!= ''){
    let receipt = await contract.removeFromSale(nonce, {});

    receipt = await receipt.wait();
    hideAll();
    $(".removeSaleDone").removeClass("hide");
    // }
    removeFromSale();
    location.reload();
    // location.href = $('#removeSaleModalData').data('url')
  } catch (err) {
    hideAll();
    $(".removeSaleRetry").removeClass("hide");
    console.error(err);
    toastr.error(err.message);
  }
};

window.removeSale = removeSale;

window.setNftPayIframe = async function setNftPayIframe(
  assetOwner,
  paymentAssetAddress,
  assetType,
  buyingAssetAddress,
  unitPrice,
  paymentAmtInWei,
  tokenId,
  tokenURI,
  supply,
  royaltyFee,
  buyingAssetQty,
  sellerSign,
  collectionId,
  isLazyMinted,
  collectionName,
  tradeAddress
) {
  const account = await getCurrentAccount();
  const nonce = getContractSignNonce(collectionId, sellerSign);
  var sig = ethers?.utils?.splitSignature(sellerSign);
  var methodName = isLazyMinted ? "mintAndBuyAsset" : "buyAsset";
  var ownerSign = sign_metadata_with_creator(
    buyingAssetAddress,
    assetOwner,
    tokenURI,
    collectionId,
    tradeAddress
  );
  var ownerSig = ethers?.utils?.splitSignature(ownerSign["sign"]);
  var iframe_src =
    `https://sandbox.nftpay.xyz/iframe/iframe_pay_soku?order[seller]=${assetOwner}&order[buyer]=${account}&order[erc20Address]=${paymentAssetAddress}&order[nftAddress]=${buyingAssetAddress}&order[nftType]=${toNum(
      assetType
    )}&order[unitPrice]=${unitPrice}&order[skipRoyalty]=${false}&order[amount]=${paymentAmtInWei}&order[tokenId]=${tokenId}&order[tokenURI]=${tokenURI}&order[supply]=${supply}&order[royaltyFee]=${royaltyFee}&order[qty]=${buyingAssetQty}&sign[v]=${
      sig?.v
    }&sign[r]=${sig?.r}&sign[s]=${sig?.s}&sign[nonce]=${nonce}` +
    (isLazyMinted
      ? `&ownerSign[v]=${ownerSig?.v}&ownerSign[r]=${ownerSig?.r}&ownerSign[s]=${ownerSig?.s}&ownerSign[nonce]=${ownerSign["nonce"]}`
      : "") +
    `&referral[referralFee]=0&referral[referrer]=0x0000000000000000000000000000000000000000&network_name=${DEFAULT_NETWORK}&method_name=${methodName}&collection_name=${collectionName}`;

  $(".nftpay-iframe").attr("src", iframe_src);
};

async function getCommodityAmount(tokenAddr, paymentAmt) {
  let commodity_amt = 0;

  if (tokenAddr == sokuAddress) {
    // If Commoditiy token is SOKU, convert that value to ETH
    const sushiRouter = await fetchContract(sushiRouterAddress, "sushi");
    const path = [wethAddress, sokuAddress];
    const amounts = await sushiRouter.getAmountsIn(paymentAmt, path);
    commodity_amt = amounts[0];
  } else {
    // If commodity is ETH, return current eth value as commodity
    commodity_amt = paymentAmt;
  }
  return commodity_amt;
}

window.initWertWidget = async function initWertWidget(
  assetName,
  assetCreator,
  assetOwner,
  buyingAssetType,
  buyingAssetAddress,
  tokenId,
  unitPrice,
  buyingAssetQty,
  paymentAmtInWei,
  paymentAssetAddress,
  sellerSign,
  collectionId,
  tokenURI,
  royaltyFee,
  supply,
  tradeAddress,
  isLazyMinted
) {
  var href = window.location.href;
  var $get_href = $(".href").text(href);
  var param = $get_href?.prevObject?.[0]?.location?.search.split("=");
  var token = param[1];
  var referrerAddr = param[2];

  const account = await getCurrentAccount();
  const ethAmount = await getCommodityAmount(
    paymentAssetAddress,
    paymentAmtInWei
  );
  const commodityAmount = parseFloat(ethers.utils.formatEther(ethAmount));
  const multiplier = Math.pow(10, 8);
  const formattedCommodityAmt = parseFloat((
    Math.ceil(commodityAmount * multiplier) / multiplier
  ).toFixed(8));
  const nonce = getContractSignNonce(collectionId, sellerSign);
  let ABI = [
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "seller",
              type: "address",
            },
            {
              internalType: "address",
              name: "buyer",
              type: "address",
            },
            {
              internalType: "address",
              name: "erc20Address",
              type: "address",
            },
            {
              internalType: "address",
              name: "nftAddress",
              type: "address",
            },
            {
              internalType: "enum Trade.BuyingAssetType",
              name: "nftType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "unitPrice",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "skipRoyalty",
              type: "bool",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
            {
              internalType: "string",
              name: "tokenURI",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "supply",
              type: "uint256",
            },
            {
              internalType: "uint96",
              name: "royaltyFee",
              type: "uint96",
            },
            {
              internalType: "uint256",
              name: "qty",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Order",
          name: "order",
          type: "tuple",
        },
        {
          components: [
            {
              internalType: "uint8",
              name: "v",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "r",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "s",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Sign",
          name: "sign",
          type: "tuple",
        },
        {
          components: [
            {
              internalType: "uint8",
              name: "v",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "r",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "s",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Sign",
          name: "ownerSign",
          type: "tuple",
        },
        {
          components: [
            {
              internalType: "address",
              name: "referrer",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "referralFee",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Referral",
          name: "referral",
          type: "tuple",
        },
        {
          internalType: "bool",
          name: "isWertPurchase",
          type: "bool",
        },
      ],
      name: "mintAndBuyAsset",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "seller",
              type: "address",
            },
            {
              internalType: "address",
              name: "buyer",
              type: "address",
            },
            {
              internalType: "address",
              name: "erc20Address",
              type: "address",
            },
            {
              internalType: "address",
              name: "nftAddress",
              type: "address",
            },
            {
              internalType: "enum Trade.BuyingAssetType",
              name: "nftType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "unitPrice",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "skipRoyalty",
              type: "bool",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
            {
              internalType: "string",
              name: "tokenURI",
              type: "string",
            },
            {
              internalType: "uint256",
              name: "supply",
              type: "uint256",
            },
            {
              internalType: "uint96",
              name: "royaltyFee",
              type: "uint96",
            },
            {
              internalType: "uint256",
              name: "qty",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Order",
          name: "order",
          type: "tuple",
        },
        {
          components: [
            {
              internalType: "uint8",
              name: "v",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "r",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "s",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "nonce",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Sign",
          name: "sign",
          type: "tuple",
        },
        {
          components: [
            {
              internalType: "address",
              name: "referrer",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "referralFee",
              type: "uint256",
            },
          ],
          internalType: "struct Trade.Referral",
          name: "referral",
          type: "tuple",
        },
        {
          internalType: "bool",
          name: "isWertPurchase",
          type: "bool",
        },
      ],
      name: "buyAsset",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
  ];
  let iface = new ethers.utils.Interface(ABI);
  if (isLazyMinted) buyingAssetType += 2;
  var orderStruct = [
    assetOwner,
    account,
    paymentAssetAddress,
    buyingAssetAddress,
    buyingAssetType,
    unitPrice,
    false,
    paymentAmtInWei,
    tokenId,
    tokenURI,
    supply,
    royaltyFee,
    buyingAssetQty,
  ];
  var ownerSign = sign_metadata_with_creator(
    buyingAssetAddress,
    assetOwner,
    tokenURI,
    collectionId,
    tradeAddress
  );
  let referralFee =
    parseFloat($("#prioritized_collection_referral_fee").val()) * 10;

  let referralStruct = [ethers.constants.AddressZero, 0];
  if (referrerAddr && referralFee != 0) {
    referralStruct = [referrerAddr, referralFee];
  }
  const sc_input_data = isLazyMinted
    ? iface.encodeFunctionData("mintAndBuyAsset", [
        orderStruct,
        splitSign(sellerSign, nonce),
        splitSign(ownerSign["sign"], ownerSign["nonce"]),
        referralStruct,
        true,
      ])
    : iface.encodeFunctionData("buyAsset", [
        orderStruct,
        splitSign(sellerSign, nonce),
        referralStruct,
        true,
      ]);
  const signedData = signSmartContractData(
    {
      address: account, // user's address
      commodity: "ETH",
      commodity_amount: formattedCommodityAmt,
      network: "ethereum",
      sc_address: tradeAddress,
      sc_input_data,
    },
    wertPrivateKey
  );
  const otherWidgetOptions = {
    partner_id: wertPartnerId, // your partner id
    container_id: "showWertWidget",
    click_id: uuidv4(), // unique id of purhase in your system
    origin: "https://widget.wert.io",
    autosize: true,
  };

  const image_url = getImageFromMetadata(tokenURI);
  const nftOptions = {
    extra: {
      item_info: {
        author: assetCreator,
        image_url,
        name: assetName,
        seller: assetOwner,
      },
    },
  };

  const wertWidget = new WertWidget({
    ...signedData,
    ...otherWidgetOptions,
    ...nftOptions,
    listeners: {
      "payment-status": (data) => {
        $(".modal__close").hide();
        toastr.warning(
          "Please do not exit or refresh this page while your payment is processing. You will be redirected when your payment is completed.",
          "Important!",
          {
            timeOut: 0,
            extendedTimeOut: 0,
            preventDuplicates: true,
            disableTimeOut: true,
            tapToDismiss: false,
          }
        );
        if (data.status == "success") {
          updateCollectionBuy(
            collectionId,
            buyingAssetQty,
            data.tx_id,
            tokenId
          );
          return window.buyPurchaseSuccess(collectionId);
        } else if (data.status == "failed" || data.status == "failover") {
          return window.buyPurchaseFailed(data);
        }
      },
    },
  });
  wertWidget.mount();
};

function getImageFromMetadata(tokenURI) {
  let image_url = null;
  $.ajax({
    url: `https://ipfs.io/ipfs/${tokenURI}`,
    type: "GET",
    async: false,
    dataType: "json",
  })
    .done(function (data) {
      return (image_url = data?.image?.toString());
    })
    .fail(function (jqXHR, textStatus) {
      console.log("Getting NFT image failed.");
    });
  return image_url;
}

window.MintAndBuyAsset = async function MintAndBuyAsset(
  assetOwner,
  buyingAssetType,
  buyingAssetAddress,
  tokenId,
  unitPrice,
  buyingAssetQty,
  paymentAmt,
  paymentAssetAddress,
  decimals,
  sellerSign,
  collectionId,
  tokenURI,
  royaltyFee,
  sharedCollection,
  supply,
  tradeAddress
) {
  try {
    var paymentAmtInWei = roundNumber(mulBy(paymentAmt, 10 ** decimals), 0);
    unitPrice = roundNumber(mulBy(unitPrice, 10 ** decimals), 0);
    var buyingAssetType = buyingAssetType + 2; // BuyAssetType -> 3: Lazy721 , 2: Lazy1155, 1:721, 0: 1155
    var contract = await fetchContract(tradeContractAddress, "trade");
    const nonce = getContractSignNonce(collectionId, sellerSign);
    var account = await getCurrentAccount();

    var href = window.location.href;
    var $get_href = $(".href").text(href);
    var param = $get_href?.prevObject?.[0]?.location?.search.split("=");
    var token = param[1];
    var referrerAddr = param[2];

    var orderStruct = [
      assetOwner,
      account,
      paymentAssetAddress,
      buyingAssetAddress,
      buyingAssetType,
      unitPrice,
      false,
      paymentAmtInWei,
      tokenId,
      tokenURI,
      supply,
      royaltyFee,
      buyingAssetQty,
    ];
    // ownerSign -> selleraddress & URI
    var ownerSign = sign_metadata_with_creator(
      buyingAssetAddress,
      assetOwner,
      tokenURI,
      collectionId,
      tradeAddress
    );
    // let referrerAddr = ethers.constants.AddressZero;

    // if (referralSign) {
    //   referrerAddr =
    //     getReferralAddress(collectionId, referralSign, token) ||
    //     ethers.constants.AddressZero;
    // }

    let referralFee =
      parseFloat($("#prioritized_collection_referral_fee").val()) * 10;

    let referralStruct = [ethers.constants.AddressZero, 0];

    if (referrerAddr && referralFee != 0) {
      referralStruct = [referrerAddr, referralFee];
    }
    var receipt = await contract.mintAndBuyAsset(
      orderStruct,
      splitSign(sellerSign, nonce),
      splitSign(ownerSign["sign"], ownerSign["nonce"]),
      referralStruct,
      false // isWertPurchase
    );
    receipt = await receipt.wait();
    var tokenId = getTokenId(receipt, buyingAssetType);
    updateCollectionBuy(
      collectionId,
      buyingAssetQty,
      receipt.transactionHash,
      tokenId
    );
    return window.buyPurchaseSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.buyMintAndPurchaseFailed(err);
  }
};

window.MintAndAcceptBid = async function (
  buyer,
  buyingAssetType,
  buyingAssetAddress,
  tokenId,
  paymentAmt,
  buyingAssetQty,
  paymentAssetAddress,
  decimals,
  buyerSign,
  collectionId,
  bidId,
  tokenURI,
  royaltyFee,
  sharedCollection,
  supply,
  tradeAddress
) {
  try {
    paymentAmt = roundNumber(mulBy(paymentAmt, 10 ** decimals), 0);
    var unitPrice = 1;
    var buyingAssetType = buyingAssetType + 2; // BuyAssetType -> 3: Lazy721 , 2: Lazy1155, 1:721, 0: 1155
    const contract = await fetchContract(tradeContractAddress, "trade");
    const nonce = getContractSignNonce(collectionId, buyerSign);
    var account = await getCurrentAccount();

    var href = window.location.href;
    var $get_href = $(".href").text(href);
    var param = $get_href?.prevObject?.[0]?.location?.search.split("=");
    var token = param[1];
    var referrerAddr = param[2];

    //token ID calculating
    window.contract721 = await getContract(
      buyingAssetAddress,
      "nft721",
      sharedCollection
    );
    var orderStruct = [
      account,
      buyer,
      paymentAssetAddress,
      buyingAssetAddress,
      buyingAssetType,
      unitPrice,
      false,
      paymentAmt,
      tokenId,
      tokenURI,
      supply,
      royaltyFee,
      buyingAssetQty,
    ];
    // ownerSign -> selleraddress & URI
    var ownerSign = sign_metadata_with_creator(
      buyingAssetAddress,
      account,
      tokenURI,
      collectionId,
      tradeAddress
    );
    saveContractNonceValue(collectionId, ownerSign);
    // let referrerAddr = ethers.constants.AddressZero;

    // if (referralSign) {
    //   referrerAddr =
    //     getReferralAddress(collectionId, referralSign, token) ||
    //     ethers.constants.AddressZero;
    // }
    let referralFee =
      parseFloat($("#prioritized_collection_referral_fee").val()) * 10;

    let referralStruct = [ethers.constants.AddressZero, 0];

    if (referrerAddr && referralFee != 0) {
      referralStruct = [referrerAddr, referralFee];
    }

    var receipt = await contract.mintAndExecuteBid(
      orderStruct,
      splitSign(buyerSign, nonce),
      splitSign(ownerSign["sign"], ownerSign["nonce"]),
      referralStruct
    );
    receipt = await receipt.wait();

    var tokenId = getTokenId(receipt, buyingAssetType);
    updateCollectionSell(
      collectionId,
      buyer,
      bidId,
      receipt.transactionHash,
      tokenId
    );
    return window.acceptBidSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.acceptBidFailed(err);
  }
};

window.executeBid = async function executeBid(
  buyer,
  buyingAssetType,
  buyingAssetAddress,
  tokenId,
  paymentAmt,
  buyingAssetQty,
  paymentAssetAddress,
  decimals,
  buyerSign,
  collectionId,
  bidId
) {
  try {
    var href = window.location.href;
    var $get_href = $(".href").text(href);
    var param = $get_href?.prevObject?.[0]?.location?.search.split("=");
    var token = param[1];
    var referrerAddr = param[2];

    paymentAmt = roundNumber(mulBy(paymentAmt, 10 ** decimals), 0);
    var unitPrice = 1;
    const contract = await fetchContract(tradeContractAddress, "trade");
    const nonce = getContractSignNonce(collectionId, buyerSign);
    var account = await getCurrentAccount();
    // supply, tokenURI, royalty needs to be passed but WILL NOT be used by the Contract
    var supply = 0;
    var tokenURI = "abcde";
    var royaltyFee = 0;
    var orderStruct = [
      account,
      buyer,
      paymentAssetAddress,
      buyingAssetAddress,
      buyingAssetType,
      unitPrice,
      gon.collection_data["imported"],
      paymentAmt,
      tokenId,
      tokenURI,
      supply,
      royaltyFee,
      buyingAssetQty,
    ];
    // let referrerAddr = ethers.constants.AddressZero;

    // if (referralSign) {
    //   referrerAddr =
    //     getReferralAddress(collectionId, referralSign, token) ||
    //     ethers.constants.AddressZero;
    // }
    let referralFee =
      parseFloat($("#prioritized_collection_referral_fee").val()) * 10;

    let referralStruct = [ethers.constants.AddressZero, 0];

    if (referrerAddr && referralFee != 0) {
      referralStruct = [referrerAddr, referralFee];
    }

    var receipt = await contract.executeBid(
      orderStruct,
      splitSign(buyerSign, nonce),
      referralStruct
    );

    receipt = await receipt.wait();
    updateCollectionSell(collectionId, buyer, bidId, receipt.transactionHash);
    return window.acceptBidSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.acceptBidFailed(err);
  }
};

// buyingAssetType = 1 # 721
// buyingAssetType = 0 # 1155
window.buyAsset = async function (
  assetOwner,
  buyingAssetType,
  buyingAssetAddress,
  tokenId,
  unitPrice,
  buyingAssetQty,
  paymentAmt,
  paymentAssetAddress,
  decimals,
  sellerSign,
  collectionId,
  asset_supply,
  token_uri,
  royalty
) {
  try {
    var href = window.location.href;
    var $get_href = $(".href").text(href);
    var param = $get_href?.prevObject?.[0]?.location?.search.split("=");
    var token = param[1];
    var referrerAddr = param[2];

    paymentAmt = roundNumber(mulBy(paymentAmt, 10 ** decimals), 0);
    // var referral = roundNumber(paymentAmt * 0.02);
    unitPrice = roundNumber(mulBy(unitPrice, 10 ** decimals), 0);
    // supply, tokenURI, royalty needs to be passed but WILL NOT be used by the Contract
    var supply = asset_supply;
    var tokenURI = token_uri ?? "abcde";
    var royaltyFee = royalty ?? 0;
    var account = await getCurrentAccount();

    var orderStruct = [
      assetOwner,
      account,
      paymentAssetAddress,
      buyingAssetAddress,
      buyingAssetType,
      unitPrice,
      gon.collection_data["imported"],
      paymentAmt,
      tokenId,
      tokenURI,
      supply,
      royaltyFee,
      buyingAssetQty,
    ];

    // let referalFeePercent = parseFloat($("#referral_fee").val());
    let referralFee =
      parseFloat($("#prioritized_collection_referral_fee")?.val()) * 10;

    var contract = await fetchContract(tradeContractAddress, "trade");
    const nonce = getContractSignNonce(collectionId, sellerSign);
    let referralStruct = [ethers.constants.AddressZero, 0];
    // let referrerAddr = ethers.constants.AddressZero;

    // if (referralSign) {
    //   referrerAddr =
    //     getReferralAddress(collectionId, referralSign, token) ||
    //     ethers.constants.AddressZero;
    // }

    if (referrerAddr && referralFee != 0) {
      referralStruct = [referrerAddr, referralFee];
    }
    var receipt = await contract.buyAsset(
      orderStruct,
      splitSign(sellerSign, nonce),
      referralStruct,
      false // isWertPurchase
    );

    receipt = await receipt.wait();
    updateCollectionBuy(collectionId, buyingAssetQty, receipt.transactionHash);
    return window.buyPurchaseSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.buyPurchaseFailed(err);
  }
};

window.bidAsset = async function bidAsset(
  assetAddress,
  tokenId,
  qty = 1,
  amount,
  payingTokenAddress,
  decimals = 18,
  collectionId,
  bidPayAmt
) {
  try {
    var amountInDec = roundNumber(mulBy(amount, 10 ** decimals), 0);
    const nonce = getNonceValue(collectionId);
    var messageHash = ethers.utils.solidityKeccak256(
      ["address", "uint256", "address", "uint256", "uint256", "uint256"],
      [assetAddress, tokenId, payingTokenAddress, amountInDec, qty, nonce]
    );
    messageHash = ethers.utils.arrayify(messageHash);
    const signature = await signer.signMessage(messageHash);
    let referral_token_for_bid = window.location.href
      .split("=")[1]
      .split("?")[0];
    placeBid(
      collectionId,
      signature,
      qty,
      {
        asset_address: assetAddress,
        token_id: tokenId,
        quantity: qty,
        amount: bidPayAmt,
        amount_with_fee: amount,
        payment_token_address: payingTokenAddress,
        payment_token_decimals: decimals,
        referral_bid_token: referral_token_for_bid,
      },
      nonce
    );
    save_NonceValue(collectionId, signature, nonce);
    return window.bidSignSuccess(collectionId);
  } catch (err) {
    console.error(err);
    return window.bidSignFailed(err);
  }
};

function getRpcErrorMessage(code = null, reason = null) {
  if (reason) return reason;

  if (!code || !METAMASK_POSSIBLE_ERRORS[code.toString()])
    return "Something went wrong";

  return METAMASK_POSSIBLE_ERRORS[code.toString()].message;
}

function getRpcErrorMessageToast(error) {
  clearToastr();
  toastr.error(getRpcErrorMessage(error?.code, error?.reason));
}

window.getRpcErrorMessageToast = getRpcErrorMessageToast;
window.getRpcErrorMessage = getRpcErrorMessage;

const METAMASK_POSSIBLE_ERRORS = {
  "-32700": {
    standard: "JSON RPC 2.0",
    message:
      "Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.",
  },
  "-32600": {
    standard: "JSON RPC 2.0",
    message: "The JSON sent is not a valid Request object.",
  },
  "-32601": {
    standard: "JSON RPC 2.0",
    message: "The method does not exist / is not available.",
  },
  "-32602": {
    standard: "JSON RPC 2.0",
    message: "Invalid method parameter(s).",
  },
  "-32603": {
    standard: "JSON RPC 2.0",
    message: "Internal JSON-RPC error.",
  },
  "-32000": {
    standard: "EIP-1474",
    message: "Invalid input.",
  },
  "-32001": {
    standard: "EIP-1474",
    message: "Resource not found.",
  },
  "-32002": {
    standard: "EIP-1474",
    message: "Resource unavailable.",
  },
  "-32003": {
    standard: "EIP-1474",
    message: "Transaction rejected.",
  },
  "-32004": {
    standard: "EIP-1474",
    message: "Method not supported.",
  },
  "-32005": {
    standard: "EIP-1474",
    message: "Request limit exceeded.",
  },
  4001: {
    standard: "EIP-1193",
    message: "User rejected the request.",
  },
  4100: {
    standard: "EIP-1193",
    message:
      "The requested account and/or method has not been authorized by the user.",
  },
  4200: {
    standard: "EIP-1193",
    message: "The requested method is not supported by this Ethereum provider.",
  },
  4900: {
    standard: "EIP-1193",
    message: "The provider is disconnected from all chains.",
  },
  4901: {
    standard: "EIP-1193",
    message: "The provider is disconnected from the specified chain.",
  },
};
