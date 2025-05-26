from sqlalchemy.orm import Session
from . import models, schemas
from typing import List, Optional
from fastapi import HTTPException
import logging
from datetime import datetime

logger = logging.getLogger("uvicorn")

def get_bottle(db: Session, bottle_id: int):
    return db.query(models.Bottle).filter(models.Bottle.id == bottle_id).first()

def get_bottles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Bottle).offset(skip).limit(limit).all()

def create_bottle(db: Session, bottle: schemas.BottleCreate):
    db_bottle = models.Bottle(**bottle.model_dump())
    db.add(db_bottle)
    db.commit()
    db.refresh(db_bottle)
    return db_bottle

def update_bottle(db: Session, bottle_id: int, bottle: schemas.BottleUpdate):
    db_bottle = get_bottle(db, bottle_id)
    if not db_bottle:
        return None
    
    update_data = bottle.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bottle, key, value)
    
    db.commit()
    db.refresh(db_bottle)
    return db_bottle

def delete_bottle(db: Session, bottle_id: int):
    db_bottle = get_bottle(db, bottle_id)
    if db_bottle:
        db.delete(db_bottle)
        db.commit()
        return True
    return False

def create_opening_event(db: Session, event: schemas.OpeningEventCreate, bottle_id: int):
    db_event = models.OpeningEvent(**event.model_dump(), bottle_id=bottle_id)
    db.add(db_event)
    
    # Update bottle's current volume
    bottle = get_bottle(db, bottle_id)
    if bottle:
        bottle.current_volume -= event.volume_used
    
    db.commit()
    db.refresh(db_event)
    return db_event

def get_inventory_bottles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.InventoryBottle).offset(skip).limit(limit).all()

def create_inventory_bottle(db: Session, bottle: schemas.InventoryBottleCreate):
    # Normalize input data
    name = bottle.name.strip() if bottle.name else ""
    color = bottle.color.strip() if bottle.color else None
    volume = float(bottle.volume)  # Ensure it's float
    
    # Debug print
    from fastapi.encoders import jsonable_encoder
    print("="*50)
    print(f"Creating bottle with params:")
    print(f"name: '{name}' (type: {type(name)})")
    print(f"color: '{color}' (type: {type(color)})")
    print(f"volume: {volume} (type: {type(volume)})")
    
    # Get all existing bottles for debug
    all_bottles = db.query(models.InventoryBottle).all()
    print("\nExisting bottles:")
    for b in all_bottles:
        print(f"- name: '{b.name}', color: '{b.color}', volume: {b.volume}")
    
    # Check for existing bottle with same parameters (case-insensitive)
    existing = db.query(models.InventoryBottle).filter(
        models.InventoryBottle.name.ilike(f"%{name}%") if name else True,
        models.InventoryBottle.volume == volume
    ).all()
    
    print("\nFound matches by name and volume:")
    for b in existing:
        print(f"- name: '{b.name}', color: '{b.color}', volume: {b.volume}")
        if (b.name.lower() == name.lower() and 
            ((color is None and b.color is None) or 
             (color and b.color and color.lower() == b.color.lower()))):
            print("!!! EXACT MATCH FOUND !!!")
            raise HTTPException(
                status_code=400,
                detail=f"Bottle with name '{name}', color '{color or 'none'}', and volume {volume}ml already exists"
            )
    
    print("\nNo exact match found, creating new bottle")
    # Create new bottle with normalized data
    db_bottle = models.InventoryBottle(
        name=name,
        color=color,
        volume=volume,
        count=bottle.count
    )
    db.add(db_bottle)
    try:
        db.commit()
        db.refresh(db_bottle)
        print("Successfully created new bottle")
        update_all_snapshots_today(db)
        return db_bottle
    except Exception as e:
        print(f"Error creating bottle: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error creating bottle: {str(e)}"
        )

