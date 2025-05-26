from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
from pydantic import validator

class OpeningEventBase(BaseModel):
    volume_used: float

class OpeningEventCreate(OpeningEventBase):
    pass

class OpeningEvent(OpeningEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bottle_id: int
    timestamp: datetime

class BottleBase(BaseModel):
    name: str
    initial_volume: float
    current_volume: float

class BottleCreate(BottleBase):
    pass

class Bottle(BottleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    opening_events: List[OpeningEvent] = []

class BottleUpdate(BaseModel):
    name: Optional[str] = None
    current_volume: Optional[float] = None

class WebSocketMessage(BaseModel):
    event_type: str
    data: dict

class InventoryBottleBase(BaseModel):
    name: str
    color: str | None = None
    volume: float
    count: int = 1

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @validator('volume')
    def validate_volume(cls, v):
        if v <= 0:
            raise ValueError('Volume must be positive')
        return float(v)

    @validator('count')
    def validate_count(cls, v):
        if v < 0:
            raise ValueError('Count cannot be negative')
        return v

    @validator('color')
    def validate_color(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                return None
        return v

class InventoryBottleCreate(InventoryBottleBase):
    pass

class InventoryBottle(InventoryBottleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime 