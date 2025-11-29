"""
Instructor-based client for structured AI interactions with remote UCY server.

This module uses the UCY ChatGPT API's OpenAI-compatible endpoint (/ollama/v1)
with Instructor to ensure type-safe, validated responses according to Pydantic schemas.
"""
import logging
from typing import Optional, Type, TypeVar
from openai import AsyncOpenAI
import instructor
import httpx
import json
from pydantic import BaseModel

from .schemas import NetworkEventAnalysis, IncidentCorrelation, ChatQueryResponse

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class InstructorClient:
    """Instructor-patched AsyncOpenAI client for structured AI responses."""
    
    def __init__(
        self,
        base_url: str,
        model: str = "gemma3",
        timeout: float = 30.0,
        max_retries: int = 2,
        temperature: float = 0.7
    ):
        """
        Initialize Instructor client for UCY ChatGPT API (OpenAI-compatible).
        
        Args:
            base_url: Base URL for the OpenAI-compatible API (e.g., https://chatucy.cs.ucy.ac.cy/ollama/v1)
            model: Model name to use
            timeout: Request timeout in seconds
            max_retries: Number of retries on validation failure
            temperature: Sampling temperature (0.0-1.0)
        """
        # Convert base URL to OpenAI-compatible endpoint if needed
        if "/api/send_message" in base_url:
            # Replace custom endpoint with OpenAI-compatible one
            base_url = base_url.replace("/api/send_message", "/ollama/v1")
        elif not base_url.endswith("/v1"):
            # Ensure it ends with /v1 for OpenAI compatibility
            base_url = base_url.rstrip("/") + "/ollama/v1"
        
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self.temperature = temperature
        
        # Create AsyncOpenAI client with custom base URL
        openai_client = AsyncOpenAI(
            base_url=base_url,
            api_key="ollama",  # Dummy key for compatibility
            http_client=httpx.AsyncClient(
                verify=False,  # Disable SSL verification for self-signed certs
                timeout=timeout
            )
        )
        
        # Patch with Instructor for strict structured outputs
        # Use MD_JSON mode to enforce schema compliance with automatic retries
        self.client = instructor.patch(
            openai_client,
            mode=instructor.Mode.MD_JSON
        )
        
        logger.info(f"InstructorClient initialized: {base_url}, model={model}")
    
    async def create_completion(
        self,
        messages: Optional[list[dict]] = None,
        response_model: Optional[Type[T]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> T:
        """
        Create a structured completion with automatic validation and retry.
        
        Uses Instructor's MD_JSON mode with UCY API for strict schema enforcement.
        Instructor automatically:
        - Injects schema into prompt
        - Validates against Pydantic model
        - Retries on validation failure (max_retries times)
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            response_model: Pydantic model to validate response against
            temperature: Override default temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters
            
        Returns:
            Validated Pydantic model instance
            
        Raises:
            Exception: If validation fails after max_retries attempts
        """
        # Handle kwargs in case response_model or messages are passed as kwargs
        messages = kwargs.pop('messages', messages)
        response_model = kwargs.pop('response_model', response_model)
        
        if messages is None or response_model is None:
            raise ValueError("Both 'messages' and 'response_model' are required")
        
        temp = temperature if temperature is not None else self.temperature
        
        logger.info(f"Calling Instructor API with model: {self.model}, response_model: {response_model.__name__}")
        logger.debug(f"Messages: {messages}")
        
        # Use Instructor's MD_JSON mode - it enforces exact schema compliance
        # The client automatically:
        # 1. Injects schema into system prompt
        # 2. Validates response against Pydantic model
        # 3. Retries on validation failure up to max_retries times
        response = await self.client.chat.completions.create(
            model=self.model,
            response_model=response_model,
            messages=messages,
            temperature=temp,
            max_tokens=max_tokens,
            max_retries=self.max_retries
        )
        
        logger.info(f" Successfully validated response as {response_model.__name__}")
        logger.debug(f"Response fields: {response.model_fields_set if hasattr(response, 'model_fields_set') else 'N/A'}")
        return response
    
    async def close(self):
        """Close the HTTP client."""
        if hasattr(self.client, '_client') and hasattr(self.client._client, 'close'):
            await self.client._client.close()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
