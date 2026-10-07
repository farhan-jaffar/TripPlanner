from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission to only allow owners of an object to view or edit it.
    For Stop objects, checks ownership via the parent trip.
    """

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "owner", None)
        if owner is None and hasattr(obj, "trip"):
            owner = getattr(obj.trip, "owner", None)
        return bool(request.user and request.user.is_authenticated and owner == request.user)
