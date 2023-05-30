class AddTimedAuctionToCollection < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :timed_auction_enabled, :boolean, default: false
    add_column :collections, :minimum_bid, :decimal, precision: 32, scale: 16
    add_column :collections, :min_bid_erc20_token_id, :integer
    add_column :collections, :bid_time, :integer
    add_column :collections, :bid_time_opt, :integer
    add_column :collections, :start_time, :datetime
    add_column :collections, :end_time, :datetime
  end
end