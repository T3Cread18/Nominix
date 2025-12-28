"""
Configuración del Admin para la app Customers.

Proporciona interfaces de administración para gestionar
clientes (inquilinos) y sus dominios asociados.
"""
from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Client, Domain
from typing import Tuple, List


class DomainInline(admin.TabularInline):
    """
    Inline para gestionar dominios desde el admin del Cliente.
    
    Permite agregar/editar dominios directamente desde la
    página de edición del cliente.
    """
    model = Domain
    extra: int = 1
    max_num: int = 5
    verbose_name = 'Dominio'
    verbose_name_plural = 'Dominios'


@admin.register(Client)
class ClientAdmin(TenantAdminMixin, admin.ModelAdmin):
    """
    Administrador del modelo Client.
    
    Utiliza TenantAdminMixin para integración correcta con django-tenants.
    """
    
    list_display: Tuple[str, ...] = (
        'name',
        'rif', 
        'schema_name',
        'created_on',
        'on_trial',
        'paid_until'
    )
    
    list_filter: Tuple[str, ...] = (
        'on_trial',
        'created_on',
    )
    
    search_fields: Tuple[str, ...] = (
        'name',
        'rif',
        'email',
        'schema_name'
    )
    
    readonly_fields: Tuple[str, ...] = (
        'created_on',
        'schema_name',
    )
    
    ordering: Tuple[str, ...] = ('name',)
    
    inlines: List = [DomainInline]
    
    fieldsets = (
        ('Información Principal', {
            'fields': ('name', 'rif', 'schema_name')
        }),
        ('Contacto', {
            'fields': ('email', 'phone', 'address'),
            'classes': ('collapse',)
        }),
        ('Suscripción', {
            'fields': ('on_trial', 'paid_until'),
        }),
        ('Información del Sistema', {
            'fields': ('created_on',),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        El schema_name no debe ser editable después de creado.
        """
        if obj:  # Editando un objeto existente
            return self.readonly_fields + ('rif',)
        return self.readonly_fields


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    """
    Administrador del modelo Domain.
    
    Permite gestionar los dominios asociados a cada inquilino.
    """
    
    list_display: Tuple[str, ...] = (
        'domain',
        'tenant',
        'is_primary',
    )
    
    list_filter: Tuple[str, ...] = (
        'is_primary',
        'tenant',
    )
    
    search_fields: Tuple[str, ...] = (
        'domain',
        'tenant__name',
        'tenant__rif',
    )
    
    ordering: Tuple[str, ...] = ('domain',)
    
    raw_id_fields: Tuple[str, ...] = ('tenant',)
