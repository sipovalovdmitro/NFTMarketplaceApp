class AddReferralToBids < ActiveRecord::Migration[6.1]
  def change
    add_column :bids, :referral_token, :string
  end
end
