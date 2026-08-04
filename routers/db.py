from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from schemas import DBConnectRequest, DBQueryRequest

router = APIRouter()

def get_engine(db_url: str):
    try:
        # Avoid creating excessive connections; in a production environment, 
        # this should be cached or use connection pooling properly.
        engine = create_engine(db_url)
        return engine
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create database engine: {str(e)}")

@router.post("/test-connection")
async def test_connection(request: DBConnectRequest):
    """Test if a database connection URL is valid and reachable."""
    engine = get_engine(request.db_url)
    try:
        with engine.connect() as conn:
            # Simple query to verify connection
            conn.execute(text("SELECT 1"))
        return {"status": "success", "message": "Connection successful"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

@router.post("/schema")
async def get_db_schema(request: DBConnectRequest):
    """Retrieve all tables and columns for the database."""
    engine = get_engine(request.db_url)
    try:
        inspector = inspect(engine)
        schema_data = {}
        
        for table_name in inspector.get_table_names():
            columns = inspector.get_columns(table_name)
            schema_data[table_name] = [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col["nullable"],
                    "primary_key": col.get("primary_key", False)
                } for col in columns
            ]
            
        return {"status": "success", "schema": schema_data}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=400, detail=f"Failed to inspect database: {str(e)}")

@router.post("/execute")
async def execute_query(request: DBQueryRequest):
    """Execute a raw SQL query and return the results."""
    engine = get_engine(request.db_url)
    try:
        with engine.connect() as conn:
            # Execute the query inside a transaction if it modifies data
            # SQLAlchemy 2.0 requires explicit commits or using .execution_options(autocommit=True)
            # For simplicity, we use begin() here to automatically commit if it's a mutation.
            with conn.begin():
                result = conn.execute(text(request.query))
                
                # Check if the query returns rows (e.g., SELECT)
                if result.returns_rows:
                    # Convert Result proxy into a list of dicts
                    columns = result.keys()
                    rows = [dict(zip(columns, row)) for row in result.fetchall()]
                    return {"status": "success", "rows": rows, "count": len(rows)}
                else:
                    return {"status": "success", "message": "Query executed successfully", "rows_affected": result.rowcount}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")
