from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.domains.inventory.model import Product, InventoryLock, Store, Inventory
from app.domains.inventory.schema import LockRequest
from redis.asyncio import Redis
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def get_all_stores(db: Session):
    return db.query(Store).all()

def get_product_by_id(db: Session, product_id: int):
    return db.query(Product).filter(Product.product_id == product_id).first()


def get_products_by_store(db: Session, store_id: int):
    # Cần qua Inventory để tìm Products thuộc về Store này
    invs = db.query(Inventory).filter(Inventory.store_id == store_id).limit(50).all()
    if not invs:
        return []
    p_ids = [inv.product_id for inv in invs]
    return db.query(Product).filter(Product.product_id.in_(p_ids)).all()


async def create_lock(db: Session, redis: Redis, request: LockRequest, user_id: int):
    from app.core.config import settings
    lock_key = f"lock:prod:{request.product_id}"

    # === PHASE 1: REDIS GATE ===
    is_locked = await redis.get(lock_key)
    if is_locked and str(is_locked) != str(user_id):
        raise HTTPException(
            status_code=409,
            detail="Sản phẩm này đang nằm trong giỏ của người khác! Vui lòng thử lại sau."
        )

    # === PHASE 2: POSTGRES ROW LOCK (Qua bảng Inventory) ===
    # Lấy thông tin Tồn kho của Product (DBeaver tách riêng bảng)
    inv = db.query(Inventory).filter(
        Inventory.product_id == request.product_id
    ).with_for_update().first()

    if not inv:
        raise HTTPException(status_code=404, detail="Sản phẩm không có thông tin tồn kho hoặc đã hết.")

    # Lấy TỔNG tồn kho có sẵn từ TẤT CẢ Store có bán product này
    # (1 product có thể được bán tại nhiều store trong travel_app)
    total_available = sum(max(0, i.stock - i.locked_stock) for i in db.query(Inventory).filter(
        Inventory.product_id == request.product_id
    ).all())
    if total_available < request.quantity:
        raise HTTPException(status_code=400, detail=f"Không đủ hàng. Tồn kho còn: {total_available}")

    # Chuẩn bị ghi DB - trừ từ inventory record đầu tiên còn hàng
    inv.locked_stock += request.quantity
    new_lock = InventoryLock(
        product_id=inv.product_id,
        user_id=user_id,
        quantity=request.quantity,
        status="soft_locked"
    )
    db.add(new_lock)
    db.flush()

    # === PHASE 3: SET REDIS TTL ===
    try:
        await redis.set(lock_key, user_id, ex=settings.INVENTORY_LOCK_TTL)
    except Exception as redis_error:
        db.rollback()
        logger.error(f"Redis SET thất bại cho lock_key={lock_key}: {redis_error}")
        raise HTTPException(
            status_code=503,
            detail="Hệ thống đang có sự cố. Vui lòng thử lại."
        )

    # === PHASE 4: COMMIT ===
    db.commit()
    db.refresh(new_lock)
    return new_lock


async def get_user_locks_with_ttl(db: Session, redis: Redis, user_id: int):
    locks = db.query(InventoryLock).filter(
        InventoryLock.user_id == user_id,
        InventoryLock.status == "soft_locked"
    ).all()
    results = []
    for lock in locks:
        try:
            ttl = await redis.ttl(f"lock:prod:{lock.product_id}")
        except Exception:
            ttl = -1
        results.append({
            "id": lock.id,
            "product_id": lock.product_id,
            "quantity": lock.quantity,
            "status": lock.status,
            "expires_at": lock.expires_at,
            "ttl_seconds": max(ttl, 0)
        })
    return results


def check_and_release_expired_locks(db: Session) -> int:
    now = datetime.now(timezone.utc)
    expired_locks = db.query(InventoryLock).filter(
        InventoryLock.status == "soft_locked",
        InventoryLock.expires_at <= now
    ).with_for_update().all()

    released_count = 0
    for lock in expired_locks:
        inv = db.query(Inventory).filter(Inventory.product_id == lock.product_id).first()
        if inv:
            inv.locked_stock = max(0, inv.locked_stock - lock.quantity)
        lock.status = "expired"
        released_count += 1

    db.commit()
    logger.info(f"[Sweep] Đã hoàn trả tồn kho cho {released_count} lock hết hạn")
    return released_count
