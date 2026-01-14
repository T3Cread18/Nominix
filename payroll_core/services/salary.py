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
    def get_salary_breakdown(contract: LaborContract) -> Dict[str, Decimal]:
        """
        Calcula el desglose del salario para un contrato dado.

        Args:
            contract: Instancia de LaborContract.

        Returns:
            Dict con claves:
                - 'base': Sueldo Base (Impacto Salarial)
                - 'complement': Bono/Complemento (No Salarial)
                - 'total': Total calculado
        """
        # 1. Obtener Sueldo Total Efectivo
        total_salary = SalarySplitter._get_effective_total_salary(contract)
        
        # 2. Obtener Configuración de la Empresa
        try:
            # Asumimos que estamos en el contexto del tenant correcto
            company = Company.objects.first()
            if not company:
                # Fallback seguro si no hay config
                return {
                    'base': total_salary,
                    'complement': Decimal('0.00'),
                    'total': total_salary
                }
        except Exception:
            # Error defensivo
            return {
                'base': total_salary,
                'complement': Decimal('0.00'),
                'total': total_salary
            }

        # 3. Aplicar Estrategia
        base_salary = Decimal('0.00')
        complement = Decimal('0.00')
        
        mode = company.salary_split_mode
        
        if mode == Company.SalarySplitMode.PERCENTAGE:
            # Calcular base como porcentaje del total
            pct = company.split_percentage_base / Decimal('100.00')
            base_salary = total_salary * pct
            complement = total_salary - base_salary
            
        elif mode == Company.SalarySplitMode.FIXED_BASE:
            # Base fija, resto complemento
            fixed_base = company.split_fixed_amount
            
            if total_salary <= fixed_base:
                base_salary = total_salary
                complement = Decimal('0.00')
            else:
                base_salary = fixed_base
                complement = total_salary - base_salary
                
        elif mode == Company.SalarySplitMode.FIXED_BONUS:
            # Complemento fijo, resto base
            fixed_bonus = company.split_fixed_amount
            
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
