class Collection < ApplicationRecord
  include Searchable
  include AASM
  include TopDays
  include ActionView::Helpers::NumberHelper

  attr_accessor :usd_price, :recent_volume

  # enum category: [:art, :animation, :audio, :video]
  enum collection_type: [:single, :multiple]
  enum state: { pending: 1, approved: 2, burned: 3 }
  enum bid_time_opt: [:days, :hours, :minutes]

  self.per_page = 20

  FILE_EXTENSIONS = %w(png gif mp3 mp4).freeze
  CATEGORY_MAPPINGS = { art: ["png"], animation: ["gif"], audio: ["mp3"], video: ["mp4"] }.freeze
  IMAGE_SIZE = { thumb: { resize_to_limit: [500, 500] }, banner: { resize_to_limit: [500, 500] } }

  serialize :data, JSON
  serialize :category, Array

  belongs_to :creator, class_name: "User", foreign_key: "creator_id"
  belongs_to :owner, class_name: "User", foreign_key: "owner_id"
  belongs_to :nft_contract, optional: true
  belongs_to :erc20_token, optional: true
  has_one_attached :attachment, dependent: :destroy
  has_one_attached :cover, dependent: :destroy
  has_many :bids
  has_many :transactions
  has_many :likes, dependent: :destroy
  has_many :referrals

  has_paper_trail

  accepts_nested_attributes_for :nft_contract

  default_scope { where(is_active: true) }
  default_scope { where(state: :approved) }
  default_scope -> { order(created_at: :desc) }
  scope :by_creator, lambda { |user| where(creator: user) }
  scope :on_sale, -> { where(put_on_sale: true) }
  # scope :on_sale, -> { where(instant_sale_enabled: true) }
  scope :other_author_nfts, lambda { |user| where("owner_id != ?", user.id) }
  scope :lazy_minted, -> {where.not(nft_contract_id: nil).where(token: nil)}
  scope :minted, -> {where.not(token: nil)}
  scope :top_bids, lambda{|days| joins(:bids).order('count(bids.collection_id) DESC').group('bids.collection_id').where('bids.created_at > ?', Time.now-(days.to_i.days)).where("bids.state"=>:pending)}
  scope :active_timed_auction, -> {where(timed_auction_enabled: true).where("end_time >= ?", Time.now)}
  scope :expired_timed_auction, -> {where(timed_auction_enabled: true).where("end_time < ?", Time.now)}
  scope :no_timed_auction, -> {where(timed_auction_enabled: false)}
  scope :nft_referrals, -> { where.not(referral_percentage: nil).where('minimum_bid IS NOT NULL OR instant_sale_enabled IS TRUE ').reorder(referral_percentage: :desc) }

  store :config, accessors: [:size, :width, :asset_supply]
  store :data, accessors: [:highest_bid, :expire_bid_days]

  validates :name, :description, :category, :attachment, :royalty, presence: true
  validates :royalty, numericality: { less_than_or_equal_to: 50, message: "accepts numbers between 0 and 50 only" }, if: Proc.new { |c| c.royalty.present? }

  validates :name, length: { maximum: 100 }
  validates :description, length: { maximum: 1000 }

  # before_create :validate_and_assign_owned_token
  # before_save :validate_quantity
  after_validation :common_validation
  before_save :update_put_on_sale
  after_save :initiate_notification
  after_create :update_activities, if: :imported
  after_create_commit { PendingCollectionJob.set(wait_until: 3.minutes.from_now).perform_later(id) }

  # after_commit :update_volume_and_floor_price, if: -> { saved_change_to_instant_sale_price? || (saved_change_to_state? && approved?) }

  aasm column: :state, enum: true, whiny_transitions: false do
    state :pending, initial: true
    state :approved
    state :burned

    event :approve do
      transitions from: :pending, to: :approved
    end

    event :burn, after: :send_burn_notification do
      transitions from: :approved, to: :burned
    end
  end

  settings number_of_shards: 1 do
    mapping dynamic: "false" do
      #indexes :id, type: :index
      indexes :name
      indexes :description
      indexes :category, type: :keyword
      indexes :collection_type, type: :keyword
      indexes :no_of_copies
      indexes :creator_name
      indexes :owner_name
      indexes :collection_name
      indexes :creator_address
      indexes :owner_address
      indexes :address
    end
  end

  def as_indexed_json(options = nil)
    self.as_json(only: [:address, :name, :description, :category, :collection_type, :no_of_copies], methods: [:collection_name, :creator_name, :owner_name, :creator_address, :owner_address])
  end

  def send_burn_notification
    Notification.notify_burn_token(self)
  end

  def title
    "#{name&.camelcase}"
  end

  def title_desc
    price, currency = sale_price
    fiat_price = sale_price_to_float(price, currency)
    formatted_price = number_with_delimiter(price)
    formatted_fiat_price = number_with_delimiter(number_with_precision(fiat_price, percision: 3))
    "#{formatted_price} #{currency} #{'<span class=\'para-color\'>($ ' + sprintf(formatted_fiat_price).to_s + ")</span>" if fiat_price > 0} 
    <span id=\'fiat_price\' class=\'hide\'>#{fiat_price}</span> <span id=\'commodity_amt\' class=\'hide\'>#{price}</span>".html_safe
  end

  def sale_price
    return [instant_sale_price.to_s, erc20_token.symbol] if instant_sale_enabled
    return [max_bid.amount, max_bid.crypto_currency_type] if max_bid
    return ["No active bids yet."] if put_on_sale?

    ["Not for sale."]
  end

  # CURRENTLY ITS FOR ETH/WBNB. FOR OTHER FIAT NEED TO INTEGRATE COINGECKO OR COINMARKETCAP APIS
  def sale_price_to_float(price, currency = "eth")
    return 0 unless currency
    usd_price = Rails.cache.fetch "#{currency}_price", expires_in: 10.seconds do
      Api::Etherscan.usd_price(currency.downcase)
    end
    (price.to_f * usd_price).round(10)
  end

  def collection_info
    "<p class='para-color' data-toggle='tooltip' data-placement='top'>#{nft_contract&.name&.upcase}</p>".html_safe
  end

  def total_editions
    "(#{owned_tokens.to_i} of #{no_of_copies})"
  end

  def creator_name
    creator.name
  end

  def owner_name
    owner.name
  end

  def creator_address
    creator.address
  end

  def owner_address
    owner.address
  end

  def collection_name
    # WHEN CONTARCT IS NOT YET CREATED FOR OWN NFT
    nft_contract ? nft_contract.address : nil
  end

  # def fetch_cur_token_price
  #   all_price = Api::Etherscan.get_all_price
  #    usd_price = Rails.cache.fetch "#{self.instant_currency_symbol}_price", expires_in: 10.seconds do
  #     Api::Etherscan.usd_price(self.instant_currency_symbol.downcase)
  #    end
  #    hash = {collection_max_bid: usd_price, collection_token_symbol: self.instant_currency_symbol.downcase}
  #     Api::Etherscan::COINGECKO_IDS.each do |k,v|
  #       hash[k] = all_price[v]['usd'] if all_price[v].present?
  #     end
  #   return hash
  # end

  def place_bid(bidding_params)
    details = bidding_params[:details]
    erc20_token = Erc20Token.where(address: details[:payment_token_address]).first
    # raise "Bids below min amount won’t be allowed." if timed_auction_enabled && details[:amount].to_f < minimum_bid.to_f
    nftcontract_type = NftContract.where(address: details[:asset_address]).first.contract_type
    minimum_accept = self.minimum_bid_accept
    if minimum_accept != false && nftcontract_type != "nft1155"
      minimum_accept_in_fiat = self.sale_price_to_float(minimum_accept[0], minimum_accept[1])
      bidding_amount_in_fiat = self.sale_price_to_float(details[:amount], erc20_token&.symbol)
      if bidding_amount_in_fiat < minimum_accept_in_fiat
        raise "Bids need to be more than minimum bid amount."
      end
    end

    self.bids.create(sign: bidding_params[:sign], amount: details[:amount], amount_with_fee: details[:amount_with_fee], state: :pending, owner_id: self.owner_id,
                     user_id: bidding_params[:user_id], erc20_token_id: erc20_token&.id, quantity: details[:quantity], referral_token: details[:referral_bid_token])
  end

  def execute_bid(buyer_address, bid_id, receipt, lazy_minted)
    user = User.where(address: buyer_address).first
    bid = bids.where(id: bid_id, user_id: user.id).first
    if self.put_on_sale && bid.execute_bidding && bid.save!
      hash = { seller_id: self.owner_id, buyer_id: bid.user_id, currency: bid.crypto_currency, currency_type: bid.crypto_currency_type, channel: :bid }
      self.hand_over_to_owner(bid.user_id, receipt, bid.quantity, lazy_minted)
      self.add_transaction(hash)
    end
  end

  #TODO: FOR CASES LIKE 1155, BID APPROVED FOR ONLY 10, THE REAL COLLECTION SHOULD BE CLOSED FOR SELLING TOO. NEED TO CHCK FOR MULTIPLE CASES
  def hand_over_to_owner(new_owner_id, transaction_hash, quantity = 1, lazy_minted = nil, notify_owner = false, notify_user = false, burn_transfer = false)
    redirect_address = address
    if multiple? && owned_tokens > 1
      final_qty = owned_tokens - quantity
      if final_qty == 0
        #self.update({owner_id: new_owner_id, put_on_sale: false, instant_sale_price: nil, instant_sale_enabled: false})
        self.update({
          owner_id: new_owner_id,
          put_on_sale: false,
          instant_sale_enabled: false,
          instant_sale_price: nil,
          timed_auction_enabled: false,
          minimum_bid: nil,
          min_bid_erc20_token_id: nil,
          bid_time: nil,
          bid_time_opt: nil,
          start_time: nil,
          end_time: nil,
          allow_bid: false,
        })
      elsif final_qty > 0
        collection = Collection.where(owner_id: new_owner_id, nft_contract_id: nft_contract_id, token: token).first
        if collection
          collection.assign_attributes({ owned_tokens: (collection.owned_tokens + quantity) })
        else
          collection = dup.tap do |destination_package|
            destination_package.attachment.attach(attachment.blob)
            destination_package.cover.attach(self.cover.blob) if self.cover.blob
          end
          collection.assign_attributes({ owner_id: new_owner_id, address: self.class.generate_uniq_token, put_on_sale: false, owned_tokens: quantity, instant_sale_price: nil, instant_sale_enabled: false, allow_bid: false, timed_auction_enabled: false, minimum_bid: nil, start_time: nil, end_time: nil })
        end
        collection.save
        quantity_remains = {
          owned_tokens: final_qty,
          asset_supply: lazy_minted.present? ? final_qty : asset_supply,
          put_on_sale: lazy_minted.present? ? false : put_on_sale,
          instant_sale_price: lazy_minted.present? ? nil : instant_sale_price,
          instant_sale_enabled: lazy_minted.present? ? false : instant_sale_enabled,
          transaction_hash: transaction_hash,
          allow_bid: lazy_minted.present? ? false : allow_bid,
          start_time: lazy_minted.present? ? nil : start_time,
          end_time: lazy_minted.present? ? nil : end_time,
          timed_auction_enabled: lazy_minted.present? ? false : timed_auction_enabled,
        }
        if burn_transfer
          copies = no_of_copies - quantity
          update_copies_to_all_buyers(copies)
          quantity_remains.merge!({ no_of_copies: copies, any_burned: true })
        end
        self.update(quantity_remains)
        self.update_column(:any_burned, false)
        Notification.notify_nft_partial_sold(collection, self.owner_id, quantity) if notify_owner
        self.update(owned_tokens: final_qty)
        redirect_address = collection.address
      end
    else
      #self.update({owner_id: new_owner_id, put_on_sale: false, instant_sale_price: nil, instant_sale_enabled: false, transaction_hash: transaction_hash})
      update({
        owner_id: new_owner_id,
        put_on_sale: false,
        instant_sale_price: nil,
        instant_sale_enabled: false,
        timed_auction_enabled: false,
        minimum_bid: nil,
        min_bid_erc20_token_id: nil,
        bid_time: nil,
        bid_time_opt: nil,
        start_time: nil,
        end_time: nil,
        allow_bid: false,
      })
    end
    cancel_bids((lazy_minted ? false : true)) #Partial cancel true and if lazy minted it should be false
    redirect_address
  end

  def update_copies_to_all_buyers(copies)
    Collection.where("id !=? and metadata_hash = ?", id, metadata_hash).update_all(no_of_copies: copies)
  end

  def max_bid
    bids.pending.order("bids.amount desc").first if put_on_sale
    # if self.put_on_sale
    #   bids = self.bids.pending.select{|bid| bid.sale_price_to_float(bid.amount, bid.erc20_token.symbol)}.max
    # end
  end

  def min_bid
    bids.pending.order("bids.amount asc").first if put_on_sale
    # if self.put_on_sale
    #   bids = self.bids.pending.select{|bid| bid.sale_price_to_float(bid.amount, bid.erc20_token.symbol)}.min
    # end
  end

  def cancel_bids(partial_cancel = false)
    # self.bids.where(state: :pending).update_all(state: :expired)
    bids_to_cancel = bids.where(state: :pending)
    if partial_cancel && collection_type == "multiple"
      bids_to_cancel = bids_to_cancel.select { |bid| bid.quantity > owned_tokens }
    end
    bids_to_cancel.each { |bid| bid.expire_bidding && bid.save! }
  end

  def direct_buy(buyer, quantity, transaction_hash, lazy_minted, invite_token)
    hash = {
      seller_id: owner_id, buyer_id: buyer.id, currency: instant_sale_price,
      currency_type: instant_currency_symbol, channel: :direct,
    }
    redirect_address = hand_over_to_owner(buyer.id, transaction_hash, quantity, lazy_minted, true, false)
    use_nft_referral_token(invite_token) if invite_token.present?
    add_transaction(hash)
    redirect_address
  end

  def use_nft_referral_token(invite_token)
    referral = self.referrals.find_by_token(invite_token)
    return if referral.present? && referral.is_collection_referral?
    if self.is_from_sigle?
      referral.update(expired_at: Time.now, status: "expired")
    elsif self.is_from_multiple?
      if self.no_of_copies == self.owned_tokens
        referral.update(expired_at: Time.now, status: "expired")
      end
    end
  end

  def is_owner?(user)
    owner == user
  end

  def is_from_multiple?
    return true if self.nft_contract.contract_type == "nft1155"
    false
  end

  def is_from_sigle?
    return true if self.nft_contract.contract_type == "nft721"
    false
  end

  def get_attachment(user, is_background = false)
    attachment_with_variant(:thumb) rescue nil
    # if unlock_on_purchase?
    #   user.present? && user&.id == owner_id ? attachment : "#{is_background ? '/assets/dummy-image.jpg' : '/assets/dummy-image.jpg'}"
    # else
    #   attachment_with_variant(:thumb) rescue nil
    # end
  end

  def can_view_unlock_content?(current_user_id = nil)
    owner_id == current_user_id && unlock_on_purchase && unlock_description.present?
  end

  def self.generate_uniq_token
    rand_token = ""
    loop do
      rand_token = SecureRandom.hex
      collections = Collection.where(token: rand_token)
      break if collections.blank?
    end
    rand_token
  end

  def add_transaction(hash)
    transactions.create(hash)
  end

  def remove_from_sale
    self.put_on_sale = false
    self.timed_auction_enabled = false
    self.minimum_bid = nil
    self.min_bid_erc20_token_id = nil
    self.start_time = nil
    self.end_time = nil
    self.allow_bid = false
    self.unlock_on_purchase = false
    self.unlock_description = nil
    save
  end

  def self.is_valid_activity(activity)
    ["state", "put_on_sale", "instant_sale_price", "owned_tokens"].any? { |x| activity.changeset.keys.include? x }
  end

  # CONVERT TO INTEGER (* 10) BY ROUND OFF BY 1 DECIMAL
  def royalty_fee
    (royalty.to_f.round(1) * 10).to_i
  end

  def self.get_with_sort_option(sort_by = nil)
    if sort_by.present?
      if sort_by == "liked"
        on_sale.where("id in (?)", joins(:likes).group(:id).order("count(collections.id) desc").pluck(:id))
      else
        on_sale.where("instant_sale_price is not null").order("instant_sale_price #{sort_by == "lowest" ? "asc" : "desc"}")
      end
    else
      on_sale.order("created_at desc")
    end
  end

  def get_collections
    if single?
      [self]
    else
      Collection.where(nft_contract_id: nft_contract_id, token: token)
    end
  end

  def fetch_details(bid_id, erc20_address)
    pay_token = Erc20Token.where(address: erc20_address).first
    trade_address = Settings.tradeContractAddress
    bid_detail = bids.where(id: bid_id).first if bid_id.present?
    details = { collection_id: self.address, creator_address: creator.address, owner_address: owner.address, unit_price: instant_sale_price,
                asset_type: nft_contract&.contract_asset_type, asset_address: nft_contract&.address, shared: shared?,
                seller_sign: sign_instant_sale_price, contract_type: contract_type, owned_tokens: owned_tokens, total: no_of_copies,
                token_uri: metadata_hash, type: collection_type, royalty: royalty, is_lazy_minted: is_lazy_minted? }
    if is_lazy_minted?
      details = details.merge(token_id: 0, asset_supply: 0)
    else
      details = details.merge(token_id: token, asset_supply: asset_supply)
    end
    details = details.merge(pay_token_address: pay_token.address, pay_token_decimal: pay_token.decimals) if pay_token.present?
    details = details.merge(trade_address: trade_address) if trade_address.present?
    details = details.merge(buyer_address: bid_detail.user.address, amount: bid_detail.amount, amount_with_fee: bid_detail.amount_with_fee,
                            quantity: bid_detail.quantity, buyer_sign: bid_detail.sign, bid_id: bid_detail.id) if bid_detail.present?
    details
  end

  def change_ownership(recipient_user)
    update({ owner_id: recipient_user, put_on_sale: false, instant_sale_price: nil })
  end

  def gon_data
    { contract_address: nft_contract&.address,
      contract_type: nft_contract&.contract_type,
      contract_shared: shared?,
      instant_sale_price: instant_sale_price,
      put_on_sale: put_on_sale,
      imported: imported }
  end

  def attachment_with_variant(size = nil)
    size.present? && IMAGE_SIZE[size].present? && attachment.content_type != "image/gif" ? attachment.variant(IMAGE_SIZE[size]) : attachment
  end

  def executed_price
    bids.executed.present? ? bids.executed.last.amount : instant_sale_price
  end

  def isLiked?(user_id)
    likes.pluck(:user_id).include?(user_id)
  end

  def is_lazy_minted?
    is_active? && !nft_contract_id.nil? && token.nil?
  end

  # To help with front-end validation, store equivalent value for all Erc20Token(in database) in MAP  Eg return {'eth': 0.05, 'fiat': 400}
  def minimum_bid_accept
    if self.max_bid.present?
      amount = self.max_bid.crypto_currency
      currency = self.max_bid.crypto_currency_type
    else
      if self.minimum_bid.present?
        amount = self.minimum_bid
        currency = Erc20Token.find(self.min_bid_erc20_token_id).symbol
      else
        return false
      end
    end
    return [amount, currency]
  end

  # Commented this one as the client want to set their own time for Timed Auction
  # def set_timed_auction
  #   # Extending Auction time by 10mins if Bid gets placed in the last 10mins
  #   # update(end_time: end_time + 10.minutes) if end_time.blank? == false &&  end_time - Time.now < 10.minutes
  #   update(start_time: Time.now, end_time: Time.now + eval("#{bid_time}.#{bid_time_opt}")) if start_time.blank?
  # end

  def allowed_for_instant_buy?
    return !(timed_auction_enabled && end_time.present? && Time.now > end_time) if instant_sale_price?

    false
  end

  def allowed_for_bid?
    if put_on_sale?
      if !timed_auction_enabled
        return true
      elsif timed_auction_enabled && (start_time.present? && start_time < Time.now) && (end_time.present? && end_time > Time.now)
        return true
      else
        return false
      end
    else
      return false
    end
  end

  def auction_further?
    return start_time&.future? #&& put_on_sale? if timed_auction_enabled?

    false
  end

  def auction_running?
    return start_time&.past? && end_time&.future? # && put_on_sale? if timed_auction_enabled?

    # false
  end

  def auction_enabled?
    return auction_running? #if timed_auction_enabled?

    put_on_sale?
  end

  def auction_timing
    start_time&.future? ? start_time : end_time
  end

  def auction_ended?
    return end_time&.past? # && put_on_sale? if timed_auction_enabled?

    false
  end

  def auction_expired?
    end_time&.past? # && timed_auction_enabled?
  end

  def auction_expired_after
    return unless timed_auction_enabled && auction_ended?

    update({ put_on_sale: false, instant_sale_price: nil, instant_sale_enabled: false })
  end

  def update_activities
    versions.last.update_column(:event, "list")
  end

  private

  def common_validation
    return if errors.present?
    errors.add(:minimum_bid, "cant be more than instant selling price") if minimum_bid.present? && instant_sale_price.present? && instant_sale_price < minimum_bid
    errors.add(:royalty, "should be between 0 to 50") if royalty.present? && !royalty.between?(0, 50) && !imported
    errors.add(:data, "should not be blank") if validate_data
    self.errors.add(:no_of_copies, "should be between 1 to 10000000") if no_of_copies.present? && !no_of_copies.between?(1, 10000000)
    self.errors.add(:no_of_copies, "should not be blank for multiple collection") if self.collection_type == "multiple" && !no_of_copies.present?
    self.errors.add(:base, "Owned tokens can't be greater than no of copies") if owned_tokens.to_i > no_of_copies.to_i
    self.errors.add(:instant_sale_price, "should be valid") if instant_sale_price.present? && instant_sale_price.to_f <= 0
  end

  def validate_data
    is_blank = false
    data.each { |k, v| is_blank = true if k.blank? || v.blank? }
    is_blank
  end

  def update_put_on_sale
    if !self.put_on_sale? && self.put_on_sale_changed?
      self.instant_sale_enabled = false
      self.instant_sale_price = nil
      self.sign_instant_sale_price = nil
    end
  end

  def initiate_notification
    if saved_change_to_state? && state == "approved"
      Notification.notify_put_on_sale(self) if put_on_sale
      Notification.notify_price_update(self) if instant_sale_price.to_f > 0
    end

    if saved_change_to_owner_id?
      Notification.notify_ownership_transfer(self, saved_changes["owner_id"].first) if saved_changes["owner_id"].first || saved_changes["owner_id"].last != saved_changes["creator_id"].last
      Notification.notify_nft_sold(self, saved_changes["owner_id"].first)
    end
  end

  def self.get_activity_user(activity)
    if activity.changeset.has_key?("owner_id")
      owner = User.find_by_id(activity.changeset["owner_id"][0])
      owner = User.find_by_id(activity.changeset["owner_id"][1]) if owner.nil?
      owner.profile_image
    else
      activity.reify.owner.profile_image
    end
  end

  # def update_volume_and_floor_price
  #   return unless nft_contract

  #   nft_contract.update_columns(volume: nft_contract.calculate_volume)
  #   converted_amount = sale_price_to_float(instant_sale_price, erc20_token.symbol)
  #   nft_contract.update_columns(floor_price: converted_amount) if nft_contract.calculate_floor_price > converted_amount
  # end

  delegate :shared?, to: :nft_contract, allow_nil: true
  delegate :contract_type, to: :nft_contract, allow_nil: true
  delegate :symbol, to: :erc20_token, prefix: :instant_currency, allow_nil: true
  delegate :address, to: :erc20_token, prefix: :instant_currency, allow_nil: true
end
