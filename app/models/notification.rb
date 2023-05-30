class Notification < ApplicationRecord
  include Rails.application.routes.url_helpers

  belongs_to :from_user, class_name: 'User', foreign_key: 'from_user_id', optional: true
  belongs_to :to_user, class_name: 'User', foreign_key: 'to_user_id'

  has_one_attached :image

  default_scope { order('created_at desc') }
  scope :unread, lambda { |user| where('to_user_id=? and is_read=?', user.id, false) }

  def image_url
    if notification.image.attached?
      notification.image.variant(resize: '200x200')
    else
      'banner-1.png'
    end
  end

  def self.collection_image(collection)
    attachment = ['image/png', 'image/jpeg', 'image/gif'].include?(collection.attachment.content_type) ? collection.attachment_with_variant(nil) : collection.cover
    attachment.present? ? attachment.blob : nil
  end

  def self.notify_put_on_sale(collection)
    return unless collection.present?
    message = I18n.t("notifications.put_on_sale", owner_name: collection.owner.full_name)
    image = collection_image(collection)
    create_notification({to_user: collection.owner_id, message: message, path: "/collections/#{collection.address}", image: image})
  end

  def self.notify_price_update(collection)
    return unless collection.present?
    message = I18n.t("notifications.price_updated", price: collection.instant_sale_price, owner_name: collection.owner.full_name)
    image = collection_image(collection)
    create_notification({to_user: collection.owner_id, message: message, path: "/collections/#{collection.address}", image: image})
  end

  def self.notify_ownership_transfer(collection, old_owner_id)
    old_owner = User.find_by_id(old_owner_id)
    old_owner = collection.creator unless old_owner
    message = I18n.t("notifications.ownership_transfer", buyer_name: collection.owner.full_name, owner_name: old_owner&.full_name)
    image = collection_image(collection)
    create_notification({ to_user: collection.owner_id, message: message, path: "/collections/#{collection.address}", image: image })
  end

  def self.notify_new_bid(bid)
    return unless bid.present?
    message = I18n.t("notifications.new_bid", bid_amount: bid.amount.to_f, buyer_name: bid.user.full_name)
    image = collection_image(bid.collection)
    create_notification({to_user: bid.collection.owner_id, message: message, path: "/collections/#{bid.collection.address}", image: image})
  end

  def self.notify_bid_accept(bid)
    return unless bid.present?
    message = I18n.t("notifications.bid_accept", owner_name: bid.collection.owner.full_name)
    image = collection_image(bid.collection)
    create_notification({to_user: bid.user_id, message: message, path: "/collections/#{bid.collection.address}", image: image})
  end

  def self.notify_expire_bid(bid)
    return unless bid.present?
    message = I18n.t("notifications.expire_bid", owner_name: bid.collection.owner.full_name)
    image = collection_image(bid.collection)
    create_notification({to_user: bid.user_id, message: message, path: "/collections/#{bid.collection.address}", image: image})
  end

  def self.notify_profile_verified(user)
    return unless user.present?
    image = user.profile_image.blob
    create_notification({to_user: user.id, message: I18n.t("notifications.profile_verified"), path: "/users/#{user.address}", image: image})
  end

  def self.notify_burn_token(collection)
    return unless collection.present?
    message = I18n.t("notifications.burn_token", collection_name: collection.title, owner_name: collection.owner.full_name)
    image = collection_image(collection)
    create_notification({to_user: collection.owner_id, message: message, path: "#", image: image})
  end

  def self.notify_nft_sold(collection, owner_id)
    return unless collection.present?
    message = I18n.t("notifications.nft_sold", collection_name: collection.title)
    image = collection_image(collection)
    create_notification({to_user: owner_id, message: message, path: "/collections/#{collection.address}", image: image})
  end

  def self.notify_nft_partial_sold(collection, owner_id, quantity)
    return unless collection.present?
    number_of_copies = quantity == 1 ? '1 copy' : "#{quantity} copies"
    message = I18n.t("notifications.partial_sold", collection_name: collection.title, number_of_copies: number_of_copies)
    image = collection_image(collection)
    create_notification({to_user: owner_id, message: message, path: "/collections/#{collection.address}", image: image})
  end

  def self.notify_following(follow)
    return unless follow.present?
    message = I18n.t("notifications.following", user_name: follow.follower.full_name)
    Rails.application.routes.default_url_options[:host] = Rails.application.credentials.config[:app_url] || 'localhost:3000'
    image = follow.follower.profile_image == 'new-user.png' ? follow.follower.profile_image : follow.follower.profile_image.blob
    create_notification({from_user_id: follow.follower_id, to_user: follow.followee_id, message: message, path: "/users/#{follow.follower.address}", image: image})
  end

  def self.notify_like(like)
    return unless like.present?
    message = I18n.t("notifications.like", collection_name: like.collection.title, user_name: like.user.full_name)
    Rails.application.routes.default_url_options[:host] = Rails.application.credentials.config[:app_url] || 'localhost:3000'
    image = like.user.profile_image == 'new-user.png' ? like.user.profile_image : like.user.profile_image.blob
    create_notification({to_user: like.collection.owner_id, message: message, path: "/users/#{like.user.address}", image: image})
  end

  def self.notify_unlike(like)
    return unless like.present?
    message = I18n.t("notifications.unlike", collection_name: like.collection.title, user_name: like.user.full_name)
    Rails.application.routes.default_url_options[:host] = Rails.application.credentials.config[:app_url] || 'localhost:3000'
    image = like.user.profile_image == 'new-user.png' ? like.user.profile_image : like.user.profile_image.blob
    create_notification({to_user: like.collection.owner_id, message: message, path: "/users/#{like.user.address}", image: image})
  end

  def self.create_notification(param)
    image = param.delete(:image) if param[:image].instance_of?(String)

    notification = create({
      from_user_id: param[:from_user],
      to_user_id: param[:to_user],
      message: param[:message],
      redirect_path: param[:path],
      image_url: param[:image_url],
      image: param[:image]
    })
    notification.image.attach(io: File.open("#{Rails.root}/app/assets/images/#{image}"), filename: image) if image

    notification
  end
end
