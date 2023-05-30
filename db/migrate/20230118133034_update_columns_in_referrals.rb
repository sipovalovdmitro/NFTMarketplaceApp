class UpdateColumnsInReferrals < ActiveRecord::Migration[6.1]
  def change
    rename_column :referrals, :referrer_id, :referrer_address
    rename_column :referrals, :referre_id, :referre_address
  end
end
