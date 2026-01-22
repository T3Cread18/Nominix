"""
Servicios relacionados con cálculos salariales y distribución de ingresos.
"""
from decimal import Decimal
from typing import Dict, Optional, Union
from django.core.exceptions import ObjectDoesNotExist

from ..models.organization import Company
from ..models.employee import LaborContract


class SalarySplitter:
    """
    Servicio encargado de desglosar el sueldo total de un contrato
    en sus componentes Salarial (Base) y No Salarial (Bono/Complemento),
    según la estrategia definida por la empresa.
    """

    @staticmethod
    def get_salary_breakdown(contract: LaborContract, exchange_rate: Decimal = None) -> Dict[str, Decimal]:
        """
        Calcula el desglose del salario para un contrato dado.

        Args:
            contract: Instancia de LaborContract.
            exchange_rate: Tasa de cambio USD->VES (opcional, para convertir montos fijos en VES)

        Returns:
            Dict con claves:
                - 'base': Sueldo Base (Impacto Salarial) en USD
                - 'complement': Bono/Complemento (No Salarial) en USD
                - 'total': Total calculado en USD
        """
        # 1. Obtener Sueldo Total Efectivo (en USD)
        total_salary = SalarySplitter._get_effective_total_salary(contract)
        
        # 2. Obtener Configuración de la Empresa
        try:
            company = Company.objects.first()
            if not company:
                return {
                    'base': total_salary,
                    'complement': Decimal('0.00'),
                    'total': total_salary
                }
        except Exception:
            return {
                'base': total_salary,
                'complement': Decimal('0.00'),
                'total': total_salary
            }

        # 3. Obtener datos del cargo
        job_position = contract.job_position
        
        # 4. Aplicar Estrategia
        base_salary = Decimal('0.00')
        complement = Decimal('0.00')
        mode = company.salary_split_mode
        
        if mode == Company.SalarySplitMode.PERCENTAGE:
            # Calcular base como porcentaje del total
            pct = company.split_percentage_base / Decimal('100.00')
            base_salary = total_salary * pct
            complement = total_salary - base_salary
            
        elif mode == Company.SalarySplitMode.FIXED_BASE:
            # Base fija (viene del cargo), resto complemento
            fixed_base = Decimal('0.00')
            if job_position and job_position.split_fixed_amount:
                fixed_base = job_position.split_fixed_amount
                # Si está en VES, convertir a USD para comparar
                if job_position.split_fixed_currency and job_position.split_fixed_currency.code == 'VES':
                    if exchange_rate and exchange_rate > 0:
                        fixed_base = fixed_base / exchange_rate
            
            if total_salary <= fixed_base:
                base_salary = total_salary
                complement = Decimal('0.00')
            else:
                base_salary = fixed_base
                complement = total_salary - base_salary
                
        elif mode == Company.SalarySplitMode.FIXED_BONUS:
            # Complemento fijo (viene del cargo), resto base
            fixed_bonus = Decimal('0.00')
            if job_position and job_position.split_fixed_amount:
                fixed_bonus = job_position.split_fixed_amount
                # Si está en VES, convertir a USD para comparar
                if job_position.split_fixed_currency and job_position.split_fixed_currency.code == 'VES':
                    if exchange_rate and exchange_rate > 0:
                        fixed_bonus = fixed_bonus / exchange_rate
            
            if total_salary <= fixed_bonus:
                complement = total_salary
                base_salary = Decimal('0.00')
            else:
                complement = fixed_bonus
                base_salary = total_salary - fixed_bonus
        
        else:
            # Default fallback (Todo a base)
            base_salary = total_salary
            complement = Decimal('0.00')

        # Redondear a 2 decimales
        return {
            'base': base_salary.quantize(Decimal('0.01')),
            'complement': complement.quantize(Decimal('0.01')),
            'total': total_salary.quantize(Decimal('0.01'))
        }


    @staticmethod
    def _get_effective_total_salary(contract: LaborContract) -> Decimal:
        """Determina el sueldo total a usar para el cálculo."""
        # 1. Override manual en contrato
        if contract.total_salary_override is not None:
             return contract.total_salary_override
        
        # 2. Por defecto del cargo
        if contract.job_position:
            return contract.job_position.default_total_salary
            
        # 3. Fallback a salary_amount (legacy)
        # Nota: salary_amount podría ser quincenal/semanal, 
        # pero aquí asumimos que buscamos el TOTAL MENSUAL de referencia.
        # Usamos la propiedad monthly_salary que ya unifica esto.
        return contract.monthly_salary
