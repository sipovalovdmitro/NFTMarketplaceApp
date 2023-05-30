class NftContract < ApplicationRecord

  include Rails.application.routes.url_helpers
  include TopDays

  attr_accessor :recent_volume, :total_volume, :total_sales, :average_price, :owners

  has_many :collections
  has_many :referrals
  belongs_to :owner, class_name: 'User', foreign_key: 'owner_id', optional: true
  has_one_attached :attachment, dependent: :destroy
  has_one_attached :cover, dependent: :destroy
  enum contract_type: [:nft721, :nft1155]

  validates :name, uniqueness: true

  default_scope -> { order(volume: :desc) }

  def self.get_shared_id type
    type == 'single' ? where(symbol: 'Shared', contract_type: :nft721).first&.id : where(symbol: 'Shared', contract_type: :nft1155).first&.id
  end

  def attachment_with_variant
    if attachment.variable?
      attachment.variant(resize: "100x100")
    else
      attachment
    end
  end

  def self.filter_all_collections
    joins(:collections)
    .where('collections.owner_id IS NOT NULL OR nft_contracts.owner_id IS NOT NULL')
    .where.not(symbol: 'Shared')
  end

  def shared?
    symbol == 'Shared'
  end

  def masked_address(first_char=13, last_char=4)
    "#{address[0..first_char]}...#{address.split(//).last(last_char).join("").to_s}"
  end

  def contract_asset_type
    nft1155? ? 0 : 1
  end

  def attachment_url
    Rails.application.routes.default_url_options[:host] = Rails.application.credentials.config[:app_url] || 'localhost:3000'
    self.attachment.present? ? url_for(attachment) : 'banner-1.png'
  end

  def cover_url
    Rails.application.routes.default_url_options[:host] = Rails.application.credentials.config[:app_url] || 'localhost:3000'
    self.cover.present? ? url_for(cover) : 'banner-1.png'
  end

  def calculate_volume(address = '', range='all')
    response = Api::NftCollections::get_collection_stats(address, range)

    if (address.present? && response && response['volume'].present?)
      return response['volume']

    else
      total = 0
      collections.on_sale.where.not(instant_sale_price: nil).each do |collection|
        total += collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
      end
      Bid.executed.where(collection_id: collections.ids).each do |bid|
        total += bid.sale_price_to_float(bid.amount, bid.crypto_currency_type)
      end
      return total
    end
  end

  def calculate_floor_price(address = '')
    response = Api::NftCollections::get_collection_stats(address)
    if (address.present? && response && response['floorPrice'].present?)
        floor = response['floorPrice']
    end
    floor_price = 1 / 0.0
    floor_price_object = {}
    collections.includes(:erc20_token).on_sale.where.not(instant_sale_price: nil).each do |collection|
      converted_amount = collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
      if floor_price > converted_amount
        floor_price = converted_amount
        floor_price_object = { amount: collection.instant_sale_price, currency: collection.erc20_token.symbol }
      end
    end
    Bid.executed.where(collection_id: collections.ids).each do |bid|
      converted_amount = bid.sale_price_to_float(bid.amount, bid.crypto_currency_type)
      if floor_price > converted_amount
        floor_price = converted_amount
        floor_price_object = { amount: bid.amount, currency: bid.crypto_currency_type }
      end
    end
    if address.present? && floor
      return floor
    else
      return floor_price_object
    end
  end
end
