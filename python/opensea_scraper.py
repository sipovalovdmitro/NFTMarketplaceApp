import requests
import json
import psycopg2
import time
from datetime import datetime, timedelta
from pytz import timezone

# Define the OpenSea API endpoint URL
OPENSEA_API_URL = 'https://api.opensea.io/api/v1/'

# Define the number of NFTs per page
LIMIT = 50

# Define the database connection parameters
DB_PARAMS = {
    'host': 'localhost',
    'database': 'opensea',
    'user': 'postgres',
    'password': 'password'
}

# Define the notification parameters
NOTIFICATION_PARAMS = {
    'recipient_email': 'youremail@example.com',
    'sender_email': 'senderemail@example.com',
    'sender_password': 'senderpassword',
    'smtp_server': 'smtp.example.com',
    'smtp_port': 587
}

# Connect to the database
conn = psycopg2.connect(**DB_PARAMS)

# Create a cursor object
cur = conn.cursor()

# Create the collections table if it doesn't exist
cur.execute("""
    CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        external_link TEXT,
        image_url TEXT,
        total_supply INTEGER,
        floor_price FLOAT,
        num_owners INTEGER,
        num_sales INTEGER,
        total_volume FLOAT,
        best_offer FLOAT,
        percentage_listed FLOAT,
        date_created TIMESTAMP,
        creator_earnings FLOAT,
        creator_royalty FLOAT
    );
""")

# Create the nfts table if it doesn't exist
cur.execute("""
    CREATE TABLE IF NOT EXISTS nfts (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        external_link TEXT,
        image_url TEXT,
        token_id INTEGER,
        num_owners INTEGER,
        num_sales INTEGER,
        last_sale_amount FLOAT,
        last_sale_time TIMESTAMP,
        total_volume FLOAT,
        floor_price FLOAT,
        best_offer FLOAT,
        percentage_listed FLOAT,
        date_created TIMESTAMP,
        creator_earnings FLOAT,
        creator_royalty FLOAT
    );
""")

# Define a function to extract collection information
def extract_collection_info(collection_data):
    collection = {}
    collection['id'] = collection_data['slug']
    collection['name'] = collection_data['name']
    collection['description'] = collection_data['description']
    collection['external_link'] = collection_data['external_link']
    collection['image_url'] = collection_data['image_url']
    collection['total_supply'] = collection_data['stats']['total_supply']
    collection['floor_price'] = collection_data['stats']['floor_price']
    collection['num_owners'] = collection_data['stats']['num_owners']
    collection['num_sales'] = collection_data['stats']['num_sales']
    collection['total_volume'] = collection_data['stats']['total_volume']
    collection['best_offer'] = collection_data['stats']['best_offer']
    collection['percentage_listed'] = collection_data['stats']['percentage_listed']
    collection['date_created'] = datetime.strptime(collection_data['created_date'], '%Y-%m-%dT%H:%M:%S.%fZ')
    collection['creator_earnings'] = collection_data['stats']['creator_earnings']
    collection['creator_royalty'] = collection_data['stats']['creator_royalty']
    return collection

