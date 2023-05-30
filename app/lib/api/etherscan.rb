module Api
  class Etherscan
    ZERO = 0.0
    COINGECKO_IDS = {'weth': 'weth', 'soku': 'sokuswap'}

    def contract_abi(contract_address)
      options = {:open_timeout => 10, :read_timeout => 70, :parse_result => true, :url => Rails.application.credentials.etherscan[:api_url]}
      api = Web3::Eth::Etherscan.new(Rails.application.credentials.etherscan[:api_key], connect_options: options)
      api.contract_getabi(address: contract_address)
    end

    def self.usd_price currency='eth'
      currency == 'eth' ? eth_price : erc20_price(currency)
    end

    def self.eth_price
      uri = URI.parse(Rails.application.credentials.etherscan.dig(:api_url) + "api?module=stats&action=ethprice&apikey=#{Rails.application.credentials.etherscan[:api_key]}")
      request = Net::HTTP::Get.new(uri)
      request.content_type = "application/json"
      req_options = {
        use_ssl: uri.scheme == "https",
        open_timeout: 45,
        read_timeout: 45,
      }
      response = Net::HTTP.start(uri.hostname, uri.port, req_options) do |http|
        http.request(request)
      end
      response.code == '200' ? JSON.parse(response.body)['result']['ethusd'].to_f : ZERO
    end

    def self.erc20_price currency='weth', fiat='usd'
      currency = COINGECKO_IDS[currency.to_sym].present? ? COINGECKO_IDS[currency.to_sym] : currency.downcase
      uri = URI.parse(Rails.application.credentials.config[:coingecko_url] + "?x_cg_pro_api_key=#{Rails.application.credentials.config[:coingecko_api_key]}&ids=#{currency}&vs_currencies=#{fiat}")
      request = Net::HTTP::Get.new(uri)
      request.content_type = "application/json"
      req_options = {
        use_ssl: uri.scheme == "https",
        open_timeout: 45,
        read_timeout: 45,
      }
      response = Rails.cache.fetch "erc20_price_#{currency}_#{fiat}", expires_in: 10.seconds do
        Net::HTTP.start(uri.hostname, uri.port, req_options)  { |http| http.request(request) }
      end
      response.code == '200' ? (JSON.parse(response.body)[currency][fiat].to_f rescue ZERO) : ZERO
    end

    def self.get_all_price(fiat='usd')
      own_tk_symbols = Erc20Token.partner_enabled.pluck(:symbol)
      ids =(COINGECKO_IDS.map { |_, id| id } + own_tk_symbols).map(&:downcase).join(",")
      uri = URI.parse(Rails.application.credentials.config[:coingecko_url] + "?x_cg_pro_api_key=#{Rails.application.credentials.config[:coingecko_api_key]}&ids=#{ids}&vs_currencies=#{fiat}")
      request = Net::HTTP::Get.new(uri)
      request.content_type = "application/json"
      req_options = {
        use_ssl: uri.scheme == "https",
        open_timeout: 45,
        read_timeout: 45,
      }
      response = Rails.cache.fetch "get_all_price_#{fiat}", expires_in: 10.seconds do
        Net::HTTP.start(uri.hostname, uri.port, req_options)  { |http| http.request(request) }
      end
      if response.code == '200'
        data = JSON.parse(response.body, object_class: OpenStruct)
        data
      else
        nil
      end
    end

  end
end
