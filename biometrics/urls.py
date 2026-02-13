"""
URLs para el módulo de biometría.

Registra todos los endpoints REST bajo /api/biometric/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'device-types', views.BiometricDeviceTypeViewSet, basename='biometric-device-types')
router.register(r'devices', views.BiometricDeviceViewSet, basename='biometric-devices')
router.register(r'events', views.AttendanceEventViewSet, basename='biometric-events')
router.register(r'mappings', views.EmployeeDeviceMappingViewSet, basename='biometric-mappings')
router.register(r'daily-attendance', views.DailyAttendanceViewSet, basename='daily-attendance')

urlpatterns = [
    path('', include(router.urls)),
]
