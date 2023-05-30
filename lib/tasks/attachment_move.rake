namespace :attachment_move  do
  desc "Migrate Active Storage attachments from local storage to S3"
  task :upload_data_to_s3 => :environment do
    skip_ids = [1, 2, 3, 4, 5, 6, 13, 27, 28, 30, 35, 37, 38, 40, 53, 54, 60, 61, 64, 65, 66, 67, 68, 69, 83, 84, 86, 87, 88, 89, 91, 92, 93, 94, 97, 99, 102, 104, 105, 106, 107, 108, 109, 111, 113, 115, 116, 117, 120, 121, 122, 124, 128, 130, 132, 133, 134, 137, 138, 140, 141, 142, 146, 147, 148, 160, 185, 232, 233, 357, 358, 359, 361, 363, 364, 365, 370, 372, 373, 386, 392, 409, 410, 411, 412, 413, 414, 415, 416, 417, 421, 422, 423, 424, 428, 429, 432, 441, 448, 452, 533, 573, 574, 578, 585, 586, 589, 595, 602, 608, 609, 653, 654, 707, 708, 710, 711, 730, 734, 738, 751, 752, 754, 756, 758]

    ActiveStorage::Attachment.find_each do |at|
      next unless at.blob.service_name == "local"
      next if skip_ids.include?(at.id)

      puts "Moving attachment with ID #{at.id}"

      errors = []
      begin
        blob = at.blob
        blob.open do |f|
          at.record.send(at.name).attach(io: f, content_type: blob.content_type, filename: blob.filename)
        end
        blob.destroy
      rescue ActiveStorage::FileNotFoundError
        puts "File not found error for attachment with ID #{at.id}"
      rescue Exception => e
        errors << "Got issue on blob with ID #{at.id}, details #{e.message}"
      end
    end
    puts "Migration complete!"
    puts "Errors: "
    puts errors.inspect
  end
end
