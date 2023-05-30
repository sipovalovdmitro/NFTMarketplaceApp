class NftContractsController < ApplicationController
  skip_before_action :authenticate_user, only: [:show, :filters, :update_scrapped_contract_data]
  skip_before_action :is_approved, only: [:show, :filters, :update_scrapped_contract_data]
  skip_before_action :verify_authenticity_token

  require "uri"

  def show
    @contract = NftContract.joins(:collections).where.not(symbol:"Shared").distinct.where(address: params[:id]).first
    unless @contract.present?
      redirect_path = request.referer.present? ? request.referer : root_path
      redirect_to redirect_path, alert: 'Invalid contract address!' and return  
    end
    set_referral_token

    @filter_tokens = @contract.collections.order(:created_at).reverse_order.paginate(page: params[:page] || 1, per_page: 24)
    
    if params[:nft_contract_id].present? && params[:sale_type].present?
      if params[:sale_type] == 'sale'
        @filter_tokens = @contract.collections.on_sale.sort_by(&:created_at).reverse!
      elsif params[:sale_type] == 'bid'
        @filter_tokens = @contract.collections.where(allow_bid: true).sort_by(&:created_at).reverse!
      elsif params[:sale_type] == 'auction'
        @filter_tokens = @contract.collections.active_timed_auction.sort_by(&:created_at).reverse!
      end
    elsif params[:nft_contract_id].present? && params[:sort_type].present?
      search_by_price_and_age
    end
  end

  def update_scrapped_contract_data
    nft_contract = NftContract.unscoped.find(params[:id])
    nft_contract.symbol = 'Own'
    nft_contract.opensea_nft_contract = true
    
    img = URI.open(params[:image_url])
    nft_contract.attachment.attach(io: img, filename: params[:nft_contract_name], content_type: img.content_type)
    cover = URI.open(params[:cover_url])
    nft_contract.cover.attach(io: cover, filename: params[:nft_contract_name], content_type: cover.content_type)
    nft_contract.save(validate: false)
  end

  private

  def search_by_price_and_age
    if params[:sort_type] == "ascending"
      @filter_tokens = @contract.collections.on_sale.where.not(instant_sale_price: nil).each do |collection|
        collection.usd_price = collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
      end
      @filter_tokens = @filter_tokens.sort_by(&:usd_price)
    elsif params[:sort_type] == "descending"
      @filter_tokens = @contract.collections.on_sale.where.not(instant_sale_price: nil).each do |collection|
        collection.usd_price = collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
      end
      @filter_tokens = @filter_tokens.sort_by(&:usd_price).reverse!
    elsif params[:sort_type] == "newest"
      @filter_tokens = @contract.collections.sort_by(&:created_at).reverse!
    elsif params[:sort_type] == "oldest"
      @filter_tokens = @contract.collections.sort_by(&:created_at)
    end
  end

  def set_referral_token
    return unless current_user.present?
    @referral = current_user.referrals.un_used.where(user_id: current_user.id, nft_contract_id: @contract.id).first
    
    if @referral.present?
      @referral_link = request.base_url + nft_contract_path(@contract.address) + "?token=" + @referral.token + "?sender=" + @referral.referrer_address
    end
  end
end
