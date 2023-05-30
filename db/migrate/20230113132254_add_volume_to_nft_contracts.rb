class AddVolumeToNftContracts < ActiveRecord::Migration[6.1]
  def change
    add_column :nft_contracts, :volume, :decimal, :precision => 32, :scale => 16, default: 0
    # Calculate volumes of existing NFT's
    NftContract.where(volume: 0).each do |contract|
      contract.update(volume: contract.calculate_volume)
    end
  end
end
