class AddUserToReferral < ActiveRecord::Migration[6.1]
  def change
    add_reference :referrals, :user, index: true
    add_reference :referrals, :nft_contract, index: true
    add_column :referrals, :referral_type, :integer
  end
end
