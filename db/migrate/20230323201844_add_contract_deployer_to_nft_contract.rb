class AddContractDeployerToNftContract < ActiveRecord::Migration[6.1]
  def change
    add_column :nft_contracts, :contract_deployer, :string
  end
end
