from pydantic import BaseModel, Field


class CartItemInput(BaseModel):
    product_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=100)


class CartInput(BaseModel):
    items: list[CartItemInput] = Field(max_length=100)


class OrderInput(BaseModel):
    items: list[CartItemInput] = Field(min_length=1, max_length=100)

