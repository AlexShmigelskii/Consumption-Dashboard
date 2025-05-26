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

## Installation & Setup

### Prerequisites
- Docker and Docker Compose
- Node.js (v18+)
- npm or yarn
- Python 3.11+

### Backend Setup
1. Navigate to backend directory:
```bash
cd backend
```

2. Start the backend services:
```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Build and start FastAPI backend
- Create necessary database tables
- Load initial demo data

The backend API will be available at http://localhost:8000

### Frontend Setup
1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or if using yarn:
yarn install
```

3. Start development server:
```bash
npm run dev
# or with yarn:
yarn dev
```

The frontend will be available at http://localhost:5173 or http://localhost:5174 (check in console)

## Development

### Clean Rebuild
If you need to completely rebuild the project:

1. Backend:
```bash
cd backend
docker-compose down -v  # Stop and remove containers and volumes
docker-compose build --no-cache  # Rebuild images
docker-compose up -d  # Start services
```

2. Frontend:
```bash
cd frontend
rm -rf node_modules dist .vite
npm install
npm run dev
```

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc