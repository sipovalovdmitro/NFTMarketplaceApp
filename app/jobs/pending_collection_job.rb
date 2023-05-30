class PendingCollectionJob < ApplicationJob
  queue_as :high
  sidekiq_options retry: false
  def perform(collection_id)
    collection = Collection.unscoped.find_by_id(collection_id)
    return if collection.approved?
    
    Notification.where(redirect_path: "/collections/#{collection.address}").destroy_all
    collection.destroy
  end
end
