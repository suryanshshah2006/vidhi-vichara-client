import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_qdrant import QdrantVectorStore

# Load environment variables
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

print("🔌 Connecting to Qdrant Vector Store...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60.0)

embeddings = HuggingFaceEndpointEmbeddings(
    model="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    huggingfacehub_api_token=HUGGINGFACEHUB_API_TOKEN
)

vectorstore = QdrantVectorStore(
    client=q_client, 
    collection_name="indian_laws_master", 
    embedding=embeddings
)

def audit_retrieval(query_text: str, top_k: int = 3):
    print(f"\n" + "="*60)
    print(f"🔍 TESTING QUERY: \"{query_text[:80]}...\"")
    print("="*60)
    
    # Perform similarity search WITH similarity scores
    results = vectorstore.similarity_search_with_score(query_text, k=top_k)
    
    if not results:
        print("❌ No documents retrieved! Your vector store might be empty or unreachable.")
        return

    for idx, (doc, score) in enumerate(results, 1):
        meta = doc.metadata
        act_name = meta.get("act_name") or meta.get("source") or "Unknown Act"
        
        print(f"\n--- 📄 RESULT #{idx} (Similarity Score: {score:.4f}) ---")
        print(f"🏛️  DETECTED ACT: {act_name}")
        print(f"📌 METADATA: {meta}")
        print(f"📝 VERBATIM TEXT CHUNK (First 300 chars):")
        print(f"   \"{doc.page_content[:300].strip()}...\"")
    print("\n" + "="*60)

# ── TEST CASES ──
if __name__ == "__main__":
    # Test Case 1: Information Technology overlap
    test_1 = "No person shall without permission access or secure access to any computer, computer system or computer network."
    
    # Test Case 2: State vs Central Tax overreach (Schedule VII overlap)
    test_2 = "The State Government hereby mandates a 15% state tax on all inter-state e-commerce transactions and digital encryption services."
    
    audit_retrieval(test_1, top_k=3)
    audit_retrieval(test_2, top_k=3)