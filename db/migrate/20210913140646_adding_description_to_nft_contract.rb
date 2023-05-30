class AddingDescriptionToNftContract < ActiveRecord::Migration[6.1]
  def change
    add_column :nft_contracts, :description, :string
  end
end