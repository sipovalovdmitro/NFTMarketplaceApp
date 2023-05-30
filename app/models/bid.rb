class Bid < ApplicationRecord
  include AASM

  belongs_to :user
  belongs_to :owner, class_name: 'User', foreign_key: 'owner_id'
  belongs_to :collection
  belongs_to :erc20_token

  has_paper_trail on: [:create, :update]

  validates :user_id, :collection_id, :owner_id, :amount, :state, presence: true

  default_scope { where.not(state: [:cancelled,:expired]) }
  scope :by_desc, lambda { order('created_at desc') }

  after_create :send_notification
  # after_commit :update_volume_and_floor_price, if: -> { state == 'executed' && state_before_last_save != 'executed' }

  # after_create :start_timed_auction # Commented this one as the client want to set their own time for Timed Auction

  enum state: {
      pending: 1,
      approved: 2,
      executed: 3,
      expired: 4,
      cancelled: 5
    }

  aasm column: :state, enum: true, whiny_transitions: false do
    state :pending, initial: true, if: :is_eligible_for_bid?
    state :approved
    state :executed
    state :expired

    event :execute_bidding, after: :send_accept_notification do
      transitions from: :pending, to: :executed
    end

    event :expire_bid do
      transitions from: :pending, to: :expired, if: :is_date_expired?
    end

    event :cancel_bid do
      transitions from: :pending, to: :cancelled
    end

    event :expire_bidding, after: :send_expire_notification do
      transitions from: :pending, to: :expired
    end
  end

  def bid_price
    price, currency = self.crypto_currency, self.crypto_currency_type
    fiat_price = sale_price_to_float(price, currency)
    "#{price} #{currency} #{'($' + sprintf('%.10f', fiat_price).to_s + ')'}".html_safe
  end

  def sale_price_to_float price, currency='eth'
    return 0 unless currency
    usd_price = Rails.cache.fetch "#{currency}_price", expires_in: 10.seconds do
      Api::Etherscan.usd_price(currency.downcase)
    end
    return (price.to_f * usd_price).round(10)
  end


  def send_accept_notification
    Notification.notify_bid_accept(self)
    use_referral_link
  end

  def use_referral_link
    bids_nft = Collection.find_by_id(self.collection_id)
    bids_nft.use_nft_referral_token(self.referral_token)
  end

  # Commented this one as the client want to set their own time for Timed Auction
  # def start_timed_auction
  #   collection.set_timed_auction if collection.timed_auction_enabled?
  # end

  def is_highest_bid?
    #Need crypto currency conversion
    self.collection.bids.pluck('amount').max == self.amount
  end

  def is_date_expired?
    #expire allowance days from common application configuration or collection level.??
    col = self.collection
    ((self.created_at + eval(col.expire_bid_days)) < Time.now) if col.expire_bid_days
  end

  def is_eligible_for_bid?
    self.collection.put_on_sale
  end

  def value
    "#{self.crypto_currency} #{self.crypto_currency_type}"
  end

  def crypto_currency
    self.amount
  end

  def crypto_currency_type
    self.erc20_token.symbol rescue nil
  end

  def crypto_currency=(amt)
    self.amount=amt
  end

  def crypto_currency_type=(sym)
    self.erc20_token_id = Erc20Token.where(:symbol=>sym).first.id rescue nil
  end

  def desc
    "#{value} for #{quantity} edition(s)"
  end

  private

  def send_notification
    Notification.notify_new_bid(self)
  end
  
  def send_cancel_notification
    Notification.notify_expire_bid(self) if self.expired?
  end

  def send_expire_notification
    Notification.notify_expire_bid(self)
  end

  # def update_volume_and_floor_price
  #   return unless collection&.nft_contract

  #   converted_amount = sale_price_to_float(amount, erc20_token.symbol)
  #   nft_contract = collection.nft_contract
  #   nft_contract.volume = nft_contract.calculate_volume
  #   nft_contract.floor_price = converted_amount if nft_contract.floor_price > converted_amount
  #   nft_contract.save(validate: false)
  # end
end
