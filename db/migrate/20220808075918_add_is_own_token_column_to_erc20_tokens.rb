class AddIsOwnTokenColumnToErc20Tokens < ActiveRecord::Migration[6.1]
  def change
    add_column :erc20_tokens, :is_own_token, :boolean, :default => false
  end
end
