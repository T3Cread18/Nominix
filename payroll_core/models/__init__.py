"""
Payroll Core Models Package.

Este paquete contiene los modelos divididos por dominio:
- currency: Currency, ExchangeRate
- organization: Branch, Department, Company
- employee: Employee, LaborContract
- concepts: PayrollConcept, EmployeeConcept
- payroll: PayrollPeriod, Payslip, PayslipDetail, PayrollNovelty
"""

# Importar desde módulos individuales
from .base import tenant_upload_path
from .currency import Currency, ExchangeRate
from .organization import Branch, Department, Company
from .employee import Employee, LaborContract
from .concepts import PayrollConcept, EmployeeConcept
from .payroll import PayrollPeriod, Payslip, PayslipDetail, PayrollNovelty
from .loans import Loan, LoanPayment

# Exponer todos los modelos a nivel de paquete para compatibilidad
__all__ = [
    # Utilities
    'tenant_upload_path',
    # Currency
    'Currency',
    'ExchangeRate',
    # Organization
    'Branch',
    'Department',
    'Company',
    # Employee
    'Employee',
    'LaborContract',
    # Concepts
    'PayrollConcept',
    'EmployeeConcept',
    # Payroll
    'PayrollPeriod',
    'Payslip',
    'PayslipDetail',
    'PayrollNovelty',
    # Loans
    'Loan',
    'LoanPayment',
]
