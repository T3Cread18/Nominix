"""
URLs para la app payroll_core.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LatestExchangeRateView,
    EmployeeViewSet, BranchViewSet, LaborContractViewSet,
    CurrencyViewSet, PayrollConceptViewSet, EmployeeConceptViewSet,
    PayrollPeriodViewSet, PayslipReadOnlyViewSet, PayrollNoveltyViewSet,
    CompanyConfigView, DepartmentViewSet, LoanViewSet, LoanPaymentViewSet,
    PayrollVariablesView, ValidateFormulaView, JobPositionViewSet
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
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'job-positions', JobPositionViewSet, basename='job-position')
# Loan Routes
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'loan-payments', LoanPaymentViewSet, basename='loan-payment')

urlpatterns = [
    path('', include(router.urls)),
    path('company/config/', CompanyConfigView.as_view(), name='company-config'),
    path('exchange-rates/latest/', LatestExchangeRateView.as_view(), name='latest-rate'),
    path('payroll/variables/', PayrollVariablesView.as_view(), name='payroll-variables'),
    path('payroll/validate-formula/', ValidateFormulaView.as_view(), name='validate-formula'),
]
