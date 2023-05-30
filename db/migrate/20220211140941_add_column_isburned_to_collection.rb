class AddColumnIsburnedToCollection < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :any_burned, :boolean , default: false
  end
end