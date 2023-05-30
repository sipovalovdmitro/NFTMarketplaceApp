class ApplicationRecord < ActiveRecord::Base
  self.abstract_class = true

  IMAGE_ALLOWED_FORMATS = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
end
