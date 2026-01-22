"""
Servicios de la aplicación Payroll Core.
"""
from .currency import SalaryConverter, BCVRateService, CurrencyNotFoundError, ExchangeRateNotFoundError
from .employee import EmployeeService
from .payroll import PayrollProcessor
from .social_benefits_engine import (
    calculate_comprehensive_salary,
    process_quarterly_guarantee,
    process_annual_additional_days,
    process_annual_interest,
    calculate_final_settlement,
    create_settlement_record,
    get_current_balance,
)

__all__ = [
    'SalaryConverter',
    'BCVRateService',
    'CurrencyNotFoundError',
    'ExchangeRateNotFoundError',
    'EmployeeService',
    'PayrollProcessor',
    # Social Benefits Engine
    'calculate_comprehensive_salary',
    'process_quarterly_guarantee',
    'process_annual_additional_days',
    'process_annual_interest',
    'calculate_final_settlement',
    'create_settlement_record',
    'get_current_balance',
]

