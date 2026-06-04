from rest_framework import viewsets, permissions
from .models import Comment
from .serializers import CommentSerializer


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Comment.objects.all()
        # Filter based on user permissions
        if not user.is_superuser:
            queryset = queryset.filter(is_internal=False)
        return queryset
