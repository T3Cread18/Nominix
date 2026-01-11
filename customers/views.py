"""
Views para la app Customers.

Define los endpoints de la API REST para gestión de tenants.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import connection
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from typing import Any

from .models import Client, Domain
from .serializers import (
    ClientSerializer, 
    ClientCreateSerializer,
    DomainSerializer,
    TenantStatsSerializer
)
from .auth_serializers import LoginSerializer, UserSerializer
import logging

logger = logging.getLogger(__name__)


class IsPublicSchemaPermission(permissions.BasePermission):
    """
    Permiso que solo permite acceso desde el esquema público.
    
    La gestión de tenants solo debe hacerse desde el tenant público.
    """
    message = "La gestión de tenants solo está disponible desde el dominio principal"
    
    def has_permission(self, request, view) -> bool:
        # Verificar que estamos en el schema público
        return connection.schema_name == 'public'


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de Clientes/Tenants.
    """
    def update(self, request, *args, **kwargs):
        logger.info(f"Update Tenant Request Data: {request.data}")
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error updating tenant: {e}")
            raise e
    

    
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublicSchemaPermission]
    
    def get_queryset(self):
        """Excluir el tenant público de la lista."""
        return Client.objects.exclude(schema_name='public')
    
    def get_serializer_class(self):
        """Usar serializer simplificado para crear."""
        if self.action == 'create':
            return ClientCreateSerializer
        return ClientSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Crear un nuevo tenant.
        
        Ejemplo de request:
        ```json
        {
            "name": "Farmacia Central",
            "rif": "J-12345678-9",
            "domain": "central.localhost",
            "email": "admin@farmacia.com"
        }
        ```
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            client = serializer.save()
            
            # Retornar con el serializer completo
            output_serializer = ClientSerializer(client)
            return Response(
                {
                    'message': f"Tenant '{client.name}' creado exitosamente",
                    'tenant': output_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Eliminar un tenant y su esquema de PostgreSQL.
        
        
        ADVERTENCIA: Esta acción es irreversible.
        """
        instance = self.get_object()
        schema_name = instance.schema_name
        tenant_name = instance.name
        
        # No permitir eliminar el tenant público
        if schema_name == 'public':
            return Response(
                {'error': 'No puedes eliminar el tenant público'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Eliminar dominios primero
            Domain.objects.filter(tenant=instance).delete()
            
            # Eliminar el cliente
            instance.delete()
            
            # Eliminar el esquema de PostgreSQL
            with connection.cursor() as cursor:
                cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            
            return Response(
                {'message': f"Tenant '{tenant_name}' eliminado completamente"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtener estadísticas del sistema de tenants.
        
        GET /api/tenants/stats/
        """
        tenants = Client.objects.exclude(schema_name='public')
        
        stats = {
            'total_tenants': tenants.count(),
            'active_tenants': tenants.filter(on_trial=False).count(),
            'trial_tenants': tenants.filter(on_trial=True).count(),
            'total_domains': Domain.objects.exclude(tenant__schema_name='public').count(),
        }
        
        serializer = TenantStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_domain(self, request, pk=None):
        """
        Agregar un dominio a un tenant existente.
        
        POST /api/tenants/{id}/add_domain/
        ```json
        {
            "domain": "otro.localhost",
            "is_primary": false
        }
        ```
        """
        client = self.get_object()
        domain_name = request.data.get('domain')
        is_primary = request.data.get('is_primary', False)
        
        if not domain_name:
            return Response(
                {'error': 'El campo "domain" es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que no exista
        if Domain.objects.filter(domain=domain_name).exists():
            return Response(
                {'error': f"El dominio '{domain_name}' ya está en uso"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si es primario, desactivar otros
        if is_primary:
            Domain.objects.filter(tenant=client, is_primary=True).update(is_primary=False)
        
        domain = Domain.objects.create(
            domain=domain_name,
            tenant=client,
            is_primary=is_primary
        )
        
        serializer = DomainSerializer(domain)
        return Response(
            {
                'message': f"Dominio '{domain_name}' agregado",
                'domain': serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['delete'])
    def remove_domain(self, request, pk=None):
        """
        Eliminar un dominio de un tenant.
        
        DELETE /api/tenants/{id}/remove_domain/?domain=ejemplo.localhost
        """
        client = self.get_object()
        domain_name = request.query_params.get('domain')
        
        if not domain_name:
            return Response(
                {'error': 'El parámetro "domain" es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            domain = Domain.objects.get(domain=domain_name, tenant=client)
        except Domain.DoesNotExist:
            return Response(
                {'error': f"No se encontró el dominio '{domain_name}'"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # No permitir eliminar si es el único dominio
        if Domain.objects.filter(tenant=client).count() == 1:
            return Response(
                {'error': 'No puedes eliminar el único dominio del tenant'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        domain.delete()
        
        return Response(
            {'message': f"Dominio '{domain_name}' eliminado"},
            status=status.HTTP_200_OK
        )


    @action(detail=True, methods=['get'])
    def deep_stats(self, request, pk=None):
        """
        Obtener estadísticas profundas de un tenant específico.
        Requiere cambiar al esquema del tenant para consultar sus tablas.
        
        GET /api/tenants/{id}/deep_stats/
        """
        client = self.get_object()
        schema = client.schema_name
        
        from django_tenants.utils import schema_context
        from payroll_core.models import Employee
        
        try:
            with schema_context(schema):
                active_employees = Employee.objects.filter(is_active=True).count()
                total_employees = Employee.objects.count()
                
                deep_data = {
                    'active_employees': active_employees,
                    'total_employees': total_employees,
                }
                
            return Response(deep_data)
        except Exception as e:
            return Response(
                {'error': f'Error accediendo al esquema {schema}: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def renew_subscription(self, request, pk=None):
        """
        Renovar suscripción del tenant.
        
        POST /api/tenants/{id}/renew/
        Body: {"months": 1} (default 1)
        """
        client = self.get_object()
        months = int(request.data.get('months', 1))
        
        from datetime import date
        from dateutil.relativedelta import relativedelta
        
        current_date = client.paid_until or date.today()
        if current_date < date.today():
            current_date = date.today()
            
        new_date = current_date + relativedelta(months=months)
        client.paid_until = new_date
        client.on_trial = False
        client.save()
        
        serializer = self.get_serializer(client)
        return Response({
            'message': f'Suscripción renovada hasta {new_date}',
            'tenant': serializer.data
        })


class TenantInfoView(APIView):
    """
    Vista para obtener información del tenant actual.
    
    GET /api/tenant-info/
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Retorna información del tenant actual basado en el dominio."""
        current_schema = connection.schema_name
        
        try:
            client = Client.objects.get(schema_name=current_schema)
            serializer = ClientSerializer(client)
            return Response({
                'schema': current_schema,
                'tenant': serializer.data
            })
        except Client.DoesNotExist:
            return Response({
                'schema': current_schema,
                'tenant': None
            })


class AuthView(viewsets.ViewSet):
    """
    Vista para manejo de autenticación (Login/Logout/Status).
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Inicia sesión en el tenant actual.
        POST /api/auth/login/
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = authenticate(
            request, 
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        
        if user:
            login(request, user)
            return Response(UserSerializer(user).data)
        
        return Response(
            {'error': 'Credenciales inválidas'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Cierra la sesión actual.
        POST /api/auth/logout/
        """
        logout(request)
        return Response({'message': 'Sesión cerrada exitosamente'})

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Retorna el usuario actual.
        GET /api/auth/me/
        """
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        return Response(
            {'error': 'No autenticado'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
