import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    yield
    # Shutdown logic if needed


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Aegis: Safe, Verified Autonomous AI Agent Execution Runtime",
        lifespan=lifespan
    )

    # CORS configuration
    cors_origins = list(settings.CORS_ORIGINS)
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url and render_url not in cors_origins:
        cors_origins.append(render_url)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https://.*\.onrender\.com",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include root API router (all /api/* endpoints)
    app.include_router(api_router)

    # Determine frontend distribution directory path
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    frontend_dist = os.path.join(base_dir, "frontend", "dist")

    if os.path.isdir(frontend_dist):
        # Mount static assets (/assets -> frontend/dist/assets)
        assets_dir = os.path.join(frontend_dist, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        # Catch-all route for Single Page Application (SPA)
        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            # Do not intercept API or docs routes with SPA fallback
            if (
                full_path == "api"
                or full_path.startswith("api/")
                or full_path.startswith("docs")
                or full_path.startswith("redoc")
                or full_path == "openapi.json"
            ):
                raise HTTPException(status_code=404, detail="Not Found")

            # Check if specific static file exists in frontend/dist (e.g. favicon.ico, vite.svg)
            target_file = os.path.join(frontend_dist, full_path)
            if full_path and os.path.isfile(target_file):
                return FileResponse(target_file)

            # Serve index.html for root and client-side routes
            index_path = os.path.join(frontend_dist, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path)

            raise HTTPException(status_code=404, detail="Frontend index.html not found")
    else:
        # Fallback root status endpoint when frontend has not been compiled
        @app.get("/")
        async def root():
            return {
                "name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "tagline": "Plan. Act. Verify. Trust.",
                "status": "online",
                "docs_url": "/docs"
            }

    return app


app = create_app()
