class Admin::OwnTokensController < Admin::BaseController
  before_action :set_token, only: %i[ show edit update destroy ]

  def index
    @tokens= Erc20Token.all
  end

  def show;end

  def new
    @token = Erc20Token.new
  end

  def edit;end
 

  def create
    @token = Erc20Token.new(token_params)
    respond_to do |format|
      if @token.save
        format.html { redirect_to admin_own_tokens_path, notice: "Token was successfully created." }
        format.json { render :show, status: :created, location: new_admin_own_tokens_path }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @token.errors, status: :unprocessable_entity }
      end
    end
  end

  def update
    respond_to do |format|
      if @token.update(token_params)
        format.html { redirect_to admin_own_tokens_path, notice: "Token was successfully updated." }
        format.json { render :show, status: :ok, location: edit_admin_own_tokens_path }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @token.errors, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @token.destroy
    respond_to do |format|
      format.html { redirect_to admin_own_tokens_url, notice: "Token was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
  def set_token
    @token = Erc20Token.find_by(id: params[:id])
  end

  def token_params
    params.require(:token).permit(:name, :symbol, :address, :is_partner, :chain_id, :decimals, :is_own_token)
  end
end