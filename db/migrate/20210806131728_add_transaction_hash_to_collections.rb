class AddTransactionHashToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :transaction_hash, :string
  end
end
