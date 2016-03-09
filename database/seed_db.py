import pymssql
import pandas as pd
import json

with open('../secrets.json') as data_file:
    CLIENT_SECRETS = json.load(data_file)

USERNAME = CLIENT_SECRETS['username']
PASSWORD = CLIENT_SECRETS['password']

ENDPOINT = 'mssql.cxezxmmbhs1j.us-east-1.rds.amazonaws.com'

conn = pymssql.connect(server=ENDPOINT, user=USERNAME, password=PASSWORD, database='turkey_demo', port=1433)

cursor = conn.cursor()

# Drop the table if it already exists
# cursor.execute("IF OBJECT_ID('nuts_data', 'U') IS NOT NULL DROP TABLE nuts_data;")
# conn.commit()

# # Create the table
# cursor.execute("""
# 	CREATE TABLE nuts_data (
# 	    region_code VARCHAR(10) NOT NULL,
# 	    topic VARCHAR(50) NOT NULL,
# 	    group_id INT NOT NULL,
# 	    indicator_id INT NOT NULL,
# 	    n INT,
# 	    value INT,
# 	    CONSTRAINT pk_RecordId PRIMARY KEY (region_code,topic,group_id,indicator_id)
# 	);
# """)
# conn.commit()

# Populate the data from our .csv files
file_stubs = [
	'Corruption',
	'Crime',
	'Finance',
	'Firm Characteristics',
	'Gender',
	'Informality',
	'Infrastructure',
	'Innovation and Technology',
	'Performance',
	'Regulations and Taxes',
	'Trade'
	'Workforce'
]

for stub in file_stubs:
	print 'Loading data for topic: '+stub

	df = pd.read_csv('../data/nutsData'+stub+'.csv',usecols=['regionCode','groupID','indicatorID','N','value'])
	df['topic'] = stub

	upload_data = [tuple(x) for x in df[['regionCode','topic','groupID','indicatorID','N','value']].values]

	cursor.executemany('''INSERT INTO nuts_data (region_code, topic, group_id, indicator_id, n, value)
                      VALUES (%s,%s,%s,%s,%s,%s);''', upload_data)
	conn.commit()


conn.close()
