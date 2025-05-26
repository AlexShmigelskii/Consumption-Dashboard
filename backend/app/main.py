from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas
from .database import engine, get_db
from .websocket import manager
from datetime import datetime

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Consumption Dashboard API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/bottles/", response_model=List[schemas.Bottle])
def read_bottles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    bottles = crud.get_bottles(db, skip=skip, limit=limit)
    return bottles

@app.post("/bottles/", response_model=schemas.Bottle)
async def create_bottle(bottle: schemas.BottleCreate, db: Session = Depends(get_db)):
    db_bottle = crud.create_bottle(db, bottle)
    await manager.broadcast({
        "event_type": "bottle_created",
        "data": {
            "id": db_bottle.id,
            "name": db_bottle.name,
            "current_volume": db_bottle.current_volume
        }
    })
    return db_bottle

@app.get("/bottles/{bottle_id}", response_model=schemas.Bottle)
def read_bottle(bottle_id: int, db: Session = Depends(get_db)):
    db_bottle = crud.get_bottle(db, bottle_id)
    if db_bottle is None:
        raise HTTPException(status_code=404, detail="Bottle not found")
    return db_bottle

@app.patch("/bottles/{bottle_id}", response_model=schemas.Bottle)
async def update_bottle(bottle_id: int, bottle: schemas.BottleUpdate, db: Session = Depends(get_db)):
    db_bottle = crud.update_bottle(db, bottle_id, bottle)
    if db_bottle is None:
        raise HTTPException(status_code=404, detail="Bottle not found")
    await manager.broadcast({
        "event_type": "bottle_updated",
        "data": {
            "id": db_bottle.id,
            "name": db_bottle.name,
            "current_volume": db_bottle.current_volume
        }
    })
    return db_bottle

@app.delete("/bottles/{bottle_id}")
def delete_bottle(bottle_id: int, db: Session = Depends(get_db)):
    success = crud.delete_bottle(db, bottle_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bottle not found")
    return {"message": "Bottle deleted successfully"}

@app.post("/bottles/{bottle_id}/events", response_model=schemas.OpeningEvent)
async def create_opening_event(
    bottle_id: int,
    event: schemas.OpeningEventCreate,
    db: Session = Depends(get_db)
):
    db_event = crud.create_opening_event(db, event, bottle_id)
    bottle = crud.get_bottle(db, bottle_id)
    await manager.broadcast({
        "event_type": "opening_event_created",
        "data": {
            "bottle_id": bottle_id,
            "volume_used": event.volume_used,
            "current_volume": bottle.current_volume
        }
    })
    return db_event

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/inventory/", response_model=List[schemas.InventoryBottle])
def read_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_inventory_bottles(db, skip=skip, limit=limit)

@app.post("/inventory/", response_model=schemas.InventoryBottle)
async def create_inventory_bottle(bottle: schemas.InventoryBottleCreate, db: Session = Depends(get_db)):
    # Normalize input data
    name = bottle.name.strip() if bottle.name else ""
    color = bottle.color.strip() if bottle.color else None
    volume = float(bottle.volume)

    # Check for duplicates
    existing = db.query(models.InventoryBottle).filter(
        models.InventoryBottle.name.ilike(name),
        models.InventoryBottle.volume == volume
    ).first()

    if existing and (
        (color is None and existing.color is None) or
        (color and existing.color and color.lower() == existing.color.lower())
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Bottle with name '{name}', color '{color or 'none'}', and volume {volume}ml already exists"
        )

    return crud.create_inventory_bottle(db, bottle)

@app.delete("/inventory/{bottle_id}")
def delete_inventory_bottle(bottle_id: int, db: Session = Depends(get_db)):
    success = crud.delete_inventory_bottle(db, bottle_id)
    if not success:
        raise HTTPException(status_code=404, detail="Inventory bottle not found")
    return {"message": "Inventory bottle deleted successfully"}

@app.post("/inventory/{bottle_id}/open", response_model=schemas.Bottle)
def open_inventory_bottle(bottle_id: int, db: Session = Depends(get_db)):
    bottle = crud.open_inventory_bottle(db, bottle_id)
    if not bottle:
        raise HTTPException(status_code=400, detail="No bottles left in inventory")
    return bottle

@app.post("/inventory_snapshots/", response_model=schemas.InventorySnapshot)
def create_or_update_snapshot(snapshot: schemas.InventorySnapshotCreate, db: Session = Depends(get_db)):
    return crud.create_or_update_snapshot(db, snapshot)

@app.get("/inventory_snapshots/", response_model=List[schemas.InventorySnapshot])
def read_snapshots(start_date: str, end_date: str, db: Session = Depends(get_db)):
    # start_date, end_date: YYYY-MM-DD
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    return crud.get_snapshots_for_period(db, start, end) 