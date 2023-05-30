import requests
import pdb
from lxml import etree
import json
import psycopg2
import mysql.connector
import pyperclip
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

from datetime import datetime
from io import BytesIO
from base64 import b64encode
from datetime import date
import time
import re


# DB_PARAMS = {
#     'host': 'localhost',
#     'database': 'opensea',
#     'user': 'dev',
#     'password': 'password'
# }

# PRODUCTION
# DB_PARAMS = {
#     'host': 'production-db.cln3nezl1yuz.us-east-1.rds.amazonaws.com',
#     'database': 'rarible_development',
#     'user': 'sokunft',
#     'password': 'labelkills00A#'
# }
# TEST
DB_PARAMS = {
    'host': 'test-db-snap.cln3nezl1yuz.us-east-1.rds.amazonaws.com',
    'database': 'rarible_development',
    'user': 'sokunft',
    'password': 'labelkills00A#'
}
conn = mysql.connector.connect(**DB_PARAMS)
if conn.is_connected():
    print('Connection successful!')
else:
    print('Connection failed.')

cur = conn.cursor()

# Create the collections table if it doesn't exist
# cur.execute("""
#     CREATE TABLE IF NOT EXISTS `nft_contracts` (
#         `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
#         `name` VARCHAR(255),
# 		`unique_name` VARCHAR(255),
#         `description` TEXT,
#         `external_link` VARCHAR(255),
#         `image_url` VARCHAR(255),
#         `floor_price` DECIMAL(18, 8),
#         `num_owners` DECIMAL(18, 8),
#         `total_volume` DECIMAL(18, 8),
#         `created_at` DATETIME,
#         `best_offer` DECIMAL(18, 8),
#         `percentage_listed` DECIMAL(18, 8),
#         `creator_name` VARCHAR(255),
#         `creator_earnings` DECIMAL(18, 8)
#     );
# """)
# conn.commit()


# Create the nfts table if it doesn't exist
# cur.execute("""
#     CREATE TABLE IF NOT EXISTS collections (
# 			id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
# 			image_url TEXT,
# 			token_id INT,
# 			category TEXT,
# 			last_sale_amount TEXT,
# 			creator_earnings FLOAT,
# 			properties JSON

#     );
# """)
# conn.commit()

def insert_collection_data(collection_data):
    try:
        cur.execute(
            """
		INSERT INTO collections (
			token,
			image_hash,
			nft_contract_id,
			is_active,
			description,
			name,
			properties,
            collection_type,
            owned_tokens,
            no_of_copies,
			created_at
		)
		VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
		""",
            (
                collection_data['token_id'],
                collection_data['image_url'],
                collection_data['nft_contract_id'],
                collection_data['is_active'],
                collection_data['description'],
                collection_data['name'],
                collection_data['traits'],
                collection_data['collection_type'],
                collection_data['owned_tokens'],
                collection_data['no_of_copies'],
                date.today()
            )
        )
        conn.commit()
        print(
            f"Collection {collection_data['name']} inserted into the database.")
    except Exception as e:
        print(
            f"Error inserting collection {collection_data['name']} into the database: {e}")


def insert_nft_contract_data(nft_contract):
    try:
        cur.execute(
            """
			INSERT INTO nft_contracts (
				name,
				description,
				volume,
				address,
				contract_type,
                created_at
			)
			VALUES (%s, %s, %s, %s, %s, %s)
			""",
            (
                nft_contract['name'],
                nft_contract['description'],
                nft_contract['volume'],
                nft_contract['address'],
                nft_contract['contract_type'],
                date.today()
            )
        )
        conn.commit()
        print(
            f"Nft Contracts: '{nft_contract['name']}' inserted into the database.")
    except Exception as e:
        print(
            f"Error inserting Nft Contracts: '{nft_contract['name']}' into the database: {e}")

# Define a function to extract data from a collection page


