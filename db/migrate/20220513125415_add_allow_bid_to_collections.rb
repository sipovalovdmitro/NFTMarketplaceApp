class AddAllowBidToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :allow_bid, :boolean
  end
end