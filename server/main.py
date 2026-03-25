from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, decoy, feed

app = FastAPI(title="HoneyTrap API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(decoy.router, prefix="/api")
app.include_router(feed.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "HoneyTrap API is running 🍯"}
