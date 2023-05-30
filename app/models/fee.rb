class Fee < ApplicationRecord
  validates_uniqueness_of  :fee_type, presence: true
  # enum fee_type: ['Buyer', 'Seller']

  # def self.default_service_fee
  #   service_fee = where(fee_type: :service_charge).first
  #   service_fee ? service_fee.percentage : Rails.application.credentials.default_fees[:service_fee]
  # end

  def self.buyer_service_fee
    type = [0, "Buyer"]
    service_fee = where(fee_type: type).first
    service_fee ? service_fee.percentage : Rails.application.credentials.default_fees[:buyer_service_fee]
  end

  def self.seller_service_fee
    type = [1, "Seller"]
    service_fee = where(fee_type: type).first
    service_fee ? service_fee.percentage : Rails.application.credentials.default_fees[:seller_service_fee]
  end
end