# Define a function to extract NFT information
def extract_nft_info(nft_data):
    nft = {}
    nft['id'] = nft_data['token_id']
    nft['name'] = nft_data['name']
    nft['description'] = nft_data['description']
    nft['external_link'] = nft_data['external_link']
    nft['image_url'] = nft_data['image_url']
    nft['token_id'] = nft_data['token_id']
    nft['num_owners'] = nft_data['num_owners']
    nft['num_sales'] = nft_data['num_sales']
    nft['last_sale_amount'] = nft_data['last_sale']['total_price'] if nft_data['last_sale'] else None
    nft['last_sale_time'] = datetime.strptime(nft_data['last_sale']['event_timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ') if nft_data['last_sale'] else None
    nft['total_volume'] = nft_data['total_volume']
    nft['floor_price'] = nft_data['floor_price']
    nft['best_offer'] = nft_data['best_offer']
    nft['percentage_listed'] = nft_data['percentage_listed']
    nft['date_created'] = datetime.strptime(nft_data['created_date'], '%Y-%m-%dT%H:%M:%S.%fZ')
    nft['creator_earnings'] = nft_data['creator_earnings']
    nft['creator_royalty'] = nft_data['creator_royalty']
    return nft

# Define a function to insert data into the collections table

def insert_collection_data(collection):
    cur.execute("""
    INSERT INTO collections (id, name, description, external_link, image_url, total_supply, floor_price, num_owners, num_sales, total_volume, best_offer, percentage_listed, date_created, creator_earnings, creator_royalty)
    VALUES (%(id)s, %(name)s, %(description)s, %(external_link)s, %(image_url)s, %(total_supply)s, %(floor_price)s, %(num_owners)s, %(num_sales)s, %(total_volume)s, %(best_offer)s, %(percentage_listed)s, %(date_created)s, %(creator_earnings)s, %(creator_royalty)s)
    ON CONFLICT (id) DO UPDATE SET
    name = %(name)s,
    description = %(description)s,
    external_link = %(external_link)s,
    image_url = %(image_url)s,
    total_supply = %(total_supply)s,
    floor_price = %(floor_price)s,
    num_owners = %(num_owners)s,
    num_sales = %(num_sales)s,
    total_volume = %(total_volume)s,
    best_offer = %(best_offer)s,
    percentage_listed = %(percentage_listed)s,
    date_created = %(date_created)s,
    creator_earnings = %(creator_earnings)s,
    creator_royalty = %(creator_royalty)s;
    """, collection)
    conn.commit()

# Define a function to insert data into the nfts table

def insert_nft_data(nft_data):
    try:
        cur.execute(
            """
            INSERT INTO nfts (
                collection_id,
                token_id,
                name,
                description,
                image_url,
                external_link,
                attributes,
                traits,
                created_date,
                last_sale_date,
                num_sales,
                total_volume,
                floor_price,
                best_offer,
                percentage_listed,
                creator_royalties
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                nft_data['collection_id'],
                nft_data['token_id'],
                nft_data['name'],
                nft_data['description'],
                nft_data['image_url'],
                nft_data['external_link'],
                nft_data['attributes'],
                nft_data['traits'],
                nft_data['created_date'],
                nft_data['last_sale_date'],
                nft_data['num_sales'],
                nft_data['total_volume'],
                nft_data['floor_price'],
                nft_data['best_offer'],
                nft_data['percentage_listed'],
                nft_data['creator_royalties']
            )
        )
        conn.commit()
        print(f"NFT {nft_data['token_id']} inserted into the database.")
    except (Exception, psycopg2.Error) as error:
        print(f"Error inserting NFT {nft_data['token_id']} into the database: {error}")
        conn.rollback()

# Define a function to check if a collection already exists in the database

def check_collection_exists(collection_id):
    cur.execute("SELECT id FROM collections WHERE id = %s", (collection_id,))
    return cur.fetchone() is not None

# Define a function to scrape all NFTs from a given OpenSea collection

def scrape_opensea_collection(collection_url):
    # Get collection ID from URL
    collection_id = collection_url.split('/')[-1]

# If collection already exists in the database, skip scraping it
if check_collection_exists(collection_id):
    print(f"Collection {collection_id} already exists in the database.")
    return

# Scrape collection data
collection_data = scrape_opensea_collection_data(collection_url)
collection_data['id'] = collection_id

# Insert collection data into the database
insert_collection_data(collection_data)

# Scrape NFTs from collection
nfts_data = scrape_opensea_nfts_data(collection_url)

# Insert NFT data into the database
for nft_data in nfts_data:
    nft_data['collection_id'] = collection_id
    nft = extract_nft_info(nft_data)
    insert_nft_data(nft)

print(f"Collection {collection_id} scraped successfully!")

# Define a function to scrape all OpenSea collections

def scrape_opensea_collections():
    # Get current number of collections in the database
    cur.execute("SELECT COUNT(*) FROM collections")
    num_collections = cur.fetchone()[0]
    print(f"Currently {num_collections} collections in the database.")

# Scrape all collections from OpenSea
collections_data = scrape_opensea_collections_data()

# Insert collection data into the database
for collection_data in collections_data:
    collection_id = collection_data['id']
    if not check_collection_exists(collection_id):
        insert_collection_data(collection_data)
        print(f"Collection {collection_id} inserted into the database.")

# Get new number of collections in the database
cur.execute("SELECT COUNT(*) FROM collections")
new_num_collections = cur.fetchone()[0]
num_new_collections = new_num_collections - num_collections

print(f"{num_new_collections} new collections inserted into the database.")

# Scrape NFTs from new collections
cur.execute("SELECT id, slug FROM collections WHERE id NOT IN (SELECT DISTINCT collection_id FROM nfts)")
new_collections = cur.fetchall()

for new_collection in new_collections:
    collection_id = new_collection[0]
    collection_slug = new_collection[1]
    collection_url = f"https://opensea.io/collection/{collection_slug}?search[sortAscending]=true&search[sortBy]=PRICE&search[toggles][0]=BUY_NOW"
    scrape_opensea_collection(collection_url)


# Run scraper
scrape_opensea_collections()

# Connect to the DB server
conn = psycopg2.connect(
    host="localhost",
    database="nft_database",
    user="your_username",
    password="your_password"
)

# Create a cursor object to interact with the database
cur = conn.cursor()

# Create the collections table
cur.execute(
    """
    CREATE TABLE collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        symbol VARCHAR(255),
        address VARCHAR(255),
        created_date DATE,
        num_tokens INTEGER,
        num_owners INTEGER
    )
    """
)

# Create the nfts table
cur.execute(
    """
    CREATE TABLE nfts (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER REFERENCES collections(id),
        token_id INTEGER,
        name VARCHAR(255),
        description TEXT,
        image_url TEXT,
        external_link TEXT,
        attributes JSONB,
        traits JSONB,
        created_date DATE,
        last_sale_date DATE,
        num_sales INTEGER,
        total_volume NUMERIC,
        floor_price NUMERIC,
        best_offer NUMERIC,
        percentage_listed NUMERIC,
        creator_royalties NUMERIC
    )
    """
)

# Commit the changes to the database and close the connection
conn.commit()
conn.close()