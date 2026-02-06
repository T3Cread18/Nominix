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
import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, TypedDict

from django.utils import timezone

from payroll_core.models import LaborContract, Employee

logger = logging.getLogger(__name__)


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
    def get_policy(company=None):
        """
        Obtiene la política de vacaciones activa de la empresa.
        
        Si no existe una política configurada, retorna un objeto con
        los valores por defecto según LOTTT.
        
        Args:
            company: Instancia de Company (opcional). Si no se provee,
                     usa la empresa principal.
        
        Returns:
            PayrollPolicy o DefaultPolicy con valores LOTTT.
        """
        from payroll_core.models import Company, PayrollPolicy
        
        if company is None:
            company = Company.objects.first()
        
        if company is None:
            # Retornar defaults LOTTT si no hay empresa
            return type('DefaultPolicy', (), {
                'vacation_days_base': DIAS_VACACIONES_BASE,
                'vacation_days_per_year': 1,
                'vacation_days_max': MAX_DIAS_ADICIONALES_VACACIONES,
                'vacation_bonus_days_base': DIAS_BONO_VACACIONAL_BASE,
                'vacation_bonus_days_max': MAX_DIAS_BONO_VACACIONAL,
                'min_service_months': 12,
                'pay_rest_days': True,
                'pay_holidays': True,
            })()
        
        try:
            return company.policy
        except PayrollPolicy.DoesNotExist:
            # Retornar defaults LOTTT si no hay política
            return type('DefaultPolicy', (), {
                'vacation_days_base': DIAS_VACACIONES_BASE,
                'vacation_days_per_year': 1,
                'vacation_days_max': MAX_DIAS_ADICIONALES_VACACIONES,
                'vacation_bonus_days_base': DIAS_BONO_VACACIONAL_BASE,
                'vacation_bonus_days_max': MAX_DIAS_BONO_VACACIONAL,
                'min_service_months': 12,
                'pay_rest_days': True,
                'pay_holidays': True,
            })()

    @staticmethod
    def calculate_entitlement(
        contract: LaborContract,
        calculation_date: Optional[date] = None,
        policy=None
    ) -> VacationEntitlementResult:
        """
        Calcula los días de vacaciones correspondientes según antigüedad.
        
        Utiliza los parámetros configurados en PayrollPolicy. Si no existe
        política, usa valores LOTTT por defecto.
        
        LOTTT Art. 190 (valores por defecto):
        - Año 1: 15 días hábiles
        - Años siguientes: +1 día por año de servicio
        - Máximo adicional: 15 días (Total máximo: 30 días)
        
        Args:
            contract: Contrato laboral del empleado.
            calculation_date: Fecha para el cálculo (default: hoy).
            policy: Política de vacaciones (opcional). Si no se provee,
                    se obtiene de la empresa.
        
        Returns:
            VacationEntitlementResult con el desglose de días.
        
        Ejemplo con LOTTT defaults:
            - 1 año de servicio: 15 días
            - 5 años de servicio: 15 + 4 = 19 días
            - 10 años de servicio: 15 + 9 = 24 días
            - 20 años de servicio: 15 + 15 = 30 días (tope máximo)
        """
        if calculation_date is None:
            calculation_date = timezone.now().date()
        
        # Obtener política de vacaciones
        if policy is None:
            policy = VacationEngine.get_policy()
        
        # Leer parámetros de la política
        base_days_config = getattr(policy, 'vacation_days_base', DIAS_VACACIONES_BASE)
        days_per_year = getattr(policy, 'vacation_days_per_year', 1)
        max_additional = getattr(policy, 'vacation_days_max', MAX_DIAS_ADICIONALES_VACACIONES)
        
        # Obtener años de servicio del empleado
        employee = contract.employee
        years_of_service = employee.seniority_years
        
        # Base: días configurados (solo si tiene al menos 1 año cumplido)
        base_days = base_days_config if years_of_service >= 1 else 0
        
        # Días adicionales por antigüedad (a partir del segundo año)
        if years_of_service <= 1:
            additional_days = 0
        else:
            # Días adicionales = días_por_año × (años - 1), hasta el máximo
            additional_days = min(
                (years_of_service - 1) * days_per_year,
                max_additional
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
        calculation_date: Optional[date] = None,
        policy=None
    ) -> VacationMonetaryResult:
        """
        Calcula los montos de vacaciones y bono vacacional.
        
        Utiliza los parámetros configurados en PayrollPolicy. Si no existe
        política, usa valores LOTTT por defecto.
        
        LOTTT Art. 190 - Salario de Vacaciones:
            Se paga con base en el salario normal del mes anterior.
        
        LOTTT Art. 192 - Bono Vacacional (valores por defecto):
            Fórmula: (15 + (años_servicio - 1)) días de salario normal
            Mínimo: 15 días
            Máximo: 30 días
        
        Args:
            contract: Contrato laboral del empleado.
            days_to_enjoy: Días de vacaciones a disfrutar.
            calculation_date: Fecha para el cálculo (default: hoy).
            policy: Política de vacaciones (opcional). Si no se provee,
                    se obtiene de la empresa.
        
        Returns:
            VacationMonetaryResult con salarios, bonos y totales.
        
        IMPORTANTE:
            - Todos los montos están en Decimal.
            - El salario normal es el salario mensual / 30.
            - NO incluye alícuotas (esas son para Prestaciones Sociales).
        """
        if calculation_date is None:
            calculation_date = timezone.now().date()
        
        # Obtener política de vacaciones
        if policy is None:
            policy = VacationEngine.get_policy()
        
        # Leer parámetros del bono desde la política
        bonus_days_base = getattr(policy, 'vacation_bonus_days_base', DIAS_BONO_VACACIONAL_BASE)
        bonus_days_max = getattr(policy, 'vacation_bonus_days_max', MAX_DIAS_BONO_VACACIONAL)
        
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
        # 3. CALCULAR BONO VACACIONAL (Art. 192) - CONFIGURABLE
        # =================================================================
        # Fórmula: bonus_base + (años_servicio - 1), hasta bonus_max
        if years_of_service <= 1:
            bonus_days = bonus_days_base if years_of_service >= 1 else 0
        else:
            bonus_days = min(
                bonus_days_base + (years_of_service - 1),
                bonus_days_max
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
        from vacations.services.vacation_novelties import count_mondays_in_range
        employee = contract.employee
        years_of_service = employee.seniority_years
        # Variables para compatibilidad de reporte
        base_total_salary = contract.monthly_salary or Decimal('0')
        split_percentage = Decimal('0') # Valor por defecto si no aplica

        if company is None:
            company = CompanyModel.objects.first()

        minimum_salary = company.national_minimum_salary if company else Decimal('130.00')
        tope_ivss = minimum_salary * 5
        
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
        
        # DETECTAR SI EL SALARIO ESTÁ EN VES (Para evitar doble conversión)
        is_ves_salary = False
        
        # Caso 1: Se usa SOLO BASE y la base es VES protegida
        if salary_basis_used == CompanyModel.VacationSalaryBasis.BASE_ONLY:
             if 'base_ves_protected' in salary_breakdown and salary_breakdown['base'] == salary_breakdown['base_ves_protected']:
                 is_ves_salary = True
        
        # Caso 2: Se usa TOTAL (Base + Complemento) o cualquier otro y el total es VES protegido
        else:
             if 'total_ves_protected' in salary_breakdown and salary_breakdown['total'] == salary_breakdown['total_ves_protected']:
                 is_ves_salary = True
        
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
        mondays_count = 0  # Contador de lunes
        
        current_date = start_date
        business_days_counted = 0
        
        # Iterar hasta completar los días hábiles de vacaciones
        while business_days_counted < vacation_days:
            weekday = current_date.weekday()  # 0=Lunes, 5=Sábado, 6=Domingo
            
            if weekday == 0:
                mondays_count += 1
            
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
        
        # --- FIX: Calcular IVSS/RPE/FAOV SIEMPRE en VES ---
        # La norma exige que las deducciones de ley se calculen y reporten en Bolívares.
        deduction_base_ves = deduction_base
        if not is_ves_salary:
            if exchange_rate and exchange_rate > 0:
                deduction_base_ves = (deduction_base * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            else:
                 logger.warning("Calculando deducciones en USD sin tasa de cambio explícita")

        # Aplicar tope en VES para IVSS/RPE
        base_mensual_ivss_ves = min(deduction_base_ves, tope_ivss)
        base_semanal_ivss_ves = (base_mensual_ivss_ves * Decimal('12')) / Decimal('52')
        
        mondays_count = count_mondays_in_range(start_date, end_date)
        
        logger.debug(
            "CÁLCULO DEDUCCIONES - Tope IVSS: %s, Base Original: %s, Base VES: %s, "
            "Base Mensual IVSS (Topeado): %s, Base Semanal IVSS: %s, Lunes: %d, VES Nativo: %s",
            tope_ivss, deduction_base, deduction_base_ves,
            base_mensual_ivss_ves, base_semanal_ivss_ves, mondays_count, is_ves_salary
        )

        # IVSS: 4% (Siempre en VES)
        ivss_rate = Decimal('0.04')
        ivss_amount = (base_semanal_ivss_ves * ivss_rate * mondays_count).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # FAOV: 1% (Siempre en VES)
        faov_rate = Decimal('0.01')
        faov_amount = (deduction_base_ves * faov_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # RPE: 0.5% (Siempre en VES)
        rpe_rate = Decimal('0.005')
        rpe_amount = (base_semanal_ivss_ves * rpe_rate * mondays_count).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        logger.debug(
            "DEDUCCIONES CALCULADAS [VES] - IVSS: %s, FAOV: %s, RPE: %s",
            ivss_amount, faov_amount, rpe_amount
        )
        
        total_deductions_ves = ivss_amount + faov_amount + rpe_amount
        
        # CÁLCULO DEL NETO
        # Debemos restar las deducciones (que están en VES) del Bruto (que puede estar en USD)
        if is_ves_salary:
            # Todo es VES
            gross_total_ves = gross_total
            net_total = gross_total - total_deductions_ves
            # Para consistencia en output
            total_deductions = total_deductions_ves 
        else:
            # Nómina en USD: Convertir deducciones a USD solo para la resta
            deduction_impact_usd = Decimal('0.00')
            if exchange_rate and exchange_rate > 0:
                deduction_impact_usd = (total_deductions_ves / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            net_total = gross_total - deduction_impact_usd
            
            # En el objeto de respuesta, 'total_deductions' será el valor en VES (mixed currency display)
            # Ojo: esto puede causar confusión si se suman las columnas visualmente, 
            # pero cumple "No conversiones en deducciones".
            total_deductions = total_deductions_ves

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
- Lunes en el período: {mondays_count}

SALARIO BASE:
- Salario Mensual: {monthly_salary:,.2f} {'(VES)' if is_ves_salary else '(USD)'}
- Salario Diario: {daily_salary:,.2f}

DEVENGADOS:
- Días de Vacaciones: {vacation_days} × {daily_salary:,.2f} = {vacation_amount:,.2f}
- Días de Descanso: {rest_days} × {daily_salary:,.2f} = {rest_amount:,.2f}
- Días Feriados: {holiday_days} × {daily_salary:,.2f} = {holiday_amount:,.2f}
- Bono Vacacional: {bonus_days} × {daily_salary:,.2f} = {bonus_amount:,.2f}
- TOTAL BRUTO: {gross_total:,.2f}

DEDUCCIONES (En Bolívares - VES):
- Base Deducciones: {deduction_base_ves:,.2f} Bs.
- Tope IVSS Aplicado: {min(deduction_base_ves, tope_ivss):,.2f} Bs.
- IVSS (4%): {ivss_amount:,.2f} Bs.
- FAOV (1%): {faov_amount:,.2f} Bs.
- RPE (0.5%): {rpe_amount:,.2f} Bs.
- TOTAL DEDUCCIONES: {total_deductions_ves:,.2f} Bs.

NETO A PAGAR: {net_total:,.2f} {'(USD)' if not is_ves_salary else '(VES)'}
(Deducciones convertidas a divisa para el neto si aplica)
""".strip()
        
        # =====================================================================
        # 8. GENERAR TRAZAS ESTRUCTURADAS
        # =====================================================================
        # Helper para estructurar valores monetarios para que el frontend los convierta/formatee
        def money(val, force_currency=None):
            return {
                'type': 'money',
                'amount': float(val),
                'currency': force_currency # Si es None, frontend usa moneda de la vista (con conversión)
            }
            
        def val(v):
            return str(v)

        traces = {
            'daily_salary': {
                'formula': 'Salario Mensual / 30',
                'values': {
                    'Salario Mensual': money(monthly_salary),
                    'Divisor': val(30)
                },
                'result': money(daily_salary)
            },
            'vacation_amount': {
                'formula': f'{vacation_days} días * Salario Diario',
                'values': {
                    'Días': val(vacation_days),
                    'Salario Diario': money(daily_salary)
                },
                'result': money(vacation_amount)
            },
            'rest_amount': {
                'formula': f'{rest_days} días * Salario Diario',
                'values': {
                    'Días': val(rest_days),
                    'Salario Diario': money(daily_salary)
                },
                'result': money(rest_amount)
            },
            'holiday_amount': {
                'formula': f'{holiday_days} días * Salario Diario',
                'values': {
                    'Días': val(holiday_days),
                    'Salario Diario': money(daily_salary)
                },
                'result': money(holiday_amount)
            },
            'bonus_amount': {
                'formula': f'{bonus_days} días * Salario Diario',
                'values': {
                    'Días': val(bonus_days),
                    'Salario Diario': money(daily_salary)
                },
                'result': money(bonus_amount)
            },
            # Para deducciones, forzamos moneda VES porque el cálculo fue estricto en Bs.
            'ivss_amount': {
                'formula': '((Base Mensual VES * 12) / 52) * 4% * Lunes',
                'values': {
                    'Base Mensual VES': money(base_mensual_ivss_ves, 'VES'),
                    'Tope IVSS': money(tope_ivss, 'VES'),
                    'Lunes': val(mondays_count),
                    'Porcentaje': val('4%')
                },
                'result': money(ivss_amount, 'VES')
            },
            'faov_amount': {
                'formula': 'Base Deducciones VES * 1%',
                'values': {
                    'Base Deducciones VES': money(deduction_base_ves, 'VES'),
                    'Porcentaje': val('1%')
                },
                'result': money(faov_amount, 'VES')
            },
            'rpe_amount': {
                'formula': '((Base Mensual VES * 12) / 52) * 0.5% * Lunes',
                'values': {
                    'Base Mensual VES': money(base_mensual_ivss_ves, 'VES'),
                    'Lunes': val(mondays_count),
                    'Porcentaje': val('0.5%')
                },
                'result': money(rpe_amount, 'VES')
            }
        }
        
        result = {
            'traces': traces,
            
            # Salario
            'daily_salary': daily_salary,
            'monthly_salary': monthly_salary,
            'base_total_salary': base_total_salary,
            'currency': 'VES' if is_ves_salary else 'USD',
            
            # Configuración usada
            'salary_basis_used': salary_basis_used,
            'split_percentage': split_percentage,
            
            # Días
            'vacation_days': vacation_days,
            'rest_days': rest_days,
            'holiday_days': holiday_days,
            'mondays_count': mondays_count,
            'bonus_days': bonus_days,
            
            # Montos devengados
            'vacation_amount': vacation_amount,
            'rest_amount': rest_amount,
            'holiday_amount': holiday_amount,
            'bonus_amount': bonus_amount,
            'gross_total': gross_total,
            
            # Deducciones (ESTAS ESTÁN EN VES AHORA)
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
        # 8. AGREGAR CONVERSIÓN O MAPE DIRECTO
        # =====================================================================
        # =====================================================================
        # 9. RESULTADO FINAL
        # =====================================================================
        
        # 1. Asignar valores base según moneda salarial
        if is_ves_salary:
            # Origen VES: Llenar campos _ves (Siempre)
            result['daily_salary_ves'] = daily_salary
            result['monthly_salary_ves'] = monthly_salary
            result['base_total_salary_ves'] = base_total_salary
            
            result['gross_total_ves'] = gross_total
            # result['total_deductions_ves'] = total_deductions_ves # Ya calculado arriba explícitamente
            result['net_total_ves'] = net_total
            
            result['vacation_amount_ves'] = vacation_amount
            result['rest_amount_ves'] = rest_amount
            result['holiday_amount_ves'] = holiday_amount
            result['bonus_amount_ves'] = bonus_amount
            
            # Deducciones ya vienen en VES por defecto en la lógica anterior
            result['ivss_amount_ves'] = ivss_amount
            result['faov_amount_ves'] = faov_amount
            result['rpe_amount_ves'] = rpe_amount
            result['total_deductions_ves'] = total_deductions_ves
            
        else:
            # Origen USD: Llenar campos _usd (Siempre)
            # Nota: 'daily_salary' etc están en USD
            result['daily_salary_usd'] = daily_salary
            result['monthly_salary_usd'] = monthly_salary
            result['base_total_salary_usd'] = base_total_salary
            
            result['gross_total_usd'] = gross_total
            result['net_total_usd'] = net_total
            
            result['vacation_amount_usd'] = vacation_amount
            result['rest_amount_usd'] = rest_amount
            result['holiday_amount_usd'] = holiday_amount
            result['bonus_amount_usd'] = bonus_amount

            # Las deducciones siempre se calcularon en VES, así que asignamos _ves directamente
            result['ivss_amount_ves'] = ivss_amount
            result['faov_amount_ves'] = faov_amount
            result['rpe_amount_ves'] = rpe_amount
            result['total_deductions_ves'] = total_deductions_ves


        # 2. Conversiones (Si hay tasa)
        if exchange_rate and exchange_rate > 0:
            result['exchange_rate'] = exchange_rate
            
            if is_ves_salary:
                # VES -> USD
                result['daily_salary_usd'] = (daily_salary / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['monthly_salary_usd'] = (monthly_salary / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['base_total_salary_usd'] = (base_total_salary / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                result['gross_total_usd'] = (gross_total / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['net_total_usd'] = (net_total / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                # Desglose en USD (referencial)
                # Deducciones en USD (referencial)
                deduction_impact_usd = (total_deductions_ves / exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
            else:
                # USD -> VES
                result['daily_salary_ves'] = (daily_salary * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['monthly_salary_ves'] = (monthly_salary * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['base_total_salary_ves'] = (base_total_salary * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                result['gross_total_ves'] = (gross_total * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                # Desglose VES
                result['vacation_amount_ves'] = (vacation_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['rest_amount_ves'] = (rest_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['holiday_amount_ves'] = (holiday_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                result['bonus_amount_ves'] = (bonus_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                # NETO Total en VES = Gross(VES) - Deductions(VES)
                result['net_total_ves'] = result['gross_total_ves'] - result['total_deductions_ves']

        
        return result
