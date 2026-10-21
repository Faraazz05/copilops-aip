import sqlite3

c = sqlite3.connect("data/aip.db")
for row in c.execute("SELECT entity_key, message FROM issues WHERE code='FREQ_PARSE'"):
    print(row)