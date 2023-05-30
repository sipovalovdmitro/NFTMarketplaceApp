module BidsHelper
  def get_bid_referrer_address(bid)
    referral = Referral.find_by_token(bid.referral_token)
    return referral.referrer_address if referral.present?
  end
end
