class AddReferralPercentageToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :referral_percentage, :float
  end
end
