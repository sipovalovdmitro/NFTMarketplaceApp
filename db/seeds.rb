# Admin User
CHAIN_ID = Settings.defaultNetworkId
AdminUser.find_or_create_by(email: Rails.application.credentials.admin[:email])
  .update(password: Rails.application.credentials.admin[:password], first_name: "Admin", last_name: "User", password_confirmation: Rails.application.credentials.admin[:password])
# goerli
# Fee.find_or_create_by(fee_type: "Buyer").update(name: "Service Charge", percentage: "2.5")
# mainnet
Fee.find_or_create_by(fee_type: "Buyer").update(name: "Service Charge", percentage: "0.0")
Fee.find_or_create_by(fee_type: "Seller").update(name: "Service Charge", percentage: "2.5")

["Art", "Animation", "Games", "Music", "Videos", "Memes", "Metaverses"].each { |c| Category.find_or_create_by(name: c) }

#Creating ERC20 Token List
Erc20Token.find_or_create_by(chain_id: CHAIN_ID, symbol: "WETH")
  .update(address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", name: "Wrapped Ether", decimals: 18)
Erc20Token.find_or_create_by(chain_id: CHAIN_ID, symbol: "SOKU")
  .update(address: "0x4c3a8eceb656ec63eae80a4ebd565e4887db6160", name: "SOKU", decimals: 18, is_own_token: true)

# CREATING SHARED NFT CONTRACT ADDRESSES
NftContract.find_or_create_by(contract_type: "nft721", symbol: "Shared")
  .update(name: "SokuNFT721", address: "0x79bFCC367D1f3C0272FdEc06bae2B6A3101d9baD")
NftContract.find_or_create_by(contract_type: "nft1155", symbol: "Shared")
  .update(name: "SokuNFT1155", address: "0xd7714953169771F01AeaFC119e8eD91f423d279E")

# #Creating ERC20 Token List
# Erc20Token.find_or_create_by(chain_id: CHAIN_ID, symbol: "WETH")
#   .update(address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", name: "Wrapped Ether", decimals: 18)
# Erc20Token.find_or_create_by(chain_id: CHAIN_ID, symbol: "SOKU")
#   .update(address: "0x3B15393E5F88913e5870Bb695DF43c408c127102", name: "SOKU", decimals: 18, is_own_token: true)

# # CREATING SHARED NFT CONTRACT ADDRESSES
# NftContract.find_or_create_by(contract_type: "nft721", symbol: "Shared")
#   .update(name: "SokuNFT721", address: "0x1613a0b2479f49002a3e9041e0707db1d37627d5")
# NftContract.find_or_create_by(contract_type: "nft1155", symbol: "Shared")
#   .update(name: "SokuNFT1155", address: "0x842eeacff112c19b2da5127104a6d5cb0df68988")
