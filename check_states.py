import os
from collections import Counter
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "indian_laws_master"

print("🔌 Connecting to Qdrant...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

print("🔎 Scanning all 105,900 chunks to verify jurisdictions... (this takes about 5 seconds)")

offset = None
state_counts = Counter()

# Scroll through the database 5,000 chunks at a time (vectors turned off for speed)
while True:
    records, offset = q_client.scroll(
        collection_name=COLLECTION_NAME,
        limit=5000,
        offset=offset,
        with_payload=True,
        with_vectors=False
    )
    
    for r in records:
        # LangChain stores our custom data inside the 'metadata' dictionary
        metadata = r.payload.get("metadata", {})
        state_name = metadata.get("state_name", "Unknown")
        state_counts[state_name] += 1
        
    if offset is None:
        break

print("\n📊 JURISDICTION BREAKDOWN:")
print("-" * 40)
for state, count in state_counts.most_common():
    print(f"✅ {state:<25} : {count:,} chunks")
print("-" * 40)
print(f"Total Chunks Verified: {sum(state_counts.values()):,}")