module Api
    class Gasprice
        def self.gas_price
          begin
            uri = URI.parse(Rails.application.credentials.config[:gasstation_url])
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
            response.code == '200' ? JSON.parse(response.body) : ''
          rescue Exception => e
            Rails.logger.warn "################## Exception while Fetching Gas Price ##################"
            Rails.logger.warn "ERROR: #{e.message}"
            Rails.logger.warn $!.backtrace[0..20].join("\n")
            ''
          end
        end
    end
end