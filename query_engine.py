import os
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from groq import Groq

load_dotenv()

# Initialize Qdrant and Embeddings
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "indian_laws_master"
GROQ_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_KEY:
    print("❌ ERROR: Could not find GROQ_API_KEY in your .env file.")
    sys.exit(1)

print("🔌 Hooking up to the Indian Laws Master Database...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
vectorstore = QdrantVectorStore(client=q_client, collection_name=COLLECTION_NAME, embedding=embeddings)

# Initialize Groq Client
groq_client = Groq(api_key=GROQ_KEY)

def run_legal_query(user_prompt: str, target_state: str = None):
    print(f"\n🔍 Searching vector space for: '{user_prompt}'")
    
    # Metadata filtering: Search Central + Target State
    search_filter = None
    if target_state:
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue
        search_filter = Filter(
            should=[
                FieldCondition(key="metadata.jurisdiction", match=MatchValue(value="Central")),
                FieldCondition(key="metadata.state_name", match=MatchValue(value=target_state))
            ]
        )
    
    # Retrieve top 5 highly relevant statutory provisions
    results = vectorstore.similarity_search(user_prompt, k=5, filter=search_filter)
    
    # Construct structured context layer
    context_blocks = []
    print("\n📚 Grounding context retrieved from database:")
    for idx, doc in enumerate(results):
        meta = doc.metadata
        source_tag = f"[{meta.get('jurisdiction')} Law | Act: {meta.get('act_name')} | Region: {meta.get('state_name')}]"
        print(f"   📍 Match {idx+1}: {source_tag}")
        context_blocks.append(f"Source {idx+1} {source_tag}\nStatute Text:\n{doc.page_content}\n")
    
    full_context = "\n---\n".join(context_blocks)
    
    # System Instruction forcing Jurisdictional Overreach analysis
    system_prompt = f"""
    You are the core AI compliance engine for Vidhi-Vichara, an expert system on Indian Jurisprudence.
    Analyze the user's query using strictly the provided Central and State statutory contexts below.
    
    CRITICAL RULE: Check for jurisdictional conflicts. If a state law clause directly contradicts, 
    bypasses, or adds strict compliance steps beyond a Central Act framework, explicitly flag this 
    as a "Potential Jurisdictional Override/Conflict" and explain the legal implications under Indian law.
    
    Context Information:
    {full_context}
    
    User Query: {user_prompt}
    
    Provide a precise legal response citing the specific Acts used from the context.
    """
    
    print("\n🧠 Generating compliance response via Groq (Llama-3.3)...")
    
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": system_prompt,
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    
    print("\n" + "="*50)
    print(" ⚖️ VIDHI-VICHARA COMPLIANCE OUTPUT")
    print("="*50)
    print(chat_completion.choices[0].message.content)
    print("="*50 + "\n")

# 🔥 RUN E-2-E PRODUCTION TEST
# 🔥 RUN JURISDICTIONAL CONFLICT TEST ON ASSAM
if __name__ == "__main__":
    sample_query = "What are the rules regarding police administration, control, and local maintenance of law and order?"
    
    # Run against Assam to force state-level structural cross-referencing
    run_legal_query(sample_query, target_state="Assam")