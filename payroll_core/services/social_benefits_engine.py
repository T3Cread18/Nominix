"""
Motor de Cálculo de Prestaciones Sociales (LOTTT Art. 142).

Este módulo proporciona funciones puras para:
- Calcular el salario integral (Art. 122 LOTTT)
- Procesar abonos trimestrales de garantía
- Procesar días adicionales por antigüedad
- Calcular intereses sobre saldo acumulado
- Simular liquidación final comparando Garantía vs Retroactivo

IMPORTANTE: Este motor usa EXACTAMENTE los campos definidos en el modelo
SocialBenefitsLedger: basis_days, daily_salary_used, amount, balance.
"""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, TypedDict
from django.db.models import Sum
from django.utils import timezone

from ..models import (
    Employee,
    LaborContract,
    SocialBenefitsLedger,
    SocialBenefitsSettlement,
    InterestRateBCV,
)


# =============================================================================
# TYPE DEFINITIONS
# =============================================================================

class ComprehensiveSalaryResult(TypedDict):
    """Resultado del cálculo de salario integral."""
    monthly_salary: Decimal
    daily_salary: Decimal
    aliquot_utilidades: Decimal
    aliquot_bono_vacacional: Decimal
    daily_salary_integral: Decimal


class SettlementComparison(TypedDict):
    """Resultado de la comparación de liquidación."""
    # Método A: Garantía (Art. 142 literal c)
    total_garantia: Decimal
    total_dias_adicionales: Decimal
    total_intereses: Decimal
    total_anticipos: Decimal
    net_garantia: Decimal
    
    # Método B: Retroactivo (Art. 142 literal d)
    years_of_service: Decimal
    retroactive_days: Decimal
    final_daily_salary: Decimal
    retroactive_amount: Decimal
    
    # Resultado
    chosen_method: str  # 'GARANTIA' o 'RETROACTIVO'
    settlement_amount: Decimal
    calculation_summary: str


# =============================================================================
# CONSTANTES LOTTT
# =============================================================================

# Días de utilidades mínimos por ley (Art. 131)
DIAS_UTILIDADES_MINIMO = Decimal('30')

# Días de bono vacacional mínimo (Art. 192)
DIAS_BONO_VACACIONAL_BASE = Decimal('15')

# Días de garantía por trimestre (Art. 142)
DIAS_GARANTIA_TRIMESTRE = Decimal('15')

# Días adicionales por año de antigüedad (Art. 142)
DIAS_ADICIONALES_POR_ANIO = Decimal('2')

# Máximo de días adicionales por año
MAX_DIAS_ADICIONALES_ANIO = Decimal('30')

# Días retroactivos por año (Art. 142 literal d)
DIAS_RETROACTIVO_POR_ANIO = Decimal('30')


# =============================================================================
# CÁLCULOS SALARIALES
# =============================================================================

