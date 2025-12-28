from rest_framework import serializers

class LoginSerializer(serializers.Serializer):
    """Serializador para validación de credenciales de login."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class UserSerializer(serializers.Serializer):
    """Serializador para retornar información del usuario logueado."""
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_staff = serializers.BooleanField()
