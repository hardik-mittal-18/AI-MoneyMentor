"""Global rate limiter.

Uses in-memory storage by default (suitable for demo/local dev).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
