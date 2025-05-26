from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, Bottle, OpeningEvent, InventoryEvent, InventorySnapshot, InventoryBottle
from app.crud import create_or_update_snapshot
from datetime import datetime, timedelta
import random

# Drop and recreate all tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def update_all_snapshots_for_date(db: Session, date: datetime):
    # Считаем остатки по InventoryEvent на эту дату
    # Для каждой уникальной позиции (name, color, volume) считаем сумму всех пополнений до этой даты
    events = db.query(InventoryEvent).filter(InventoryEvent.timestamp <= date).all()
    stock = {}
    for ev in events:
        key = (ev.name, ev.color, ev.volume)
        stock[key] = stock.get(key, 0) + ev.count
    # Для каждой позиции сохраняем снапшот
    for (name, color, volume), count in stock.items():
        snap = InventorySnapshot(
            name=name,
            color=color,
            volume=volume,
            count=max(0, count),
            date=date
        )
        db.merge(snap)
    db.commit()

def seed_data():
    db = SessionLocal()
    try:
        db.query(OpeningEvent).delete()
        db.query(Bottle).delete()
        db.query(InventoryEvent).delete()
        db.query(InventorySnapshot).delete()
        db.commit()

        today = datetime(2025, 5, 26)
        start_date = today - timedelta(days=29)
        days = [start_date + timedelta(days=i) for i in range(30)]

        black_volume = 1000
        clear_volume = 500
        black_name = "Resin Black"
        clear_name = "Resin Clear"
        black_color = "Black"
        clear_color = "Transparent"

        # 1. Пополнение склада: в начале периода 3 Black, 5 Clear
        db.add(InventoryEvent(
            name=black_name, color=black_color, volume=black_volume, count=3, timestamp=days[0], type="add"
        ))
        db.add(InventoryEvent(
            name=clear_name, color=clear_color, volume=clear_volume, count=5, timestamp=days[0], type="add"
        ))
        db.commit()
        update_all_snapshots_for_date(db, days[0])

        black_left = 3
        clear_left = 5
        random.seed(42)
        for i, day in enumerate(days):
            # Black расходуем только если остались
            if black_left > 0 and i < 12:
                n = random.choices([0,1], [0.4,0.6])[0]
                n = min(n, black_left)
                for _ in range(n):
                    b = Bottle(name=black_name, initial_volume=black_volume, current_volume=0, created_at=day)
                    db.add(b)
                    db.commit()
                    db.add(OpeningEvent(bottle_id=b.id, timestamp=day, volume_used=black_volume))
                    black_left -= 1
                    # Сразу уменьшаем остаток: создаем InventoryEvent списания
                    db.add(InventoryEvent(
                        name=black_name, color=black_color, volume=black_volume, count=-1, timestamp=day, type="remove"
                    ))
                    db.commit()
            # Clear расходуем всегда
            if clear_left > 0:
                n = random.choices([0,1,2], [0.2,0.6,0.2])[0]
                n = min(n, clear_left)
                for _ in range(n):
                    b = Bottle(name=clear_name, initial_volume=clear_volume, current_volume=0, created_at=day)
                    db.add(b)
                    db.commit()
                    db.add(OpeningEvent(bottle_id=b.id, timestamp=day, volume_used=clear_volume))
                    clear_left -= 1
                    db.add(InventoryEvent(
                        name=clear_name, color=clear_color, volume=clear_volume, count=-1, timestamp=day, type="remove"
                    ))
                    db.commit()
            # В день 15 Black закончилась, через 2 дня пополняем еще 2 Black
            if i == 14:
                db.add(InventoryEvent(
                    name=black_name, color=black_color, volume=black_volume, count=2, timestamp=days[i+2], type="add"
                ))
                db.commit()
            # Сохраняем снапшот после всех операций за день
            update_all_snapshots_for_date(db, day)
        # В конце периода открываем одну Clear, но не тратим её (она в запасе)
        last_clear_date = today + timedelta(days=1)
        b = Bottle(name=clear_name, initial_volume=clear_volume, current_volume=clear_volume, created_at=last_clear_date)
        db.add(b)
        db.commit()
        print("Demo data: непостоянный расход, Black заканчивается, потом пополняется, расход кратен бутылкам.")

        # После всех операций, перед finally:
        for snap in db.query(InventorySnapshot).filter(InventorySnapshot.date == today).all():
            db.add(InventoryBottle(
                name=snap.name,
                color=snap.color,
                volume=snap.volume,
                count=snap.count,
                created_at=today
            ))
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
