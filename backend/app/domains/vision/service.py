from sqlalchemy.orm import Session
from app.domains.vision.model import VisionTask, VirtualCloset
import uuid
import logging

logger = logging.getLogger(__name__)

def create_vision_task(db: Session, image_path: str):
    task_id = str(uuid.uuid4())
    new_task = VisionTask(task_id=task_id, image_path=image_path, status="processing")
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    try:
        from workers.ai_worker.vision_tasks import process_image
        process_image.delay(task_id, image_path)
    except Exception as e:
        logger.warning(f"Lỗi khi gửi task Celery process_image: {e}")
    return new_task

def get_vision_task(db: Session, task_id: str):
    return db.query(VisionTask).filter(VisionTask.task_id == task_id).first()

def add_to_closet(db: Session, user_id: int, image_path: str):
    # Khởi tạo None ngay lập tức, vì Vector thực sẽ được chạy ngầm bởi AI Celery
    new_item = VirtualCloset(
        user_id=user_id,
        image_path=image_path,
        vector_embedding=None
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # Ném công việc nặng (AI Vision Embeddings) cho Background Worker
    try:
        from workers.ai_worker.vision_tasks import process_closet_image
        process_closet_image.delay(new_item.id, image_path)
    except Exception as e:
        logger.warning(f"Lỗi khi gửi task Celery process_closet_image: {e}")

    return new_item

def get_user_closet(db: Session, user_id: int):
    return db.query(VirtualCloset).filter(VirtualCloset.user_id == user_id).all()
