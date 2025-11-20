Collaborative Whiteboarding Platform

[![Deploy to Production](https://github.com/iamapoorv476/my-excildrawapp/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/iamapoorv476/my-excildrawapp/actions/workflows/ci-cd.yml)


##  Project Overview

A production-ready, real-time collaborative whiteboard application inspired by Excalidraw. Users can join rooms, draw together using various shapes (circles, rectangles, freehand), and see changes in real-time. Each user gets independent zoom and pan controls while maintaining synchronized drawing state across all participants.

### Key Features

- **Real-time Collaboration**: Multiple users can draw simultaneously in shared rooms using WebSocket connections
- **Drawing Tools**: Circle, Rectangle, and Pencil tools with smooth rendering
- **Advanced Canvas Controls**: 
  - Individual zoom controls (scroll to zoom)
  - Pan functionality (Shift + Click to pan)
  - Zoom levels from 10% to 500%
- **User Authentication**: Secure JWT-based authentication system
- **Room Management**: Create and join dedicated drawing rooms
- **Persistent Storage**: All drawings saved to PostgreSQL database
- **Responsive Design**: Modern UI built with Tailwind CSS

##  Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Modern utility-first styling
- **Canvas API** - High-performance drawing
- **Axios** - HTTP client for API calls

### Backend
- **Express.js** - REST API server (Port 3001)
- **WebSocket (ws)** - Real-time bidirectional communication (Port 8080)
- **Prisma ORM** - Type-safe database queries
- **PostgreSQL** - Relational database
- **JWT** - Secure authentication

### DevOps & Deployment
- **Docker** - Multi-stage containerization
- **Docker Compose** - Service orchestration
- **GitHub Actions** - Automated CI/CD pipeline
- **GitHub Container Registry (GHCR)** - Docker image hosting
- **Turborepo** - Monorepo build system

## 📁 Project Structure

```
my-excildrawapp/
├── apps/
│   ├── http-backend/          # Express REST API
│   │   ├── src/
│   │   │   ├── index.ts       # API server entry
│   │   │   └── middleware.ts  # JWT auth middleware
│   │   └── Dockerfile.backend
│   │
│   ├── ws-backend/            # WebSocket server
│   │   ├── src/
│   │   │   └── index.ts       # WS server with room logic
│   │   └── Dockerfile.ws
│   │
│   └── my-excildraw/          # Next.js frontend
│       ├── app/
│       │   ├── components/    # React components
│       │   │   ├── Canvas.tsx       # Main canvas with tools
│       │   │   ├── RoomCanvas.tsx   # Room wrapper
│       │   │   └── AuthPage.tsx     # Login/Signup
│       │   └── draw/
│       │       └── Game.ts          # Canvas logic + zoom/pan
│       └── Dockerfile.frontend
│
├── packages/
│   ├── db/                    # Prisma schema & client
│   │   └── prisma/
│   │       └── schema.prisma  # Database models
│   ├── common/                # Shared Zod schemas
│   ├── backend-common/        # Shared backend utilities
│   └── ui/                    # Shared UI components
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD pipeline
│
└── staging/
    └── docker-compose.yml     # Production deployment
```



##  Production Deployment

This project was successfully deployed to AWS EC2 with a fully automated CI/CD pipeline. Below is the deployment architecture:

```
┌─────────────────────────────────────────────────────┐
│                   AWS EC2 Instance                   │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │        Docker Compose Services                │  │
│  │                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │  │
│  │  │ Frontend │  │  API     │  │ WebSocket │  │  │
│  │  │ (Next.js)│  │ (Express)│  │   (WS)    │  │  │
│  │  │  :3000   │  │  :3001   │  │   :8080   │  │  │
│  │  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │  │
│  │       │             │              │         │  │
│  │       └─────────────┴──────────────┘         │  │
│  │                     │                        │  │
│  │              ┌──────┴──────┐                 │  │
│  │              │  PostgreSQL │                 │  │
│  │              │     :5432   │                 │  │
│  │              └─────────────┘                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      ▲
                      │
         ┌────────────┴────────────┐
         │   GitHub Actions CI/CD   │
         │   • Build Docker Images  │
         │   • Push to GHCR        │
         │   • SSH Deploy          │
         └─────────────────────────┘
```

### CI/CD Pipeline

**Automated Workflow** (`.github/workflows/deploy.yml`):
1.  Triggers on push to `main` branch
2.  Builds 3 Docker images (frontend, api, ws) using multi-stage builds
3.  Pushes images to GitHub Container Registry
4.  SSH into EC2 instance
5.  Creates `.env` with secrets from GitHub
6.  Pulls latest images
7.  Performs zero-downtime deployment with `docker-compose`
8.  Cleans up old images

### Docker Architecture

**Multi-Stage Builds** for optimized images:
- **Frontend**: Node 20 Alpine → Production build → Standalone output
- **Backend**: Node 20 Alpine → TypeScript compilation → Prisma generation
- **WebSocket**: Node 20 Alpine → TypeScript compilation → Prisma generation

**To redeploy:**
1. Provision a new EC2 instance (Ubuntu 22.04)
2. Install Docker & Docker Compose
3. Configure GitHub Secrets (HOST_SERVER, HOST_USERNAME, HOST_SSH_PRIVATE_KEY)
4. Push to main branch → Automatic deployment!


##  Local Development

Prerequisites:

Docker & Docker Compose installed.

Node.js 20+ & pnpm installed.

Steps:
1. Clone the repository:
git clone https://github.com/iamapoorv476/my-excildrawapp.git
cd my-excildrawapp

2. Install dependencies:
pnpm install

3. Set up Environment Variables: Create a .env file in the root directory:
DATABASE_URL="postgresql://postgres:password@localhost:5432/excildraw_db"
JWT_SECRET="development_secret"
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=excildraw_db

4. Start the App (Docker): This will spin up the Postgres database and all services.
# Use the development compose file
docker-compose -f docker-compose.dev.yml up

5. Access the App:
Frontend: http://localhost:3000

API: http://localhost:3001

WebSocket: ws://localhost:8080

## Contributing
This is a portfolio project, but feedback and suggestions are welcome!



 