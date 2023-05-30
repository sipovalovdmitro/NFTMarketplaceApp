class Admin::PartnersController < Admin::BaseController

  def index
    @partners = Partner.all
  end

  def new
    @partners = Partner.new
  end

  def create
    @partners = Partner.new(partner_params)
    if @partners.save
      redirect_to admin_partners_path, notice: "Partner successfully created."
    else
      render :new
    end
  end

  def destroy
    partner = Partner.find_by(id: params[:id])
    partner.destroy
    respond_to do |format|
      format.html { redirect_to admin_partners_path, notice: "Partner was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private

  def partner_params
    params.require(:partners).permit(:address)
  end

end