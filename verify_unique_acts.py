import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "indian_laws_master"

print("🔌 Connecting to Qdrant to verify unique Acts...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300.0)

# We use Qdrant's Scroll API to efficiently grab the metadata of every single chunk
# and use a Python set to filter down to the unique Act Names.
unique_central_acts = set()
unique_state_acts = set()
state_tally = {}

print("⏳ Scanning entire database... This will take a few seconds.")

# Scroll through all vectors to extract unique act names
offset = None
while True:
    records, offset = q_client.scroll(
        collection_name=COLLECTION_NAME,
        limit=10000,
        with_payload=True,
        with_vectors=False,
        offset=offset
    )
    
    for record in records:
        meta = record.payload.get("metadata", {})
        act_name = meta.get("act_name", "Unknown Act")
        jurisdiction = meta.get("jurisdiction", "Unknown")
        state_name = meta.get("state_name", "N/A")
        
        if jurisdiction == "Central":
            unique_central_acts.add(act_name)
        elif jurisdiction == "State":
            unique_state_acts.add(f"{state_name} - {act_name}")
            # Keep a tally of how many unique acts each state has
            if state_name not in state_tally:
                state_tally[state_name] = set()
            state_tally[state_name].add(act_name)
            
    if offset is None:
        break

print("\n" + "="*50)
print(" 📜 VIDHI-VICHARA: UNIQUE ACTS VERIFICATION REPORT")
print("="*50)
print(f"Total UNIQUE Central Acts Ingested : {len(unique_central_acts):,}")
print(f"Total UNIQUE State Acts Ingested   : {len(unique_state_acts):,}")
print("="*50)

if len(state_tally) > 0:
    print("\n📍 STATE-BY-STATE BREAKDOWN (Unique Acts):")
    for state, acts in sorted(state_tally.items()):
        print(f"   • {state}: {len(acts):,} Acts")
else:
    print("\n⚠️ No State Acts detected in the database.")
print("="*50 + "\n")