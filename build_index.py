from qdrant_client import QdrantClient
from qdrant_client.http.models import PayloadSchemaType

QDRANT_URL = "https://34c5b349-2de8-4069-8f00-917b1f00557a.sa-east-1-0.aws.cloud.qdrant.io:6333"
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6OWEzOTc4NDItZjU3My00ZTk0LWI4NjktZGEwMjM0NWFiZjg0In0.NlmNN_vllhTxeRjW_I1MHryHL61h9FAweT5ueL0wOmc"

print("Connecting to Qdrant Cloud...")
# Added a 5-minute timeout so Python waits for the server to finish organizing 700k items
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300.0)

print("Building index for 'jurisdiction'...")
client.create_payload_index(
    collection_name="indian_laws_master", 
    field_name="jurisdiction", 
    field_schema=PayloadSchemaType.KEYWORD
)

print("Building index for 'act_name'...")
client.create_payload_index(
    collection_name="indian_laws_master", 
    field_name="act_name", 
    field_schema=PayloadSchemaType.KEYWORD
)

print("✅ Indexes built successfully! Your database is now lightning fast.")