# -*- coding: utf-8 -*-
"""
Motor de Cálculos de Vacaciones - LOTTT Venezuela

Este módulo implementa los cálculos de vacaciones según la
Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT).

REFERENCIAS LEGALES:

Art. 190 LOTTT - Vacaciones:
    "Cuando el trabajador cumpla un año de trabajo ininterrumpido para un
    patrono, disfrutará de un período de vacaciones remuneradas de quince
    días hábiles. Los años sucesivos tendrá derecho además a un día
    adicional remunerado por cada año de servicio, hasta un máximo de
    quince días hábiles adicionales, para un total de treinta días hábiles."

Art. 192 LOTTT - Bono Vacacional:
    "Los patronos pagarán al trabajador en la oportunidad de sus vacaciones,
    además del salario correspondiente, una bonificación especial para su
    disfrute equivalente a un mínimo de quince días de salario normal más
    un día por cada año de servicio hasta un total de treinta días de
    salario normal."

NOTA IMPORTANTE:
    Todos los cálculos monetarios usan Decimal para precisión exacta.
    NUNCA usar float para cálculos de nómina.
"""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, TypedDict

from django.utils import timezone

from payroll_core.models import LaborContract, Employee


# =============================================================================
# TYPE DEFINITIONS
# =============================================================================

class VacationEntitlementResult(TypedDict):
    """Resultado del cálculo de días de vacaciones."""
    years_of_service: int
    base_days: int        # 15 días base
    additional_days: int  # Días adicionales por antigüedad
    total_days: int       # Total de días correspondientes


class VacationMonetaryResult(TypedDict):
    """Resultado del cálculo monetario de vacaciones."""
    # Salarios base
    monthly_salary: Decimal
    daily_salary: Decimal
    
    # Vacaciones (Art. 190)
    vacation_days: int
    salary_amount: Decimal
    
    # Bono Vacacional (Art. 192)
    bonus_days: int
    bonus_amount: Decimal
    
    # Totales
    total: Decimal
    
    # Trazabilidad
    calculation_trace: str


# =============================================================================
# CONSTANTES LOTTT
# =============================================================================

# Art. 190: Días base de vacaciones (primer año)
DIAS_VACACIONES_BASE: int = 15

# Art. 190: Máximo de días adicionales por antigüedad
MAX_DIAS_ADICIONALES_VACACIONES: int = 15

# Art. 190: Total máximo de días de vacaciones
MAX_DIAS_VACACIONES_TOTAL: int = 30

# Art. 192: Días base de bono vacacional
DIAS_BONO_VACACIONAL_BASE: int = 15

# Art. 192: Máximo de días de bono vacacional
MAX_DIAS_BONO_VACACIONAL: int = 30


# =============================================================================
# MOTOR DE CÁLCULOS
# =============================================================================

