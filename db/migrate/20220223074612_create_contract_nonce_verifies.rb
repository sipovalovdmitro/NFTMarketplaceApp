class CreateContractNonceVerifies < ActiveRecord::Migration[6.1]
  def change
    create_table :contract_nonce_verifies do |t|
      t.string :contract_sign_address
      t.string :contract_sign_nonce
      t.integer :network_id
      t.string :user_address

      t.timestamps
    end
  end
end
