from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.orm import relationship
from .database import Base

class Bottle(Base):
    __tablename__ = "bottles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    initial_volume = Column(Float)
    current_volume = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    opening_events = relationship("OpeningEvent", back_populates="bottle")

class OpeningEvent(Base):
    __tablename__ = "opening_events"

    id = Column(Integer, primary_key=True, index=True)
    bottle_id = Column(Integer, ForeignKey("bottles.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    volume_used = Column(Float)

    bottle = relationship("Bottle", back_populates="opening_events")

class InventoryBottle(Base):
    __tablename__ = "inventory_bottles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    volume = Column(Float, nullable=False)
    count = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Create case-insensitive unique index
    __table_args__ = (
        Index('ix_unique_bottle', 
              func.lower(name),
              func.coalesce(func.lower(color), ''),  # handle NULL colors
              volume,
              unique=True
        ),
    ) 