import csv
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import (
    Base, Bottle, OpeningEvent,
    InventoryEvent, InventorySnapshot,
    InventoryBottle
)

# --- 1. Сброс и создание таблиц ---
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def update_all_snapshots_for_date(db: Session, date: datetime):
    """
    Аггрегирует все InventoryEvent до заданной даты (включительно)
    и сохраняет/обновляет запись в InventorySnapshot.
    """
    events = db.query(InventoryEvent).filter(InventoryEvent.timestamp <= date).all()
    stock = {}
    for ev in events:
        key = (ev.name, ev.color, ev.volume)
        stock[key] = stock.get(key, 0) + ev.count

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


def seed_data_from_csv(csv_path: str):
    db = SessionLocal()
    try:
        # --- Очищаем старые данные ---
        db.query(OpeningEvent).delete()
        db.query(Bottle).delete()
        db.query(InventoryEvent).delete()
        db.query(InventorySnapshot).delete()
        db.query(InventoryBottle).delete()
        db.commit()

        # --- Параметры продуктов ---
        sunlu = {
            'name': 'SUNLU',
            'color': 'Solid Grey',
            'volume': 1000
        }
        elegoo = {
            'name': 'ELEGOO',
            'color': 'Ceramic Grey',
            'volume': 1000
        }

        # --- Чтение CSV и подсчёт расхода по датам ---
        consumption = {}  # {date: count}
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                date_str = row.get('Date d’ouverture')
                cnt = row.get('Bouteilles ouvertes')
                if not date_str or not cnt:
                    continue
                used = int(float(cnt))
                if used <= 0:
                    continue
                date = datetime.strptime(date_str, '%d/%m/%y')
                consumption[date] = consumption.get(date, 0) + used

        if not consumption:
            raise ValueError('Нет данных о расходе в CSV')

        # --- Определяем диапазон дат ---
        init_date = min(consumption.keys())  # 07/04/25
        last_date = max(consumption.keys())
        total_consumed = sum(consumption.values())

        # --- Приход на начальную дату ---
        # SUNLU: добавлено 38 бутылок (30 использовано + 8 осталось)
        db.add(InventoryEvent(
            name=sunlu['name'], color=sunlu['color'],
            volume=sunlu['volume'], count=total_consumed + 8,
            timestamp=init_date, type='add'
        ))
        # ELEGOO: добавлено 30 бутылок, не использовались
        db.add(InventoryEvent(
            name=elegoo['name'], color=elegoo['color'],
            volume=elegoo['volume'], count=30,
            timestamp=init_date, type='add'
        ))
        db.commit()

        # --- Ежедневный цикл: расход и снапшоты ---
        current_date = init_date
        while current_date <= last_date:
            # Если в этот день были открытия SUNLU
            used_today = consumption.get(current_date, 0)
            for _ in range(used_today):
                # создаём бутылку и событие открытия
                b = Bottle(
                    name=sunlu['name'],
                    initial_volume=sunlu['volume'],
                    current_volume=0,
                    created_at=current_date
                )
                db.add(b)
                db.commit()
                db.add(OpeningEvent(
                    bottle_id=b.id,
                    timestamp=current_date,
                    volume_used=sunlu['volume']
                ))
                # списание из инвентаря
                db.add(InventoryEvent(
                    name=sunlu['name'], color=sunlu['color'],
                    volume=sunlu['volume'], count=-1,
                    timestamp=current_date, type='remove'
                ))
                db.commit()

            # Обновляем снапшот на каждый день, даже если расхода нет
            update_all_snapshots_for_date(db, current_date)
            current_date += timedelta(days=1)

        # --- Перенос итоговых остатков в InventoryBottle ---
        final_snaps = db.query(InventorySnapshot).filter(
            InventorySnapshot.date == last_date
        ).all()
        for snap in final_snaps:
            db.add(InventoryBottle(
                name=snap.name,
                color=snap.color,
                volume=snap.volume,
                count=snap.count,
                created_at=last_date
            ))
        db.commit()

        print('DB заполнена с ежедневными снапшотами.')
    finally:
        db.close()


if __name__ == '__main__':
    seed_data_from_csv('TRANSCENDENTAL_Shmigelskii - Consomation de résine.csv')
