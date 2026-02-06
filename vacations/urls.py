# -*- coding: utf-8 -*-
"""
URLs del módulo de Vacaciones.
"""
from rest_framework.routers import DefaultRouter
from .views import VacationRequestViewSet, VacationBalanceViewSet, HolidayViewSet

router = DefaultRouter()
router.register(r'vacations', VacationRequestViewSet, basename='vacation-request')
router.register(r'vacation-balance', VacationBalanceViewSet, basename='vacation-balance')
router.register(r'holidays', HolidayViewSet, basename='holiday')

urlpatterns = router.urls