def scrape_collection_data(url):

    driver = webdriver.Chrome(options=options)
    driver.get(url)

    height = driver.execute_script("return document.body.scrollHeight")
    start_pos = 0
    start_time = time.time()

    # while True:
    #     driver.execute_script(f"window.scrollBy(0, 200);")
    #     time.sleep(1)
    #     current_pos = driver.execute_script("return window.pageYOffset;")
    #     if current_pos == (height - 200):
    #         break
    #     start_pos = current_pos
    #     if time.time() - start_time > 600:
    #         break
    source_data = driver.page_source
    response = requests.get(url, headers=headers)
    dom = etree.HTML(str(source_data))
    soup = BeautifulSoup(response.content, "html.parser")

    best_offer = (dom.xpath(
        '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[3]/div/div[9]/a/div/span[1]/div/span'))
    num_owners = (dom.xpath(
        '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[3]/div/div[15]/span/div/span[1]/div/span'))
    img_url = soup.find("img", class_="sc-6d5b054-0 bVHNDA")
    cover_url = soup.find("img", class_="sc-a2bbba39-0 hclTAv")
    percentage_listed = (dom.xpath(
        '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[3]/div/div[12]/a/div/span[1]/div'))
    creator_name = (dom.xpath(
        '//*[@id="main"]/div/div/div/div[4]/div/div/div[1]/div[1]/div[2]/div/a[1]/span'))
    description = dom.xpath(
        '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[1]/div/div[1]/div[1]/span/div/div')[0]

    content = description.xpath('.//text()')
    combined_text = ' '.join(content)

    # description = (dom.xpath(
    #     '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[1]/div/div[1]/div[1]/span/div/div/p[1]'))
    desc = soup.find(
        "div", class_="sc-29427738-0 sc-74f297e6-2 sc-51e25b7b-7 NZOwx bVELKT iIYIFP")
    erc1155_badge = soup.find(
        "span", class_="sc-29427738-0 sc-bgqQcB cKdnBO cNibvN Badge--text")
    is_erc1155 = False if erc1155_badge is None else True
    # 0 is 721, 1 is 1155
    contract_type = 1 if is_erc1155 == True else 0
    # floor_price = (dom.xpath('//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[3]/div/div[6]/a/div/span[1]/div/span'))
    volume = (dom.xpath(
        '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[2]/div[3]/div/div[3]/a/div/span[1]/div/text()'))
    try:
        created_at = (dom.xpath(
            '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[1]/div/span/div/span/div/span[2]/div/div/span/div/div/span'))[0].text.strip()
        created_at = datetime.strptime(created_at, '%b %Y')
    except:
        created_at = None
    try:
        creator_earnings = (dom.xpath(
            '//*[@id="main"]/div/div/div/div[5]/div/div[2]/div/div[1]/div[1]/span/div[2]/span/div/span[3]/div/div[2]/span/div/div[2]/span'))
        creator_earnings = float(
            creator_earnings[0].text.strip().replace('%', ''))
    except:
        creator_earnings = None

    unique_name = url.split('/')[-1]

    collection = {}
    collection['name'] = str(
        soup.find("h1", class_="sc-29427738-0 sc-bgqQcB hWpwdI hDIPOU").text.strip())
    collection['unique_name'] = unique_name
    collection['contract_type'] = contract_type
    # collection['external_link'] = str(soup.find("a", class_="sc-1f719d57-0 fKAlPV").get('href'))
    try:
        collection['attachment'] = str(img_url.get('src'))
    except:
        collection['attachment'] = None
    try:
        collection['cover'] = str(cover_url.get('src'))
    except:
        collection['cover'] = None
    # collection['creator_name'] = str(creator_name[0].text.strip()) if creator_name else None
    collection['description'] = str(
        combined_text) if combined_text else None
    # collection['floor_price'] = float(floor_price[0].text.strip().replace(',', '')) if floor_price else None
    # collection['num_owners'] =  float((num_owners)[0].text.strip().replace(',', '')) if num_owners else None
    collection['volume'] = float(
        volume[0].strip().replace(',', '')) if volume else None
    # collection['best_offer'] =  float((best_offer)[0].text.strip().replace(',', '')) if best_offer else None
    # collection['percentage_listed'] = float((percentage_listed)[0].text.strip().replace('%', '')) if percentage_listed else None
    collection['created_at'] = created_at
    # collection['creator_earnings'] = creator_earnings
    nfts = dom.xpath(
        "//*[contains(@class, 'sc-1f719d57-0 eiItIQ Asset--anchor')]")
    url_list = [ele.get('href') for ele in nfts if ele.get('href') is not None]
    urls = ['https://opensea.io' + url for url in url_list]
    collection['nft_urls'] = urls
    try:
        collection['address'] = url_list[0].split('/')[-2]
    except:
        collection['address'] = None
    return collection

