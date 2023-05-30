module TopDays
  extend ActiveSupport::Concern

  included do
    scope :top_thirty_days, -> { where("#{table_name}.created_at > ?", 30.days.ago) }
    scope :top_seven_days, -> { where("#{table_name}.created_at > ?", 7.days.ago) }
    scope :top_one_day, -> { where("#{table_name}.created_at > ?", 1.days.ago) }

    def self.filter_by_days(days)
      case days
      when '1'
        top_one_day
      when '7'
        top_seven_days
      when '30'
        top_thirty_days
      else
        distinct
      end
    end
  end
end
