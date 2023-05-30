class CreateReferrals < ActiveRecord::Migration[6.1]
  def change
    create_table :referrals do |t|
      t.string :status
      t.datetime :expired_at
      t.references :collection
      t.string :referrer_id
      t.string :referre_id
      t.string :token

      t.timestamps
    end
  end
end
