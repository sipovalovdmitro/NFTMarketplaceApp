class Partner < ApplicationRecord
	validates :address, presence: true, uniqueness: true
  belongs_to :user, optional: true

  validate :check_user

  after_create :update_user

  def update_user  
    self.update_attribute :user_id, fetch_user.id if fetch_user.present?
  end

  def check_user
     self.errors.add(:user_id, "Address Invalid") unless fetch_user.present?
  end

  def fetch_user
    User.find_by_address(address)
  end
end