def calculate_comprehensive_salary(
    contract: LaborContract,
    calculation_date: Optional[date] = None,
    dias_utilidades: Optional[Decimal] = None,
    dias_bono_vacacional: Optional[Decimal] = None,
) -> ComprehensiveSalaryResult:
    """
    Calcula el Salario Integral Diario según Art. 122 LOTTT.
    
    Salario Integral = Salario Normal + Alícuota Utilidades + Alícuota Bono Vacacional
    
    Args:
        contract: Contrato laboral del empleado.
        calculation_date: Fecha para el cálculo (default: hoy).
        dias_utilidades: Días de utilidades (default: 30 mínimo legal).
        dias_bono_vacacional: Días de bono vacacional (default: 15 mínimo legal).
    
    Returns:
        ComprehensiveSalaryResult con el desglose del salario integral.
    """
    if calculation_date is None:
        calculation_date = timezone.now().date()
    
    # Usar valores por defecto legales si no se especifican
    if dias_utilidades is None:
        dias_utilidades = DIAS_UTILIDADES_MINIMO
    if dias_bono_vacacional is None:
        dias_bono_vacacional = DIAS_BONO_VACACIONAL_BASE
    
    # 1. Obtener salario mensual del contrato
    monthly_salary = contract.monthly_salary
    if monthly_salary is None or monthly_salary <= Decimal('0'):
        monthly_salary = Decimal('0')
    
    # 2. Calcular salario diario normal
    daily_salary = (monthly_salary / Decimal('30')).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    
    # 3. Calcular Alícuota de Utilidades
    # Fórmula: (Salario Mensual * Días Utilidades) / 360
    aliquot_utilidades = (
        (monthly_salary * dias_utilidades) / Decimal('360')
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # 4. Calcular Alícuota de Bono Vacacional
    # Fórmula: (Salario Mensual * Días Bono Vacacional) / 360
    aliquot_bono_vacacional = (
        (monthly_salary * dias_bono_vacacional) / Decimal('360')
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # 5. Calcular Salario Integral Diario
    daily_salary_integral = (
        daily_salary + aliquot_utilidades + aliquot_bono_vacacional
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    return ComprehensiveSalaryResult(
        monthly_salary=monthly_salary,
        daily_salary=daily_salary,
        aliquot_utilidades=aliquot_utilidades,
        aliquot_bono_vacacional=aliquot_bono_vacacional,
        daily_salary_integral=daily_salary_integral,
    )


# =============================================================================
# PROCESAMIENTO DE GARANTÍA TRIMESTRAL
# =============================================================================

def get_current_balance(employee: Employee) -> Decimal:
    """
    Obtiene el saldo actual de prestaciones sociales del empleado.
    
    Returns:
        El balance del último registro del ledger, o 0 si no hay registros.
    """
    last_entry = SocialBenefitsLedger.objects.filter(
        employee=employee
    ).order_by('-transaction_date', '-created_at').first()
    
    if last_entry:
        return last_entry.balance
    return Decimal('0.00')


def process_quarterly_guarantee(
    contract: LaborContract,
    transaction_date: date,
    period_description: str,
    created_by: str = 'SYSTEM',
    ip_address: Optional[str] = None,
    notes: str = '',
) -> SocialBenefitsLedger:
    """
    Procesa el abono trimestral de garantía de prestaciones (Art. 142 LOTTT).
    
    Cada trimestre se abonan 15 días de salario integral.
    
    Args:
        contract: Contrato laboral vigente.
        transaction_date: Fecha del abono.
        period_description: Descripción del trimestre (ej: "Q1-2026").
        created_by: Usuario o proceso que crea el registro.
        ip_address: Dirección IP origen.
        notes: Observaciones adicionales.
    
    Returns:
        El registro SocialBenefitsLedger creado.
    """
    employee = contract.employee
    
    # 1. Calcular salario integral
    salary_result = calculate_comprehensive_salary(contract, transaction_date)
    daily_salary_used = salary_result['daily_salary_integral']
    
    # 2. Constante: 15 días por trimestre
    basis_days = DIAS_GARANTIA_TRIMESTRE
    
    # 3. Calcular monto
    amount = (basis_days * daily_salary_used).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    
    # 4. Obtener saldo anterior
    previous_balance = get_current_balance(employee)
    
    # 5. Calcular nuevo balance
    new_balance = previous_balance + amount
    
    # 6. Crear registro en el ledger
    ledger_entry = SocialBenefitsLedger(
        employee=employee,
        contract=contract,
        transaction_type=SocialBenefitsLedger.TransactionType.GARANTIA,
        transaction_date=transaction_date,
        period_description=period_description,
        # Snapshot de auditoría
        basis_days=basis_days,
        daily_salary_used=daily_salary_used,
        previous_balance=previous_balance,
        # Campos financieros
        amount=amount,
        balance=new_balance,
        # Trazabilidad del cálculo
        calculation_formula='basis_days * daily_salary_used',
        calculation_trace=f'{basis_days} * {daily_salary_used} = {amount}',
        # Auditoría
        created_by=created_by,
        ip_address=ip_address,
        notes=notes,
    )
    ledger_entry.save()
    
    return ledger_entry


# =============================================================================
# PROCESAMIENTO DE DÍAS ADICIONALES
# =============================================================================

def calculate_additional_days(years_of_service: int) -> Decimal:
    """
    Calcula los días adicionales por antigüedad (Art. 142 LOTTT).
    
    Después del primer año de servicio, el trabajador tiene derecho a 
    2 días adicionales por cada año, hasta un máximo de 30 días por año.
    
    Args:
        years_of_service: Años completos de antigüedad.
    
    Returns:
        Días adicionales correspondientes.
    """
    if years_of_service <= 1:
        return Decimal('0')
    
    # 2 días por cada año después del primero
    additional_years = years_of_service - 1
    days = DIAS_ADICIONALES_POR_ANIO * additional_years
    
    # Tope máximo: 30 días adicionales
    return min(days, MAX_DIAS_ADICIONALES_ANIO)


def process_annual_additional_days(
    contract: LaborContract,
    transaction_date: date,
    period_description: str,
    created_by: str = 'SYSTEM',
    ip_address: Optional[str] = None,
    notes: str = '',
) -> Optional[SocialBenefitsLedger]:
    """
    Procesa los días adicionales por antigüedad (Art. 142 LOTTT).
    
    A partir del segundo año de servicio, se abonan 2 días adicionales
    por cada año de antigüedad (acumulativo hasta 30 días).
    
    Args:
        contract: Contrato laboral vigente.
        transaction_date: Fecha del abono.
        period_description: Descripción del período (ej: "Año 2025").
        created_by: Usuario o proceso que crea el registro.
        ip_address: Dirección IP origen.
        notes: Observaciones adicionales.
    
    Returns:
        El registro SocialBenefitsLedger creado, o None si no corresponden días.
    """
    employee = contract.employee
    
    # 1. Calcular años de antigüedad
    years_of_service = employee.seniority_years
    
    # 2. Calcular días adicionales
    basis_days = calculate_additional_days(years_of_service)
    
    # Si no corresponden días adicionales, no crear registro
    if basis_days <= Decimal('0'):
        return None
    
    # 3. Calcular salario integral
    salary_result = calculate_comprehensive_salary(contract, transaction_date)
    daily_salary_used = salary_result['daily_salary_integral']
    
    # 4. Calcular monto
    amount = (basis_days * daily_salary_used).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    
    # 5. Obtener saldo anterior
    previous_balance = get_current_balance(employee)
    
    # 6. Calcular nuevo balance
    new_balance = previous_balance + amount
    
    # 7. Crear registro en el ledger
    ledger_entry = SocialBenefitsLedger(
        employee=employee,
        contract=contract,
        transaction_type=SocialBenefitsLedger.TransactionType.DIAS_ADIC,
        transaction_date=transaction_date,
        period_description=period_description,
        # Snapshot de auditoría
        basis_days=basis_days,
        daily_salary_used=daily_salary_used,
        previous_balance=previous_balance,
        # Campos financieros
        amount=amount,
        balance=new_balance,
        # Trazabilidad del cálculo
        calculation_formula='basis_days * daily_salary_used',
        calculation_trace=(
            f'Años: {years_of_service}, Días adicionales: {basis_days}, '
            f'{basis_days} * {daily_salary_used} = {amount}'
        ),
        # Auditoría
        created_by=created_by,
        ip_address=ip_address,
        notes=notes or f'Antigüedad: {years_of_service} años',
    )
    ledger_entry.save()
    
    return ledger_entry


# =============================================================================
# PROCESAMIENTO DE INTERESES
# =============================================================================

def process_annual_interest(
    contract: LaborContract,
    transaction_date: date,
    year: int,
    created_by: str = 'SYSTEM',
    ip_address: Optional[str] = None,
    notes: str = '',
) -> Optional[SocialBenefitsLedger]:
    """
    Procesa los intereses anuales sobre el saldo acumulado (Art. 143 LOTTT).
    
    Los intereses se calculan con la tasa activa promedio del BCV.
    
    Args:
        contract: Contrato laboral vigente.
        transaction_date: Fecha del abono.
        year: Año para el cual se calculan los intereses.
        created_by: Usuario o proceso que crea el registro.
        ip_address: Dirección IP origen.
        notes: Observaciones adicionales.
    
    Returns:
        El registro SocialBenefitsLedger creado, o None si no hay saldo.
    """
    employee = contract.employee
    
    # 1. Obtener saldo actual
    previous_balance = get_current_balance(employee)
    
    if previous_balance <= Decimal('0'):
        return None
    
    # 2. Obtener tasa de interés promedio del año
    rates = InterestRateBCV.objects.filter(year=year)
    if not rates.exists():
        # Sin tasas registradas, no se puede calcular
        return None
    
    # Calcular tasa promedio anual
    avg_rate = rates.aggregate(avg=Sum('rate') / rates.count())['avg']
    if avg_rate is None:
        avg_rate = Decimal('0')
    
    interest_rate_used = avg_rate
    
    # 3. Calcular interés anual
    # Fórmula: saldo * (tasa / 100)
    amount = (previous_balance * (interest_rate_used / Decimal('100'))).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    
    if amount <= Decimal('0'):
        return None
    
    # 4. Calcular nuevo balance
    new_balance = previous_balance + amount
    
    # 5. Para intereses, daily_salary_used no aplica directamente
    # Pero el campo es requerido, usamos 0 o el saldo como referencia
    salary_result = calculate_comprehensive_salary(contract, transaction_date)
    daily_salary_used = salary_result['daily_salary_integral']
    
    # 6. Crear registro en el ledger
    ledger_entry = SocialBenefitsLedger(
        employee=employee,
        contract=contract,
        transaction_type=SocialBenefitsLedger.TransactionType.INTERES,
        transaction_date=transaction_date,
        period_description=f'Intereses Año {year}',
        # Snapshot de auditoría
        basis_days=Decimal('0'),  # No aplica para intereses
        daily_salary_used=daily_salary_used,
        interest_rate_used=interest_rate_used,
        previous_balance=previous_balance,
        # Campos financieros
        amount=amount,
        balance=new_balance,
        # Trazabilidad del cálculo
        calculation_formula='previous_balance * (interest_rate / 100)',
        calculation_trace=(
            f'{previous_balance} * ({interest_rate_used} / 100) = {amount}'
        ),
        # Auditoría
        created_by=created_by,
        ip_address=ip_address,
        notes=notes or f'Tasa promedio BCV {year}: {interest_rate_used}%',
    )
    ledger_entry.save()
    
    return ledger_entry


# =============================================================================
# LIQUIDACIÓN FINAL
# =============================================================================

def calculate_final_settlement(
    contract: LaborContract,
    termination_date: date,
) -> SettlementComparison:
    """
    Calcula la liquidación final de prestaciones sociales (Art. 142 LOTTT).
    
    Compara dos métodos:
    - Método A (literal c): Garantía acumulada + días adicionales + intereses - anticipos
    - Método B (literal d): 30 días * años de antigüedad (retroactivo)
    
    El trabajador tiene derecho a recibir EL MAYOR de los dos montos.
    
    Args:
        contract: Contrato laboral que termina.
        termination_date: Fecha de terminación de la relación laboral.
    
    Returns:
        SettlementComparison con el desglose y resultado de la comparación.
    """
    employee = contract.employee
    
    # =========================================================================
    # MÉTODO A: GARANTÍA (Art. 142 literal c)
    # =========================================================================
    
    # Sumar todos los movimientos por tipo
    ledger_totals = SocialBenefitsLedger.objects.filter(
        employee=employee
    ).exclude(
        transaction_type=SocialBenefitsLedger.TransactionType.LIQUIDACION
    ).exclude(
        transaction_type=SocialBenefitsLedger.TransactionType.REVERSAL
    ).values('transaction_type').annotate(
        total=Sum('amount')
    )
    
    totals_dict = {item['transaction_type']: item['total'] or Decimal('0') 
                   for item in ledger_totals}
    
    total_garantia = totals_dict.get(
        SocialBenefitsLedger.TransactionType.GARANTIA, Decimal('0')
    )
    total_dias_adicionales = totals_dict.get(
        SocialBenefitsLedger.TransactionType.DIAS_ADIC, Decimal('0')
    )
    total_intereses = totals_dict.get(
        SocialBenefitsLedger.TransactionType.INTERES, Decimal('0')
    )
    total_anticipos = abs(totals_dict.get(
        SocialBenefitsLedger.TransactionType.ANTICIPO, Decimal('0')
    ))
    
    # Neto Garantía = Garantía + Días Adicionales + Intereses - Anticipos
    net_garantia = (
        total_garantia + total_dias_adicionales + total_intereses - total_anticipos
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # =========================================================================
    # MÉTODO B: RETROACTIVO (Art. 142 literal d)
    # =========================================================================
    
    # Calcular años de servicio
    hire_date = employee.hire_date
    if hire_date:
        delta = termination_date - hire_date
        years_of_service = Decimal(delta.days) / Decimal('365')
    else:
        years_of_service = Decimal('0')
    
    # Días retroactivos = 30 días * años de servicio
    retroactive_days = (DIAS_RETROACTIVO_POR_ANIO * years_of_service).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    
    # Salario integral al momento de terminar
    salary_result = calculate_comprehensive_salary(contract, termination_date)
    final_daily_salary = salary_result['daily_salary_integral']
    
    # Monto retroactivo = días * salario integral diario
    retroactive_amount = (retroactive_days * final_daily_salary).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    
    # =========================================================================
    # COMPARACIÓN: EL MAYOR
    # =========================================================================
    
    if net_garantia >= retroactive_amount:
        chosen_method = SocialBenefitsSettlement.ChosenMethod.GARANTIA
        settlement_amount = net_garantia
    else:
        chosen_method = SocialBenefitsSettlement.ChosenMethod.RETROACTIVO
        settlement_amount = retroactive_amount
    
    # Generar resumen del cálculo
    calculation_summary = f"""
LIQUIDACIÓN DE PRESTACIONES SOCIALES (Art. 142 LOTTT)
======================================================
Empleado: {employee.full_name} ({employee.national_id})
Fecha Ingreso: {hire_date}
Fecha Egreso: {termination_date}
Años de Servicio: {years_of_service:.2f}

MÉTODO A - GARANTÍA (Art. 142 literal c):
-----------------------------------------
Total Garantía Trimestral:  {total_garantia:>12,.2f}
Total Días Adicionales:     {total_dias_adicionales:>12,.2f}
Total Intereses:            {total_intereses:>12,.2f}
(-) Anticipos Otorgados:    {total_anticipos:>12,.2f}
                            ----------------
NETO GARANTÍA:              {net_garantia:>12,.2f}

MÉTODO B - RETROACTIVO (Art. 142 literal d):
--------------------------------------------
Años de Servicio:           {years_of_service:.2f}
Días Retroactivos (30*años): {retroactive_days:.2f}
Salario Integral Diario:    {final_daily_salary:>12,.2f}
                            ----------------
MONTO RETROACTIVO:          {retroactive_amount:>12,.2f}

RESULTADO:
----------
Método Seleccionado: {chosen_method}
MONTO A PAGAR:       {settlement_amount:>12,.2f}
""".strip()
    
    return SettlementComparison(
        # Método A
        total_garantia=total_garantia,
        total_dias_adicionales=total_dias_adicionales,
        total_intereses=total_intereses,
        total_anticipos=total_anticipos,
        net_garantia=net_garantia,
        # Método B
        years_of_service=years_of_service.quantize(Decimal('0.01')),
        retroactive_days=retroactive_days,
        final_daily_salary=final_daily_salary,
        retroactive_amount=retroactive_amount,
        # Resultado
        chosen_method=chosen_method,
        settlement_amount=settlement_amount,
        calculation_summary=calculation_summary,
    )


def create_settlement_record(
    contract: LaborContract,
    termination_date: date,
    created_by: str,
    created_ip: Optional[str] = None,
    notes: str = '',
) -> SocialBenefitsSettlement:
    """
    Crea el registro de liquidación final en la base de datos.
    
    Args:
        contract: Contrato laboral que termina.
        termination_date: Fecha de terminación.
        created_by: Usuario que crea el registro.
        created_ip: IP del usuario.
        notes: Observaciones adicionales.
    
    Returns:
        El registro SocialBenefitsSettlement creado.
    """
    employee = contract.employee
    
    # Calcular la comparación
    comparison = calculate_final_settlement(contract, termination_date)
    
    # Crear registro de liquidación
    settlement = SocialBenefitsSettlement(
        contract=contract,
        # Snapshot del empleado
        employee_national_id=employee.national_id,
        employee_full_name=employee.full_name,
        hire_date=employee.hire_date,
        termination_date=termination_date,
        # Método A - Garantía
        total_garantia=comparison['total_garantia'],
        total_dias_adicionales=comparison['total_dias_adicionales'],
        total_intereses=comparison['total_intereses'],
        total_anticipos=comparison['total_anticipos'],
        net_garantia=comparison['net_garantia'],
        # Método B - Retroactivo
        years_of_service=comparison['years_of_service'],
        retroactive_days=comparison['retroactive_days'],
        final_daily_salary=comparison['final_daily_salary'],
        retroactive_amount=comparison['retroactive_amount'],
        # Resultado
        chosen_method=comparison['chosen_method'],
        settlement_amount=comparison['settlement_amount'],
        calculation_summary=comparison['calculation_summary'],
        # Estado y auditoría
        settlement_date=termination_date,
        status=SocialBenefitsSettlement.SettlementStatus.CALCULATED,
        created_by=created_by,
        created_ip=created_ip,
        notes=notes,
    )
    settlement.save()
    
    return settlement
