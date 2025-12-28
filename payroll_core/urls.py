"""
URLs para la app payroll_core.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, BranchViewSet, LaborContractViewSet,
    CurrencyViewSet, PayrollConceptViewSet, EmployeeConceptViewSet,
    PayrollPeriodViewSet, PayslipReadOnlyViewSet, PayrollNoveltyViewSet
)

app_name = 'payroll_core'

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'contracts', LaborContractViewSet, basename='contract')
router.register(r'currencies', CurrencyViewSet, basename='currency')
router.register(r'payroll-concepts', PayrollConceptViewSet, basename='payroll-concept')
router.register(r'employee-concepts', EmployeeConceptViewSet, basename='employee-concept')
router.register(r'payroll-periods', PayrollPeriodViewSet, basename='payroll-period')
router.register(r'payslips', PayslipReadOnlyViewSet, basename='payslip')
router.register(r'payroll-novelties', PayrollNoveltyViewSet, basename='payroll-novelty')

urlpatterns = [
    path('', include(router.urls)),
]
