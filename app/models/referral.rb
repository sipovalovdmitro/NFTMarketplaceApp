class Referral < ApplicationRecord
  validates_uniqueness_of :token
  enum referral_type: { nft: 0, collection: 1 }

  belongs_to :user
  belongs_to :collection, optional: true
  belongs_to :nft_contract, optional: true

  scope :used, -> { where(status: "expired") }
  scope :un_used, -> { where(status: "pending") }

  after_create :set_generator_address, :set_referral_type

  def set_generator_address
    self.update(referrer_address: User.current.address, status: "pending")
  end

  def set_referral_type
    self.update(referral_type: 0) if self.collection_id.present?
    self.update(referral_type: 1) if self.nft_contract_id.present?
  end

  def is_nft_referral?
    referral_type == 'nft' ? true : false
  end

  def is_collection_referral?
    referral_type == 'collection' ? true : false
  end
end
