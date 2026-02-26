from rest_framework import serializers
from django.contrib.auth.models import User, Group, Permission

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

class GroupSerializer(serializers.ModelSerializer):
    permissions_list = PermissionSerializer(source='permissions', many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        source='permissions', 
        many=True, 
        queryset=Permission.objects.all(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions_list', 'permission_ids']

class LoginSerializer(serializers.Serializer):
    """Serializador para validación de credenciales de login."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class UserSerializer(serializers.ModelSerializer):
    """Serializador para retornar información del usuario logueado."""
    groups_data = GroupSerializer(source='groups', many=True, read_only=True)
    all_permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'groups', 'groups_data', 'all_permissions']
        extra_kwargs = {
            'groups': {'write_only': True, 'required': False}
        }

    def get_all_permissions(self, obj):
        return list(obj.get_all_permissions())

