module Utils
  class Web3Schmoozer < Schmooze::Base
    dependencies Web3: "web3"

    solidity_sha3_func =
      "
            function(contractAddress, current_user_address, metadataHash, provider, nonce) {
                var web3 = new Web3(new Web3.providers.HttpProvider(provider));
                return web3.utils.soliditySha3(contractAddress, current_user_address, metadataHash, nonce);
            }
        "

    sign_func =
      "
            function(msg, privateKey, provider) {
                var web3 = new Web3(new Web3.providers.HttpProvider(provider));
                return web3.eth.accounts.sign(msg, privateKey);
            }
        "

    recover_func =
      "
            function(msg, sign, provider) {
                var web3 = new Web3(new Web3.providers.HttpProvider(provider));
                return web3.eth.accounts.recover(msg, sign).toLowerCase();
            }
        "

    solidity_sha3_lazy_mint_func =
      "
            function(contractAddress, buying_asset_address, current_user_address, metadataHash, provider, nonce) {
                var web3 = new Web3(new Web3.providers.HttpProvider(provider));
                return web3.utils.soliditySha3(contractAddress, buying_asset_address, current_user_address, metadataHash, nonce);
            }
        "

    solidity_sha3_referral_func =
      "
              function(collection_contract_id, token, referrer_address, provider) {
                  var web3 = new Web3(new Web3.providers.HttpProvider(provider));
                  return web3.utils.soliditySha3(collection_contract_id, token, referrer_address);
              }
        "

    method :solidity_sha3, solidity_sha3_func
    method :sign, sign_func
    method :recover, recover_func
    method :solidity_sha3_lazy_mint, solidity_sha3_lazy_mint_func
    method :solidity_sha3_referral, solidity_sha3_referral_func
  end

  class Web3
    def initialize
      @web3_schmoozer = Web3Schmoozer.new(__dir__)
      @provider = Rails.application.credentials.ethereum_provider
    end

    def sign(msg)
      @web3_schmoozer.sign(msg, Rails.application.credentials.signer_private_key, @provider)
    end

    def recover(msg, sign)
      @web3_schmoozer.recover(msg, sign, @provider)
    end

    def sign_metadata_hash(contract_address, current_user_address, metadata_hash, nonce_value = nil, buying_asset_address = nil, is_lazy_minted = nil)
      if (!is_lazy_minted)
        hash = @web3_schmoozer.solidity_sha3(contract_address, current_user_address, metadata_hash, @provider, nonce_value)
      else
        hash = @web3_schmoozer.solidity_sha3_lazy_mint(contract_address, buying_asset_address, current_user_address, metadata_hash, @provider, nonce_value)
      end
      sign(hash)
    end

    def sign_referral_hash(collection_contract_id, token, referrer_address)
      hash = @web3_schmoozer.solidity_sha3_referral(collection_contract_id, token, referrer_address, @provider)
      # sign(hash)
      hash
    end

    def valid_like?(signer, sign, contract_address, token_id)
      msg = I18n.t("sign.like", contract_address: contract_address, token_id: token_id)
      recover(msg, sign) == signer.downcase
    end

    def valid_put_on_sale_req?(signer, sign, contract_address, token_id)
      msg = I18n.t("sign.put_on_sale", contract_address: contract_address, token_id: token_id, owner_address: signer)
      recover(msg, sign) == signer.downcase
    end

    def valid_remove_from_sale_req?(signer, sign, contract_address, token_id)
      msg = I18n.t("sign.remove_from_sale", contract_address: contract_address, token_id: token_id, owner_address: signer)
      recover(msg, sign) == signer.downcase
    end

    def valid_start_action?(signer, sign, nft_contract_address, token_id, erc20_contract_address, min_price, start_time, end_time)
      msg = I18n.t("sign.start_action",
                   nft_contract_address: nft_contract_address,
                   token_id: token_id,
                   owner_address: signer,
                   erc20_contract_address: erc20_contract_address,
                   min_price: min_price,
                   start_time: start_time,
                   end_time: end_time)
      recover(msg, sign) == signer.downcase
    end
  end
end
