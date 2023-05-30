module CollectionsHelper
  def cover_url(collection)
    return "dummy-image.jpg" if unauthorized_to_show_attachment(collection)
    attachment = ["image/png", "image/jpeg", "image/gif"].include?(collection.attachment.content_type) ? collection.attachment_with_variant(:thumb) : collection.cover
    attachment.present? ? url_for(attachment) : "banner-1.png"
    # pinata_url(collection)
  end

  def meta_url(collection)
    attachment = Collection::IMAGE_ALLOWED_FORMATS.include?(collection.attachment.content_type) ? collection.attachment : collection.cover
    if attachment.present?
      Rails.application.routes.url_helpers.url_for(attachment)
    else
      "banner-1.png"
    end
  end

  def attachment_tag(collection)
    attachment = collection.attachment
    return image_tag "dummy-image.jpg", class: "img-responsive" if unauthorized_to_show_attachment(collection)

    if ["audio/mp3", "audio/webm", "audio/mpeg"].include?(attachment.content_type)
      audio_tag url_for(attachment), size: "550x400", controls: true
    elsif ["video/mp4", "video/webm"].include?(attachment.content_type)
      video_tag url_for(attachment), class: "video-responsive", controls: true
    else
      # image_tag pinata_url(collection), class: "img-responsive"
      image_tag url_for(attachment), class: "img-responsive"
    end
  end

  def cover_tag(collection)
    attachment = collection.attachment
    if ["audio/mp3", "audio/webm", "audio/mpeg"].include?(attachment.content_type)
      image_tag cover_url(collection), class: "img-responsive"
    end
  end

  def unauthorized_to_show_attachment(collection)
    # collection.unlock_on_purchase? && (!current_user.present? || (current_user && current_user != collection.owner))
    return false
  end

  def pinata_url(collection)
    collection.image_hash.present? ? "https://gateway.pinata.cloud/ipfs/#{collection.image_hash}" : "dummy-image.jpg"
  end

  def contract_path(collection)
    return "javascript:void(0)" if collection.nft_contract&.shared?

    nft_contract_path(:id => collection.nft_contract.address)
  end

  def property_rarity(key, value)
    if @collection.nft_contract.symbol == "Shared"
      contract = @collection.nft_contract
      puts contract.inspect, "CONTRACT"
      total_nfts = contract.collections.count
      property_count = contract.collections.where("JSON_EXTRACT(properties,'$.\"#{key}\"') = \"#{value}\"").count
      rarity = (property_count * 100).to_f / total_nfts
      rarity.round(2)
    else
      puts @collection.nft_contract.address.inspect, @collection.token.inspect
      url = URI("https://eth-mainnet.g.alchemy.com/nft/v2/#{Rails.application.credentials.alchemy[:api_key]}/computeRarity?contractAddress=#{@collection.nft_contract.address}&tokenId=#{@collection.token}")
      response = Net::HTTP.get_response(url)
      if response.kind_of? Net::HTTPSuccess
        rarities = JSON.parse(response.body)
        rarity = 0
        if rarities.length > 0
          rarities.each do |data|
            if data["trait_type"] == key && data["value"] == value
              rarity = (data["prevalence"]*100).to_f
            end
          end
        end
        rarity.round(2)
      else
        rarity = '-'
      end
    end
  end

  def highest_bid(collection)
    bids = collection.bids
    if bids.present?
      highest_bid = bids.first
      bids.each do |bid|
        if ("%f" % bid.amount.to_f) > ("%f" % highest_bid.amount.to_f)
          highest_bid = bid
        end
      end
      return highest_bid
    else
      return nil
    end
  end

  def sale_sonversions(val)
    return "On Sale" if val == "sale"
    return "Allow Bid" if val == "bid"
    return "Active Auctions" if val == "act_auction"
    return "EXpired Auctions" if val == "exp_auction"
  end

  def sort_sonversions(val)
    return "Price: Low to High" if val == "ascending"
    return "Price: High to Low" if val == "descending"
    return "Date: Newest" if val == "newest"
    return "Date: Oldest" if val == "oldest"
  end

  def is_active_user_link_for_nft(col_id, user_id)
    user = User.find_by_id(user_id)
    pending_referrals = user.referrals.un_used.where(collection_id: col_id).count
    pending_referrals > 0 ? true : false
  end

  def get_response_attributes(attributes)
    attributes&.map { |attr| attr.values }.to_h.invert
  end

  def get_image_url(url)
    puts url, "URL from IMAGE URL"
  end
    
end
