import logging

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler to ensure unhandled exceptions return a clean
    JSON 500 error instead of falling back to Django's HTML 500 page when DEBUG=False.
    """
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    logger.exception("Unhandled exception in API endpoint", exc_info=exc)
    if settings.DEBUG:
        return None  # Let Django's detailed debug page show locally

    return Response(
        {"detail": "An unexpected error occurred. Please try again later."},
        status=500,
    )
