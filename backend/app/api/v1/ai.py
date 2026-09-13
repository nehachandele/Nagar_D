from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.ai import AIClassificationResponse, AIEmbeddingResponse
from app.services.ai_service import classify_image, generate_embedding

router = APIRouter(prefix="/ai", tags=["AI Subsystem"])

@router.post("/classify", response_model=AIClassificationResponse)
async def classify_civic_defect(file: UploadFile = File(...)):
    """
    Performs real-time YOLOv8 object detection on uploaded image.
    Returns predicted civic class, bounding boxes, and suggested department.
    """
    try:
        contents = await file.read()
        res = classify_image(contents)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@router.post("/embed", response_model=AIEmbeddingResponse)
async def extract_image_embedding(file: UploadFile = File(...)):
    """
    Extracts 512-dimensional feature vector for pgvector cosine duplicate indexing.
    """
    try:
        contents = await file.read()
        vec = generate_embedding(contents)
        return {"embedding_dimension": len(vec), "vector": vec}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding extraction error: {str(e)}")
