class ChangeDatatypeNftcontractDesc < ActiveRecord::Migration[6.1]
  def up
    change_column :nft_contracts, :description, :text
    change_column :nft_contracts, :name, :text
  end
  def down
    change_column :nft_contracts, :description, :string
    change_column :nft_contracts, :name, :string
  end
end
