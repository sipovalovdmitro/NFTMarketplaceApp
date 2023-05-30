require 'will_paginate/array'

class DashboardController < ApplicationController
  skip_before_action :authenticate_user
  skip_before_action :is_approved

  include ApplicationHelper
  include NftContractHelper

  def status
    render :json => {:status => :ok }
  end

  def index
    set_categories_by_filter
    @hot_bids = Collection.top_bids(30).with_attached_attachment
    @featured_users = FeaturedUser.limit(10).map(&:user)
    @featured_collections = FeaturedCollection.limit(10).map(&:collection).compact
    # @hot_collections = Collection.group(:owner).count
    @own_contract = NftContract.filter_all_collections.distinct.paginate(page: params[:page] || 1, per_page: 10)
    @top_collections = NftContract.joins(:collections).where.not(symbol:"Shared").distinct.each do |contract|
      contract.recent_volume = contract.calculate_volume(contract.address)
    end
    @referrals = Collection.includes(:cover_attachment, :attachment_attachment, :bids, nft_contract: :collections)
                           .nft_referrals
                           .order(referral_percentage: :desc)
                           .limit(4)

    @top_collections = @top_collections.sort_by(&:recent_volume).last(4).reverse

    top_buyers_and_sellers
  end

  def set_categories_by_filter
    params[:page_no] ||= 1
    @category_collections = params[:query].present? ? Collection.search("*#{build_elastic_search_str(params[:query].strip)}*").records.on_sale : Collection.on_sale

    @category_collections = @category_collections.get_with_sort_option(params[:sort_by]) if params[:sort_by]
    @category_collections = @category_collections.where("category like ?", "%#{params[:category]}%") if params[:category].present?
    @category_collections = @category_collections.on_sale.with_attached_attachment.paginate(page: params[:page] || 1, per_page: 12)
    if params[:sale_type].present?
      @category_collections_sale = search_by_sale_type
      @no_record = "clear" if @category_collections_sale.blank?
    elsif params[:sort_type].present?
      @category_collections_sort = search_by_price_and_age
      @no_record = "clear" if @category_collections_sort.blank?
    end
  end

  def top_buyers_and_sellers
    @top_sellers = User.top_seller(params[:days]).with_attached_attachment
    @top_buyers = User.top_buyer(params[:days]).with_attached_attachment
  end

  def search
    params[:page] ||= 1
    # @users = User.search("*#{build_elastic_search_str(params[:query])}*").records.paginate(page: params[:page], per_page: 20)
    @collections = params[:query].present? ? Collection.search(sanitize_elasticsearch_query(build_elastic_search_str("*#{params[:query].strip}*"))).records.on_sale : Collection.on_sale
    @collections = @collections.where("category like ?", "%#{params[:category]}%") if params[:category].present?
    @collections= @collections.with_attached_attachment.paginate(page: params[:page] || 1, per_page: 20)  rescue []
  end

  def notifications
    Notification.unread(current_user).update_all(is_read: true) if Notification.unread(current_user).present?
    @notifications = current_user.notifications
  end

  def contract_abi
    shared = ActiveModel::Type::Boolean.new.cast(params[:shared])
    abi = if params[:contract_address].present? && params[:type] == 'erc20'
      Utils::Abi.weth
    elsif params[:contract_address].present? && (params[:type] == 'trade')
      Utils::Abi.trade
    elsif params[:contract_address].present? && (params[:type] == 'sushi')
      Utils::Abi.sushi
    elsif(shared)
      if params[:type] == 'nft721'
        Utils::Abi.shared_nft721
      elsif params[:type] == 'nft1155'
        Utils::Abi.shared_nft1155
      end
    elsif(!shared)
      if params[:type] == 'nft721'
        Utils::Abi.nft721
      elsif params[:type] == 'nft1155'
        Utils::Abi.nft1155
      end
    else
      {}
    end
    render json: {compiled_contract_details: abi}
  end

  def gas_price
    gas_price = Api::Gasprice.gas_price
    render json: {gas_price: gas_price}
  end

  def collectionitemlists
    @own_contract = NftContract.filter_all_collections.distinct
                               .paginate(page: params[:page] || 1, per_page: 10)
  end

  def all_top_collections
    @top_collections = NftContract.joins(:collections)
                                  .distinct
                                  .where.not(symbol: 'Shared')
                                  .each do |contract|

      contract.recent_volume = contract.calculate_volume(contract.address, range_from_day_filter)
      contract.total_sales = total_collection_transactions(contract, range_from_day_filter).to_i
      contract.average_price = total_collection_avgPrice(contract, range_from_day_filter).to_f
      contract.owners = total_collection_holders(contract, range_from_day_filter).to_i
    end

    @top_collections = display_sorted_collections(@top_collections, params[:sort_by], params[:sort_to])

    respond_to do |format|
      format.html
      format.js
    end
  end

  def nft_referrals
    @page = params[:page] || 1
    @referrals = Collection.includes(:cover_attachment, :attachment_attachment, nft_contract: :collections)
                           .filter_by_days(params[:days])
                           .nft_referrals
                           .paginate(page: @page, per_page: 10)
  end

  def top_collection_prices
    collections = {}
    if params[:collection_ids].present?
      params[:collection_ids].each do |c|
        contract = NftContract.find_by_id(c)
        collections["#{c}"] = {
          floor_price: '%.10f' % usd_to_eth(contract.calculate_volume),
          full_price: '%.10f' % usd_to_eth(contract.calculate_volume),
          hvr_price: '%.3f' % usd_to_eth(contract.calculate_volume)
        }
      end
      render json: {collections: collections}
    end
  end

  private

  def display_sorted_collections(top_collections, sort_by_param, sort_to)
    sort_by_param ||= :recent_volume
    sort_to ||= 'desc'

    if sort_to == 'desc'
      top_collections.sort_by(&sort_by_param.to_sym).reverse
    else
      top_collections.sort_by(&sort_by_param.to_sym)
    end
  end

  def search_by_sale_type
    if params[:sale_type] == "sale"
      results = Collection.all.on_sale.sort_by(&:created_at).reverse!
    elsif params[:sale_type] == "bid"
      results = Collection.where(allow_bid: true).sort_by(&:created_at).reverse!
    elsif params[:sale_type] == "act_auction"
      results = Collection.active_timed_auction.sort_by(&:created_at).reverse!
    elsif params[:sale_type] == "exp_auction"
      results = Collection.expired_timed_auction.sort_by(&:created_at).reverse!
    elsif params[:sale_type] == "all"
      results = @category_collections
    end
    return results
  end

  def search_by_price_and_age
    if params[:sort_type] == "ascending"
      results = Collection.on_sale.where.not(instant_sale_price: nil).each do |collection|
        collection.usd_price = collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
      end
      results = results.sort_by(&:usd_price)
    elsif params[:sort_type] == "descending"
      results = Collection.on_sale.where.not(instant_sale_price: nil).each do |collection|
        collection.usd_price = collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
      end
      results = results.sort_by(&:usd_price).reverse!
    elsif params[:sort_type] == "newest"
      results = Collection.all.sort_by(&:created_at).reverse!
    elsif params[:sort_type] == "oldest"
      results = Collection.all.sort_by(&:created_at)
    elsif params[:sort_type] == "clear"
      results = @category_collections
    end
    return results
  end

  def sanitize_elasticsearch_query(query)
    query&.strip&.gsub(/[^A-Za-z0-9\s]/, '')
  end

  def build_elastic_search_str(string)
    return nil if string.nil?
    es_string = ''
    str_arr = string.strip.split("")
    str_arr.each_with_index do |char, index|
      if ['^', '/'].include?(char)
        if str_arr[index - 1] == '\\' then es_string += char else es_string += '\\' + char end
      else
        es_string += char
      end
    end
    es_string
  end

  def range_from_day_filter
    if ['1', '7', '30'].include?(params[:days])
      params[:days] + 'd'
    else
      'all'
    end
  end
end
