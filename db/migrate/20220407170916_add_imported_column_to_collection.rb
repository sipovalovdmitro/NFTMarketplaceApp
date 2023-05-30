class AddImportedColumnToCollection < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :imported, :boolean, default: false
  end
end
