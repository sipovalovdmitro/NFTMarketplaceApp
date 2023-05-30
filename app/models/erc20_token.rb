class Erc20Token < ApplicationRecord
  validates :name, :symbol, :address, presence: true, uniqueness: true

  scope :not_partner, lambda {where(is_partner: false)}
  scope :partner_enabled, lambda { where(is_partner: true)}
  scope :own_tokens, lambda {where(is_own_token: true)}

  def self.select_options(user)
    scope = user&.partner.present? ? :all : :not_partner
    send(scope).map { |token| [token.symbol.upcase, token.id, {address: token.address, decimals: token.decimals}] }
  end

  def currency_symbol
    symbol.upcase
  end
end
