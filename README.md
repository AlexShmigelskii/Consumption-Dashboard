# Consumption Dashboard

## Project Description
A web service for tracking 3D printer photopolymer consumption. Operators log bottle openings, visualize monthly usage trends, and forecast depletion dates.

## Main Features
- Monthly consumption line chart (default view)
- Bottle buttons to log opening events.
- Trendline and depletion-date forecast overlay
- Initial stock setup form at first launch for entering current volumes
- Settings page for bottle management and chart customization (future version)

## Technical Stack
- **Frontend:** React (TypeScript), Vite, Tailwind CSS, Recharts, React Query, WebSocket  
- **Backend:** Python, FastAPI, SQLAlchemy  
- **Database:** PostgreSQL  
- **Infrastructure & Deployment:** Docker, Railway  
- **CI/CD:** GitHub Actions