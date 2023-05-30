class ApplicationController < ActionController::Base
  prepend_before_action :authenticate_user
  before_action :is_approved
  before_action :set_locale
  before_action :set_base_gon
  before_action :set_token_address
  before_action :set_current_user
  # before_action :authenticate_user, except: [:show]

  helper_method :current_user, :current_balance, :gon, :buyer_service_fee, :seller_service_fee

  private

  def set_current_user
    User.current = current_user
  end

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def current_balance
    @current_balance ||= session[:balance]
  end

  # def service_fee
  #   Fee.default_service_fee
  # end

  def buyer_service_fee
    Fee.buyer_service_fee
  end

  def seller_service_fee
    Fee.seller_service_fee
  end

  def set_locale
    if params[:locale] || cookies['locale'].nil?
      I18n.locale = params[:locale] || I18n.default_locale
      cookies['locale'] = I18n.locale
    else
      I18n.locale = cookies['locale']
    end
    @locale = I18n.locale
  end

  def authenticate_user
    redirect_to root_path, alert: 'Please connect your wallet to proceed.' unless current_user
  end

  def is_approved
    redirect_to root_path, alert: 'Pending for admin approval.' unless current_user&.is_approved
  end

  def set_base_gon
    gon.session = current_user.present?
    gon.rpc = Rails.application.credentials.infura_id
  end

  def set_token_address
    gon.address = session[:address]
    gon.wallet = session[:wallet]
    gon.tokenURIPrefix = Settings.tokenURIPrefix
    gon.transferProxyContractAddress = Settings.transferProxyContractAddress
    gon.wethAddress = Settings.wethAddress
    gon.sokuAddress = Settings.sokuAddress
    gon.sushiRouterAddress = Settings.sushiRouterAddress
    gon.tradeContractAddress = Settings.tradeContractAddress
    gon.factoryContractAddressFor721 = Settings.factoryContractAddressFor721
    gon.factoryContractAddressFor1155 = Settings.factoryContractAddressFor1155
    gon.network = Settings.defaultNetwork
    gon.chainId = Settings.defaultNetworkId
    gon.owntokenSymbol = Erc20Token.own_tokens.pluck(:symbol)
    gon.wertPrivateKey = Rails.application.credentials.wert_private_key
    gon.wertPartnerId = Rails.application.credentials.wert_partner_id
  end

  def after_sign_out_path_for(resource_or_scope)
    request.referrer
  end
end
