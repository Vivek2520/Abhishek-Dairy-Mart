import json
import os

# optional: load .env variables using python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # agar python-dotenv install nahi hai to bhi chalega

# MySQL connection example using mysql-connector-python or pymysql
# credentials DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment se aayenge


script_dir = os.path.dirname(os.path.abspath(__file__))
products_path = os.path.join(script_dir, 'products.json')

with open(products_path, 'r') as f:
    products = json.load(f)

print('Sample products with productId:')
for p in products[:5]:
    print('ID: ' + str(p['id']) + ', productId: ' + p.get('productId', 'MISSING') + ', Name: ' + p['name'][:30])

# agar MySQL se bhi kuch verify karna ho to yeh snippet use kar sakte ho
try:
    import mysql.connector
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST','localhost'),
        user=os.getenv('DB_USER','root'),
        password=os.getenv('DB_PASSWORD',''),
        database=os.getenv('DB_NAME','mywebsite_db')
    )
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM products')
    cnt = cursor.fetchone()[0]
    print(f"Products table mein {cnt} rows hain (from MySQL)")
except Exception as e:
    print('MySQL connection failed:', e)
finally:
    try:
        cursor.close()
        conn.close()
    except:
        pass
