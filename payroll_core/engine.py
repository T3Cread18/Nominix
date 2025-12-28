"""
Motor de Cálculo de Nómina.

Implementa la lógica central para calcular asignaciones y deducciones.
Convierte monedas y ejecuta fórmulas según el modelo PayrollConcept.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Union, Tuple
from datetime import date
from .models import PayrollConcept, LaborContract, Currency, ExchangeRate
from .formulas import FORMULA_REGISTRY

class PayrollEngine:
    """
    Motor de cálculo de conceptos de nómina.
    
    Responsable de:
    1. Interpretar el método de cálculo (FIJO, PORCENTAJE, FÓRMULA).
    2. Realizar conversiones de moneda usando la tasa del día.
    3. Retornar montos finales en Bolívares (VES).
    """
    
    def __init__(
        self, 
        contract: LaborContract, 
        payment_date: date, 
        exchange_rate: Optional[ExchangeRate] = None,
        input_variables: Optional[dict] = None
    ):
        """
        Inicializa el motor para un contrato específico.
        
        Args:
            contract: Contrato laboral del empleado.
            payment_date: Fecha de pago (para buscar tasas si no se proveen).
            exchange_rate: Objeto ExchangeRate opcional. Si es None, se busca el más reciente.
            input_variables: Diccionario de novedades (horas extra, faltas, etc.).
        """
        self.contract = contract
        self.payment_date = payment_date
        self.exchange_rate = exchange_rate
        self.input_variables = input_variables or {}
        
        # Cache de salarios convertidos para optimización
        self._cached_salary_ves: Optional[Decimal] = None

    def _get_exchange_rate(self, currency: Currency) -> Decimal:
        """Obtiene la tasa de cambio para una moneda."""
        if currency.code == 'VES':
            return Decimal('1.00')
            
        # Si ya se proveyó una tasa y coincide la moneda
        if self.exchange_rate and self.exchange_rate.currency == currency:
            return self.exchange_rate.rate
            
        # Buscar tasa en BD
        # Nota: Idealmente esto debería venir del servicio centralizado
        latest_rate = ExchangeRate.objects.filter(
            currency=currency,
            date_valid__lte=self.payment_date
        ).order_by('-date_valid').first()
        
        if not latest_rate:
            # Fallback o error dependiendo del requerimiento. Por ahora 1.0 para no romper
            return Decimal('1.00')
            
        return latest_rate.rate

    def _get_salary_in_ves(self) -> Decimal:
        """Obtiene el salario base del contrato convertido a Bolívares."""
        if self._cached_salary_ves is not None:
            return self._cached_salary_ves
            
        amount = self.contract.salary_amount
        currency = self.contract.salary_currency
        
        if currency.code == 'VES':
            self._cached_salary_ves = amount
        else:
            rate = self._get_exchange_rate(currency)
            self._cached_salary_ves = amount * rate
            
        return self._cached_salary_ves

    def calculate_concept_amount(self, concept: PayrollConcept, override_value: Optional[Decimal] = None) -> Decimal:
        """
        Calcula el monto final de un concepto en Bolívares (VES).
        
        Args:
            concept: El concepto a calcular.
            override_value: Valor personalizado si existe (employee_concept.override_value).
            
        Returns:
            Decimal: Monto final en Bolívares redondeado a 2 decimales.
        """
        result = Decimal('0.00')
        
        # 1. Determinar el valor base (global o personalizado)
        base_value = override_value if override_value is not None else concept.value
        
        # 2. Aplicar lógica según método de cálculo
        if concept.computation_method == PayrollConcept.ComputationMethod.FIXED_AMOUNT:
            # Si es monto fijo, convertir según la moneda del concepto
            if concept.currency.code == 'VES':
                result = base_value
            else:
                rate = self._get_exchange_rate(concept.currency)
                result = base_value * rate

        elif concept.computation_method == PayrollConcept.ComputationMethod.PERCENTAGE_OF_BASIC:
            # Calcular porcentaje sobre el salario base en VES
            salary_ves = self._get_salary_in_ves()
            # Fórmula: (Salario * Porcentaje) / 100
            result = (salary_ves * base_value) / Decimal('100.00')

        elif concept.computation_method == PayrollConcept.ComputationMethod.FORMULA:
            # Buscar función en el registro legal
            # Se asume que concept.code coincide con las llaves en FORMULA_REGISTRY
            formula_func = FORMULA_REGISTRY.get(concept.code)
            
            if formula_func:
                # Determinar la tasa del contrato para pasarla al contexto
                rate = self._get_exchange_rate(self.contract.salary_currency)
                
                # Preparar contexto para la fórmula
                context = {
                    'rate': rate,
                    'payment_date': self.payment_date,
                    'input_variables': self.input_variables,
                }
                
                # Ejecutar fórmula
                result = formula_func(self.contract, context)
            else:
                # Por ahora retorna 0 si no hay implementación específica registrada
                result = Decimal('0.00')

        # 3. Redondeo final a 2 decimales
        return result.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
