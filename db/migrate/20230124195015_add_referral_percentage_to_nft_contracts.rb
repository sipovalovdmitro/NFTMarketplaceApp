class AddReferralPercentageToNftContracts < ActiveRecord::Migration[6.1]
  def change
    add_column :nft_contracts, :referral_percentage, :float
  end
end
