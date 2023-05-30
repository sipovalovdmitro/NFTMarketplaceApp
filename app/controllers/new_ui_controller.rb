class NewUiController < ApplicationController
    skip_before_action :authenticate_user
    skip_before_action :is_approved

    def profile_detail
    
    end

    def detail
    
    end
end