# Define a function to extract data from an NFT page


def scrape_nft_data(url):
    global copies
    driver = webdriver.Chrome(options=options)
    driver.get(url)
    source_data = driver.page_source
    dom = etree.HTML(str(source_data))
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, "html.parser")
    desc = soup.find("div", class_="sc-a509dbea-0 eIeEJC")
    match = re.search(r'/ethereum/(\w+)/', url)
    last_sale = (dom.xpath(
        '//*[@id="Body event-history"]/div/div/div[2]/div/div[3]/div[2]/div/div/div/div'))
    category = dom.xpath(
        '//*[@class="item--about-container"]/div/div[2]/span/span')
    name = dom.xpath(
        '//*[@class="item--header"]/div[2]/h1')
    creator_earnings = (
        dom.xpath('//*[@id="Body assets-item-asset-details"]/div/div/div/div[6]/span'))
    token_id = url.split('/')[-1]
    img_url = soup.find(
        "img", class_="Image--image")
    type_of_erc = soup.find_all('span', {
        'class': 'sc-29427738-0 sc-bgqQcB sc-29325e69-1 cKdnBO cNibvN jKfKQU'})[2].text.strip()
    collection_type = 0 if type_of_erc == "ERC-721" else 1
    # if its 721
    wait = WebDriverWait(driver, 10)  # Maximum wait time of 10 seconds

    if collection_type == 0:
        owner_url = wait.until(EC.presence_of_element_located(
            (By.XPATH, '//*[@class="item--header"]/div[3]/div/a'))).get_attribute('href')
        print(owner_url, 'url')
    else:
        owner_url = wait.until(EC.presence_of_element_located(
            (By.XPATH, '//*[@id="Body assets-item-description"]/div/div/section/div/div/a'))).get_attribute('href')
        print(owner_url, 'url')
    owner_link = owner_url
    print('Owner Link: ', owner_link)
    owner_address = owner_info(owner_link)
    try:
        nft_description = str(desc.find('p').text)
    except:
        nft_description = None
    n = 1
    traits = {}
    while True:
        xpath_key = '//*[@id="Body assets-item-properties"]/div/div/div/div[' + \
            str(n) + ']/a/div/div[1]/div'
        xpath_value = '//*[@id="Body assets-item-properties"]/div/div/div/div[' + \
            str(n) + ']/a/div/div[2]/div/div'
        key = dom.xpath(xpath_key)
        value = dom.xpath(xpath_value)
        if len(key) == 0 and len(value) == 0:
            break
        trait_key = key[0].text
        trait_value = value[0].text
        traits[trait_key] = trait_value
        n += 1

    nft = {}
    nft['owner_address'] = owner_address
    nft['collection_id'] = str(match.group(1)) if match else None
    nft['image_url'] = str(img_url.get('src') if img_url else None)
    nft['desc'] = nft_description
    nft['token_id'] = int(token_id) if token_id else None
    nft['name'] = str(name[0].text) if name else None
    nft['creator_earnings'] = float(creator_earnings[0].text.strip().replace(
        '%', '')) if creator_earnings else None
    category_text = (category)[0].text.strip() if category else None
    nft['collection_type'] = int(collection_type)
    nft['category'] = [category_text]
    nft['traits'] = json.dumps(traits)
    nft['is_active'] = True
    nft['state'] = 'approved'

    return nft

