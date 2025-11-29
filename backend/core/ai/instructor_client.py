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
from pydantic import BaseModel

from .schemas import NetworkEventAnalysis, IncidentCorrelation, ChatQueryResponse

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class InstructorClient:
    """Instructor-patched AsyncOpenAI client for structured AI responses."""
    
    def __init__(
        self,
        base_url: str,
        model: str = "llama3.1:latest",
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
        
        # Patch with Instructor for structured outputs
        self.client = instructor.patch(
            openai_client,
            mode=instructor.Mode.JSON
        )
        
        logger.info(f"InstructorClient initialized: {base_url}, model={model}")
    
    async def create_completion(
        self,
        messages: list[dict],
        response_model: Type[T],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> T:
        """
        Create a structured completion with automatic validation and retry.
        
        Uses Instructor with the OpenAI-compatible UCY API endpoint.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            response_model: Pydantic model to validate response against
            temperature: Override default temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Validated Pydantic model instance
            
        Raises:
            Exception: If validation fails after max_retries
        """
        temp = temperature if temperature is not None else self.temperature
        
        try:
            logger.info(f"Calling Instructor API with model: {self.model}")
            logger.debug(f"Messages: {messages}")
            
            # Use Instructor's patched client - it handles schema injection and validation
            response = await self.client.chat.completions.create(
                model=self.model,
                response_model=response_model,
                messages=messages,
                temperature=temp,
                max_tokens=max_tokens,
                max_retries=self.max_retries,
                timeout=self.timeout
            )
            
            logger.info(f"Successfully validated response as {response_model.__name__}")
            return response
            
        except Exception as e:
            logger.error(f"Instructor API error: {e}", exc_info=True)
            raise Exception(f"Failed to get structured response: {str(e)}")
    
    async def close(self):
        """Close the HTTP client."""
        if hasattr(self.client, '_client') and hasattr(self.client._client, 'close'):
            await self.client._client.close()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
