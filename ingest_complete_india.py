import os
import time
import concurrent.futures
from dotenv import load_dotenv
from pypdf import PdfReader
from huggingface_hub import list_repo_files, hf_hub_download
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, Filter, FieldCondition, MatchValue, PayloadSchemaType
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "indian_laws_master"
REPO_ID = "judicialmind/india-acts"

# 🚀 Reduced to 3 to prevent Qdrant from forcibly closing connections due to flooding
MAX_THREADS = 3  

print("🔌 Connecting to Qdrant...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300.0)

print("🧠 Loading Embedding Model locally...")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

# Append-only setup & Indexing
if not q_client.collection_exists(COLLECTION_NAME):
    q_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )
    print("✨ Created fresh Qdrant collection!")
else:
    print("✅ Existing database detected. Running in production append mode.")

q_client.create_payload_index(collection_name=COLLECTION_NAME, field_name="metadata.act_name", field_schema=PayloadSchemaType.KEYWORD)
q_client.create_payload_index(collection_name=COLLECTION_NAME, field_name="metadata.state_name", field_schema=PayloadSchemaType.KEYWORD)

vectorstore = QdrantVectorStore(client=q_client, collection_name=COLLECTION_NAME, embedding=embeddings)
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
BATCH_SIZE = 32

print("📂 Fetching comprehensive file catalog from Hugging Face...")
all_files = list_repo_files(repo_id=REPO_ID, repo_type="dataset")

target_files = [
    f for f in all_files 
    if (f.startswith("central/english/") or f.startswith("state/english/")) and f.endswith(".pdf")
]
print(f"📊 Target collection isolated: Found {len(target_files)} total statutes to process.")


def process_single_pdf(file_data):
    idx, file_path, total_files_count = file_data
    path_parts = file_path.split('/')
    
    # 1. Metadata Extraction
    if path_parts[0] == "central":
        jurisdiction_type = "Central"
        state_name = "N/A"
        clean_act_name = path_parts[3].replace("_", " ").strip().title() if len(path_parts) >= 4 else f"Central Act {idx+1}"
    else:
        jurisdiction_type = "State"
        state_name = path_parts[2].replace("_", " ").strip().title()
        clean_act_name = path_parts[4].replace("_", " ").strip().title() if len(path_parts) >= 5 else f"{state_name} Act {idx+1}"
        
    # 2. Lightning-fast Indexed Deduplication Check
    exact_match_filter = Filter(
        must=[
            FieldCondition(key="metadata.act_name", match=MatchValue(value=clean_act_name)),
            FieldCondition(key="metadata.state_name", match=MatchValue(value=state_name))
        ]
    )
    if q_client.count(collection_name=COLLECTION_NAME, count_filter=exact_match_filter).count > 0:
        print(f"   ⏩ Skipping: '{clean_act_name}' -> Already Indexed.")
        return

    print(f"📖 [{idx+1}/{total_files_count}] Thread Pulling: {clean_act_name} | {jurisdiction_type}...")
    
    try:
        # Bypass Windows 260-char limit
        local_pdf_path = hf_hub_download(
            repo_id=REPO_ID, 
            repo_type="dataset", 
            filename=file_path,
            local_dir="C:/hf_cache"
        )
        
        # Read
        reader = PdfReader(local_pdf_path)
        extracted_text = "".join(page.extract_text() or "" for page in reader.pages)
        
        # Clean up the local cached PDF to save space
        if os.path.exists(local_pdf_path):
            os.remove(local_pdf_path)
            
        if len(extracted_text.strip()) < 100:
            return

        # Chunk & Embed
        chunks = splitter.split_text(extracted_text)
        docs = [
            Document(page_content=c, metadata={"act_name": clean_act_name, "jurisdiction": jurisdiction_type, "state_name": state_name, "source": "JudicialMind Production Corpus"}) for c in chunks
        ]
        
        # Upload with Exponential Backoff retry mechanism
        for i in range(0, len(docs), BATCH_SIZE):
            batch = docs[i : i + BATCH_SIZE]
            for attempt in range(4):  # Try 4 times max
                try:
                    vectorstore.add_documents(batch)
                    break # Success! Break out of the retry loop
                except Exception as e:
                    if attempt == 3:
                        print(f"   ❌ [CRITICAL] Failed to upload batch for {clean_act_name}: {e}")
                        raise e # Re-raise if all 4 attempts fail
                        
                    # Exponential backoff: sleep longer each time (5s, 10s, 20s)
                    sleep_time = 5 * (2 ** attempt)
                    print(f"   ⚠️ Connection dropped for {clean_act_name}. Retrying in {sleep_time}s... (Attempt {attempt+1}/4)")
                    time.sleep(sleep_time)
                    
    except Exception as e:
        print(f"   ❌ Thread Error on {clean_act_name}: {str(e)[:50]}")


# 🔥 LAUNCH THE TURBO THREAD POOL 🔥
print(f"\n🚀 Launching Multi-Threaded Engine with {MAX_THREADS} parallel workers...")
start_time = time.time()

# Package data for threads
file_payloads = [(idx, path, len(target_files)) for idx, path in enumerate(target_files)]

with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
    executor.map(process_single_pdf, file_payloads)

end_time = time.time()
print(f"\n🎉 MULTI-THREADED RUN COMPLETE in {round((end_time - start_time) / 60, 2)} minutes!")