# extract the owner info from opensea


def owner_info(url):
    driver = webdriver.Chrome(options=options)
    driver.get(url)

    try:
        # Wait for the first button to be clickable
        button1 = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, '//*[contains(@class, "sc-b267fe84-0")][contains(@class, "sc-30c58415-0")][contains(@class, "cEtajt")][contains(@class, "bMTkTk")]'))
        )

        if button1:
            # Click the first button
            button1.click()
            owner_address = pyperclip.paste()
            print('owner: ', owner_address)
            return owner_address
        # Check if the second button element is present
    except:
        print("No Button 1")

    try:
        button2 = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, '//*[@class="sc-29427738-0 sc-bgqQcB sc-d94077a8-1 cKdnBO lnprYd hwhiuH"]/button[2]'))
        )
        if button2:
            button2.click()
            # Click the second button
            button_to_get_address = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable(
                    (By.XPATH, '//*[@class="sc-29427738-0 sc-462418b0-0 sc-462418b0-1 sc-fb098485-4 cKdnBO beBOxh hytZqS gmyTcS"]/li[2]/button')))
            button_to_get_address.click()
            owner_address = pyperclip.paste()
            print("owner: ", owner_address)
            return owner_address
    except:
        print("No Button 2")
        # owner_button = driver.find_element(
        #     By.XPATH, '//*[@id="main"]/div/div/div/div[4]/div/div/div/div/div/div[1]/div/div/button[2]').click()


# To extract all collections of opensea and retruns the urls of all collections


def scrape_opensea_collections(url):
    driver = webdriver.Chrome(options=options)
    driver.get(url)
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, "html.parser")

    height = driver.execute_script("return document.body.scrollHeight")
    start_pos = 0
    collections_opensea = []

    for i in range(10):
        start_pos = 0
        while True:
            driver.execute_script(f"window.scrollBy(0, 500);")
            time.sleep(1)
            source_data = driver.page_source
            dom = etree.HTML(str(source_data))
            test = driver.find_elements(
                By.XPATH, '//*[@class="sc-1f719d57-0 eiItIQ sc-29427738-0 sc-630fc9ab-0 sc-3c78d994-0 sc-d400cbf1-0 fbMeng bNkKFC kgKBRW coxSav"]')
            for item in test:
                collections_opensea.append(item.get_attribute(('href')))

            # opensea = dom.xpath(
            #     "//*[contains(@class, 'sc-1f719d57-0 eiItIQ sc-29427738-0 sc-630fc9ab-0 sc-3c78d994-0 sc-d400cbf1-0 fbMeng bNkKFC kgKBRW coxSav')]")
            # collections_opensea = collections_opensea + opensea
            current_pos = driver.execute_script("return window.pageYOffset;")
            if current_pos == (height - 200):
                break
            if current_pos <= start_pos:
                try:
                    button = driver.find_element(
                        By.XPATH, '//*[@id="main"]/div/div[2]/button[2]')
                    button.click() if button else None
                except:
                    break
                break
            start_pos = current_pos
    # print(collections_opensea, 'opensea urls')
    # urls = set([ele.get('href')
    #            for ele in collections_opensea if ele.get('href') is not None])
    # collection_urls = ['https://opensea.io' + url for url in urls]
    # print(collection_urls, 'urls')
    # setting the max limit scrape nfts
    num_of_collections_to_scrape = 25
    total_records = len(collections_opensea)
    max_collections_to_scrape = min(
        num_of_collections_to_scrape, total_records - 1)
    max_urls = collections_opensea[:max_collections_to_scrape + 1]
    print(max_urls, 'urls')
    return max_urls


