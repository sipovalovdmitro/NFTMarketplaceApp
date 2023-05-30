module Api
  class NftCollections
    require "uri"
    require "net/http"

    def self.nft_collections(owner_address, page)
      uri = URI("https://eth-mainnet.g.alchemy.com/nft/v2/#{Rails.application.credentials.alchemy[:api_key]}/getNFTs?owner=#{owner_address}&orderBy=transferTime")
      response = Rails.cache.fetch "#{owner_address}_assets", expires_in: 1.minutes do
        # send_request(Rails.application.credentials.config[:opensea_url] + "/api/v1/assets?owner=#{owner_address}&limit=15&offset=#{(page.to_i-1)*15}")
        Net::HTTP.get_response(uri)
      end
      if response
        # puts response.body
        response_body = JSON.parse(response.body)
        response_JSON = response_body["ownedNfts"]
        user = User.find_by(address: owner_address)
        user_collections = user.imported_collections.includes(:nft_contract).pluck(:token, "nft_contracts.address")
        next_page = response_JSON.length > 15

        #   exclude_opensea_nfts = exclude_opensea_nfts(response_body)
        response_JSON.map! do |resp|
          if resp["title"].present?
            status = user_collections.select { |c| c.first == resp["id"]["tokenId"].to_i(16) && c.last.downcase == resp["contract"]["address"].downcase }.present?
            unless status
              import_nft_hash(resp)
            end
          end
        end
        collections = response_JSON.compact()
        { collections: collections, next_page: next_page }
      else
        ""
      end
    end

    def self.exclude_opensea_nfts(response_data)
      data = response_data.collect do |resp|
        if resp["asset_contract"]["name"] == "OpenSea Collections" && resp["num_sales"].zero?
          import_nft_hash(resp)
        end
      end
      return data.compact
    end

    def self.import_nft_hash(resp)
      {
        type: resp["id"]["tokenMetadata"]["tokenType"],
        title: resp["title"],
        description: resp["description"],
        image_url: resp["media"][0]["gateway"],
        metadata: resp["metadata"],
        token: resp["id"]["tokenId"].to_i(16),
        contract_address: resp["contract"]["address"],
        balance: resp["balance"],
      }
    end

    def self.get_collection_data_alchemy(contract)
      url = URI.parse("https://eth-mainnet.g.alchemy.com/nft/v2/#{Rails.application.credentials.alchemy[:api_key]}/getContractMetadata?contractAddress=#{contract.address}")
      https = Net::HTTP.start(url.host, url.port, :use_ssl => true)
      request = Net::HTTP::Get.new(url)

      response = Rails.cache.fetch "get_collection_data_alchemy_#{contract}", expires_in: 60.seconds do
        https.request(request)
      end
      if response.code == "200"
        asset_response = JSON.parse(response.body)
        if asset_response.present?
          return asset_response.compact
        end
      else
          Rails.logger.warn "#########################################################"
          Rails.logger.warn "Failed while fetch collection data - #{response}"
          Rails.logger.warn "#########################################################"
          false
      end
    end

    def self.get_collection_stats(contract_address, range='all')
      url = URI.parse("https://api.dappradar.com/68733um6yespwfom/nfts/collections?address=#{contract_address}&chain=ethereum&range=#{range}")
      https = Net::HTTP.start(url.host, url.port, :use_ssl => true)

      request = Net::HTTP::Get.new(url)
      request["X-BLOBR-KEY"] = "Znpx5OW5ssGFlERv7jgVwYd6MJ817kf6"

      response = Rails.cache.fetch "get_collection_stats_#{contract_address}", expires_in: 10.seconds do
        https.request(request)
      end
      if response.code == "200"
        response_JSON = JSON.parse(response.body)
        data = response_JSON["results"][0]
        if data.present?
          return data.compact
        end
      else
          Rails.logger.warn "#########################################################"
          Rails.logger.warn "Failed while fetch collection data - #{response}"
          Rails.logger.warn "#########################################################"
          false
      end
    end

    def self.send_request(url)
      begin
        uri = URI.parse(url)
        request = Net::HTTP::Get.new(uri)
        request.content_type = "application/json"
        req_options = {
          use_ssl: uri.scheme == "https",
          open_timeout: 5,
          read_timeout: 5,
        }
        response = Net::HTTP.start(uri.hostname, uri.port, req_options) do |http|
          http.request(request)
        end

        if response.code == "200"
          JSON.parse(response.body)
        else
          Rails.logger.warn "#########################################################"
          Rails.logger.warn "Failed while fetch assets - #{response}"
          Rails.logger.warn "#########################################################"
          false
        end
      rescue Timeout::Error => exc
        Rails.logger.warn "ERROR: #{exc.message}"
      rescue Errno::ETIMEDOUT => exc
        Rails.logger.warn "ERROR: #{exc.message}"
      rescue Exception => e
        Rails.logger.warn "################## Exception while Fetching Collection(s) from Opensea ##################"
        Rails.logger.warn "ERROR: #{e.message}"
        Rails.logger.warn $!.backtrace[0..20].join("\n")
      end
    end
  end
end
