"""
Servicios relacionados con el procesamiento de nómina.
"""
from decimal import Decimal
from datetime import datetime
from typing import Optional
from django.db import models, transaction
from django.utils import timezone

from ..engine import PayrollEngine
from ..models import (
    PayrollPeriod, Payslip, PayslipDetail, PayrollNovelty, 
    Employee, Currency, ExchangeRate, PayrollConcept,
    Loan, LoanPayment
)
from .currency import SalaryConverter, CurrencyNotFoundError, ExchangeRateNotFoundError


class PayrollProcessor:
    """
    Servicio encargado de ejecutar el cálculo masivo y cierre definitivo de nómina.
    Transforma cálculos de motor en registros inmutables.
    """

    @staticmethod
    @transaction.atomic
    def process_period(period_id: int, user: Optional[models.Model] = None, manual_rate: Optional[Decimal] = None) -> dict:
        """
        Calcula y cierra el periodo para todos los empleados activos.
        
        Paso 1: Validar periodo.
        Paso 2: Obtener tasa BCV (Automática o Manual).
        Paso 3: Agrupar novedades por empleado.
        Paso 4: Procesar cada empleado y persistir snapshots.
        Paso 5: Cerrar periodo.
        """
        # 1. Obtener Periodo
        try:
            period = PayrollPeriod.objects.select_for_update().get(id=period_id)
        except PayrollPeriod.DoesNotExist:
            raise ValueError(f"El periodo {period_id} no existe.")

        if period.status == PayrollPeriod.Status.CLOSED:
            raise ValueError("Este periodo ya se encuentra cerrado.")

        # 2. Obtener Tasa BCV
        bcv_rate = None
        
        if manual_rate:
            # Si el usuario provee una tasa manual, la usamos y la guardamos para el record
            bcv_rate = Decimal(str(manual_rate))
            currency_usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'Dólar Estadounidense'})
            ExchangeRate.objects.get_or_create(
                currency=currency_usd,
                date_valid__date=period.payment_date,
                source=ExchangeRate.RateSource.BCV,
                defaults={'rate': bcv_rate, 'date_valid': datetime.combine(period.payment_date, datetime.min.time()).replace(tzinfo=timezone.get_current_timezone())}
            )
        else:
            try:
                usd_rate_obj = SalaryConverter.get_latest_rate(
                    currency_code='USD',
                    target_date=period.payment_date,
                    source='BCV'
                )
                bcv_rate = usd_rate_obj.rate
            except (CurrencyNotFoundError, ExchangeRateNotFoundError):
                raise ValueError(
                    f"No hay una tasa BCV válida cargada para la fecha {period.payment_date}. "
                    "Cargue la tasa de cambio antes de proceder al cierre."
                )

        # 3. Obtener Empleados y Novedades
        active_employees = Employee.objects.filter(is_active=True).prefetch_related('contracts')
        
        # Agrupar novedades: { employee_id: { concept_code: amount, ... }, ... }
        all_novelties = PayrollNovelty.objects.filter(period=period)
        novelties_map = {}
        for n in all_novelties:
            if n.employee_id not in novelties_map:
                novelties_map[n.employee_id] = {}
            novelties_map[n.employee_id][n.concept_code] = n.amount

        # 4. Procesamiento
        processed_count = 0
        total_income_ves = Decimal('0.00')
        warnings = []

        for employee in active_employees:
            contract = employee.contracts.filter(is_active=True).first()
            if not contract:
                warnings.append(f"Empleado {employee.full_name} ({employee.national_id}) no tiene contrato activo.")
                continue

            # Obtener variables de entrada (novedades)
            input_vars = novelties_map.get(employee.id, {})

            # Ejecutar Motor (Lógica Centralizada LOTTT)
            engine = PayrollEngine(
                contract=contract,
                period=period,
                input_variables=input_vars
            )
            
            # Obtener resultados calculados por el motor
            # Esto incluye: Conceptos de Contrato (Base, Cesta, Compl) + Deducciones Ley + Conceptos Dinámicos
            calculation_result = engine.calculate_payroll()
            
            result_lines = calculation_result.get('lines', [])
            totals = calculation_result.get('totals', {})
            
            if not result_lines:
                continue

            # 5. Guardar Snapshot e Inmutabilidad
            snapshot = {
                'position': contract.position,
                'salary_amount': str(contract.salary_amount),
                'salary_currency': contract.salary_currency.code,
                'payment_frequency': contract.payment_frequency,
                'hire_date': str(employee.hire_date),
                'department': contract.department.name if contract.department else None,
                'base_salary_bs': str(contract.base_salary_bs)
            }

            payslip = Payslip.objects.create(
                period=period,
                employee=employee,
                contract_snapshot=snapshot,
                total_income_ves=totals.get('income_ves', 0),
                total_deductions_ves=totals.get('deductions_ves', 0),
                net_pay_ves=totals.get('net_pay_ves', 0),
                exchange_rate_applied=bcv_rate,
                currency_code='VES',
                status=Payslip.PayslipStatus.DRAFT
            )

            # Bulk create de detalles
            detail_objs = []
            for line in result_lines:
                # line = {'code', 'name', 'kind', 'amount_ves'}
                detail_objs.append(
                    PayslipDetail(
                        payslip=payslip,
                        concept_code=line['code'],
                        concept_name=line['name'],
                        kind=line['kind'],
                        amount_ves=line['amount_ves'],
                        tipo_recibo=line.get('tipo_recibo', 'salario'),
                        quantity=line.get('quantity', 0) or 0,
                        unit=line.get('unit', 'días'),
                        calculation_trace=line.get('trace', ''),
                        # Referencial en moneda origen (si aplica)
                        amount_src=(line['amount_ves'] / bcv_rate).quantize(Decimal('0.01')) if bcv_rate else 0
                    )
                )

                # Procesamiento de Préstamos (Amortización)
                if line.get('code') == 'PRESTAMO' and line.get('loan_id'):
                    try:
                        loan = Loan.objects.get(id=line['loan_id'])
                        
                        # Crear registro del pago
                        payment_amount = line['amount_ves']
                        exchange_rate_val = Decimal('1.00')
                        
                        # Si el préstamo es en divisa, debemos convertir el monto descontado (VES)
                        # de vuelta a la moneda del préstamo para restar del saldo
                        if loan.currency.code != 'VES':
                            # Usamos la tasa aplicada en este cierre (bcv_rate)
                            exchange_rate_val = bcv_rate or Decimal('1.00')
                            payment_amount = (line['amount_ves'] / exchange_rate_val).quantize(Decimal('0.01'))
                        
                        LoanPayment.objects.create(
                            loan=loan,
                            payslip=payslip,
                            amount=payment_amount,
                            payment_date=period.payment_date,
                            exchange_rate_applied=exchange_rate_val,
                            reference=f"Deducción Nómina {period.name}"
                        )
                        
                        # Actualizar saldo
                        loan.balance -= payment_amount
                        
                        # Verificar si se pagó completo (o si quedó saldo negativo insignificante por redondeo)
                        if loan.balance <= Decimal('0.01'):
                            loan.balance = Decimal('0.00')
                            loan.status = Loan.LoanStatus.Paid
                        
                        loan.save()
                        
                    except Loan.DoesNotExist:
                        pass # Should not happen given engine logic

            PayslipDetail.objects.bulk_create(detail_objs)

            processed_count += 1
            total_income_ves += totals.get('net_pay_ves', 0)

        # 6. Finalizar Periodo
        period.status = PayrollPeriod.Status.CLOSED
        period.save()

        return {
            "processed_employees": processed_count,
            "total_payroll_ves": float(total_income_ves),
            "exchange_rate": float(bcv_rate),
            "warnings": warnings
        }
    @staticmethod
    def preview_period(period_id: int, manual_rate: Optional[Decimal] = None) -> dict:
        """
        Calcula la nómina para todos los empleados activos sin guardar cambios.
        """
        # 1. Obtener Periodo
        try:
            period = PayrollPeriod.objects.get(id=period_id)
        except PayrollPeriod.DoesNotExist:
            raise ValueError(f"El periodo {period_id} no existe.")

        # 2. Obtener Tasa BCV
        bcv_rate = None
        if manual_rate:
            bcv_rate = Decimal(str(manual_rate))
        else:
            try:
                usd_rate_obj = SalaryConverter.get_latest_rate(
                    currency_code='USD',
                    target_date=period.payment_date,
                    source='BCV'
                )
                bcv_rate = usd_rate_obj.rate
            except (CurrencyNotFoundError, ExchangeRateNotFoundError):
                # Para la previsualización, si no hay tasa, podemos intentar la última disponible
                # o devolver un error informativo.
                last_rate = ExchangeRate.objects.filter(currency__code='USD').order_by('-date_valid').first()
                if last_rate:
                    bcv_rate = last_rate.rate
                else:
                    raise ValueError("No hay una tasa de cambio disponible para la previsualización.")

        # 3. Obtener Empleados y Novedades
        active_employees = Employee.objects.filter(is_active=True).prefetch_related('contracts')
        all_novelties = PayrollNovelty.objects.filter(period=period)
        novelties_map = {}
        for n in all_novelties:
            if n.employee_id not in novelties_map:
                novelties_map[n.employee_id] = {}
            novelties_map[n.employee_id][n.concept_code] = n.amount

        # 4. Procesamiento
        results = []
        total_net_ves = Decimal('0.00')

        for employee in active_employees:
            contract = employee.contracts.filter(is_active=True).first()
            if not contract:
                continue

            input_vars = novelties_map.get(employee.id, {})
            engine = PayrollEngine(
                contract=contract,
                period=period,
                input_variables=input_vars
            )
            
            calc = engine.calculate_payroll()
            totals = calc.get('totals', {})
            
            results.append({
                'employee_id': employee.id,
                'full_name': employee.full_name,
                'national_id': employee.national_id,
                'income_ves': float(totals.get('income_ves', 0)),
                'deductions_ves': float(totals.get('deductions_ves', 0)),
                'net_pay_ves': float(totals.get('net_pay_ves', 0)),
                'net_pay_usd_ref': float(totals.get('net_pay_usd_ref', 0)),
                'lines': calc.get('lines', []) # <--- ADICIONADO PARA DETALLE
            })
            total_net_ves += totals.get('net_pay_ves', 0)

        return {
            "period_name": period.name,
            "exchange_rate": float(bcv_rate),
            "total_net_ves": float(total_net_ves),
            "results": results
        }
