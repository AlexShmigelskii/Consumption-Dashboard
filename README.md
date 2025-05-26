# Consumption Dashboard

## Project Description
A web service for tracking 3D printer photopolymer consumption. The system helps operators monitor resin usage, manage inventory, and predict when stocks need replenishment.

## Main Features
- **Inventory Management:**
  - Add/remove bottles with color and volume tracking
  - Track bottle count in stock
  - Open bottles from inventory

- **Usage Tracking:**
  - Log bottle openings and consumption
  - Track consumption per bottle type
  - Filter data by bottle type

- **Analytics:**
  - Stock dynamics visualization (30-day history)
  - Current month usage statistics
  - Daily average consumption (90-day rolling average)
  - Stock depletion forecast
  - Remaining stock calculation

- **Real-time Updates:**
  - WebSocket-based live updates
  - Instant reflection of inventory changes
  - Immediate consumption data updates

## Technical Stack
- **Frontend:** 
  - React 18 with TypeScript
  - Vite for build tooling
  - Tailwind CSS for styling
  - Recharts for data visualization
  - React Query for data management
  - WebSocket for real-time updates

- **Backend:**
  - FastAPI (Python 3.11+)
  - SQLAlchemy ORM
  - PostgreSQL database
  - Pydantic for data validation
  - Async/await support

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