"""
URLs para la app payroll_core.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LatestExchangeRateView,
    EmployeeViewSet, BranchViewSet, LaborContractViewSet,
    CurrencyViewSet, PayrollConceptViewSet, EmployeeConceptViewSet,
    PayrollPeriodViewSet, PayrollReceiptViewSet, PayrollNoveltyViewSet,
    CompanyConfigView, DepartmentViewSet, LoanViewSet, LoanPaymentViewSet,
    PayrollVariablesView, ValidateFormulaView, JobPositionViewSet,
    ConceptConfigMetadataView, PayrollPolicyView,
    # Social Benefits
    SocialBenefitsViewSet, InterestRateBCVViewSet, ExchangeRateViewSet,
    # Endowments
    EndowmentEventViewSet,
    # Import Views
    ImportFieldsView, ImportPreviewView, ImportValidateView, ImportExecuteView
)
from .views.import_views import ImportTemplateView
from .views.export_views import (
    IVSSExportView, FAOVExportView, ISLRXMLExportView,
    LPPSSCalculateView, INCESCalculateView,
    ConstanciaTrabajoView, PayrollExcelReportView,
    EndowmentSizesExportView
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
router.register(r'payslips', PayrollReceiptViewSet, basename='payslip')

router.register(r'payroll-novelties', PayrollNoveltyViewSet, basename='payroll-novelty')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'job-positions', JobPositionViewSet, basename='job-position')
# Loan Routes
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'loan-payments', LoanPaymentViewSet, basename='loan-payment')
# Social Benefits Routes
router.register(r'social-benefits', SocialBenefitsViewSet, basename='social-benefits')
router.register(r'bcv-rates', InterestRateBCVViewSet, basename='bcv-rate')
router.register(r'exchange-rates', ExchangeRateViewSet, basename='exchange-rate')
router.register(r'endowments', EndowmentEventViewSet, basename='endowment')



urlpatterns = [
    # Template Route (Separate - moved to top to avoid conflicts)
    path('templates/<str:model_key>/', ImportTemplateView.as_view(), name='import-template'),

    path('company/config/', CompanyConfigView.as_view(), name='company-config'),
    path('company/policies/', PayrollPolicyView.as_view(), name='payroll-policy'),
    path('concepts/config-metadata/', ConceptConfigMetadataView.as_view(), name='concept-config-metadata'),
    path('exchange-rates/latest/', LatestExchangeRateView.as_view(), name='latest-rate'),
    path('', include(router.urls)),
    path('payroll/variables/', PayrollVariablesView.as_view(), name='payroll-variables'),
    path('payroll/validate-formula/', ValidateFormulaView.as_view(), name='validate-formula'),
    
    # Import Routes
    path('import/preview/', ImportPreviewView.as_view(), name='import-preview'),
    path('import/<str:model_key>/fields/', ImportFieldsView.as_view(), name='import-fields'),
    path('import/<str:model_key>/validate/', ImportValidateView.as_view(), name='import-validate'),
    path('import/<str:model_key>/execute/', ImportExecuteView.as_view(), name='import-execute'),
    path('import/<str:model_key>/execute/', ImportExecuteView.as_view(), name='import-execute'),
    
    # Government Exports & Declarations
    path('exports/ivss/', IVSSExportView.as_view(), name='export-ivss'),
    path('exports/faov/', FAOVExportView.as_view(), name='export-faov'),
    path('exports/islr-xml/', ISLRXMLExportView.as_view(), name='export-islr-xml'),
    path('exports/endowment-sizes/', EndowmentSizesExportView.as_view(), name='export-endowment-sizes'),
    path('declarations/lppss/calculate/', LPPSSCalculateView.as_view(), name='lppss-calculate'),
    path('declarations/inces/calculate/', INCESCalculateView.as_view(), name='inces-calculate'),
    
    # Reports
    path('reports/constancia-trabajo/<int:employee_id>/', ConstanciaTrabajoView.as_view(), name='constancia-trabajo'),
    path('reports/excel/<int:period_id>/', PayrollExcelReportView.as_view(), name='payroll-excel-report'),

]
