from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class LogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user: str
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

class PaginatedLogsResponse(BaseModel):
    logs: list[LogResponse]
    total: int
    page: int
    size: int
