import pymssql
import pandas as pd
import json

with open('../secrets.json') as data_file:
    CLIENT_SECRETS = json.load(data_file)

USERNAME = CLIENT_SECRETS['username']
PASSWORD = CLIENT_SECRETS['password']

ENDPOINT = 'mssql.cxezxmmbhs1j.us-east-1.rds.amazonaws.com'

conn = pymssql.connect(server=ENDPOINT, user=USERNAME, password=PASSWORD, db='turkey_demo', port=1433)

cursor = conn.cursor()

cursor.execute("""
	CREATE DATABASE turkey_demo;
""")

cursor.execute("""
	CREATE TABLE persons (
	    id INT NOT NULL,
	    name VARCHAR(100),
	    salesrep VARCHAR(100),
	    PRIMARY KEY(id)
	)
""")

conn.commit()
conn.close()
