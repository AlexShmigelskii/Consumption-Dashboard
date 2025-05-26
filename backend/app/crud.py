from sqlalchemy.orm import Session
from . import models, schemas
from typing import List, Optional
from fastapi import HTTPException
import logging

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
        return db_bottle
    except Exception as e:
        print(f"Error creating bottle: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error creating bottle: {str(e)}"
        )

def delete_inventory_bottle(db: Session, bottle_id: int):
    db_bottle = db.query(models.InventoryBottle).filter(models.InventoryBottle.id == bottle_id).first()
    if db_bottle:
        db.delete(db_bottle)
        db.commit()
        return True
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
    return new_bottle 