class CreatePartners < ActiveRecord::Migration[6.1]
  def change
    create_table :partners do |t|
      t.integer :user_id
      t.string :address
      t.timestamps
    end
    add_column :erc20_tokens, :is_partner, :boolean, default: false
  end
end
