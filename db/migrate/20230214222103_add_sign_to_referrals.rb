class AddSignToReferrals < ActiveRecord::Migration[6.1]
  def change
    add_column :referrals, :sign, :string
  end
end
