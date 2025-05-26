from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, Bottle, OpeningEvent, InventoryBottle
from datetime import datetime, timedelta
import random

# Drop and recreate all tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    try:
        # Очистить все
        db.query(OpeningEvent).delete()
        db.query(Bottle).delete()
        db.query(InventoryBottle).delete()
        db.commit()

        today = datetime(2025, 5, 26)
        start_date = today - timedelta(days=29)
        days = [start_date + timedelta(days=i) for i in range(30)]

        # Две бутылки: Black (1000 мл), Clear (500 мл)
        # Black закончится в середине месяца, Clear — до конца
        black_volume = 1000
        clear_volume = 500
        black_left = 0
        clear_left = 1
        db.add(InventoryBottle(name="Resin Black", color="Black", volume=black_volume, count=black_left))
        db.add(InventoryBottle(name="Resin Clear", color="Transparent", volume=clear_volume, count=clear_left))
        db.commit()

        # Расход: первые 13 дней Black, потом только Clear
        black_bottles_left = 10  # всего 10 бутылок Black
        clear_bottles_left = 15  # всего 15 бутылок Clear
        random.seed(42)
        for i, day in enumerate(days):
            events_today = []
            # Black расходуем только если остались
            if black_bottles_left > 0 and i < 13:
                n = random.choices([0,1,2], [0.2,0.6,0.2])[0]  # чаще 1, иногда 0 или 2
                n = min(n, black_bottles_left)
                for _ in range(n):
                    b = Bottle(name="Resin Black", initial_volume=black_volume, current_volume=0, created_at=day)
                    db.add(b)
                    db.commit()
                    db.add(OpeningEvent(bottle_id=b.id, timestamp=day, volume_used=black_volume))
                    black_bottles_left -= 1
            # После Black — только Clear
            if i >= 10 and clear_bottles_left > 0:
                n = random.choices([0,1,2], [0.3,0.5,0.2])[0]
                n = min(n, clear_bottles_left)
                for _ in range(n):
                    b = Bottle(name="Resin Clear", initial_volume=clear_volume, current_volume=0, created_at=day)
                    db.add(b)
                    db.commit()
                    db.add(OpeningEvent(bottle_id=b.id, timestamp=day, volume_used=clear_volume))
                    clear_bottles_left -= 1
        # В конце периода открываем одну Clear, но не тратим её (она в инвентаре)
        last_clear_date = today + timedelta(days=1)
        b = Bottle(name="Resin Clear", initial_volume=clear_volume, current_volume=clear_volume, created_at=last_clear_date)
        db.add(b)
        db.commit()
        db.commit()
        print("Demo data: непостоянный расход, Black заканчивается в середине месяца, расход кратен бутылкам.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
