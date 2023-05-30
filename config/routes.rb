Rails.application.routes.draw do
  default_url_options host: Rails.application.credentials.config[:app_url] || 'localhost:3000'
  namespace :admin do
    devise_for :admin_users, controllers: {
      sessions: 'admin/admin_users/sessions',
    }
    resources :users do
      collection do
        get :reports
      end

      member do
        get :collections
        get :approve
        get :deny
        get :enable
        get :verify
      end
    end
    resources :categories
    resources :fees
    resources :featured_users, except: [:edit, :update]
    resources :featured_collections, except: [:edit, :update]
    resources :transactions, only: [:index]
    resources :partners, except: [:edit, :update]
    resources :own_tokens

    get 'dashboard', to: 'dashboard#index'
    root to: 'dashboard#index'
  end

  resources :users, except: [:index, :create, :destroy] do
    collection do
      get :following
      get :follow
      get :unfollow
      get :load_tabs
      post :like
      post :unlike
      post :bid
      post :report
      post :create_contract
    end
  end

  resources :nft_contracts, only: [:show] do 
    member do 
      post :update_scrapped_contract_data
    end
  end

  resources :collections, only: [:new, :show, :create]  do
    member do
      get :remove_from_sale
      get :fetch_details
      get :fetch_transfer_user
      post :bid
      post :buy
      post :sell
      post :update_token_id
      post :change_price
      post :transfer_token
      post :sign_metadata_hash
      post :sign_fixed_price
      post :owner_transfer
      post :burn
      post :save_contract_nonce_value
      post :get_nonce_value
      post :save_nonce_value
      post :get_contract_sign_nonce
      post :approve
      post :sign_metadata_with_creator
      post :initiate_sale
      post :remove_from_sale_data
      get  :get_referral_signed_address
      get  :set_currency_max_bid_usd_price
      get  :set_weth_live_price
      #get :fetch_cur_token_price
      post :update_scrapped_collection_data
    end
  end

  resources :sessions, only: [:create, :destroy] do
    collection do
      get :valid_user
    end
  end
  resources :likes, only: [:create, :update]
  resources :bids
  resources :fees

  ### CUSTOM ROUTES
  get 'dashboard', to: 'dashboard#index'
  get 'top_buy_sell', to: 'dashboard#top_buyers_and_sellers'
  get 'all-collections', to: 'dashboard#collectionitemlists'
  get 'my_items', to: 'users#my_items'
  get 'activities', to: 'activities#index'
  get 'load_more_activities', to: 'activities#load_more'
  get 'search', to: 'dashboard#search'
  get 'notifications', to: 'dashboard#notifications'
  get 'contract_abi', to: 'dashboard#contract_abi'
  get 'category_filter', to: 'dashboard#set_categories_by_filter'
  get 'sale_type_filter', to: 'dashboard#search_by_sale_type'
  get 'gas_price', to: 'dashboard#gas_price'
  get 'rankings', to: 'dashboard#all_top_collections'
  get 'top_collection_prices', to: 'dashboard#top_collection_prices'
  get 'referrals', to: 'dashboard#nft_referrals'

  ### STATIC PAGES
  get 'about', to: 'static#about'
  get 'faq', to: 'static#faq'
  get 'terms_conditions', to: 'static#terms_conditions'
  get 'privacy', to: 'static#privacypolicy'
  get 'sitemap', to: 'static#sitemap', defaults: {format: 'xml' }

  ### ROOT PAGE
  root to: "dashboard#index"
  get 'status', to: 'dashboard#status'

  ### THIRD-PARTY ROUTES
  require 'sidekiq/web'
  mount Sidekiq::Web => '/sidekiq'

  #New UI static pages
  get 'new_ui/profile_details', to: 'new_ui#profile_details'
  get 'new_ui/detail', to: 'new_ui#detail'
  get '/generate_referral_for_collection', to: 'referral#generate_referral_for_collection'
  get '/generate_referral_for_contract', to: 'referral#generate_referral_for_contract'
end
