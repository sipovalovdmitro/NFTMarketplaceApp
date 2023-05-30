class AddFloorPriceToNftContracts < ActiveRecord::Migration[6.1]
  def change
    add_column :nft_contracts, :floor_price, :decimal, :precision => 32, :scale => 16, default: 0
    NftContract.all.each do |contract|
      volume = 0
      floor_price = 0
      contract.collections.on_sale.where.not(instant_sale_price: nil).each do |collection|
        converted_amount = collection.sale_price_to_float(collection.instant_sale_price, collection.erc20_token.symbol)
        volume += converted_amount
        floor_price = converted_amount if floor_price > converted_amount
      end
      Bid.executed.where(collection_id: contract.collections.ids).each do |bid|
        converted_amount = bid.sale_price_to_float(bid.amount, bid.crypto_currency_type)
        volume += converted_amount
        floor_price = converted_amount if floor_price > converted_amount
      end
      contract.update(volume: volume, floor_price: floor_price)
    end
  end
end
