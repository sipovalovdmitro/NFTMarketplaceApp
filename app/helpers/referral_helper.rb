module ReferralHelper
  def create_referral_link(collection, referral)
    referral_link = request.base_url + collection_path(collection.address) + "?token=" + referral.token
  end
end
 