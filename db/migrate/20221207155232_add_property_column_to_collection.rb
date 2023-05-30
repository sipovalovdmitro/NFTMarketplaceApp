class AddPropertyColumnToCollection < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :properties, :json
  end
end
