module Api
  class Pinata
    attr_reader :base_url, :api_key, :api_secret
    require "open-uri"
    require "tempfile"

    def initialize
      @base_url = Rails.application.credentials.pinata[:base_url]
      @api_key = Rails.application.credentials.pinata[:api_key]
      @api_secret = Rails.application.credentials.pinata[:api_secret]
    end

    def send_file(file)
      res = connection.post(base_url, file: file)
      if res.success?
        res = JSON.parse(res.body, symbolize_names: true)
        return true, res[:IpfsHash]
      else
        return false, res[:IpfsHash]
      end
    end

    def upload(collection)
      begin
        attachment = collection.attachment

        file_path = ""
        content_type = attachment.blob.content_type
        ok = false
        image_ipfs_hash = ""
        metadata_ipfs_hash = ""
        if attachment.blob.service_name == "local"
          file_path = ActiveStorage::Blob.service.send(:path_for, attachment.key)
        elsif attachment.blob.service_name == "amazon"
          temp_file = Tempfile.new
          open(attachment.service_url, "rb", encoding: "UTF-8") do |read_file|
            temp_file.write(read_file.read)
          end
          temp_file.rewind
          file_path = temp_file.path
        else
          raise ArgumentError, "Unsupported ActiveStorage service: #{attachment.service.class.name}"
        end

        file_io = Faraday::UploadIO.new(file_path, content_type)

        ok, image_ipfs_hash = send_file(file_io)
        return unless ok

        metadata = {
          name: collection.name,
          description: collection.description,
          image: "https://ipfs.io/ipfs/" + image_ipfs_hash,
        }
        File.write("tmp/metadata.json", metadata.to_json)
        metadata_io = Faraday::UploadIO.new("tmp/metadata.json", "application/json")
        ok, metadata_ipfs_hash = send_file(metadata_io)

        collection.update(image_hash: image_ipfs_hash, metadata_hash: metadata_ipfs_hash)
        puts metadata_ipfs_hash, "metadata_ipfs_hash"
        ok ? metadata_ipfs_hash : nil
      ensure
        temp_file.close! unless temp_file.nil?
      end
    end

    def connection
      @connection ||= Faraday.new do |f|
        f.request :multipart
        f.request :url_encoded
        f.headers["Content-Type"] = "multipart/form-data"
        f.headers["pinata_api_key"] = api_key
        f.headers["pinata_secret_api_key"] = api_secret
        f.adapter :net_http
      end
    end
  end
end