def check_nft_exists(nft_token_id):
    cur.execute(
        "SELECT token_id FROM collections WHERE token_id = %s", (nft_token_id,))
    return cur.fetchone() is not None


def check_collection_exists(address):
    cur.execute(
        "SELECT address FROM nft_contracts WHERE address = %s", (address,))
    return cur.fetchone() is not None


def get_balance_of_collection(owner_address, contract_address, token_id):
    print('params: ', owner_address, contract_address, token_id)
    api_key = '6YC2E-iiDAA-u_LOQXMb-Pp-RtxMXl76'
    url = f'https://eth-mainnet.g.alchemy.com/nft/v2/{api_key}/getNFTs?owner={owner_address}&contractAddresses[]={contract_address}'
    response = requests.get(url)
    # this is added if in some case api response is not 200 ( json.loads ) throws the error
    if response.status_code == 200:
        response_json = json.loads(response.content)
        # print(response_json['ownedNfts'], 'response_json')
        filtered_object = next((item for item in response_json['ownedNfts'] if item['contract']['address'] == contract_address and int(
            item['id']['tokenId'], 16) == token_id), None)
        if filtered_object is not None:
            return int(filtered_object['balance'])
        else:
            return 1
    else:
        return 1

# Used to enter data in to database


def insert_data_to_db(url):
    collections_urls = scrape_opensea_collections(url)
    max_int_value = 2147483647

    for collection_url in collections_urls:
        nft_contract_data = scrape_collection_data(collection_url)
        address = nft_contract_data['address']
        image_url = nft_contract_data['attachment']
        cover_url = nft_contract_data['cover']
        if address is not None and not check_collection_exists(address):
            insert_nft_contract_data(nft_contract_data)
            nft_contract_id = cur.lastrowid
            if nft_contract_id != 0 and image_url and cover_url:
                url = f'https://sokunft.com/nft_contracts/{nft_contract_id}/update_scrapped_contract_data'
                params = {'nft_contract_id': nft_contract_id,
                          'image_url': image_url, 'cover_url': cover_url, 'nft_contract_name': nft_contract_data['name']}
                response = requests.post(url, data=params)

            if nft_contract_id != 0:
                nfts_urls = nft_contract_data['nft_urls']
                for nft_url in nfts_urls:
                    collection_data = scrape_nft_data(nft_url)
                    collection_data['nft_contract_id'] = nft_contract_id
                    img_url = collection_data['image_url']
                    token_id = collection_data['token_id']
                    category = collection_data['category']
                    owner_address = collection_data['owner_address']

                    collection_data['description'] = collection_data['desc'] if collection_data['desc'] else nft_contract_data['description']
                    collection_data['no_of_copies'] = get_balance_of_collection(
                        owner_address, address, token_id)
                    collection_data['owned_tokens'] = collection_data['no_of_copies']
                    if nft_contract_id and token_id and img_url is not None and owner_address is not None:
                        insert_collection_data(collection_data)
                        collection_id = cur.lastrowid

                        url = f'https://sokunft.com/collections/{collection_id}/update_scrapped_collection_data'
                        params = {'collection_id': collection_id, 'image_url': img_url,
                                  'category': category, 'owner_address': owner_address, 'collection_name': collection_data['name']}
                        response = requests.post(url, data=params)

# main code start here


opensea_collections = "https://opensea.io/rankings?chain=ethereum"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"}
options = Options()
# options.add_argument("--window-size=1920,1080")
# options.add_argument("--headless")
# options.add_argument("--disable-gpu")
options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36")

# owner_info('https://opensea.io/0x9d9f9e315d12f88ee0Aa5549eDF0daCcEC24c7F4')
insert_data_to_db(opensea_collections)
# scrape_nft_data(
#     'https://opensea.io/assets/ethereum/0x808e5cd160d8819ca24c2053037049eb611d0542/110')
# scrape_collection_data('https://opensea.io/collection/wolf-game-farmer')
