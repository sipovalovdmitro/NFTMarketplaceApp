module NftContractHelper
  def total_collection_bids(contract)
    bids_count = 0
    contract.collections.each do |col|
      bids_count = bids_count + col.bids.count
    end
    return bids_count
  end

  def total_collection_likes(contract)
    likes_count = 0
    contract.collections.each do |col|
      likes_count = likes_count + col.likes.count
    end
    return likes_count
  end

  def total_collection_transactions(contract, range='all')
    response = Api::NftCollections::get_collection_stats(contract.address, range)
    if (response && response['sales'].present?)
      return response['sales']
    else
      transactions_count = 0
      contract.collections.each do |col|
        transactions_count = transactions_count + col.transactions.count
      end
      transactions = transactions_count > 0 ? transactions_count : '-'
      return transactions

    end
  end

  def total_collection_holders(contract, range='all')
    response = Api::NftCollections::get_collection_stats(contract.address, range)
    if (response && response['traders'].present?)
      return response['traders']
    else
      return '-'
    end
  end

  def get_contract_deployer(contract)
    response = Api::NftCollections::get_collection_data_alchemy(contract)
    if (response && response['contractMetadata']['contractDeployer'].present?)
      return response['contractMetadata']['contractDeployer']
    else
      return '-'
    end
  end

  def total_collection_avgPrice(contract, range='all')
    response = Api::NftCollections::get_collection_stats(contract.address, range)
    if (response && response['avgPrice'].present?)
      return response['avgPrice']
    else
      return '-'
    end
  end

  def set_referral_token(contract)
    return unless User.current.present?
    referral = User.current.referrals.un_used.where(user_id: User.current.id, nft_contract_id: contract.id).first

    if referral.present?
      referral_link = request.base_url + nft_contract_path(contract.address) + "?token=" + referral.token + "?sender=" + referral.referrer_address
      return referral_link
    end
  end

  def is_active_user_link(collection_id, user_id)
    user = User.find_by_id(user_id)
    pending_referrals = user.referrals.un_used.where(nft_contract_id: collection_id).count
    pending_referrals > 0 ? true : false
  end

  # def calculate_floor_pice(contract)
  #   #floor_price among on sale records
  #   if contract.collections.on_sale.present?
  #     records = contract.collections.on_sale.where.not(instant_sale_price: nil).sort_by(&:instant_sale_price)
  #   end

  #   floor_price = records.first.instant_sale_price if records.present?

  #   #floor_price among on_bid records
  #   records = contract.collections.active_timed_auction.where(allow_bid: true).or(contract.collections.active_timed_auction.on_sale)

  #   if records.present?
  #     records.each do |collection|
  #       if collection.min_bid.present? && collection.min_bid.amount < floor_price
  #         floor_price = collection.min_bid.amount
  #       end
  #     end
  #   end

  #   if floor_price.present?
  #     return floor_price
  #   else
  #     render html: "<p class='mbl-breakpoint not-available'>Not Available</p>".html_safe
  #   end
  # end
end