class VacationEngine:
    """
    Motor de cálculos de vacaciones según LOTTT.
    
    Esta clase proporciona métodos estáticos para calcular:
    - Días de vacaciones correspondientes por antigüedad
    - Montos de salario de vacaciones y bono vacacional
    
    Ejemplo de uso:
        >>> from vacations.services import VacationEngine
        >>> contract = LaborContract.objects.get(pk=1)
        >>> entitlement = VacationEngine.calculate_entitlement(contract)
        >>> print(f"Días correspondientes: {entitlement['total_days']}")
        >>> 
        >>> monetary = VacationEngine.calculate_monetary_values(contract, 15)
        >>> print(f"Total a pagar: {monetary['total']}")
    """
    
    @staticmethod
    def calculate_entitlement(
        contract: LaborContract,
        calculation_date: Optional[date] = None
    ) -> VacationEntitlementResult:
        """
        Calcula los días de vacaciones correspondientes según antigüedad.
        
        LOTTT Art. 190:
        - Año 1: 15 días hábiles
        - Años siguientes: +1 día por año de servicio
        - Máximo adicional: 15 días (Total máximo: 30 días)
        
        Args:
            contract: Contrato laboral del empleado.
            calculation_date: Fecha para el cálculo (default: hoy).
        
        Returns:
            VacationEntitlementResult con el desglose de días.
        
        Ejemplo:
            - 1 año de servicio: 15 días
            - 5 años de servicio: 15 + 4 = 19 días
            - 10 años de servicio: 15 + 9 = 24 días
            - 20 años de servicio: 15 + 15 = 30 días (tope máximo)
        """
        if calculation_date is None:
            calculation_date = timezone.now().date()
        
        # Obtener años de servicio del empleado
        employee = contract.employee
        years_of_service = employee.seniority_years
        
        # Base: 15 días (solo si tiene al menos 1 año cumplido)
        base_days = DIAS_VACACIONES_BASE if years_of_service >= 1 else 0
        
        # Días adicionales por antigüedad (a partir del segundo año)
        if years_of_service <= 1:
            additional_days = 0
        else:
            # 1 día por cada año después del primero
            additional_days = min(
                years_of_service - 1,
                MAX_DIAS_ADICIONALES_VACACIONES
            )
        
        total_days = base_days + additional_days
        
        return VacationEntitlementResult(
            years_of_service=years_of_service,
            base_days=base_days,
            additional_days=additional_days,
            total_days=total_days
        )
    
    @staticmethod
    def calculate_monetary_values(
        contract: LaborContract,
        days_to_enjoy: int,
        calculation_date: Optional[date] = None
    ) -> VacationMonetaryResult:
        """
        Calcula los montos de vacaciones y bono vacacional.
        
        LOTTT Art. 190 - Salario de Vacaciones:
            Se paga con base en el salario normal del mes anterior.
        
        LOTTT Art. 192 - Bono Vacacional:
            Fórmula: (15 + (años_servicio - 1)) días de salario normal
            Mínimo: 15 días
            Máximo: 30 días
        
        Args:
            contract: Contrato laboral del empleado.
            days_to_enjoy: Días de vacaciones a disfrutar.
            calculation_date: Fecha para el cálculo (default: hoy).
        
        Returns:
            VacationMonetaryResult con salarios, bonos y totales.
        
        IMPORTANTE:
            - Todos los montos están en Decimal.
            - El salario normal es el salario mensual / 30.
            - NO incluye alícuotas (esas son para Prestaciones Sociales).
        """
        if calculation_date is None:
            calculation_date = timezone.now().date()
        
        employee = contract.employee
        years_of_service = employee.seniority_years
        
        # =================================================================
        # 1. OBTENER SALARIO NORMAL
        # =================================================================
        # Usamos el salario mensual del contrato
        monthly_salary = contract.monthly_salary
        if monthly_salary is None or monthly_salary <= Decimal('0'):
            monthly_salary = Decimal('0')
        
        # Salario diario normal = Mensual / 30
        daily_salary = (monthly_salary / Decimal('30')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # =================================================================
        # 2. CALCULAR SALARIO DE VACACIONES (Art. 190)
        # =================================================================
        vacation_days = days_to_enjoy
        salary_amount = (daily_salary * Decimal(str(vacation_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # =================================================================
        # 3. CALCULAR BONO VACACIONAL (Art. 192)
        # =================================================================
        # Fórmula: 15 + (años_servicio - 1), mínimo 15, máximo 30
        if years_of_service <= 1:
            bonus_days = DIAS_BONO_VACACIONAL_BASE if years_of_service >= 1 else 0
        else:
            bonus_days = min(
                DIAS_BONO_VACACIONAL_BASE + (years_of_service - 1),
                MAX_DIAS_BONO_VACACIONAL
            )
        
        bonus_amount = (daily_salary * Decimal(str(bonus_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # =================================================================
        # 4. CALCULAR TOTAL
        # =================================================================
        total = salary_amount + bonus_amount
        
        # =================================================================
        # 5. GENERAR TRAZA DE CÁLCULO
        # =================================================================
        calculation_trace = f"""
CÁLCULO DE VACACIONES (LOTTT Art. 190 y 192)
=============================================
Empleado: {employee.full_name}
Años de Servicio: {years_of_service}
Fecha Cálculo: {calculation_date}

SALARIO BASE:
- Salario Mensual: {monthly_salary:,.2f}
- Salario Diario Normal: {daily_salary:,.2f}

SALARIO DE VACACIONES (Art. 190):
- Días a Disfrutar: {vacation_days}
- Monto: {vacation_days} días × {daily_salary:,.2f} = {salary_amount:,.2f}

BONO VACACIONAL (Art. 192):
- Fórmula: 15 + ({years_of_service} - 1) = {bonus_days} días (máx. 30)
- Monto: {bonus_days} días × {daily_salary:,.2f} = {bonus_amount:,.2f}

TOTAL A PAGAR: {total:,.2f}
""".strip()
        
        return VacationMonetaryResult(
            monthly_salary=monthly_salary,
            daily_salary=daily_salary,
            vacation_days=vacation_days,
            salary_amount=salary_amount,
            bonus_days=bonus_days,
            bonus_amount=bonus_amount,
            total=total,
            calculation_trace=calculation_trace
        )
    
    @staticmethod
    def get_employee_vacation_summary(employee: Employee) -> Dict:
        """
        Obtiene un resumen completo del estado vacacional de un empleado.
        
        Incluye:
        - Días correspondientes por antigüedad
        - Saldo actual (días disponibles)
        - Días disfrutados
        
        Args:
            employee: Instancia de Employee
        
        Returns:
            Diccionario con el resumen vacacional
        """
        from vacations.models import VacationBalance
        
        # Obtener contrato activo
        contract = employee.contracts.filter(is_active=True).first()
        
        if not contract:
            return {
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'error': 'No tiene contrato activo',
                'entitled_days': 0,
                'balance': 0,
                'used_days': 0,
            }
        
        # Calcular días correspondientes
        entitlement = VacationEngine.calculate_entitlement(contract)
        
        # Obtener saldo del kardex
        balance = VacationBalance.get_balance(employee)
        
        # Calcular días usados (suma de USAGE, valor absoluto)
        from django.db.models import Sum
        used_result = VacationBalance.objects.filter(
            employee=employee,
            transaction_type=VacationBalance.TransactionType.USAGE
        ).aggregate(total=Sum('days'))
        used_days = abs(used_result['total'] or 0)
        
        return {
            'employee_id': employee.id,
            'employee_name': employee.full_name,
            'years_of_service': entitlement['years_of_service'],
            'entitled_days': entitlement['total_days'],
            'balance': balance,
            'used_days': used_days,
            'available_days': balance,
        }
    
    @staticmethod
    def calculate_complete_payment(
        contract: LaborContract,
        start_date: date,
        days_to_enjoy: int,
        holidays: Optional[list] = None,
        company = None,
        exchange_rate: Decimal = None
    ) -> Dict:
        """
        Calcula el pago COMPLETO de vacaciones incluyendo días de descanso,
        feriados y deducciones de ley.
        
        BRECHA CRÍTICA RESUELTA:
        La LOTTT requiere pagar el PERÍODO COMPLETO incluyendo fines de semana
        y feriados que caigan dentro del período vacacional.
        
        Args:
            contract: Contrato laboral del empleado.
            start_date: Fecha de inicio de vacaciones.
            days_to_enjoy: Días hábiles de vacaciones a disfrutar.
            holidays: Lista opcional de fechas feriadas (si no se provee, se cargan de BD).
            company: Instancia de Company con configuración de vacaciones. Si None, usa total.
            exchange_rate: Tasa de cambio USD->VES para conversión dual.
        
        Returns:
            Dict con desglose completo: días, montos, deducciones, neto.
        
        Ejemplo:
            10 días hábiles de vacaciones pueden incluir 4 días de descanso
            (2 fines de semana) = 14 días calendario total a pagar.
        """
        from datetime import timedelta
        from vacations.models import Holiday
        from payroll_core.models import Company as CompanyModel
        from payroll_core.services.salary import SalarySplitter
        
        employee = contract.employee
        years_of_service = employee.seniority_years
        
        # Variables para compatibilidad de reporte
        base_total_salary = contract.monthly_salary or Decimal('0')
        split_percentage = Decimal('0') # Valor por defecto si no aplica
        
        # =====================================================================
        # 1. OBTENER SALARIO MENSUAL SEGÚN CONFIGURACIÓN (REFACTORIZADO)
        # =====================================================================
        # Usar servicio centralizado para desglose salarial (soporta FIXED_BASE, PERCENTAGE, etc.)
        salary_breakdown = SalarySplitter.get_salary_breakdown(contract, exchange_rate)
        
        # Determinar qué base salarial usar según configuración de vacación
        salary_basis_used = 'BASE_PLUS_COMPLEMENT'
        if company:
            salary_basis_used = company.vacation_salary_basis
        
        if salary_basis_used == CompanyModel.VacationSalaryBasis.BASE_ONLY:
            # Solo sueldo base (del desglose calculado por SalarySplitter)
            monthly_salary = salary_breakdown.get('base', Decimal('0.00'))
        else:
            # Paquete completo (TOTAL calculado por SalarySplitter, que incluye base + complemento)
            monthly_salary = salary_breakdown.get('total', Decimal('0.00'))
            
            # Fallback de seguridad por si el total es 0 pero hay override
            if monthly_salary == 0 and contract.total_salary_override:
                monthly_salary = contract.total_salary_override
        
        daily_salary = (monthly_salary / Decimal('30')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # =====================================================================
        # 2. CARGAR FERIADOS SI NO SE PROVEEN
        # =====================================================================
        if holidays is None:
            holiday_dates = set(
                Holiday.objects.filter(
                    date__year=start_date.year
                ).values_list('date', flat=True)
            )
            # También cargar del año siguiente si el período cruza años
            holiday_dates.update(
                Holiday.objects.filter(
                    date__year=start_date.year + 1
                ).values_list('date', flat=True)
            )
        else:
            holiday_dates = set(holidays)
        
        # =====================================================================
        # 3. CALCULAR PERÍODO CALENDARIO Y DÍAS DE DESCANSO/FERIADOS
        # =====================================================================
        vacation_days = days_to_enjoy
        rest_days = 0  # Sábados y Domingos
        holiday_days = 0  # Feriados nacionales
        
        current_date = start_date
        business_days_counted = 0
        
        # Iterar hasta completar los días hábiles de vacaciones
        while business_days_counted < vacation_days:
            weekday = current_date.weekday()  # 0=Lunes, 5=Sábado, 6=Domingo
            
            if weekday in (5, 6):  # Fin de semana
                rest_days += 1
            elif current_date in holiday_dates:  # Feriado
                holiday_days += 1
            else:  # Día hábil
                business_days_counted += 1
            
            current_date += timedelta(days=1)
        
        # end_date es el último día de vacaciones
        end_date = current_date - timedelta(days=1)
        
        # Calcular fecha de retorno (siguiente día hábil después de end_date)
        return_date = current_date
        while return_date.weekday() in (5, 6) or return_date in holiday_dates:
            return_date += timedelta(days=1)
        
        # =====================================================================
        # 4. CALCULAR BONO VACACIONAL (Art. 192)
        # =====================================================================
        if years_of_service <= 1:
            bonus_days = DIAS_BONO_VACACIONAL_BASE if years_of_service >= 1 else 0
        else:
            bonus_days = min(
                DIAS_BONO_VACACIONAL_BASE + (years_of_service - 1),
                MAX_DIAS_BONO_VACACIONAL
            )
        
        # =====================================================================
        # 5. CALCULAR MONTOS
        # =====================================================================
        vacation_amount = (daily_salary * Decimal(str(vacation_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        rest_amount = (daily_salary * Decimal(str(rest_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        holiday_amount = (daily_salary * Decimal(str(holiday_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        bonus_amount = (daily_salary * Decimal(str(bonus_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        gross_total = vacation_amount + rest_amount + holiday_amount + bonus_amount
        
        # =====================================================================
        # 6. CALCULAR DEDUCCIONES
        # =====================================================================
        # Base para deducciones: salario de vacaciones + días de descanso
        # (No se deducen sobre el bono vacacional)
        deduction_base = vacation_amount + rest_amount + holiday_amount
        
        # IVSS: 4% (aporte del trabajador)
        ivss_rate = Decimal('0.04')
        ivss_amount = (deduction_base * ivss_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # FAOV (BANAVIH): 1%
        faov_rate = Decimal('0.01')
        faov_amount = (deduction_base * faov_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # RPE (Régimen Prestacional de Empleo): 0.5%
        rpe_rate = Decimal('0.005')
        rpe_amount = (deduction_base * rpe_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        total_deductions = ivss_amount + faov_amount + rpe_amount
        net_total = gross_total - total_deductions
        
        # =====================================================================
        # 7. GENERAR TRAZA DE CÁLCULO
        # =====================================================================
        calculation_trace = f"""
CÁLCULO COMPLETO DE VACACIONES (LOTTT Art. 190-194)
====================================================
Empleado: {employee.full_name}
Cédula: {employee.national_id}
Antigüedad: {years_of_service} años

PERÍODO VACACIONAL:
- Fecha Inicio: {start_date.strftime('%d/%m/%Y')}
- Fecha Fin: {end_date.strftime('%d/%m/%Y')}
- Fecha Retorno: {return_date.strftime('%d/%m/%Y')}

SALARIO BASE:
- Salario Mensual: {monthly_salary:,.2f}
- Salario Diario: {daily_salary:,.2f}

DEVENGADOS:
- Días de Vacaciones: {vacation_days} × {daily_salary:,.2f} = {vacation_amount:,.2f}
- Días de Descanso: {rest_days} × {daily_salary:,.2f} = {rest_amount:,.2f}
- Días Feriados: {holiday_days} × {daily_salary:,.2f} = {holiday_amount:,.2f}
- Bono Vacacional: {bonus_days} × {daily_salary:,.2f} = {bonus_amount:,.2f}
- TOTAL BRUTO: {gross_total:,.2f}

DEDUCCIONES (Base: {deduction_base:,.2f}):
- IVSS (4%): {ivss_amount:,.2f}
- FAOV (1%): {faov_amount:,.2f}
- RPE (0.5%): {rpe_amount:,.2f}
- TOTAL DEDUCCIONES: {total_deductions:,.2f}

NETO A PAGAR: {net_total:,.2f}
""".strip()
        
        result = {
            # Salario
            'daily_salary': daily_salary,
            'monthly_salary': monthly_salary,
            'base_total_salary': base_total_salary,
            'currency': 'USD',
            
            # Configuración usada
            'salary_basis_used': salary_basis_used,
            'split_percentage': split_percentage,
            
            # Días
            'vacation_days': vacation_days,
            'rest_days': rest_days,
            'holiday_days': holiday_days,
            'bonus_days': bonus_days,
            
            # Montos devengados
            'vacation_amount': vacation_amount,
            'rest_amount': rest_amount,
            'holiday_amount': holiday_amount,
            'bonus_amount': bonus_amount,
            'gross_total': gross_total,
            
            # Deducciones
            'deduction_base': deduction_base,
            'ivss_amount': ivss_amount,
            'faov_amount': faov_amount,
            'rpe_amount': rpe_amount,
            'total_deductions': total_deductions,
            
            # Neto
            'net_total': net_total,
            
            # Fechas
            'start_date': start_date,
            'end_date': end_date,
            'return_date': return_date,
            
            # Trazabilidad
            'calculation_trace': calculation_trace,
            'years_of_service': years_of_service,
        }
        
        # =====================================================================
        # 8. AGREGAR CONVERSIÓN A BOLÍVARES SI HAY TASA
        # =====================================================================
        if exchange_rate and exchange_rate > 0:
            result['exchange_rate'] = exchange_rate
            result['daily_salary_ves'] = (daily_salary * exchange_rate).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            result['gross_total_ves'] = (gross_total * exchange_rate).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            result['total_deductions_ves'] = (total_deductions * exchange_rate).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            result['net_total_ves'] = (net_total * exchange_rate).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            
            # Desglose VES
            result['vacation_amount_ves'] = (vacation_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            result['rest_amount_ves'] = (rest_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            result['holiday_amount_ves'] = (holiday_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            result['bonus_amount_ves'] = (bonus_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            result['ivss_amount_ves'] = (ivss_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            result['faov_amount_ves'] = (faov_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            result['rpe_amount_ves'] = (rpe_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return result
