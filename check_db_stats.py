import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue, PayloadSchemaType

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "indian_laws_master"

print("🔌 Connecting to Qdrant to check stats...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# 🔥 FIX: Create index for 'jurisdiction' so Qdrant can count it quickly
try:
    q_client.create_payload_index(
        collection_name=COLLECTION_NAME, 
        field_name="metadata.jurisdiction", 
        field_schema=PayloadSchemaType.KEYWORD
    )
    print("⚡ Index verified for jurisdiction. Fetching counts...")
except Exception:
    pass # Index already exists

# 1. Get Total Chunks
total = q_client.count(collection_name=COLLECTION_NAME).count

# 2. Count Central Laws
central_filter = Filter(must=[FieldCondition(key="metadata.jurisdiction", match=MatchValue(value="Central"))])
central_count = q_client.count(collection_name=COLLECTION_NAME, count_filter=central_filter).count

# 3. Count State Laws
state_filter = Filter(must=[FieldCondition(key="metadata.jurisdiction", match=MatchValue(value="State"))])
state_count = q_client.count(collection_name=COLLECTION_NAME, count_filter=state_filter).count

print("\n" + "="*40)
print(" 📊 VIDHI-VICHARA DATABASE REPORT")
print("="*40)
print(f"Total Legal Chunks in DB : {total:,}")
print(f"Central Law Chunks       : {central_count:,}")
print(f"State Law Chunks         : {state_count:,}")
print("="*40)

# 4. Verify Maharashtra
maha_filter = Filter(must=[FieldCondition(key="metadata.state_name", match=MatchValue(value="Maharashtra"))])
maha_count = q_client.count(collection_name=COLLECTION_NAME, count_filter=maha_filter).count
print(f"Chunks specifically from Maharashtra: {maha_count:,}")
print("="*40 + "\n")