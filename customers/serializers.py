"""
Serializers para la app Customers.

Define los serializers para la API REST de gestión de tenants.
"""
from rest_framework import serializers
from django.db import connection
from django.conf import settings
from .models import Client, Domain
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class DomainSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Domain."""
    
    class Meta:
        model = Domain
        fields = ['id', 'domain', 'is_primary']
        read_only_fields = ['id']


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Client (Tenant).
    
    Incluye los dominios asociados y valida la creación de nuevos tenants.
    """
    
    domains = DomainSerializer(many=True, read_only=True)
    primary_domain = serializers.CharField(
        write_only=True, 
        required=True,
        help_text='Dominio principal del tenant (ej: farmacia.localhost)'
    )
    
    class Meta:
        model = Client
        fields = [
            'id',
            'schema_name',
            'name',
            'rif',
            'email',
            'phone',
            'address',
            'on_trial',
            'paid_until',
            'created_on',
            'domains',
            'primary_domain',
            'price_per_employee',
        ]
        read_only_fields = ['id', 'created_on', 'domains']
        extra_kwargs = {
            'schema_name': {
                'required': True,
                'help_text': 'Nombre del esquema en PostgreSQL (sin espacios, minúsculas)'
            },
        }

    def validate(self, attrs):
        logger.info(f"Validating Tenant Data: {attrs}")
        return super().validate(attrs)
    
    def validate_schema_name(self, value: str) -> str:
        """Valida que el schema_name sea válido para PostgreSQL."""
        # Convertir a minúsculas y reemplazar espacios
        value = value.lower().replace(' ', '_').replace('-', '_')
        
        # Verificar que no sea 'public'
        if value == 'public':
            raise serializers.ValidationError(
                "No puedes usar 'public' como nombre de esquema"
            )
        
        # Verificar que no exista
        if Client.objects.filter(schema_name=value).exists():
            raise serializers.ValidationError(
                f"Ya existe un tenant con el esquema '{value}'"
            )
        
        # Verificar caracteres válidos
        import re
        if not re.match(r'^[a-z][a-z0-9_]*$', value):
            raise serializers.ValidationError(
                "El nombre del esquema debe comenzar con letra y contener solo "
                "letras minúsculas, números y guiones bajos"
            )
        
        return value
    
    def validate_rif(self, value: str) -> str:
        """Valida y normaliza el RIF."""
        value = value.upper().strip()
        
        # Verificar que no exista, excluyendo la instancia actual
        qs = Client.objects.filter(rif=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            raise serializers.ValidationError(
                f"Ya existe un tenant con el RIF '{value}'"
            )
        
        return value
    
    def create(self, validated_data: Dict[str, Any]) -> Client:
        """
        Crea un nuevo tenant con su dominio principal.
        
        El esquema de PostgreSQL se crea automáticamente gracias a
        auto_create_schema = True en el modelo Client.
        """
        primary_domain = validated_data.pop('primary_domain')
        
        # Crear el cliente (esto crea el esquema automáticamente)
        client = Client.objects.create(**validated_data)
        
        # Crear el dominio principal
        Domain.objects.create(
            domain=primary_domain,
            tenant=client,
            is_primary=True
        )
        
        return client
    
    def update(self, instance: Client, validated_data: Dict[str, Any]) -> Client:
        """Actualiza un tenant existente."""
        # No permitir cambiar el schema_name
        validated_data.pop('schema_name', None)
        validated_data.pop('primary_domain', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class ClientCreateSerializer(serializers.Serializer):
    """
    Serializer simplificado para crear tenants.
    
    Ejemplo de uso:
    {
        "name": "Farmacia Central",
        "rif": "J-12345678-9",
        "domain": "central.localhost",
        "email": "admin@farmacia.com"
    }
    """
    
    name = serializers.CharField(max_length=200)
    rif = serializers.CharField(max_length=12)
    domain = serializers.CharField(max_length=253)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    on_trial = serializers.BooleanField(default=True)
    
    def validate_rif(self, value: str) -> str:
        """Valida el formato y unicidad del RIF."""
        import re
        value = value.upper().strip()
        
        if not re.match(r'^[JVEGPC]-\d{8}-\d$', value):
            raise serializers.ValidationError(
                "El RIF debe tener el formato: X-12345678-9"
            )
        
        if Client.objects.filter(rif=value).exists():
            raise serializers.ValidationError(
                f"Ya existe un tenant con el RIF '{value}'"
            )
        
        return value
    
    def validate_domain(self, value: str) -> str:
        """Valida que el dominio no esté en uso."""
        value = value.lower().strip()
        
        # Si no tiene puntos, asumimos que es un subdominio y agregamos el dominio base
        if '.' not in value:
            value = f"{value}.{settings.TENANT_BASE_DOMAIN}"
        
        if Domain.objects.filter(domain=value).exists():
            raise serializers.ValidationError(
                f"El dominio '{value}' ya está en uso"
            )
        
        return value
    
    def create(self, validated_data: Dict[str, Any]) -> Client:
        """Crea el tenant con schema_name generado automáticamente."""
        domain = validated_data.pop('domain')
        
        # Generar schema_name desde el nombre
        import re
        schema_name = validated_data['name'].lower()
        schema_name = re.sub(r'[^a-z0-9]', '_', schema_name)
        schema_name = re.sub(r'_+', '_', schema_name).strip('_')
        
        # Asegurar unicidad
        base_schema = schema_name
        counter = 1
        while Client.objects.filter(schema_name=schema_name).exists():
            schema_name = f"{base_schema}_{counter}"
            counter += 1
        
        # Crear cliente
        client = Client.objects.create(
            schema_name=schema_name,
            **validated_data
        )
        
        # Crear dominio
        Domain.objects.create(
            domain=domain,
            tenant=client,
            is_primary=True
        )
        
        return client


class TenantStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas del sistema de tenants."""
    
    total_tenants = serializers.IntegerField()
    active_tenants = serializers.IntegerField()
    trial_tenants = serializers.IntegerField()
    total_domains = serializers.IntegerField()


class UserManagementSerializer(serializers.Serializer):
    """
    Serializer para creación y edición de usuarios dentro de un tenant.
    """
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    is_staff = serializers.BooleanField(default=False)
    is_superuser = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)
    
    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    roles = serializers.SerializerMethodField(read_only=True)

    def get_roles(self, obj):
        from .auth_serializers import GroupSerializer
        return GroupSerializer(obj.groups.all(), many=True).data

