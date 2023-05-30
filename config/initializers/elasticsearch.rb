config = {
    host: ENV["ELASTIC_HOST"] || "elasticsearch"
}

Elasticsearch::Model.client = Elasticsearch::Client.new(config)
