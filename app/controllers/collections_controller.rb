class CollectionsController < ApplicationController
  skip_before_action :authenticate_user, only: [:show, :update_scrapped_collection_data]
  # skip_before_action :is_approved, only: [:show]
  before_action :is_approved, except: [:show, :update_scrapped_collection_data]
  # before_action :set_collection, only: [:show, :bid, :execute_max_bid, :remove_from_sale, :execute_bid, :buy]
  before_action :set_collection, except: [:new, :create, :update_token_id, :sign_metadata_hash, :update_scrapped_collection_data]

  skip_before_action :verify_authenticity_token

  before_action :set_referral_token, only: [:show]

  require "uri"
  require "net/http"
  require "openssl"

  def masked_address(first_char = 13, last_char = 4)
    "#{address[0..first_char]}...#{address.split(//).last(last_char).join("").to_s}"
  end

  def new
    @current_user = current_user
    @collection_type = params[:type]
    if params[:contract_address] && params[:token]
      begin
        url = URI("https://eth-mainnet.g.alchemy.com/nft/v2/#{Rails.application.credentials.alchemy[:api_key]}/getNFTMetadata?contractAddress=#{params[:contract_address]}&tokenId=#{params[:token]}")
        response = Net::HTTP.get_response(url)
        asset_response = JSON.parse(response.body)
        if asset_response
          contract_symbol = asset_response["contractMetadata"]["symbol"]
          contract_type = (contract_symbol.include?("NFT1155") || contract_symbol.include?("NFT721")) ? "Shared" : "Own"
          # num_of_copy = asset_response["top_ownerships"].find { |resp| resp["owner"]["address"].downcase == current_user.address.downcase }.try(:fetch, "quantity")
          num_of_copy = params[:balance]
          if params[:nft]
            data = params[:nft]
            data["image"] = asset_response["media"][0]["gateway"]
          else
            data = {}
            data["name"] = asset_response["title"]
            data["description"] = asset_response["description"]
            data["image"] = asset_response["media"][0]["gateway"]
          end

          @nft = {
            title: data["name"],
            symbol: contract_symbol,
            description: data["description"],
            metadata: params[:nft],
            token: params[:token],
            contract_type: contract_type,
            num_copies: num_of_copy,
            contract_address: params[:contract_address],
            properties: data["attributes"],
          }
          OpenURI::Buffer.send :remove_const, "StringMax" if OpenURI::Buffer.const_defined?("StringMax")
          OpenURI::Buffer.const_set "StringMax", 0
          if data.has_key?("animation_url")
            nft_image_split = data["animation_url"].split("://")
            file = URI.open(if nft_image_split[0] == "ipfs" then "https://ipfs.io/ipfs/#{nft_image_split[1]}" else data["animation_url"] end)
            @nft.merge!({
              url: data["animation_url"],
              file_path: if file.base_uri.present? then file.base_uri else file.path end,
              file_type: file.content_type,
              preview_url: data["animation_url"],
            })
          elsif data.has_key?("image")
            # byebug
            # image = data['image'].match(/ipfs:|ipfs/).present? ? asset_response['image_url'] : data["image"]
            nft_image_split = data["image"].split("://")
            image = if nft_image_split[0] == "ipfs" then "https://ipfs.io/ipfs/#{nft_image_split[1]}" else data["image"] end
            file = URI.open(image)
            @nft.merge!({
              url: image,
              file_path: if file.base_uri.present? then file.base_uri else file.path end,
              file_type: file.content_type,
            })
          elsif data.has_key?("image_url")
            # byebug
            # image = data['image'].match(/ipfs:|ipfs/).present? ? asset_response['image_url'] : data["image"]
            nft_image_split = data["image_url"].split("://")
            image = if nft_image_split[0] == "ipfs" then "https://ipfs.io/ipfs/#{nft_image_split[1]}" else data["image_url"] end
            file = URI.open(image)
            @nft.merge!({
              url: image,
              file_path: if file.base_uri.present? then file.base_uri else file.path end,
              file_type: file.content_type,
            })
          elsif asset_response.has_key?("media")
            file = URI.open("https://ipfs.io/ipfs/" + asset_response["media"][0]["raw"].split("://")[1])
            @nft.merge!({
              url: "https://ipfs.io/ipfs/" + data["image_url"].split("://")[1],
              file_path: if file.base_uri.present? then file.base_uri else file.path end,
              file_type: file.content_type,
            })
          end
        else
          raise "Unable to fetch the asset details"
        end
      rescue Exception => e
        puts e.inspect, "E"
        Rails.logger.warn "################## Exception while reading Opensea Collection file ##################"
        redirect_to user_path(id: current_user.address, tab: "nft_collections")
      end
    end
  end

  def show
    @og_title = @collection.name
    @og_description = @collection.description
    @tab = params[:tab]
    @collection.auction_expired_after
    @activities = PaperTrail::Version.where(item_type: "Collection", item_id: @collection.id).order("created_at desc")
    @max_bid = @collection.max_bid
    if is_collection_referred?
      @collection_referral_fee = @collection.nft_contract.referral_percentage
    else
      @collection_referral_fee = @collection.referral_percentage
    end
    set_collection_gon
  end

  def update_scrapped_collection_data
    user = User.find_or_create_by(address: params[:owner_address], is_active: true, is_approved: true)
    collection = Collection.unscoped.find(params[:id])
    collection.owner_id = user.id
    collection.creator_id = user.id
    collection.state = "approved"
    collection.category = [params[:category]]
    collection.opensea_collection = true
    # erc20_token = Erc20Token.find_or_create_by(symbol: "WETH", name: "Wrapped Ether", address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", chain_id: "5")
    collection.erc20_token_id = 1

    io = URI.open(params[:image_url])
    collection.attachment.attach(io: io, filename: params[:collection_name], content_type: io.content_type)
    collection.address = Collection.generate_uniq_token
    collection.save(validate: false)
  end

  def create
    begin
      ActiveRecord::Base.transaction do
        @collection = Collection.new(collection_params.except(:source, :nft_link, :token, :total_copies, :contract_address, :contract_type, :symbol))
        # @collection.state = params[:chooseMintType] == "lazy" ? :approved : :pending
        @collection.state = :pending
        if collection_params[:source] == "opensea"
          url = URI("https://eth-mainnet.g.alchemy.com/nft/v2/#{Rails.application.credentials.alchemy[:api_key]}/getNFTMetadata?contractAddress=#{collection_params[:contract_address]}&tokenId=#{collection_params[:token]}")
          response = Net::HTTP.get_response(url)
          asset_response = JSON.parse(response.body)
          metadata = asset_response["metadata"].presence
          if metadata
            data = metadata
            OpenURI::Buffer.send :remove_const, "StringMax" if OpenURI::Buffer.const_defined?("StringMax")
            OpenURI::Buffer.const_set "StringMax", 0
          else
            data = {}
            data["name"] = asset_response["name"].presence || asset_response["title"].presence
            data["description"] = asset_response["description"].presence
            data["image"] = asset_response["image_url"]
          end
          @collection.name = data["name"]

          image = if data["animation_url"].present? && !data["animation_url"].include?(".html")
              ipfs_formatted_url(data["animation_url"])
            elsif data["image_url"]
              ipfs_formatted_url(data["image_url"])
            else
              data["image"].match(/ipfs:\/\//).present? ? ("https://ipfs.io/ipfs/" + data["image"].split("://")[1]) : data["image"]
            end

          contract_metadata = asset_response["contractMetadata"].presence
          if contract_metadata
            contract_name = contract_metadata["name"].presence
          end
          unless @collection.nft_contract.address == collection_params[:contract_address]
            @collection.nft_contract = NftContract.find_or_create_by(contract_type: @collection.nft_contract.contract_type, name: contract_name, symbol: collection_params[:contract_type], address: collection_params[:contract_address])
          end
          if contract_metadata.has_key?("openSea")
            opensea_data = contract_metadata["openSea"]
            @collection.nft_contract.description = opensea_data["description"].presence
            if opensea_data.has_key?("imageUrl")
              contract_image = opensea_data["imageUrl"].presence
              contract_image_file = URI.open(contract_image)
              @collection.nft_contract.attachment.attach(io: contract_image_file, filename: contract_name, content_type: contract_image_file.content_type)
              # for music and video if no cover added then we add default banner image as cover
              unless @collection.nft_contract.cover.present?
                preview_file = URI.open(image)
                @collection.nft_contract.cover.attach(io: preview_file, filename: contract_name, content_type: preview_file.content_type)
              end
            else
              default_attachment_file = File.open("banner-1.png")
              preview_file = URI.open(image)
              @collection.nft_contract.attachment.attach(io: default_attachment_file, filename: "banner-1.png")
              unless @collection.nft_contract.cover.present?
                @collection.nft_contract.cover.attach(io: preview_file, filename: contract_name, content_type: preview_file.content_type)
              end
            end
          end
          @collection.nft_contract.contract_deployer = contract_metadata["contractDeployer"] if contract_metadata["contractDeployer"].present?
          @collection.royalty = 0
          @collection.token = collection_params[:token]
          @collection.no_of_copies = collection_params[:total_copies]
          @collection.owned_tokens = collection_params[:no_of_copies].present? ? collection_params[:no_of_copies] : collection_params[:total_copies]
          @collection.description = data["description"].presence || params["collection"]["description"]
          file = URI.open(image)
          @collection.attachment.attach(io: file, filename: data["name"], content_type: file.content_type)
          # for music and video if no cover added then we add default banner image as cover
          if ["audio/mp3", "audio/webm", "audio/mpeg", "video/mp4", "video/webm", "text/html"].include?(file.content_type) && !@collection.cover.present?
            if data.has_key?("animation_url")
              preview_file = URI.open(asset_response["image_url"])
              @collection.cover.attach(io: preview_file, filename: data["name"], content_type: preview_file.content_type)
            else
              preview_file = File.open("banner-1.png")
              @collection.cover.attach(io: preview_file, filename: "banner-1.png")
            end
          end
        else
          @collection.owned_tokens = @collection.no_of_copies
        end
        @collection.asset_supply = @collection.no_of_copies
        # ITS A RAND STRING FOR IDENTIFIYING THE COLLECTION. NOT CONTRACT ADDRESS
        @collection.address = Collection.generate_uniq_token
        @collection.creator_id = current_user.id
        @collection.owner_id = current_user.id
        @collection.properties = params["collection"]["attributes"].values.map(&:values).to_h
        @collection.data = JSON.parse(collection_params[:data]) if collection_params[:data].present?
        if @collection.valid?
          if params[:collection][:start_time].present? && params[:collection][:end_time].present?
            set_timer
          end
          @collection.save
          # PaperTrail.request(enabled: false) { @collection.approve! }
        else
          @errors = @collection.errors.full_messages
        end
      end
      if @collection.valid?
        @metadata_hash = Api::Pinata.new.upload(@collection)
      end
    rescue Exception => e
      Rails.logger.warn "################## Exception while creating collection ##################"
      Rails.logger.warn "ERROR: #{e.message}, PARAMS: #{params.inspect}"
      Rails.logger.warn $!.backtrace[0..20].join("\n")
      @errors = e.message
    end
  end

  def bid
    begin
      @collection.place_bid(bid_params)
    rescue Exception => e
      Rails.logger.warn "################## Exception while creating BID ##################"
      Rails.logger.warn "ERROR: #{e.message}, PARAMS: #{params.inspect}"
      Rails.logger.warn $!.backtrace[0..20].join("\n")
      @errors = e.message
    end
  end

  def remove_from_sale
    if @collection.is_owner?(current_user)
      @collection.cancel_bids
      @collection.remove_from_sale
    end
    render json: { address: @collection.address }
    # redirect_to collection_path(@collection.address), notice: 'Nft removed from sale successfully.'
  end

  def sell
    begin
      @collection.with_lock do
        lazy_minted = lazy_mint_token_update
        @redirect_address = @collection.execute_bid(params[:address], params[:bid_id], params[:transaction_hash], lazy_minted) if @collection.is_owner?(current_user)
      end
    rescue Exception => e
      Rails.logger.warn "################## Exception while selling collection ##################"
      Rails.logger.warn "ERROR: #{e.message}, PARAMS: #{params.inspect}"
      Rails.logger.warn $!.backtrace[0..20].join("\n")
      @errors = e.message
    end
  end

  def buy
    begin
      @collection.with_lock do
        lazy_minted = lazy_mint_token_update
        @redirect_address = @collection.direct_buy(current_user, params[:quantity].to_i, params[:transaction_hash], lazy_minted, params[:invite_token])
      end
    rescue Exception => e
      Rails.logger.warn "################## Exception while buying collection ##################"
      Rails.logger.warn "ERROR: #{e.message}, PARAMS: #{params.inspect}"
      Rails.logger.warn $!.backtrace[0..20].join("\n")
      @errors = e.message
    end
  end

  def update_token_id
    collection = current_user.collections.unscoped.where(address: params[:collectionId]).take
    collection.approve! unless collection.instant_sale_price.present?
    collection.update(token: params[:tokenId].to_i, transaction_hash: params[:tx_id])
  end

  def change_price
    if @collection.auction_expired? && @collection.put_on_sale? == false
      @collection.cancel_bids
      @collection.assign_attributes({
        timed_auction_enabled: nil,
        start_time: nil,
        end_time: nil,
      })
    end
    @collection.assign_attributes(change_price_params)
    if params[:collection][:start_time].present? && params[:collection][:end_time].present?
      set_timer
    end
    if @collection.valid?
      @collection.save
    else
      @errors = @collection.errors.full_messages
    end
  end

  def set_timer
    start_time = params[:collection][:start_time].to_datetime
    end_time = params[:collection][:end_time].to_datetime

    if params[:timezone_offset][0] == "+"
      start_time = start_time - params[:timezone_offset].split(":")[0].to_i.hours - params[:timezone_offset].split(":")[1].to_i.minutes
      end_time = end_time - params[:timezone_offset].split(":")[0].to_i.hours - params[:timezone_offset].split(":")[1].to_i.minutes
    elsif params[:timezone_offset][0] == "-"
      start_time = start_time - (params[:timezone_offset].split(":")[0].to_i.hours) + params[:timezone_offset].split(":")[1].to_i.minutes
      end_time = end_time - (params[:timezone_offset].split(":")[0].to_i.hours) + params[:timezone_offset].split(":")[1].to_i.minutes
    end

    @collection.start_time = start_time
    @collection.end_time = end_time
  end

  def burn
    if @collection.multiple?
      all_collections = Collection.where(nft_contract_id: @collection.nft_contract_id, token: @collection.token)
      #Using UPDATE_ALL to FORCE-skip cases where no_of_copies > owned_tokens for a brief moment
      all_collections.update_all(:no_of_copies => @collection.no_of_copies - params[:transaction_quantity].to_i)
      if @collection.owned_tokens == params[:transaction_quantity].to_i #User has 2 actions, BURN ALL vs BURN some!
        @collection.burn! if @collection.may_burn?
      else
        @collection.update(:owned_tokens => @collection.owned_tokens - params[:transaction_quantity].to_i)
      end
    else
      @collection.burn! if @collection.may_burn?
    end
    @collection.cancel_bids
  end

  def transfer_token
    new_owner = User.find_by_address(params[:user_id])
    if new_owner.present?
      @collection.hand_over_to_owner(new_owner.id)
    else
      @errors = [t("collections.show.invalid_user")]
    end
  end

  def sign_metadata_hash
    sign = if params[:contract_address].present?
        collection = current_user.collections.unscoped.where(address: params[:id]).first
        nonce = DateTime.now.strftime("%Q").to_i
        obj = Utils::Web3.new
        puts "Collection Metadata Hash: #{collection.metadata_hash}"
        puts "Nonce: #{nonce}"
        obj.sign_metadata_hash(params[:contract_address], current_user.address, collection.metadata_hash, nonce)
      else
        ""
      end
    render json: sign.present? ? sign.merge("nonce" => nonce) : {}
  end

  def fetch_details
    render json: { data: @collection.fetch_details(params[:bid_id], params[:erc20_address]) }
  end

  def fetch_transfer_user
    user = User.validate_user(params[:address])
    if user && user.is_approved? && user.is_active?
      render json: { address: user.address }
    else
      render json: { error: "User not found or not activated yet. Please provide address of the user registered in the application" }
    end
  end

  def sign_fixed_price
    collection = current_user.collections.unscoped.where(address: params[:id]).take
    collection.approve! if collection.pending?
    collection.update(sign_instant_sale_price: params[:sign], config: { asset_supply: collection.owned_tokens })
  end

  def owner_transfer
    collection = current_user.collections.unscoped.where(address: params[:id]).take
    recipient_user = User.where(address: params[:recipient_address]).first
    collection.update(sign_instant_sale_price: params[:sign])
    collection.hand_over_to_owner(recipient_user.id, params[:transaction_hash], params[:transaction_quantity].to_i)
  end

  def save_contract_nonce_value
    if params.dig("signature").present?
      contract_nonce = ContractNonceVerify.create(contract_sign_address: params.dig("signature", "sign"), contract_sign_nonce: params.dig("signature", "nonce"), user_address: current_user.address)
    end
  end

  def get_nonce_value
    render json: { nonce: DateTime.now.strftime("%Q").to_i }
  end

  def save_nonce_value
    if params[:sign].present?
      contract_nonce = ContractNonceVerify.create(contract_sign_address: params[:sign], contract_sign_nonce: params[:nonce], user_address: current_user.address)
    end
  end

  def get_contract_sign_nonce
    contract_nonce = ContractNonceVerify.find_by(contract_sign_address: params[:sign])
    nonce = contract_nonce.present? ? { nonce: contract_nonce.contract_sign_nonce.to_i } : {}
    render json: nonce
  end

  def get_referral_signed_address
    referral_data = Referral.find_by(sign: params[:sign], token: params[:token], collection_id: @collection.id)
    address = referral_data.present? ? { address: referral_data.referrer_address } : {}
    render json: address
  end

  def approve
    collection = current_user.collections.unscoped.where(address: params[:id]).take
    if collection.metadata_hash.present?
      collection.approve! if collection.pending?
    end
  end

  def sign_metadata_with_creator
    sign = if params[:address].present?
        account = User.where(address: params[:address]).first
        find_collection = account.collections.where(metadata_hash: params[:tokenURI]).exists?
        if (find_collection.present?)
          nonce = DateTime.now.strftime("%Q").to_i
          obj = Utils::Web3.new
          obj.sign_metadata_hash(params[:trade_address], account.address, params[:tokenURI], nonce, params[:buying_asset_address], true)
        else
          ""
        end
      else
        ""
      end
    render json: sign.present? ? sign.merge('nonce': nonce) : {}
  end

  def fetch_cur_token_price
    render json: @collection.fetch_cur_token_price
  end

  def initiate_sale
    render json: {
      startTime: @collection.start_time,
      endTime: @collection.end_time,
    }
  end

  def remove_from_sale_data
    nonce = ContractNonceVerify.find_by(contract_sign_address: @collection.sign_instant_sale_price)

    render json: {
      nonce: nonce&.contract_sign_nonce,
    }
  end

  def set_currency_max_bid_usd_price
    if @collection.max_bid
      price, currency = [@collection.max_bid.amount, @collection.max_bid.crypto_currency_type]
      currency_max_bid_usd_price = @collection.sale_price_to_float(price, currency)
      render json: { value: currency_max_bid_usd_price }
    else
      render json: { value: 0 }
    end
  end

  def set_weth_live_price
    price = Api::Etherscan.usd_price
    render json: { value: price }
  end

  private

  def set_referral_token
    return unless current_user.present?
    @referral = current_user.referrals.un_used.where(user_id: current_user.id, collection_id: @collection.id).first

    if @referral.present?
      @referral_link = request.base_url + collection_path(@collection.address) + "?token=" + @referral.token + "?sender=" + @referral.referrer_address
    end
  end

  def is_collection_referred?
    invite_token = params[:token].split("?").first if params[:token].present?
    referral = Referral.find_by_token(invite_token)
    (referral.present? && referral.referral_type == "collection") ? true : false
  end

  def check_referral_link_status
    return unless params[:token].present?

    token = params[:token].split("?").first
    @referral = Referral.find_by_token(token)
    if @referral.present? && @referral.status == "expired"
      flash[:notice] = "Sorry, this referral link is no longer active"
      redirect_to root_path
    end

    return unless current_user.present?
    if is_current_user_own_link?
      flash[:notice] = "Sorry, you can not buy the same NFT that you have have referred by yourself"
      redirect_to collection_path(@collection.address)
    end
  end

  def is_current_user_own_link?
    params[:token].split("=").last == current_user.address
  end

  # Collection param from React
  # def collection_params
  #   params.permit(:name, :description, :collection_address, :put_on_sale, :instant_sale_price, :unlock_on_purchase,
  #     :collection_category, :no_of_copies, :attachment)
  # end

  def collection_params
    params["collection"]["category"] = params["collection"]["category"].present? ? params["collection"]["category"].split(",") : []
    params["collection"]["nft_contract_id"] = NftContract.get_shared_id(params[:collection][:collection_type]) if params["chooseCollection"] == "nft"
    params["collection"]["nft_contract_id"] = NftContract.find_by_address(params["chooseOwnCollection"])&.id if params["chooseOwnCollection"] != "new" && params["chooseCollection"] == "create"
    params["collection"]["erc20_token_id"] = Erc20Token.where(address: params[:collection][:currency]).first&.id if params[:collection][:currency].present?
    params[:collection][:allow_bid] = false if params[:collection][:allow_bid].nil?

    if params[:collection][:instant_sale_enabled] || params[:collection][:allow_bid]
      params[:collection][:put_on_sale] = true
    else
      params[:collection][:put_on_sale] = false
    end

    params.require(:collection).permit(:name, :description, :collection_address, :put_on_sale, :instant_sale_enabled, :instant_sale_price, :unlock_on_purchase,
                                       :minimum_bid, :min_bid_erc20_token_id, :bid_time, :bid_time_opt, :bid_id, :no_of_copies, :attachment, :cover, :data, :collection_type, :royalty, :nft_contract_id, :unlock_description,
                                       :erc20_token_id, :timed_auction_enabled, :start_time, :end_time, :instant_sale_enabled, :referral_percentage,
                                       :source, :nft_link, :token, :total_copies, :contract_address, :contract_type, :imported, :allow_bid, :category, :attributes, category: [])
  end

  def change_price_params
    params[:collection][:put_on_sale] = false if params[:collection][:put_on_sale].nil?
    params[:collection][:unlock_on_purchase] = false if params[:collection][:unlock_on_purchase].nil?

    params[:collection][:allow_bid] = false if params[:collection][:allow_bid].nil?
    if params[:collection][:instant_sale_enabled] || params[:collection][:allow_bid]
      params[:collection][:put_on_sale] = true
    elsif params[:collection][:allow_bid].nil? || params[:collection][:allow_bid] == false
      params[:collection][:timed_auction_enabled] = false
      params[:collection][:minimum_bid] = nil
      params[:collection][:start_time] = nil
      params[:collection][:end_time] = nil
    else
      params[:collection][:put_on_sale] = false
    end

    unless params[:collection][:instant_sale_enabled]
      params[:collection][:instant_sale_enabled] = false
      params[:collection][:instant_sale_price] = nil
    end
    unless params[:collection_timed_auction_running]
      params[:collection][:timed_auction_enabled] = false
      params[:collection][:minimum_bid] = nil
      params[:collection][:min_bid_erc20_token_id] = nil
      params[:collection][:bid_time] = nil
      params[:collection][:bid_time_opt] = nil
      params[:collection][:start_time] = nil
      params[:collection][:end_time] = nil
    end
    params.require(:collection).permit(:put_on_sale, :instant_sale_enabled, :instant_sale_price, :unlock_on_purchase, :unlock_description, :erc20_token_id, :timed_auction_enabled, :minimum_bid, :min_bid_erc20_token_id, :bid_time, :bid_time_opt, :start_time, :end_time, :allow_bid, :referral_percentage)
  end

  def bid_params
    params[:user_id] = current_user.id
    params.permit(:sign, :quantity, :user_id, details: {})
  end

  def set_collection
    @collection = Collection.unscoped.find_by(address: params[:id])
    redirect_to root_path unless @collection.present?
  end

  def set_gon
    gon.collection_data = @collection.gon_data
  end

  def set_collection_gon
    gon.collection_data = @collection.gon_data
  end

  def lazy_mint_token_update
    # After getting sold, the owner will mint with creators name and transfer
    lazy_minted = @collection.is_lazy_minted?
    @collection.update(token: params[:tokenId].to_i) if lazy_minted && params[:tokenId]&.to_i != 0
    lazy_minted
    # Double validation because tokenId cant be 0
  end

  def ipfs_formatted_url(url)
    nft_image_split = url.split("://")
    nft_image_split[0] == "ipfs" ? "https://ipfs.io/ipfs/#{nft_image_split[1]}" : url
  end
end
