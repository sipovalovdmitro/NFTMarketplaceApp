class ChangeDatatypeForUnlockDescriptionToCollections < ActiveRecord::Migration[6.1]
  def change
    change_column(:collections, :unlock_description, :text)
  end
end