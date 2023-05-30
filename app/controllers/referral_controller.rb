class ReferralController < ApplicationController
  def generate_referral_for_collection
    @collection = Collection.find(params[:collection_id])
    token = SecureRandom.urlsafe_base64(nil, false)
    obj = Utils::Web3.new
    sign = obj.sign_referral_hash(@collection.address, token, current_user.id)
    @referral = Referral.new(collection_id: @collection.id, token: token, user_id: current_user.id, sign: sign)
    # @referral = Referral.new(collection_id: @collection.id, token: token, user_id: current_user.id)
    if @referral.save!
      flash[:notice] = "Referral created. Click View Referral for link"
      redirect_to collection_path(@collection.address)
    else
      flash[:notice] = @referral.errors.full_messages
      redirect_to collection_path(@collection.address)
    end
  end

  def generate_referral_for_contract
    @nft_contract = NftContract.find(params[:nft_contract_id])
    token = SecureRandom.urlsafe_base64(nil, false)
    obj = Utils::Web3.new
    sign = obj.sign_referral_hash(@nft_contract.address, token, current_user.id)
    @referral = Referral.new(nft_contract_id: @nft_contract.id, token: token, user_id: current_user.id, sign: sign)
    # @referral = Referral.new(nft_contract_id: @nft_contract.id, token: token, user_id: current_user.id)
    if @referral.save!
      flash[:notice] = "Referral created. Click View Referral for link"
      if params[:rankings].present?
        redirect_to rankings_path
      elsif params[:root_page].present?
        redirect_to root_path
      else
        redirect_to nft_contract_path(@nft_contract.address)
      end
    else
      flash[:notice] = @referral.errors.full_messages
      if params[:rankings].present?
        redirect_to rankings_path
      elsif params[:root_page].present?
        redirect_to root_path
      else
        redirect_to nft_contract_path(@nft_contract.address)
      end
    end
  end

  private
end
