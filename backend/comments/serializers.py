from rest_framework import serializers
from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'content_type', 'object_id', 'author', 'author_name',
                  'content', 'is_internal', 'created_at', 'updated_at', 'edited_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']
