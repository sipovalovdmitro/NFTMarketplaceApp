class AddOpenseaFieldInCollectionAndNftContract < ActiveRecord::Migration[6.1]
  def change
    add_column :nft_contracts, :opensea_nft_contract, :boolean, default: false
    add_column :collections, :opensea_collection, :boolean, default: false
  end
end
