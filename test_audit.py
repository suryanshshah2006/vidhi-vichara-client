import json
import re
from qdrant_client import QdrantClient
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# ── 1. DIRECT KEYS ──
QDRANT_URL = "https://34c5b349-2de8-4069-8f00-917b1f00557a.sa-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6OWEzOTc4NDItZjU3My00ZTk0LWI4NjktZGEwMjM0NWFiZjg0In0.NlmNN_vllhTxeRjW_I1MHryHL61h9FAweT5ueL0wOmc"
GROQ_API_KEY = "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"

# ── 2. INITIALIZE ENGINES ──
print("1. Connecting to Qdrant Cloud & Loading Multilingual AI...")
q_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

print("2. Initializing Groq Llama 3.3 Engine...\n")
llm = ChatGroq(api_key=GROQ_API_KEY, model_name="llama-3.3-70b-versatile", temperature=0.0)

# ── 3. VVAI MASTER PROMPT ──
vvai_prompt = """\
You are an expert Indian Administrative Law Auditor. Calculate the Vidhi-Vichara Alignment Index (VVAI).
The user has provided a 'Proposed Subordinate Rule' (in English or Hindi).
Compare it against the 'Retrieved Established Law' context.

Evaluate across these 7 dimensions (0.0 = Perfect Alignment, 1.0 = Complete Violation):
1. D1 Vires (0.20): Does it exceed the parent act authority?
2. D2 Definitional (0.10): Are definitions contradicting the statutory dictionary?
3. D3 Semantic (0.15): Is the language unfaithful to the operative content?
4. D4 Scope (0.15): Does it expand application to unintended entities?
5. D5 Procedural (0.10): Does it violate mandatory procedures (notice, hearing)?
6. D6 Sanction (0.10): Does it exceed statutory penalty ceilings or shift burdens?
7. D7 Purposive (0.20): Does it defeat the spirit and objects of the parent act?

OUTPUT STRICTLY AS JSON. DO NOT use markdown formatting like ```json.
If the input rule is Hindi, write 'explanation' and 'suggested_fix' in Hindi. Otherwise, English.

{{
  "vvai_score": <float 0.0-1.0>,
  "band": "Green | Amber | Red | Critical",
  "dimensions": {{"D1_Vires": 0.0, "D2_Definitional": 0.0, "D3_Semantic": 0.0, "D4_Scope": 0.0, "D5_Procedural": 0.0, "D6_Sanction": 0.0, "D7_Purposive": 0.0}},
  "deviation_type": "T1 | T2 | T3 | T4 | T5 | None",
  "severity": "S1 | S2 | S3 | S4 | None",
  "explanation": "Clear explanation of the deviations.",
  "suggested_fix": "Actionable textual or structural edit."
}}

Retrieved Law Context:
{context}"""

prompt = ChatPromptTemplate.from_messages([("system", vvai_prompt), ("human", "Proposed Rule: {input}")])

def format_docs(docs):
    return "\n\n".join(f"[Act: {d.metadata.get('act_name')} | Lang: {d.metadata.get('language')}]\n{d.page_content}" for d in docs)

# ── 4. EXECUTION PIPELINE ──
def run_vvai_audit(jurisdiction, state_or_ministry, target_act, proposed_rule):
    print(f"=======================================================")
    print(f"⚖️ AUDITING RULE AGAINST: {target_act}")
    print(f"=======================================================")
    
    from qdrant_client.http import models
    filter_params = models.Filter(
        must=[
            models.FieldCondition(key="jurisdiction", match=models.MatchValue(value=jurisdiction)),
            models.FieldCondition(key="act_name", match=models.MatchValue(value=target_act))
        ]
    )
    
    vectorstore = QdrantVectorStore(client=q_client, collection_name="indian_laws_master", embedding=embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5, "filter": filter_params})
    
    rag_chain = ({"context": retriever | format_docs, "input": RunnablePassthrough()} | prompt | llm | StrOutputParser())
    
    result = rag_chain.invoke(proposed_rule)
    clean_json = re.sub(r'```json\n|\n```|```', '', result).strip()
    
    try:
        parsed = json.loads(clean_json)
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
        print("\n")
    except Exception as e:
        print("Raw Output (Failed to parse JSON):", result)

# ── 5. RUN THE TESTS ──
test_1_rule = "Any social media company operating in India must provide the government with the personal passwords of all users within 1 hour of a verbal request by a police officer, without requiring a court warrant."
run_vvai_audit("Central", "Central/National", "The Information Technology Act 2000", test_1_rule)

test_2_rule = "राज्य में सभी दोपहिया वाहन चालकों के लिए आईएसआई (ISI) मार्क वाला हेलमेट पहनना अनिवार्य है। नियम का उल्लंघन करने पर 50,000 रुपये का जुर्माना और 5 साल की जेल होगी।"
run_vvai_audit("State", "Maharashtra", "The Motor Vehicles Act 1988", test_2_rule)