def delete_inventory_bottle(db: Session, bottle_id: int):
    print(f"\n=== Starting delete_inventory_bottle for id={bottle_id} ===")
    
    # Находим бутылку по ID
    db_bottle = db.query(models.InventoryBottle).filter(models.InventoryBottle.id == bottle_id).first()
    print(f"Found bottle: {db_bottle}")
    
    if db_bottle:
        name = db_bottle.name
        color = db_bottle.color
        volume = db_bottle.volume
        
        print(f"Deleting bottle: name='{name}', color='{color}', volume={volume}")
        
        # Удаляем все бутылки с такими же name/color/volume
        deleted_bottles = db.query(models.InventoryBottle).filter(
            models.InventoryBottle.name == name,
            models.InventoryBottle.color == color,
            models.InventoryBottle.volume == volume
        ).delete(synchronize_session=False)
        print(f"Deleted {deleted_bottles} bottles from inventory")
        
        # Удаляем все снапшоты для этой позиции за сегодня
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        print(f"Deleting snapshots for date {today}")
        
        deleted_snapshots = db.query(models.InventorySnapshot).filter(
            models.InventorySnapshot.name == name,
            models.InventorySnapshot.color == color,
            models.InventorySnapshot.volume == volume,
            models.InventorySnapshot.date == today
        ).delete(synchronize_session=False)
        print(f"Deleted {deleted_snapshots} snapshots")
        
        try:
            db.commit()
            print("Database commit successful")
            
            # Создаем новый снапшот с count=0
            snap = schemas.InventorySnapshotCreate(
                name=name,
                color=color,
                volume=volume,
                count=0,
                date=today
            )
            result = create_or_update_snapshot(db, snap)
            print(f"Created/updated snapshot with id={result.id}, count={result.count}")
            print("=== Delete operation completed successfully ===\n")
            return True
        except Exception as e:
            print(f"Error during delete operation: {str(e)}")
            db.rollback()
            return False
    else:
        print(f"Bottle with id={bottle_id} not found")
        return False

def open_inventory_bottle(db: Session, bottle_id: int):
    db_bottle = db.query(models.InventoryBottle).filter(models.InventoryBottle.id == bottle_id).first()
    if not db_bottle or db_bottle.count < 1:
        return None
    db_bottle.count -= 1
    db.commit()
    # Логируем открытие: создаём Bottle и OpeningEvent
    new_bottle = models.Bottle(
        name=db_bottle.name,
        initial_volume=db_bottle.volume,
        current_volume=db_bottle.volume
    )
    db.add(new_bottle)
    db.commit()
    db.refresh(new_bottle)
    event = models.OpeningEvent(
        bottle_id=new_bottle.id,
        volume_used=db_bottle.volume  # Фиксируем расход всего объема
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    update_all_snapshots_today(db)
    return new_bottle

def create_or_update_snapshot(db: Session, snapshot: schemas.InventorySnapshotCreate):
    # Проверяем, есть ли уже снапшот на эту дату для этой позиции
    print(f"Trying to create/update snapshot: {snapshot.name}, count={snapshot.count}, date={snapshot.date}")
    db_snapshot = db.query(models.InventorySnapshot).filter(
        models.InventorySnapshot.name == snapshot.name,
        models.InventorySnapshot.color == snapshot.color,
        models.InventorySnapshot.volume == snapshot.volume,
        models.InventorySnapshot.date == snapshot.date
    ).first()
    if db_snapshot:
        print(f"Found existing snapshot with count={db_snapshot.count}, updating to count={snapshot.count}")
        db_snapshot.count = snapshot.count
    else:
        print("Creating new snapshot")
        db_snapshot = models.InventorySnapshot(**snapshot.model_dump())
        db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot

def get_snapshots_for_period(db: Session, start_date, end_date):
    return db.query(models.InventorySnapshot).filter(
        models.InventorySnapshot.date >= start_date,
        models.InventorySnapshot.date <= end_date
    ).order_by(models.InventorySnapshot.date).all()

def create_inventory_event(db: Session, event: schemas.InventoryEventCreate):
    db_event = models.InventoryEvent(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    # После любого пополнения — обновляем снапшоты на сегодня
    update_all_snapshots_today(db)
    return db_event

def update_all_snapshots_today(db: Session):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    inventory = db.query(models.InventoryBottle).all()
    for b in inventory:
        snap = schemas.InventorySnapshotCreate(
            name=b.name,
            color=b.color,
            volume=b.volume,
            count=b.count,
            date=today
        )
        create_or_update_snapshot(db, snap) 