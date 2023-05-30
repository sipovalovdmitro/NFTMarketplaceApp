module DashboardHelper

  def display_sort_icon(sort_by, sort_type)
    return 'down' if sort_type.blank?

    if params[:sort_by] == sort_by && params[:sort_to] == 'desc'
      'down'
    else
      'up'
    end
  end

  def display_sort_type(sort_by, current_sort_type)
    return 'asc' if current_sort_type.blank?

    if params[:sort_by] == sort_by && params[:sort_to] == 'desc'
      'asc'
    else
      'desc'
    end
  end
end
